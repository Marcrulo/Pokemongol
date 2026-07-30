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
 * @property {string} weather
 * @property {number} total
 */

import { forTag } from './species.js';

export const STAT_NAMES = Object.freeze([
  'Rizz', 'Gooning', 'Sigma', 'Aura', 'Skibidi', 'Sussy',
]);
export const STAT_CAP = 100;

export const RARITIES = Object.freeze(['Common', 'Uncommon', 'Rare', 'Mythic']);

/** Rarity sets the total point budget; the roll distributes it randomly. */
export const BUDGETS = Object.freeze({
  Common: 120, Uncommon: 200, Rare: 300, Mythic: 420,
});

/**
 * Base chances at zero steps, and how much probability mass walking moves.
 * The shifts sum to zero, so the weights always sum to 1.
 */
export const BASE_CHANCE = Object.freeze({
  Common: 0.70, Uncommon: 0.22, Rare: 0.07, Mythic: 0.01,
});
export const STEP_SHIFT = Object.freeze({
  Common: -0.45, Uncommon: 0.15, Rare: 0.22, Mythic: 0.08,
});
export const STEPS_SATURATION = 20_000;

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
 * Spread `budget` points randomly over the six axes, each capped at 100.
 *
 * Weights are drawn as Dirichlet(1,...,1) — uniformly over the simplex — so no
 * axis is systematically favoured and spiky distributions are common.
 *
 * @param {{random(): number, choice(items: number[]): number}} rng
 * @param {number} budget
 * @returns {Record<string, number>}
 */
export function rollStats(rng, budget) {
  const n = STAT_NAMES.length;
  if (budget > n * STAT_CAP) {
    throw new RangeError(`budget ${budget} exceeds ${n} x ${STAT_CAP}`);
  }
  if (budget < 0) throw new RangeError(`budget ${budget} is negative`);

  const weights = Array.from({ length: n }, () => -Math.log(1 - rng.random()));
  const totalW = weights.reduce((a, w) => a + w, 0) || 1;
  const values = weights.map((w) =>
    Math.min(STAT_CAP, Math.floor((budget * w) / totalW)));

  // Rounding and clamping leave a remainder; hand it out one point at a time.
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
 * @param {string} [weather]
 * @returns {Catch|null}
 */
export function spawn(rng, stay, osmTag, placeName, steps, weather = 'unknown') {
  const species = forTag(osmTag);
  if (species === null) return null;

  const rarity = rollRarity(rng, steps);
  const stats = rollStats(rng, BUDGETS[rarity]);
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
