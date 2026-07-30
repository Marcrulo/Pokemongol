#!/usr/bin/env node
/**
 * Simulate a day's walking and render the evening review.
 *
 * Stands in for the Expo tracker: builds a synthetic GPS trail at the real
 * 30-second cadence, runs it through the real dwell detector, spawner, and
 * store, and prints the review screen.
 *
 *   node simulate.js
 *   node simulate.js --steps 19000 --seed 7
 *   node simulate.js --steps 0 --verbose
 */

import { collectDay, onePerPlace } from './src/day.js';
import { GPS_INTERVAL_SECONDS, distanceM, findStays } from './src/dwell.js';
import { clock, review } from './src/render.js';
import { makeRng } from './src/rng.js';
import { MemoryStore } from './src/store.js';

const WALK_SPEED_MS = 1.4;   // metres per second, unhurried
const JITTER_DEG = 0.00012;  // ~13 m of GPS noise

/** Kollegiebakken 1, 2800 Kgs. Lyngby — geocoded via Nominatim. */
export const HOME = Object.freeze({
  label: 'Kollegiebakken 1, 2800 Kgs. Lyngby',
  lat: 55.784523,
  lon: 12.524762,
});

/**
 * A plausible day around DTU, starting at HOME.
 *
 * Coordinates and names are real, from OpenStreetMap via Nominatim
 * (data (c) OpenStreetMap contributors, ODbL). Durations are invented.
 *
 * Three things are deliberate:
 *   - Home is `building=dormitory`, which has no catalogued haunt — it must
 *     resolve and then yield nothing.
 *   - Lundtofte Bibliotek is under 5 minutes, so the dwell rule must reject it
 *     even though DTU Bibliotek that morning was accepted.
 *   - Two different pubs both qualify, so both spawn Last Orders. One haunt per
 *     *place*, not per species.
 */
export const ITINERARY = Object.freeze([
  { osmTag: 'building=dormitory', placeName: 'Kollegiebakken 1',    minutes: 22, lat: 55.784523, lon: 12.524762 },
  { osmTag: 'shop=supermarket',   placeName: 'Netto, Lundtofte',    minutes: 13, lat: 55.783756, lon: 12.524160 },
  { osmTag: 'amenity=library',    placeName: 'DTU Bibliotek',       minutes: 96, lat: 55.786904, lon: 12.523343 },
  { osmTag: 'amenity=pub',        placeName: 'Diagonalen',          minutes: 22, lat: 55.789066, lon: 12.525653 },
  { osmTag: 'shop=bakery',        placeName: 'Park Konditoriet',    minutes: 18, lat: 55.795724, lon: 12.527538 },
  { osmTag: 'leisure=park',       placeName: 'Ravnholm',            minutes: 41, lat: 55.798441, lon: 12.528154 },
  { osmTag: 'amenity=library',    placeName: 'Lundtofte Bibliotek', minutes: 3,  lat: 55.796728, lon: 12.522236 },
  { osmTag: 'amenity=parking',    placeName: 'Kollegiebakken P',    minutes: 6,  lat: 55.783819, lon: 12.523763 },
  { osmTag: 'amenity=pub',        placeName: 'Saxen',               minutes: 74, lat: 55.783055, lon: 12.523876 },
]);

/**
 * One fix every 30 seconds: standing still at each visit, walking between.
 * @returns {import('./src/dwell.js').Fix[]}
 */
export function buildTrail(itinerary, startT, rng) {
  const trail = [];
  let t = startT;
  const jitter = () => (rng.random() * 2 - 1) * JITTER_DEG;
  const emit = (lat, lon) => {
    trail.push({ t, lat: lat + jitter(), lon: lon + jitter() });
    t += GPS_INTERVAL_SECONDS;
  };

  itinerary.forEach((visit, i) => {
    const fixes = Math.floor((visit.minutes * 60) / GPS_INTERVAL_SECONDS) + 1;
    for (let k = 0; k < fixes; k++) emit(visit.lat, visit.lon);

    const next = itinerary[i + 1];
    if (!next) return;
    const metres = distanceM(visit.lat, visit.lon, next.lat, next.lon);
    const hops = Math.max(1, Math.floor(metres / (WALK_SPEED_MS * GPS_INTERVAL_SECONDS)));
    for (let h = 1; h <= hops; h++) {
      const f = h / hops;
      emit(
        visit.lat + (next.lat - visit.lat) * f,
        visit.lon + (next.lon - visit.lon) * f,
      );
    }
  });
  return trail;
}

/**
 * Stand-in for the Overpass resolver: nearest known place within 80 m.
 *
 * 80 m rather than 120 because the real DTU places are genuinely close
 * together — Netto and the Kollegiebakken car park are ~50 m apart.
 */
export function resolve(lat, lon, itinerary) {
  let best = null;
  let bestD = 80;
  for (const v of itinerary) {
    const d = distanceM(lat, lon, v.lat, v.lon);
    if (d < bestD) { best = v; bestD = d; }
  }
  return best;
}

function parseArgs(argv) {
  const opts = {
    seed: 42, steps: 12_400, weather: 'overcast, 17C',
    day: '2026-07-30', verbose: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--verbose') opts.verbose = true;
    else if (a === '--seed') opts.seed = Number(argv[++i]);
    else if (a === '--steps') opts.steps = Number(argv[++i]);
    else if (a === '--weather') opts.weather = argv[++i];
    else if (a === '--day') opts.day = argv[++i];
  }
  return opts;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const rng = makeRng(opts.seed);
  const trail = buildTrail(ITINERARY, 7 * 3600 + 45 * 60, rng);
  const stays = findStays(trail);

  if (opts.verbose) {
    const hours = ((trail.length * GPS_INTERVAL_SECONDS) / 3600).toFixed(1);
    console.log(`\nStart: ${HOME.label}  (${HOME.lat}, ${HOME.lon})`);
    console.log(`${trail.length} fixes at ${GPS_INTERVAL_SECONDS}s (${hours} h of tracking)`);
    console.log(`${stays.length} stay(s) passed the 5-minute rule:\n`);
    for (const s of stays) {
      const v = resolve(s.lat, s.lon, ITINERARY);
      const mins = String(Math.floor(s.duration / 60)).padStart(3);
      console.log(`  ${clock(s.startT)}  ${mins} min  ${String(s.fixCount).padStart(3)} fixes  ${v ? v.placeName : 'unresolved'}`);
    }
    for (const v of ITINERARY.filter((v) => v.minutes * 60 < 300)) {
      console.log(`         ${String(v.minutes).padStart(3)} min           ${v.placeName} — too brief, no haunt`);
    }
    console.log();
  }

  const catches = collectDay({
    rng,
    stays,
    resolve: (lat, lon) => resolve(lat, lon, ITINERARY),
    steps: opts.steps,
    weather: opts.weather,
  });

  const store = new MemoryStore();
  for (const c of catches) store.add(opts.day, c);

  if (opts.verbose) {
    const resolved = stays
      .map((stay) => ({ stay, place: resolve(stay.lat, stay.lon, ITINERARY) }))
      .filter((e) => e.place);
    const merged = resolved.length - onePerPlace(resolved).length;
    const noHaunt = onePerPlace(resolved).length - catches.length;
    if (merged) console.log(`  ${merged} drift fragment(s) merged — one haunt per place per day`);
    if (noHaunt) console.log(`  ${noHaunt} place(s) resolved but have no catalogued haunt`);
    if (merged || noHaunt) console.log();
  }

  const { seen, total } = store.dexProgress();
  console.log(review(opts.day, catches, opts.steps, seen, total));
  store.close();
}

if (import.meta.url === `file://${process.argv[1]}`) main();
