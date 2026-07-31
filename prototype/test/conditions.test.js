import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  NO_READING,
  cloudBand,
  precipBand,
  readHour,
  summarize,
} from '../src/conditions.js';

const DAY = {
  tempC:    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
  precipMm: new Array(24).fill(0),
  cloudPct: new Array(24).fill(50),
};

describe('reading one hour', () => {
  it('takes the hour asked for', () => {
    assert.equal(readHour(DAY, 14).tempC, 14);
  });

  it('floors a fractional hour, so a stay is placed by its midpoint', () => {
    // A stay centred at 21:40 belongs to hour 21, not 22.
    assert.equal(readHour(DAY, 21.67).tempC, 21);
  });

  it('clamps rather than throwing when the hour is out of range', () => {
    assert.equal(readHour(DAY, -3).tempC, 0);
    assert.equal(readHour(DAY, 99).tempC, 23);
  });

  it('returns nulls for a gap in the data', () => {
    const gappy = { ...DAY, tempC: [...DAY.tempC] };
    gappy.tempC[9] = null;
    assert.equal(readHour(gappy, 9).tempC, null);
    assert.equal(readHour(gappy, 9).cloudPct, 50); // the others still read
  });

  it('returns nulls rather than throwing when there is no data at all', () => {
    const r = readHour(null, 12);
    assert.deepEqual(r, { tempC: null, precipMm: null, cloudPct: null });
  });
});

describe('condition bands', () => {
  it('names cloud cover', () => {
    assert.equal(cloudBand(0), 'clear');
    assert.equal(cloudBand(30), 'partly cloudy');
    assert.equal(cloudBand(70), 'cloudy');
    assert.equal(cloudBand(100), 'overcast');
    assert.equal(cloudBand(null), null);
  });

  it('says nothing at all when it is dry', () => {
    assert.equal(precipBand(0), null);
    assert.equal(precipBand(0.05), null);
    assert.equal(precipBand(0.2), 'drizzle');
    assert.equal(precipBand(1), 'rain');
    assert.equal(precipBand(9), 'downpour');
  });
});

describe('summarising a reading', () => {
  it('reads as a person would say it', () => {
    assert.equal(
      summarize({ tempC: 3.4, cloudPct: 95, precipMm: 0.3, sunAltitude: -12 }),
      '3C, overcast, drizzle, dusk',
    );
  });

  it('leaves out what was not measured', () => {
    // The offline case: sun altitude always resolves, the rest does not.
    assert.equal(summarize({ ...NO_READING, sunAltitude: 20 }), 'daylight');
  });

  it('says unknown when nothing was measured', () => {
    assert.equal(summarize(NO_READING), 'unknown');
    assert.equal(summarize(null), 'unknown');
  });

  it('omits rain when it was dry rather than saying so', () => {
    assert.equal(
      summarize({ tempC: 18, cloudPct: 5, precipMm: 0, sunAltitude: 40 }),
      '18C, clear, daylight',
    );
  });

  it('never prints negative zero', () => {
    // Math.round(-0.4) is -0, which would read as "-0C" if it reached the
    // string unguarded. Rounding to "0C" is the honest answer.
    assert.equal(
      summarize({ tempC: -0.4, cloudPct: 100, precipMm: 3, sunAltitude: -30 }),
      '0C, overcast, downpour, night',
    );
  });

  it('keeps a genuinely freezing reading negative', () => {
    assert.equal(
      summarize({ tempC: -6.2, cloudPct: 10, precipMm: 0, sunAltitude: -30 }),
      '-6C, clear, night',
    );
  });
});
