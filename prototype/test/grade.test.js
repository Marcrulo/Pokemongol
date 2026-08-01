/** Tests for the letter-grade scale. Run: npm test */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { GRADES, GRADE_CUTOFFS, NO_GRADE, gradeFor, gradeLabel } from '../src/grade.js';
import { makeRng } from '../src/rng.js';
import {
  BUDGETS, RARITIES, STAT_CAP, STAT_NAMES, rarityWeights, rollStats,
} from '../src/spawner.js';

describe('grade scale', () => {
  it('runs A to E, best first', () => {
    assert.deepEqual(GRADES, ['A', 'B', 'C', 'D', 'E']);
  });

  it('has strictly descending cutoffs', () => {
    for (let i = 1; i < GRADE_CUTOFFS.length; i++) {
      assert.ok(
        GRADE_CUTOFFS[i][1] < GRADE_CUTOFFS[i - 1][1],
        `cutoff ${i} is not below the one above it`,
      );
    }
  });

  it('grades the ends the way you would expect', () => {
    assert.equal(gradeFor(STAT_CAP), 'A');
    assert.equal(gradeFor(0), NO_GRADE);
    assert.equal(gradeFor(1), 'E');
  });

  it('never disagrees with itself: a bigger stat is never a worse grade', () => {
    let previous = 0;
    for (let v = 1; v <= STAT_CAP; v++) {
      const rank = GRADES.indexOf(gradeFor(v));
      assert.ok(rank <= previous || previous === 0, `grade got worse at ${v}`);
      previous = rank;
    }
  });

  it('speaks a letter rather than an article', () => {
    assert.equal(gradeLabel(90), 'grade A');
    assert.equal(gradeLabel(0), 'none');
  });
});

/**
 * The reason the cutoffs are where they are. See the header of `grade.js`:
 * these bounds are measured, not chosen, and a failure here means the roll
 * distribution moved rather than that the bounds are too tight.
 */
describe('grade distribution', () => {
  /** Grade every axis of `n` rolls, rarities at their real frequency. */
  function sweep(n, steps) {
    const rng = makeRng(20260801);
    const weights = rarityWeights(steps);
    const total = RARITIES.reduce((a, r) => a + weights[r], 0);
    const counts = {};
    let axes = 0;
    for (let i = 0; i < n; i++) {
      let roll = rng.random() * total;
      let rarity = RARITIES[RARITIES.length - 1];
      for (const r of RARITIES) {
        roll -= weights[r];
        if (roll < 0) { rarity = r; break; }
      }
      const stats = rollStats(rng, BUDGETS[rarity], 'Dread');
      for (const name of STAT_NAMES) {
        counts[gradeFor(stats[name])] = (counts[gradeFor(stats[name])] ?? 0) + 1;
        axes++;
      }
    }
    return (letter) => (counts[letter] ?? 0) / axes;
  }

  it('keeps A rare and E common without either taking over', () => {
    const share = sweep(6_000, 6_000);
    assert.ok(share('A') > 0.02, `A appeared on ${(share('A') * 100).toFixed(1)}% of axes — too cheap to matter`);
    assert.ok(share('A') < 0.10, `A appeared on ${(share('A') * 100).toFixed(1)}% of axes — no longer an achievement`);
    assert.ok(share('E') > 0.30, `E on ${(share('E') * 100).toFixed(1)}% — the low end has lost its floor`);
    assert.ok(share('E') < 0.52, `E on ${(share('E') * 100).toFixed(1)}% — most cards would read the same`);
  });

  it('separates the tiers: a Shade cannot buy an A, a Reaper often can', () => {
    const rng = makeRng(4242);
    const best = (rarity) => {
      let As = 0;
      for (let i = 0; i < 3_000; i++) {
        const stats = rollStats(rng, BUDGETS[rarity], 'Dread');
        if (STAT_NAMES.some((n) => gradeFor(stats[n]) === 'A')) As++;
      }
      return As / 3_000;
    };
    // A Shade's whole budget is 50 and its signature share is 17, so an A is
    // arithmetically out of reach. That is deliberate: the grade is the tier.
    assert.equal(best('Shade'), 0);
    const reaper = best('Reaper');
    assert.ok(reaper > 0.5, `a Reaper showed an A only ${(reaper * 100).toFixed(0)}% of the time`);
  });
});
