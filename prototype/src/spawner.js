/**
 * The spawner: a pure function from a stay to a catch.
 *
 * No I/O anywhere in this module. That is the point — balance can be tuned and
 * tested without walking anywhere, and a given seed always produces the same
 * day.
 *
 * @typedef {import('./dwell.js').Stay} Stay
 *
 * @typedef {Object} Catch
 * @property {string} speciesId
 * @property {string} rarity
 * @property {Record<string, number>} stats
 * @property {string} placeName
 * @property {string} osmTag
 * @property {number} caughtAt       seconds since midnight
 * @property {number} dwellSeconds
 * @property {import('./conditions.js').Reading} weather
 * @property {number} total
 */

import { NO_READING } from './conditions.js';
import { forTag } from './species.js';
import { signatureFor } from './types.js';

/** The five axes of the radar chart, in display order. */
export const STAT_NAMES = Object.freeze([
  'Power',     // raw force
  'Dread',     // scariness
  'Anchor',    // durability to stay in the world
  'Presence',  // aura, "feltness"
  'Insight',   // intelligence and wisdom
]);

/** Each axis is scored 0-100. Five axes, so 500 is the theoretical maximum. */
export const STAT_CAP = 100;

/** Ascending. */
export const RARITIES = Object.freeze([
  'Shade', 'Phantom', 'Wraith', 'Revenant', 'Reaper',
]);

/** Rarity sets the points available to distribute across the five axes. */
export const BUDGETS = Object.freeze({
  Shade: 50, Phantom: 75, Wraith: 100, Revenant: 125, Reaper: 150,
});

export const RARITY_INDEX = Object.freeze(
  Object.fromEntries(RARITIES.map((r, i) => [r, i])));

/**
 * Base chances at zero steps, and how much probability mass walking moves.
 * The shifts sum to zero, so the weights always sum to 1.
 */
export const BASE_CHANCE = Object.freeze({
  Shade: 0.55, Phantom: 0.27, Wraith: 0.13, Revenant: 0.04, Reaper: 0.01,
});
export const STEP_SHIFT = Object.freeze({
  Shade: -0.40, Phantom: -0.05, Wraith: 0.17, Revenant: 0.19, Reaper: 0.09,
});
export const STEPS_SATURATION = 20_000;

/**
 * How hard a haunt leans on its type's signature stat. This is what makes a
 * Forest haunt read as thoughtful and a Graveyard haunt read as strong, without
 * making every haunt of a type identical.
 *
 * Two dials, applied in `rollStats`:
 *   SIGNATURE_SHARE  fraction of the budget handed to the signature up front
 *   SIGNATURE_WEIGHT how much the signature is favoured in the random remainder
 *
 * Tuned empirically over 20,000 rolls. At (0.35, 2.0) the signature stat is the
 * single highest on ~94% of haunts and takes ~54% of the budget, with a
 * standard deviation of 13 points — strong identity, wide spread, and roughly
 * one haunt in sixteen that surprises you.
 *
 * Raising either dial tightens identity at the cost of variety: (0.40, 2.5)
 * reaches 99% but starts to feel formulaic.
 */
export const SIGNATURE_SHARE = 0.35;
export const SIGNATURE_WEIGHT = 2.0;

/**
 * Deferred: weather is recorded on every catch but does not yet affect rolls.
 * Deepening this is the next design pass — the hook lives here.
 */
export const WEATHER_MODIFIERS = Object.freeze({});

/**
 * How likely each tier is, given how far you walked today.
 *
 * More walking means better haunts, never more haunts. The count is governed
 * entirely by where you lingered.
 *
 * @param {number} steps
 * @returns {Record<string, number>}
 */
export function rarityWeights(steps) {
  const b = Math.min(Math.max(steps, 0) / STEPS_SATURATION, 1);
  const out = {};
  for (const r of RARITIES) out[r] = BASE_CHANCE[r] + STEP_SHIFT[r] * b;
  return out;
}

/**
 * @param {{random(): number}} rng
 * @param {number} steps
 * @returns {string}
 */
export function rollRarity(rng, steps) {
  const weights = rarityWeights(steps);
  const total = RARITIES.reduce((a, r) => a + weights[r], 0);
  let roll = rng.random() * total;
  for (const r of RARITIES) {
    roll -= weights[r];
    if (roll < 0) return r;
  }
  return RARITIES[RARITIES.length - 1];
}

/**
 * Hand out `budget` points across the five axes, leaning toward `signature`.
 *
 * Two stages:
 *   1. Reserve `SIGNATURE_SHARE` of the budget for the signature stat, so a
 *      haunt always reads as its type.
 *   2. Spread the remainder using Dirichlet(1,...,1) weights — uniform over the
 *      simplex, so the four non-signature axes are treated alike and spiky
 *      rolls are common — with the signature's weight scaled by
 *      `SIGNATURE_WEIGHT` so it usually, but not always, finishes highest.
 *
 * Clamping at 100 leaves a remainder, which is handed back out one point at a
 * time, so the total always lands exactly on the budget.
 *
 * @param {{random(): number, choice(items: number[]): number}} rng
 * @param {number} budget
 * @param {string} signature  one of STAT_NAMES
 * @returns {Record<string, number>}
 */
export function rollStats(rng, budget, signature) {
  const n = STAT_NAMES.length;
  const sigIndex = STAT_NAMES.indexOf(signature);
  if (sigIndex === -1) throw new Error(`unknown stat: ${signature}`);
  if (budget > n * STAT_CAP) {
    throw new RangeError(`budget ${budget} exceeds ${n} x ${STAT_CAP}`);
  }
  if (budget < 0) throw new RangeError(`budget ${budget} is negative`);

  const reserved = Math.min(STAT_CAP, Math.floor(budget * SIGNATURE_SHARE));
  const rest = budget - reserved;

  const weights = Array.from({ length: n }, () => -Math.log(1 - rng.random()));
  weights[sigIndex] *= SIGNATURE_WEIGHT;
  const totalW = weights.reduce((a, w) => a + w, 0) || 1;
  const values = weights.map((w) => Math.floor((rest * w) / totalW));
  values[sigIndex] += reserved;
  for (let i = 0; i < n; i++) values[i] = Math.min(STAT_CAP, values[i]);

  let remainder = budget - values.reduce((a, v) => a + v, 0);
  let guard = 0;
  while (remainder !== 0 && guard++ < 10_000) {
    const candidates = [];
    for (let i = 0; i < n; i++) {
      if (remainder > 0 ? values[i] < STAT_CAP : values[i] > 0) candidates.push(i);
    }
    if (candidates.length === 0) break;
    const i = rng.choice(candidates);
    if (remainder > 0) { values[i] += 1; remainder -= 1; }
    else { values[i] -= 1; remainder += 1; }
  }

  return Object.fromEntries(STAT_NAMES.map((name, i) => [name, values[i]]));
}

/**
 * Turn one qualifying stay into a catch.
 *
 * Returns null when the location type has no catalogued haunt yet — expected,
 * and the normal state of affairs while the catalog is only 30 entries deep.
 *
 * @param {{random(): number, choice(items: number[]): number}} rng
 * @param {Stay} stay
 * @param {string} osmTag
 * @param {string} placeName
 * @param {number} steps
 * @param {import('./conditions.js').Reading} [weather]
 * @returns {Catch|null}
 */
export function spawn(rng, stay, osmTag, placeName, steps, weather = NO_READING) {
  const species = forTag(osmTag);
  if (species === null) return null;

  const rarity = rollRarity(rng, steps);
  const stats = rollStats(rng, BUDGETS[rarity], signatureFor(species.type));
  return {
    speciesId: species.id,
    rarity,
    stats,
    placeName,
    osmTag,
    caughtAt: stay.startT,
    dwellSeconds: stay.duration,
    weather,
    total: Object.values(stats).reduce((a, v) => a + v, 0),
  };
}
