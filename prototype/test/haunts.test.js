/** Tests for the domain rules. Run: npm test */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { collectDay, onePerPlace } from '../src/day.js';
import { findStays, distanceM } from '../src/dwell.js';
import { INNER, card } from '../src/render.js';
import { makeRng, seedFrom } from '../src/rng.js';
import {
  BUDGETS, RARITIES, STAT_CAP, STAT_NAMES,
  rarityWeights, rollRarity, rollStats, spawn,
} from '../src/spawner.js';
import { CATALOG, TYPES, forTag } from '../src/species.js';
import { MemoryStore } from '../src/store.js';

const LAT = 55.9533;
const LON = -3.1883;

/** A trail standing perfectly still, one fix every 30 s. */
function still(minutes, start = 0, lat = LAT, lon = LON) {
  const n = Math.floor((minutes * 60) / 30) + 1;
  return Array.from({ length: n }, (_, i) => ({ t: start + i * 30, lat, lon }));
}

const aStay = () => findStays(still(25))[0];

describe('catalog', () => {
  it('has thirty species', () => {
    assert.equal(CATALOG.length, 30);
  });

  it('has unique ids and tags', () => {
    assert.equal(new Set(CATALOG.map((s) => s.id)).size, 30);
    assert.equal(new Set(CATALOG.map((s) => s.osmTag)).size, 30);
  });

  it('only uses declared types', () => {
    for (const s of CATALOG) assert.ok(TYPES.includes(s.type), s.name);
  });

  it('looks up by tag', () => {
    assert.equal(forTag('shop=supermarket').id, 'aisle_seven');
    assert.equal(forTag('amenity=nightclub'), null); // not catalogued yet
  });
});

describe('the 5-minute dwell rule', () => {
  it('accepts exactly five minutes', () => {
    assert.equal(findStays(still(5)).length, 1);
  });

  it('rejects just under five minutes', () => {
    assert.deepEqual(findStays(still(5).slice(0, -1)), []); // 4m30s
  });

  it('rejects a three-minute visit', () => {
    assert.deepEqual(findStays(still(3)), []);
  });

  it('never turns walking past into a stay', () => {
    const trail = Array.from({ length: 120 }, (_, i) => ({
      t: i * 30, lat: LAT + i * 0.0004, lon: LON,
    }));
    assert.deepEqual(findStays(trail), []);
  });

  it('tolerates GPS jitter while standing still', () => {
    const rng = makeRng(1);
    const trail = Array.from({ length: 40 }, (_, i) => ({
      t: i * 30,
      lat: LAT + (rng.random() * 2 - 1) * 0.00012,
      lon: LON + (rng.random() * 2 - 1) * 0.00012,
    }));
    assert.equal(findStays(trail).length, 1);
  });

  it('separates two distant stays', () => {
    const trail = [...still(10, 0), ...still(10, 3600, LAT + 0.01)];
    assert.equal(findStays(trail).length, 2);
  });

  it('handles an empty trail', () => {
    assert.deepEqual(findStays([]), []);
  });

  it('sorts an out-of-order trail', () => {
    assert.equal(findStays([...still(10)].reverse()).length, 1);
  });

  it('measures distance sanely', () => {
    // 0.001 degrees of latitude is about 111 m
    assert.ok(Math.abs(distanceM(LAT, LON, LAT + 0.001, LON) - 111) < 2);
  });
});

describe('rarity', () => {
  it('always sums to one', () => {
    for (const steps of [0, 5_000, 12_400, 20_000, 60_000]) {
      const sum = Object.values(rarityWeights(steps)).reduce((a, w) => a + w, 0);
      assert.ok(Math.abs(sum - 1) < 1e-9, `${steps}: ${sum}`);
    }
  });

  it('is never negative', () => {
    for (const steps of [0, 20_000, 1e6]) {
      for (const [r, w] of Object.entries(rarityWeights(steps))) {
        assert.ok(w >= 0, `${r} at ${steps} steps: ${w}`);
      }
    }
  });

  it('improves with walking', () => {
    const lazy = rarityWeights(0);
    const keen = rarityWeights(20_000);
    assert.ok(keen.Common < lazy.Common);
    assert.ok(keen.Rare > lazy.Rare);
    assert.ok(keen.Mythic > lazy.Mythic);
  });

  it('saturates at 20k steps', () => {
    assert.deepEqual(rarityWeights(20_000), rarityWeights(99_000));
  });

  it('samples in proportion to its weights', () => {
    // The bug this catches: a sampler that silently favours one tier.
    const rng = makeRng(0);
    const steps = 12_400;
    const n = 40_000;
    const counts = Object.fromEntries(RARITIES.map((r) => [r, 0]));
    for (let i = 0; i < n; i++) counts[rollRarity(rng, steps)] += 1;
    const expected = rarityWeights(steps);
    for (const r of RARITIES) {
      const got = counts[r] / n;
      assert.ok(Math.abs(got - expected[r]) < 0.01,
        `${r}: got ${got.toFixed(3)}, want ${expected[r].toFixed(3)}`);
    }
  });

  it('is mostly Common on a lazy day', () => {
    const rng = makeRng(3);
    let common = 0;
    for (let i = 0; i < 5_000; i++) if (rollRarity(rng, 0) === 'Common') common++;
    assert.ok(common / 5_000 > 0.65);
  });
});

describe('stats', () => {
  it('always totals the rarity budget exactly', () => {
    const rng = makeRng(0);
    for (const [rarity, budget] of Object.entries(BUDGETS)) {
      for (let i = 0; i < 500; i++) {
        const stats = rollStats(rng, budget);
        const total = Object.values(stats).reduce((a, v) => a + v, 0);
        assert.equal(total, budget, rarity);
      }
    }
  });

  it('has the six named axes', () => {
    assert.deepEqual(Object.keys(rollStats(makeRng(0), 200)), [...STAT_NAMES]);
    assert.equal(STAT_NAMES.length, 6);
  });

  it('keeps every value within bounds', () => {
    const rng = makeRng(0);
    for (let i = 0; i < 2_000; i++) {
      for (const v of Object.values(rollStats(rng, 420))) {
        assert.ok(v >= 0 && v <= STAT_CAP, String(v));
        assert.ok(Number.isInteger(v), String(v));
      }
    }
  });

  it('favours no axis', () => {
    const rng = makeRng(0);
    const n = 20_000;
    const sums = Object.fromEntries(STAT_NAMES.map((k) => [k, 0]));
    for (let i = 0; i < n; i++) {
      for (const [k, v] of Object.entries(rollStats(rng, 300))) sums[k] += v;
    }
    const means = STAT_NAMES.map((k) => sums[k] / n);
    assert.ok(Math.max(...means) - Math.min(...means) < 2, JSON.stringify(means));
  });

  it('varies between rolls', () => {
    const rng = makeRng(0);
    const seen = new Set();
    for (let i = 0; i < 50; i++) {
      seen.add(Object.values(rollStats(rng, 200)).join(','));
    }
    assert.ok(seen.size > 45, `only ${seen.size} distinct`);
  });

  it('rejects a budget above the cap', () => {
    assert.throws(() => rollStats(makeRng(0), 601), RangeError);
  });

  it('fills every axis at the maximum budget', () => {
    const stats = rollStats(makeRng(0), 600);
    assert.ok(Object.values(stats).every((v) => v === STAT_CAP));
  });
});

describe('spawner', () => {
  it('spawns the species matching the place', () => {
    const c = spawn(makeRng(0), aStay(), 'shop=supermarket', 'FreshCo', 9_000);
    assert.equal(c.speciesId, 'aisle_seven');
    assert.equal(c.total, BUDGETS[c.rarity]);
  });

  it('yields nothing for an uncatalogued place', () => {
    assert.equal(
      spawn(makeRng(0), aStay(), 'amenity=nightclub', 'Bassline', 9_000), null);
  });

  it('is reproducible for a given seed', () => {
    const a = spawn(makeRng(11), aStay(), 'amenity=pub', 'The Billet', 9_000);
    const b = spawn(makeRng(11), aStay(), 'amenity=pub', 'The Billet', 9_000);
    assert.deepEqual(a, b);
  });

  it('records dwell time and weather', () => {
    const c = spawn(makeRng(0), aStay(), 'shop=laundry', 'Suds', 100, 'fog');
    assert.equal(c.weather, 'fog');
    assert.ok(c.dwellSeconds >= 300);
  });
});

describe('one haunt per place per day', () => {
  const park = { osmTag: 'leisure=park', placeName: 'Victoria Park' };
  const pub = { osmTag: 'amenity=pub', placeName: 'The Crooked Billet' };
  const entry = (place, startT, duration) => ({
    place, stay: { startT, endT: startT + duration, duration, lat: 0, lon: 0, fixCount: 2 },
  });

  it('keeps only the longest stay at a repeated place', () => {
    const kept = onePerPlace([
      entry(park, 1000, 300),   // drift fragment
      entry(park, 1400, 2100),  // the real visit
    ]);
    assert.equal(kept.length, 1);
    assert.equal(kept[0].stay.duration, 2100);
  });

  it('keeps distinct places separate', () => {
    assert.equal(onePerPlace([entry(park, 0, 600), entry(pub, 5000, 600)]).length, 2);
  });

  it('returns places in arrival order', () => {
    const kept = onePerPlace([entry(pub, 9000, 600), entry(park, 1000, 600)]);
    assert.deepEqual(kept.map((e) => e.place.placeName),
      ['Victoria Park', 'The Crooked Billet']);
  });

  it('collapses a split visit into a single catch', () => {
    // The drift case, realistically: the park, a spell elsewhere, the park
    // again. Three qualifying stays, two of which are the same place.
    const FAR = LAT + 0.01;
    const trail = [
      ...still(6, 0, LAT),        // park, brief
      ...still(10, 1000, FAR),    // somewhere else
      ...still(40, 3000, LAT),    // park again, the real visit
    ];
    const stays = findStays(trail);
    assert.equal(stays.length, 3, 'three stays should be detected');

    const catches = collectDay({
      rng: makeRng(4),
      stays,
      resolve: (lat) => (lat > LAT + 0.005 ? pub : park),
      steps: 9_000,
    });
    assert.equal(catches.length, 2, 'park twice becomes one haunt');
    const parkCatch = catches.find((c) => c.speciesId === 'unmown_corner');
    assert.equal(parkCatch.dwellSeconds, 2400, 'should keep the 40-minute visit');
  });

  it('drops stays that resolve nowhere', () => {
    assert.deepEqual(
      collectDay({ rng: makeRng(0), stays: findStays(still(10)), resolve: () => null, steps: 9_000 }),
      []);
  });

  it('drops places with no catalogued haunt', () => {
    assert.deepEqual(
      collectDay({
        rng: makeRng(0),
        stays: findStays(still(10)),
        resolve: () => ({ osmTag: 'amenity=nightclub', placeName: 'Bassline' }),
        steps: 9_000,
      }),
      []);
  });

  it('handles a day with no stays', () => {
    assert.deepEqual(
      collectDay({ rng: makeRng(0), stays: [], resolve: () => park, steps: 9_000 }), []);
  });
});

describe('seeding', () => {
  it('derives the same seed from the same parts', () => {
    assert.equal(seedFrom('2026-07-30', 'aisle_seven', 23400),
      seedFrom('2026-07-30', 'aisle_seven', 23400));
  });

  it('derives different seeds from different parts', () => {
    assert.notEqual(seedFrom('2026-07-30', 'aisle_seven'),
      seedFrom('2026-07-31', 'aisle_seven'));
  });
});

describe('store', () => {
  it('round-trips a catch', () => {
    const store = new MemoryStore();
    const c = spawn(makeRng(0), aStay(), 'amenity=cafe', 'Bean There', 9_000);
    store.add('2026-07-30', c);
    const rows = store.forDay('2026-07-30');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].speciesId, 'third_flat_white');
    assert.equal(rows[0].total, c.total);
  });

  it('isolates days', () => {
    const store = new MemoryStore();
    store.add('2026-07-30',
      spawn(makeRng(0), aStay(), 'amenity=cafe', 'Bean There', 9_000));
    assert.deepEqual(store.forDay('2026-07-31'), []);
  });

  it('picks the highest total for a species', () => {
    const store = new MemoryStore();
    const rng = makeRng(5);
    const totals = [];
    for (let i = 0; i < 15; i++) {
      const c = spawn(rng, aStay(), 'amenity=pub', 'The Billet', 20_000);
      store.add('2026-07-30', c);
      totals.push(c.total);
    }
    assert.equal(store.bestOfSpecies('last_orders').total, Math.max(...totals));
  });

  it('returns null for an unseen species', () => {
    assert.equal(new MemoryStore().bestOfSpecies('cone_lord'), null);
  });

  it('counts distinct species in the dex', () => {
    const store = new MemoryStore();
    const rng = makeRng(0);
    for (const tag of ['amenity=pub', 'amenity=pub', 'amenity=cafe']) {
      store.add('2026-07-30', spawn(rng, aStay(), tag, 'x', 9_000));
    }
    assert.deepEqual(store.dexProgress(), { seen: 2, total: 30 });
  });
});

describe('render', () => {
  it('draws every card at a uniform width', () => {
    const rng = makeRng(2);
    for (const s of CATALOG) {
      const c = spawn(rng, aStay(), s.osmTag,
        'A Place With A Very Long Name Indeed', 20_000);
      const widths = new Set(card(c).split('\n').map((l) => l.length));
      assert.deepEqual([...widths], [INNER + 2], `${s.name}: ${[...widths]}`);
    }
  });
});
