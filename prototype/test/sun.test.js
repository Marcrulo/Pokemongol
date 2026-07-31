import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { daylightBand, sunAltitude } from '../src/sun.js';

/** Kollegiebakken, Kgs. Lyngby — where the simulated day starts. */
const LYNGBY = { lat: 55.7845, lon: 12.5248 };

/** Sun altitude is a physical quantity, so assert against physics. */
describe('sun altitude', () => {
  it('equals the Earth’s obliquity at the north pole on midsummer', () => {
    // At the pole, declination is the only thing lifting the sun, and on the
    // solstice declination *is* the obliquity: 23.44 degrees.
    const alt = sunAltitude(90, 0, new Date('2026-06-21T12:00:00Z'));
    assert.ok(Math.abs(alt - 23.44) < 0.1, `expected ~23.44, got ${alt}`);
  });

  it('is overhead at the equator at equinox noon', () => {
    const alt = sunAltitude(0, 0, new Date('2026-03-20T12:07:00Z'));
    assert.ok(alt > 89, `expected near 90, got ${alt}`);
  });

  it('is directly underfoot twelve hours later', () => {
    const alt = sunAltitude(0, 0, new Date('2026-03-20T00:07:00Z'));
    assert.ok(alt < -89, `expected near -90, got ${alt}`);
  });

  it('matches 90 - latitude +/- obliquity at the solstices', () => {
    const summer = sunAltitude(
      LYNGBY.lat, LYNGBY.lon, new Date('2026-06-21T10:58:00Z'),
    );
    const winter = sunAltitude(
      LYNGBY.lat, LYNGBY.lon, new Date('2026-12-21T10:58:00Z'),
    );
    assert.ok(Math.abs(summer - (90 - LYNGBY.lat + 23.44)) < 0.5, `summer ${summer}`);
    assert.ok(Math.abs(winter - (90 - LYNGBY.lat - 23.44)) < 0.5, `winter ${winter}`);
    assert.ok(summer > winter);
  });

  it('is below the horizon at night in Denmark', () => {
    const alt = sunAltitude(
      LYNGBY.lat, LYNGBY.lon, new Date('2026-01-15T23:00:00Z'),
    );
    assert.ok(alt < 0, `expected night, got ${alt}`);
  });

  it('crosses zero between night and midday', () => {
    // Walk an entire day in ten-minute steps; the sign must flip exactly twice
    // — one sunrise, one sunset. Anything else means the hour angle is wrong.
    let flips = 0;
    let previous = null;
    for (let m = 0; m < 24 * 60; m += 10) {
      const at = new Date(Date.UTC(2026, 6, 31, 0, m));
      const sign = Math.sign(sunAltitude(LYNGBY.lat, LYNGBY.lon, at));
      if (previous !== null && sign !== previous) flips++;
      previous = sign;
    }
    assert.equal(flips, 2, `expected one sunrise and one sunset, saw ${flips}`);
  });

  it('stays within the range an angle above the horizon can occupy', () => {
    for (let d = 0; d < 365; d += 7) {
      const at = new Date(Date.UTC(2026, 0, 1 + d, 9, 0));
      const alt = sunAltitude(LYNGBY.lat, LYNGBY.lon, at);
      assert.ok(alt >= -90 && alt <= 90, `out of range: ${alt}`);
    }
  });
});

describe('daylight band', () => {
  it('names each band by its altitude', () => {
    assert.equal(daylightBand(12), 'daylight');
    assert.equal(daylightBand(-3), 'twilight');
    assert.equal(daylightBand(-12), 'dusk');
    assert.equal(daylightBand(-30), 'night');
  });

  it('treats the horizon itself as not yet daylight', () => {
    assert.equal(daylightBand(0), 'twilight');
    assert.equal(daylightBand(0.1), 'daylight');
  });
});
