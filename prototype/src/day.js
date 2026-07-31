/**
 * Collect a day: stays → catches.
 *
 * This is where the "one haunt per place per day" rule lives. It belongs here
 * rather than in the dwell detector, which is correct as-is — it reports what
 * the GPS trail actually says. Deduplication is a game rule, not a fix.
 *
 * Without it, GPS drift splits one long visit into two qualifying stays on
 * roughly 26% of days, so a single 41-minute trip to the park yields two
 * haunts.
 *
 * @typedef {import('./dwell.js').Stay} Stay
 * @typedef {import('./spawner.js').Catch} Catch
 */

import { NO_READING } from './conditions.js';
import { spawn } from './spawner.js';

/** Two stays are the same place if they resolve to the same tag and name. */
const placeKey = (place) => `${place.osmTag}|${place.placeName}`;

/**
 * Keep one stay per place — the longest, so the real visit wins over a
 * drift-induced fragment.
 *
 * @param {Array<{stay: Stay, place: {osmTag: string, placeName: string}}>} resolved
 * @returns {Array<{stay: Stay, place: {osmTag: string, placeName: string}}>}
 *   in first-arrival order
 */
export function onePerPlace(resolved) {
  /** @type {Map<string, {stay: Stay, place: any}>} */
  const best = new Map();
  for (const entry of resolved) {
    const key = placeKey(entry.place);
    const held = best.get(key);
    if (!held || entry.stay.duration > held.stay.duration) best.set(key, entry);
  }
  return [...best.values()].sort((a, b) => a.stay.startT - b.stay.startT);
}

/**
 * Whether a recomputed day may overwrite what is already stored.
 *
 * Replacement is only sound while the trail that produced the stored catches
 * still exists. It does not always: the trail is pruned after a week, and a
 * migration once dropped it outright. A day then recomputes to zero catches
 * because the evidence is gone, not because nothing happened.
 *
 * So an empty recomputation never deletes a non-empty day. Catches are the one
 * thing here that walking again cannot regenerate.
 *
 * @param {number} recomputed  how many catches this run produced
 * @param {number} stored      how many are already saved for that day
 * @returns {boolean}
 */
export function mayReplaceDay(recomputed, stored) {
  if (recomputed > 0) return true;
  return stored === 0;
}

/**
 * The full daily pipeline: resolve each stay to a place, apply one-per-place,
 * then spawn.
 *
 * @param {Object} args
 * @param {{random(): number, choice(items: number[]): number}} args.rng
 * @param {Stay[]} args.stays
 * @param {(lat: number, lon: number) => ({osmTag: string, placeName: string}|null)} args.resolve
 * @param {number} args.steps
 * @param {import('./conditions.js').Reading|((stay: Stay) => import('./conditions.js').Reading)}
 *   [args.weather] one reading for the whole day, or a function of the stay.
 *   The function form matters because sun altitude differs between a morning
 *   and an evening stay on the same day.
 * @returns {Catch[]}
 */
export function collectDay({ rng, stays, resolve, steps, weather = NO_READING }) {
  const resolved = [];
  for (const stay of stays) {
    const place = resolve(stay.lat, stay.lon);
    if (place) resolved.push({ stay, place });
  }

  const readingFor =
    typeof weather === 'function' ? weather : () => weather;

  const catches = [];
  for (const { stay, place } of onePerPlace(resolved)) {
    const c = spawn(
      rng, stay, place.osmTag, place.placeName, steps, readingFor(stay),
    );
    if (c) catches.push(c);
  }
  return catches;
}
