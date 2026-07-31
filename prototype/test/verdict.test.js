import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ordinal, verdictFor } from '../src/verdict.js';

const c = (total, stats = {}) => ({
  total,
  stats: { Power: 0, Dread: 0, Anchor: 0, Presence: 0, Insight: 0, ...stats },
});
const none = { count: 0, bestTotal: null, worstTotal: null, bestByStat: {} };

describe('verdict', () => {
  it('marks a species never caught before', () => {
    const v = verdictFor(c(75), none);
    assert.equal(v.kind, 'first');
    assert.equal(v.badge, 'FIRST');
  });

  it('announces a new best and by how much', () => {
    const v = verdictFor(c(112), { count: 3, bestTotal: 98, worstTotal: 50, bestByStat: {} });
    assert.equal(v.kind, 'record');
    assert.equal(v.badge, 'BEST YET');
    assert.match(v.line, /by 14 points/);
  });

  it('says point, singular, when it wins by one', () => {
    const v = verdictFor(c(99), { count: 2, bestTotal: 98, worstTotal: 50, bestByStat: {} });
    assert.match(v.line, /by 1 point\./);
  });

  it('keeps a species alive after a high roll fixes the total', () => {
    // The trap: a Reaper's 150 beats every Shade forever, so ranking on total
    // alone closes a species permanently. An axis record must still land.
    const history = {
      count: 4,
      bestTotal: 150,
      worstTotal: 50,
      bestByStat: { Power: 40, Dread: 90, Anchor: 30, Presence: 20, Insight: 12 },
    };
    const v = verdictFor(c(50, { Insight: 40 }), history);
    assert.deepEqual(v.axisRecords, ['Insight']);
    assert.match(v.line, /most insight/);
  });

  it('lists several axis records readably', () => {
    const history = {
      count: 2, bestTotal: 150, worstTotal: 100,
      bestByStat: { Power: 1, Dread: 1, Anchor: 90, Presence: 90, Insight: 1 },
    };
    const v = verdictFor(c(120, { Power: 50, Dread: 40, Insight: 30 }), history);
    assert.match(v.line, /power, dread and insight/);
  });

  it('recognises a tie', () => {
    const v = verdictFor(c(98), { count: 1, bestTotal: 98, worstTotal: 98, bestByStat: {} });
    assert.equal(v.kind, 'tied');
  });

  it('is honest about a new worst', () => {
    const v = verdictFor(c(40), { count: 3, bestTotal: 120, worstTotal: 55, bestByStat: {} });
    assert.equal(v.kind, 'worst');
  });

  it('gives an ordinary repeat its position and the gap', () => {
    const v = verdictFor(c(70), { count: 5, bestTotal: 120, worstTotal: 60, bestByStat: {} });
    assert.match(v.line, /Your sixth\. The best is still 50 ahead\./);
  });

  it('never claims a record against no history', () => {
    for (const total of [0, 50, 150]) {
      assert.equal(verdictFor(c(total), none).kind, 'first');
    }
  });
});

describe('ordinals', () => {
  it('spells the small ones', () => {
    assert.equal(ordinal(1), 'first');
    assert.equal(ordinal(12), 'twelfth');
  });

  it('falls back to digits past twelve', () => {
    assert.equal(ordinal(13), '13th');
    assert.equal(ordinal(21), '21st');
    assert.equal(ordinal(22), '22nd');
    assert.equal(ordinal(23), '23rd');
    assert.equal(ordinal(111), '111th');
  });
});
