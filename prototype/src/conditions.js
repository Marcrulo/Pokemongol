/**
 * What the weather was when a haunt attached.
 *
 * This module owns the *shape* of a reading and how to say it aloud. Fetching
 * lives in the app layer (`src/weather.js`), the same way place classification
 * lives here while Overpass lookups do not.
 *
 * Readings are recorded and not yet acted on. `WEATHER_MODIFIERS` in
 * `spawner.js` is the seam for the pass that gives them teeth; deciding what
 * they should do is deliberately postponed until there is real data to tune
 * against. See
 * docs/superpowers/specs/2026-07-31-weather-measurement-design.md.
 *
 * @typedef {Object} Reading
 * @property {number|null} tempC        degrees Celsius
 * @property {number|null} precipMm     millimetres that hour
 * @property {number|null} cloudPct     percent of sky covered
 * @property {number|null} sunAltitude  degrees above the horizon, negative at night
 * @property {'open-meteo'|'none'} source
 */

import { daylightBand } from './sun.js';

/**
 * A reading with nothing in it. Used when collection runs with no location to
 * anchor the sun calculation.
 * @type {Reading}
 */
export const NO_READING = Object.freeze({
  tempC: null,
  precipMm: null,
  cloudPct: null,
  sunAltitude: null,
  source: 'none',
});

/**
 * Pull one hour out of a day's hourly arrays.
 *
 * Lives here rather than beside the fetching because it is pure indexing with
 * no network in it, and the edges are worth testing: an hour outside 0-23, a
 * gap in the middle of a day, a shorter array than expected.
 *
 * @param {{tempC: (number|null)[], precipMm: (number|null)[], cloudPct: (number|null)[]}} hourly
 * @param {number} hour  0-23 local; fractional hours are floored
 * @returns {{tempC: number|null, precipMm: number|null, cloudPct: number|null}}
 */
export function readHour(hourly, hour) {
  const i = Math.max(0, Math.min(23, Math.floor(hour)));
  const at = (arr) => (Array.isArray(arr) && arr[i] != null ? arr[i] : null);
  return {
    tempC: at(hourly?.tempC),
    precipMm: at(hourly?.precipMm),
    cloudPct: at(hourly?.cloudPct),
  };
}

/** How covered the sky was, in words. */
export function cloudBand(cloudPct) {
  if (cloudPct === null || cloudPct === undefined) return null;
  if (cloudPct < 15) return 'clear';
  if (cloudPct < 50) return 'partly cloudy';
  if (cloudPct < 85) return 'cloudy';
  return 'overcast';
}

/** How wet it was, in words. Below a tenth of a millimetre reads as dry. */
export function precipBand(precipMm) {
  if (precipMm === null || precipMm === undefined) return null;
  if (precipMm < 0.1) return null; // dry is worth no words
  if (precipMm < 0.5) return 'drizzle';
  if (precipMm < 2.5) return 'rain';
  return 'downpour';
}

/**
 * One line a person would actually say: "3C, overcast, drizzle, night".
 *
 * Parts that were not measured are simply left out, so an offline reading
 * still says something true rather than printing nulls.
 *
 * @param {Partial<Reading>} reading
 * @returns {string}
 */
export function summarize(reading) {
  if (!reading) return 'unknown';
  const parts = [];

  if (typeof reading.tempC === 'number') {
    parts.push(`${Math.round(reading.tempC)}C`);
  }
  const cloud = cloudBand(reading.cloudPct);
  if (cloud) parts.push(cloud);

  const precip = precipBand(reading.precipMm);
  if (precip) parts.push(precip);

  if (typeof reading.sunAltitude === 'number') {
    parts.push(daylightBand(reading.sunAltitude));
  }

  return parts.length > 0 ? parts.join(', ') : 'unknown';
}
