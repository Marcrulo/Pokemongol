/**
 * Turn a GPS trail into stays.
 *
 * A haunt only attaches if you stay within the same area for at least 5
 * minutes. This module is the whole of that rule.
 *
 * Imports unchanged into React Native — no platform APIs here.
 *
 * @typedef {Object} Fix    One GPS reading.
 * @property {number} t     seconds since midnight
 * @property {number} lat
 * @property {number} lon
 *
 * @typedef {Object} Stay   A place you lingered long enough to be noticed.
 * @property {number} startT
 * @property {number} endT
 * @property {number} lat
 * @property {number} lon
 * @property {number} fixCount
 * @property {number} duration  seconds
 */

/** Matches expo-location `timeInterval: 30000`. */
export const GPS_INTERVAL_SECONDS = 30;
export const MIN_DWELL_SECONDS = 300; // 5 minutes
/** Absorbs GPS jitter without merging adjacent shops. */
export const CLUSTER_RADIUS_M = 50;

/**
 * How long the trail may go quiet before a cluster is closed.
 *
 * Silence is missing evidence, not proof you stayed. Android delivers
 * locations in bursts and then not at all for minutes at a time, and without
 * this a fix at 22:55 and another at 23:12 from the same desk read as one
 * continuous nineteen-minute visit — seventeen minutes of which nobody
 * observed. That inflates dwell times and hands out haunts for time you may
 * not have spent there.
 *
 * Four missed intervals is the threshold: generous enough to ride out a
 * dropped fix or a brief tunnel, tight enough that a real absence breaks the
 * stay.
 */
export const MAX_GAP_SECONDS = 4 * GPS_INTERVAL_SECONDS;
const EARTH_RADIUS_M = 6_371_000;

const toRad = (d) => (d * Math.PI) / 180;

/**
 * Great-circle distance in metres.
 * @returns {number}
 */
export function distanceM(aLat, aLon, bLat, bLon) {
  const p1 = toRad(aLat);
  const p2 = toRad(bLat);
  const dp = p2 - p1;
  const dl = toRad(bLon - aLon);
  const h =
    Math.sin(dp / 2) ** 2 +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(Math.min(1, h)));
}

/**
 * Group consecutive fixes into clusters; keep the ones that lasted.
 *
 * A cluster grows while each new fix is within `radiusM` of the cluster's
 * anchor (its first fix). The anchor is deliberately not re-centred as the
 * cluster grows — that would let a slow walk drift indefinitely and register as
 * a stay.
 *
 * A cluster also ends when the trail goes quiet for longer than `maxGapS`,
 * because an unobserved stretch is not evidence of presence.
 *
 * Duration is measured first fix to last, so at a 30-second cadence a 5-minute
 * stay needs 11 fixes, not 10.
 *
 * @param {Fix[]} trail
 * @param {number} [radiusM]
 * @param {number} [minDwellS]
 * @param {number} [maxGapS]
 * @returns {Stay[]}
 */
export function findStays(
  trail,
  radiusM = CLUSTER_RADIUS_M,
  minDwellS = MIN_DWELL_SECONDS,
  maxGapS = MAX_GAP_SECONDS,
) {
  if (!trail || trail.length === 0) return [];

  const sorted = [...trail].sort((a, b) => a.t - b.t);
  /** @type {Stay[]} */
  const stays = [];
  let cluster = [sorted[0]];

  const closeCluster = () => {
    if (cluster.length < 2) return;
    const duration = cluster[cluster.length - 1].t - cluster[0].t;
    if (duration < minDwellS) return;
    const n = cluster.length;
    stays.push({
      startT: cluster[0].t,
      endT: cluster[n - 1].t,
      lat: cluster.reduce((a, f) => a + f.lat, 0) / n,
      lon: cluster.reduce((a, f) => a + f.lon, 0) / n,
      fixCount: n,
      duration,
    });
  };

  for (const fix of sorted.slice(1)) {
    const anchor = cluster[0];
    const previous = cluster[cluster.length - 1];
    const nearby = distanceM(anchor.lat, anchor.lon, fix.lat, fix.lon) <= radiusM;
    const continuous = fix.t - previous.t <= maxGapS;

    if (nearby && continuous) {
      cluster.push(fix);
    } else {
      closeCluster();
      cluster = [fix];
    }
  }
  closeCluster();
  return stays;
}
