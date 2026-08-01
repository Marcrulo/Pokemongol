/**
 * Letter grades, A to E, for the Stand-chart display.
 *
 * A stat is stored 0-100, but a bare number tells you nothing without knowing
 * the budget it came out of. A letter says immediately whether the haunt is
 * good at something, which is the whole appeal of the chart this borrows from.
 *
 * ## The cutoffs are measured
 *
 * The obvious scale — five even bands of twenty — is wrong here, because stat
 * values are nothing like uniform. Rarity fixes a points budget (50 for a
 * Shade, 150 for a Reaper) and `SIGNATURE_SHARE` hands a third of it to one
 * axis up front, so the four remaining axes live down near single digits. Even
 * bands would grade almost every haunt EEEEB and say nothing.
 *
 * These came from a sweep of 30,000 rolls, rarities drawn at their real
 * frequency for a 6,000-step day:
 *
 *              A     B     C     D     E    none
 *   all       5%    8%   14%   27%   41%     5%
 *   Shade     0%    3%   15%   25%   50%     7%
 *   Reaper   21%   10%   18%   29%   20%     2%
 *
 * That spread is the point. A is rare enough to be worth seeing, a Shade can
 * never reach one, and a Reaper does about a fifth of the time — so the grades
 * read as rarity without ever printing the word. Two neighbouring scales were
 * tried; 60/40/25/12 pushed E to 54% and flattened the low end, and 50/32/18/7
 * gave away As too cheaply.
 *
 * A test pins those shares. If it fails, the roll distribution moved — widen
 * the assertion only after finding out why.
 */

/** Descending. The first threshold a value clears wins. */
export const GRADE_CUTOFFS = Object.freeze([
  ['A', 55],
  ['B', 35],
  ['C', 20],
  ['D', 8],
  ['E', 1],
]);

export const GRADES = Object.freeze(GRADE_CUTOFFS.map(([letter]) => letter));

/**
 * What a zero shows as. A haunt with no Presence at all has *none*, not a bad
 * amount — the distinction is the same one the source material draws, and it
 * lands on about one axis in twenty.
 */
export const NO_GRADE = '—';

/**
 * @param {number} value  0-100
 * @returns {string} one of A-E, or NO_GRADE for zero
 */
export function gradeFor(value) {
  if (!(value > 0)) return NO_GRADE;
  for (const [letter, floor] of GRADE_CUTOFFS) {
    if (value >= floor) return letter;
  }
  return 'E';
}

/** Spoken form, for screen readers: "A" alone is read as an article. */
export function gradeLabel(value) {
  const g = gradeFor(value);
  return g === NO_GRADE ? 'none' : `grade ${g}`;
}
