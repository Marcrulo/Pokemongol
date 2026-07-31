import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  GPS_INTERVAL_SECONDS,
  MAX_GAP_SECONDS,
  findStays,
} from '../src/dwell.js';

const DESK = { lat: 55.78006, lon: 12.52283 };

/** A run of fixes at one spot, every 30 s, starting at `from`. */
const sit = (from, count, place = DESK) =>
  Array.from({ length: count }, (_, i) => ({
    t: from + i * GPS_INTERVAL_SECONDS,
    lat: place.lat,
    lon: place.lon,
  }));

describe('a gap in the trail ends a stay', () => {
  it('keeps an unbroken visit whole', () => {
    const stays = findStays(sit(0, 21)); // 10 minutes, no gaps
    assert.equal(stays.length, 1);
    assert.equal(stays[0].duration, 600);
  });

  it('does not count time nobody observed', () => {
    // This is the real case: fixes at 22:55, silence until 23:12, then more.
    // Before the gap rule this read as one 19-minute stay, 17 minutes of which
    // was a hole, and it handed out a haunt for time possibly not spent there.
    const trail = [...sit(0, 11), ...sit(1200, 11)];
    const stays = findStays(trail);
    assert.equal(stays.length, 2);
    for (const stay of stays) assert.equal(stay.duration, 300);
  });

  it('tolerates a few dropped fixes without splitting', () => {
    // Two missed intervals is a flaky provider, not an absence.
    const trail = [
      ...sit(0, 6),
      ...sit(5 * GPS_INTERVAL_SECONDS + 2 * GPS_INTERVAL_SECONDS, 6),
    ];
    const stays = findStays(trail);
    assert.equal(stays.length, 1);
  });

  it('splits exactly at the threshold', () => {
    const withinLimit = [...sit(0, 11), ...sit(300 + MAX_GAP_SECONDS, 11)];
    assert.equal(findStays(withinLimit).length, 1);

    const overLimit = [...sit(0, 11), ...sit(300 + MAX_GAP_SECONDS + 1, 11)];
    assert.equal(findStays(overLimit).length, 2);
  });

  it('drops a fragment too short to qualify on its own', () => {
    // A long visit, a real absence, then a two-minute return: only the first
    // half is a stay.
    const trail = [...sit(0, 21), ...sit(2000, 5)];
    const stays = findStays(trail);
    assert.equal(stays.length, 1);
    assert.equal(stays[0].startT, 0);
  });

  it('is configurable, so the simulation can relax it', () => {
    const trail = [...sit(0, 11), ...sit(1200, 11)];
    assert.equal(findStays(trail, 50, 300, 99_999).length, 1);
  });
});
