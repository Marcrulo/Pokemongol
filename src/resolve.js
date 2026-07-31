/**
 * Coordinates → an OpenStreetMap place, via Overpass.
 *
 * The one part of the app that touches the network, and it is read-only: a
 * coordinate goes out, tags come back. No user data, no account, no key.
 * Answers are cached per ~11 m cell, so a place you visit daily is looked up
 * once, ever.
 *
 * Map data © OpenStreetMap contributors, ODbL.
 */

import { forTag } from '../prototype/src/species.js';
import { typeForTag } from '../prototype/src/types.js';
import { cachePlace, cachedPlace } from './db.js';

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

/** Wide enough to catch the building you are standing in, tight enough to mean it. */
const SEARCH_RADIUS_M = 60;

const query = (lat, lon) => `[out:json][timeout:25];
nwr(around:${SEARCH_RADIUS_M},${lat},${lon});
out tags center 60;`;

/**
 * Score a candidate. A place with a species beats one that merely has a type,
 * and a named place beats an anonymous one — "Netto" reads better than
 * "Supermarket".
 */
function score(osmTag, tags) {
  if (!typeForTag(osmTag)) return -1;
  return (forTag(osmTag) ? 10 : 1) + (nameOf(tags) ? 2 : 0);
}

/**
 * Tags whose raw value reads badly on a card. `amenity=parking` becoming
 * "Parking" is technically correct and says nothing; "The car park" at least
 * sounds like somewhere you stood.
 */
const LABELS = Object.freeze({
  'amenity=parking': 'The car park',
  'amenity=place_of_worship': 'The church',
  'amenity=grave_yard': 'The churchyard',
  'landuse=cemetery': 'The cemetery',
  'highway=bus_stop': 'The bus stop',
  'natural=water': 'The water',
  'natural=wood': 'The woods',
  'landuse=forest': 'The woods',
  'leisure=park': 'The park',
  'natural=tree': 'A tree',
  'bridge=yes': 'The bridge',
  'landuse=construction': 'The building site',
  'landuse=allotments': 'The allotments',
  'waterway=stream': 'The stream',
  'waterway=river': 'The river',
});

/** Turn `shop=butcher` into something a person would read. */
function prettify(osmTag) {
  if (LABELS[osmTag]) return LABELS[osmTag];
  return osmTag
    .split('=')[1]
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());
}

/**
 * The best name available. Many real features carry no `name` at all but do
 * carry an operator or a brand, which reads far better than the tag: "Netto"
 * rather than "Supermarket".
 */
const nameOf = (tags) =>
  tags.name ?? tags['name:en'] ?? tags.brand ?? tags.operator ?? null;

/** @returns {{osmTag: string, placeName: string}|null} */
function pickBest(elements) {
  let best = null;
  let bestScore = 0;
  for (const el of elements) {
    const tags = el.tags ?? {};
    for (const [k, v] of Object.entries(tags)) {
      const osmTag = `${k}=${v}`;
      const s = score(osmTag, tags);
      if (s > bestScore) {
        bestScore = s;
        best = { osmTag, placeName: nameOf(tags) ?? prettify(osmTag) };
      }
    }
  }
  return best;
}

async function askOverpass(lat, lon) {
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: query(lat, lon),
      });
      if (!res.ok) continue;
      const json = await res.json();
      return pickBest(json.elements ?? []);
    } catch {
      // try the next mirror
    }
  }
  throw new Error('no Overpass mirror answered');
}

/**
 * @returns {Promise<{osmTag: string, placeName: string}|null>} null means the
 *   spot is genuinely nothing — a dormitory, a field with no tags.
 * @throws if the lookup could not be made at all, so the caller can leave the
 *   day uncollected and retry rather than record an empty one.
 */
export async function resolvePlace(lat, lon) {
  const hit = await cachedPlace(lat, lon);
  if (hit !== undefined) return hit;

  const place = await askOverpass(lat, lon);
  await cachePlace(lat, lon, place);
  return place;
}
