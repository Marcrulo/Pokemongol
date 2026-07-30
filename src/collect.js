/**
 * The evening. Trail → stays → places → haunts.
 *
 * Runs when you open the app, never while you are out. Collecting is
 * deterministic: the same trail always yields the same haunts, because each
 * place seeds its own RNG from the day and the place name. That means a day
 * can be re-collected safely — after the network came back, say — without
 * rerolling what you already saw.
 */

import { distanceM, findStays } from '../prototype/src/dwell.js';
import { makeRng, seedFrom } from '../prototype/src/rng.js';
import { spawn } from '../prototype/src/spawner.js';
import { onePerPlace } from '../prototype/src/day.js';
import { replaceDay, trailForDay } from './db.js';
import { resolvePlace } from './resolve.js';

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
  const stays = findStays(trail);
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

  const catches = [];
  for (const { stay, place } of onePerPlace(resolved)) {
    const rng = makeRng(seedFrom(day, place.osmTag, place.placeName));
    const c = spawn(rng, stay, place.osmTag, place.placeName, steps, 'unknown');
    if (c) catches.push(c);
  }

  await replaceDay(day, catches);
  return { catches, stays: stays.length, steps, unresolved };
}
