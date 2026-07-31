/**
 * What this catch means, given every one before it.
 *
 * The problem this solves: a Shade is 50 points spread over five axes, and by
 * the fortieth one there is nothing left to notice. No amount of presentation
 * makes the creature interesting again.
 *
 * But "the best Spirit of Aisle Seven you have ever met" is interesting at any
 * rarity, because the interesting object was never the catch — it is the
 * record.
 *
 * **Records are per axis, not only on the total.** Ranking by total alone
 * collapses into ranking by rarity: a Reaper has 150 points to a Shade's 50,
 * so once you catch one good roll the species is closed forever and every
 * later catch is dead weight. Five axes plus the total give a species six
 * records, and a 50-point Shade can still take the Insight slot by spiking it.
 * Near-misses become frequent and graceful instead of impossible.
 *
 * Pure and history-driven, so it can be tested without a database.
 */

import { STAT_NAMES } from './spawner.js';

/**
 * @typedef {Object} History  Catches of this species from *before* this one.
 * @property {number} count
 * @property {number|null} bestTotal
 * @property {number|null} worstTotal
 * @property {Record<string, number>} [bestByStat]  highest seen per axis
 */

/**
 * @typedef {Object} Verdict
 * @property {'first'|'record'|'tied'|'worst'|'repeat'} kind
 * @property {string} line          the sentence to show
 * @property {string|null} badge    short label for the card corner
 * @property {string[]} axisRecords stats this catch set a new high on
 */

const ORDINALS = [
  'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh',
  'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth',
];

/** `4` → `fourth`, falling back to digits once the words get silly. */
export function ordinal(n) {
  if (n >= 1 && n <= ORDINALS.length) return ORDINALS[n - 1];
  const rest = n % 100;
  const suffix =
    rest >= 11 && rest <= 13
      ? 'th'
      : { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th';
  return `${n}${suffix}`;
}

const list = (items) =>
  items.length <= 1
    ? items.join('')
    : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

/**
 * @param {{total: number, stats: Record<string, number>}} c
 * @param {History} history
 * @returns {Verdict}
 */
export function verdictFor(c, history) {
  const {
    count = 0,
    bestTotal = null,
    worstTotal = null,
    bestByStat = {},
  } = history ?? {};

  const axisRecords = STAT_NAMES.filter(
    (name) => bestByStat[name] != null && c.stats[name] > bestByStat[name],
  );

  if (count === 0) {
    return {
      kind: 'first',
      line: 'First of its kind. Nobody has met this one before.',
      badge: 'FIRST',
      axisRecords: [],
    };
  }

  if (bestTotal !== null && c.total > bestTotal) {
    const by = c.total - bestTotal;
    return {
      kind: 'record',
      line: `The best of these you have met, by ${by} point${by === 1 ? '' : 's'}.`,
      badge: 'BEST YET',
      axisRecords,
    };
  }

  if (bestTotal !== null && c.total === bestTotal) {
    return {
      kind: 'tied',
      line: 'Exactly as good as your best. To the point.',
      badge: null,
      axisRecords,
    };
  }

  // Not a record overall, but it beat something. This is the case that keeps a
  // species alive after a lucky high-rarity roll has fixed the total.
  if (axisRecords.length > 0) {
    return {
      kind: 'repeat',
      line: `Not the best overall, but the most ${list(
        axisRecords.map((s) => s.toLowerCase()),
      )} you have had of these.`,
      badge: null,
      axisRecords,
    };
  }

  if (worstTotal !== null && c.total < worstTotal) {
    return {
      kind: 'worst',
      line: 'The worst one yet. It is aware.',
      badge: null,
      axisRecords: [],
    };
  }

  return {
    kind: 'repeat',
    line: `Your ${ordinal(count + 1)}. The best is still ${bestTotal - c.total} ahead.`,
    badge: null,
    axisRecords: [],
  };
}
