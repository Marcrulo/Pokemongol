/**
 * The evening. Trail → stays → places → haunts.
 *
 * Runs when you open the app, never while you are out. Collecting is
 * deterministic: the same trail always yields the same haunts, because each
 * place seeds its own RNG from the day and the place name. That means a day
 * can be re-collected safely — after the network came back, say — without
 * rerolling what you already saw.
 */

import { NO_READING } from '../prototype/src/conditions.js';
import { onePerPlace } from '../prototype/src/day.js';
import { CLUSTER_RADIUS_M, distanceM, findStays } from '../prototype/src/dwell.js';
import { makeRng, seedFrom } from '../prototype/src/rng.js';
import { spawn } from '../prototype/src/spawner.js';
import { sunAltitude } from '../prototype/src/sun.js';
import { dayOf, daysWithFixes, replaceDay, trailForDay } from './db.js';
import { allowRepeatPlaces, dwellThreshold } from './dev.js';
import { resolvePlace } from './resolve.js';
import { hourlyForDay, readHour } from './weather.js';

/** Metres per step, walking. Rough on purpose — steps only nudge rarity. */
const STRIDE_M = 0.72;
/** Ignore jumps this big; that is a GPS glitch, not walking. */
const MAX_LEG_M = 200;
/** And ignore twitches this small; that is standing still. */
const MIN_LEG_M = 5;

/**
 * Estimate steps from the trail. Using the trail rather than the pedometer
 * keeps this working in the background on every phone, with no extra
 * permission and no second source of truth.
 *
 * @param {Array<{lat: number, lon: number}>} trail
 */
export function stepsFromTrail(trail) {
  let metres = 0;
  for (let i = 1; i < trail.length; i++) {
    const leg = distanceM(
      trail[i - 1].lat, trail[i - 1].lon, trail[i].lat, trail[i].lon,
    );
    if (leg >= MIN_LEG_M && leg <= MAX_LEG_M) metres += leg;
  }
  return Math.round(metres / STRIDE_M);
}

/**
 * Collect one day and write it to the store.
 *
 * @param {string} day  local ISO date
 * @returns {Promise<{catches: any[], stays: number, steps: number, unresolved: number}>}
 */
export async function collect(day) {
  const trail = await trailForDay(day);
  const stays = findStays(trail, CLUSTER_RADIUS_M, dwellThreshold());
  const steps = stepsFromTrail(trail);

  const resolved = [];
  let unresolved = 0;
  for (const stay of stays) {
    let place;
    try {
      place = await resolvePlace(stay.lat, stay.lon);
    } catch {
      unresolved++; // network down — leave it for the next open
      continue;
    }
    if (place) resolved.push({ stay, place });
  }

  // In development every stay may spawn, so sitting at one desk still produces
  // something on each attempt. The real rule keeps one haunt per place per day.
  const keep = allowRepeatPlaces() ? resolved : onePerPlace(resolved);

  // One request for the whole day, anchored on the first place you lingered.
  // Failure is not fatal: sun altitude still resolves and the rest records as
  // null, to be backfilled the next time the app opens with a connection.
  let hourly = null;
  if (keep.length > 0) {
    try {
      hourly = await hourlyForDay(
        keep[0].stay.lat, keep[0].stay.lon, day, dayOf(),
      );
    } catch {
      hourly = null;
    }
  }

  const catches = [];
  let emptyPlaces = 0;
  for (const { stay, place } of keep) {
    // Place-only seeding keeps a catch stable across re-collection. When
    // repeats are allowed the stay's start has to join the seed, or two visits
    // to one desk would roll the identical haunt twice.
    const rng = makeRng(
      allowRepeatPlaces()
        ? seedFrom(day, place.osmTag, place.placeName, stay.startT)
        : seedFrom(day, place.osmTag, place.placeName),
    );
    const c = spawn(
      rng, stay, place.osmTag, place.placeName, steps,
      readingFor(day, stay, hourly),
    );
    if (c) catches.push(c);
    else emptyPlaces++; // resolved fine, but no species has that tag yet
  }

  await replaceDay(day, catches);
  return {
    catches,
    stays: stays.length,
    steps,
    unresolved,
    // Distinguishes "you never stopped" from "you stopped somewhere with
    // nobody in". Without it both render identically, which reads as broken.
    emptyPlaces,
    weather: hourly ? 'open-meteo' : 'none',
  };
}

/**
 * Collect every day the trail still covers, newest first.
 *
 * Collecting only today loses whole days: the app is meant to be opened in the
 * evening, and skipping an evening meant that day's haunts were never created,
 * then its fixes aged out after a week and the day was gone for good. Days
 * already collected are cheap to redo — resolution and weather are both
 * cached, and seeding is deterministic, so re-collecting yields exactly what
 * it did the first time.
 *
 * @returns {Promise<{days: number, caught: number, today: object}>}
 */
export async function collectRecent() {
  const days = await daysWithFixes();
  const today = dayOf();
  if (!days.includes(today)) days.unshift(today);

  let caught = 0;
  let todayResult = null;
  for (const day of days) {
    const result = await collect(day);
    caught += result.catches.length;
    if (day === today) todayResult = result;
  }
  return {
    days: days.length,
    caught,
    today: todayResult ?? { catches: [], stays: 0, steps: 0, unresolved: 0 },
  };
}

/**
 * The conditions for one stay, taken at its midpoint — the moment that best
 * represents a visit rather than its edges.
 *
 * @param {string} day
 * @param {{startT: number, endT: number, lat: number, lon: number}} stay
 * @param {object|null} hourly  the day's arrays, or null if unavailable
 * @returns {import('../prototype/src/conditions.js').Reading}
 */
export function readingFor(day, stay, hourly) {
  const midpoint = (stay.startT + stay.endT) / 2;
  const at = new Date(`${day}T00:00:00`);
  at.setSeconds(at.getSeconds() + midpoint);

  const reading = {
    ...NO_READING,
    sunAltitude: sunAltitude(stay.lat, stay.lon, at),
  };
  if (!hourly) return reading;

  return {
    ...reading,
    ...readHour(hourly, midpoint / 3600),
    source: 'open-meteo',
  };
}
