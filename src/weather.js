/**
 * Temperature, rain and cloud, from Open-Meteo.
 *
 * One request covers a whole day: the API returns 24 hourly values, so a day
 * with eight stays still costs a single call. Results are cached per day per
 * coarse cell, so re-collecting a day — which happens every time you open the
 * app — hits the network at most once.
 *
 * Sun altitude is deliberately not fetched. It is computed locally in
 * `prototype/src/sun.js`, so the one measurement that can never fail does not
 * depend on this file at all.
 *
 * Open-Meteo needs no API key and no account. Weather data by Open-Meteo.com,
 * CC BY 4.0.
 */

import { readHour } from '../prototype/src/conditions.js';
import { cachedWeatherDay, cacheWeatherDay } from './db.js';

const ENDPOINT = 'https://api.open-meteo.com/v1/forecast';

/**
 * Round to ~11 km before asking. Weather does not vary meaningfully below
 * that, and it reveals far less than the per-place coordinate Overpass gets.
 */
const cellOf = (lat, lon) => `${lat.toFixed(1)},${lon.toFixed(1)}`;

/**
 * @typedef {Object} HourlyDay
 * @property {(number|null)[]} tempC      24 values, index = local hour
 * @property {(number|null)[]} precipMm
 * @property {(number|null)[]} cloudPct
 */

/**
 * Ask Open-Meteo for one local day.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {string} day  local ISO date
 * @returns {Promise<HourlyDay>}
 * @throws if the request fails or comes back malformed
 */
async function fetchDay(lat, lon, day) {
  const url =
    `${ENDPOINT}?latitude=${lat}&longitude=${lon}` +
    '&hourly=temperature_2m,precipitation,cloud_cover' +
    `&timezone=auto&start_date=${day}&end_date=${day}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  const json = await res.json();

  const h = json.hourly;
  if (!h?.time) throw new Error('open-meteo returned no hourly data');

  return {
    tempC: h.temperature_2m ?? [],
    precipMm: h.precipitation ?? [],
    cloudPct: h.cloud_cover ?? [],
  };
}

/**
 * The day's hourly arrays, from cache when possible.
 *
 * Today's weather is refetched if the cached copy is more than an hour old,
 * because the later hours of a day in progress are forecast rather than
 * observed. Past days never change, so they are cached permanently.
 *
 * @returns {Promise<HourlyDay>}
 * @throws if there is no cache and the network is unavailable, so the caller
 *   can record `source: 'none'` and try again on the next open.
 */
export async function hourlyForDay(lat, lon, day, today = undefined) {
  const cell = cellOf(lat, lon);
  const cached = await cachedWeatherDay(cell, day);

  const isToday = day === (today ?? day);
  const stale =
    cached && isToday && Date.now() / 1000 - cached.fetchedAt > 3600;
  if (cached && !stale) return cached.hourly;

  try {
    const hourly = await fetchDay(lat, lon, day);
    await cacheWeatherDay(cell, day, hourly);
    return hourly;
  } catch (err) {
    // A stale copy beats nothing at all.
    if (cached) return cached.hourly;
    throw err;
  }
}

export { readHour };
