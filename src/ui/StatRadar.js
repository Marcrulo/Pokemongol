/**
 * The five stats as a filled pentagon.
 *
 * What a radar shows brilliantly is **area**, and area is the points budget.
 * A Reaper encloses roughly three times a Shade. So the chart is really the
 * rarity display, and it says so without a colour, a word, or a number.
 *
 * ## Why it is filled, when it used to be a wireframe
 *
 * The wireframe was chosen on the grounds that filling an arbitrary polygon
 * needs SVG, which is a native module and a rebuild. That is true of SVG and
 * false of the polygon: a scanline fill needs no library at all. Each 4pt band
 * of the chart is one View, its left edge and width found by intersecting the
 * band with the polygon's edges — 26 Views, no dependency, no rebuild.
 *
 * The even-odd pairing matters, and not just in theory. A band can meet four
 * edges rather than two whenever a low axis sits between two high ones — a
 * search over the roll space finds it on ordinary spreads, not just contrived
 * ones. Sorting the crossings and filling between alternate pairs is correct
 * for any simple polygon. Taking min and max instead floods the notch: on
 * (1, 29, 100, 89, 22) it over-paints by 3%, and on (0, 20, 0, 0, 20) — a
 * shape with no interior at all — it paints a solid wedge out of nothing.
 *
 * Against the shoelace area the bands land within 0.5% on every realistic
 * roll; the residue is 4pt quantisation, not error.
 *
 * The grid rings are pentagons rather than circles now, because a polygonal
 * grid is what the chart this borrows from uses, and a ring the same shape as
 * the plot makes the fraction of full easier to judge.
 */

import { StyleSheet, View } from 'react-native';

import { STAT_CAP, STAT_NAMES } from '../../prototype/src/spawner.js';
import { C, FILL_OPACITY, GRID } from './theme.js';

/**
 * Sized so the whole labelled chart clears a 360dp screen alongside the
 * artwork: 104 here plus two 48pt label gutters is 200, against 320 of card
 * with a 146pt sprite anchored to its right. The overlap is deliberate and the
 * scrim in `HauntCard` handles it.
 */
export const RADAR_SIZE = 104;
export const RADAR_R = RADAR_SIZE / 2 - 8;
export const RADAR_CENTRE = RADAR_SIZE / 2;
const N = STAT_NAMES.length;

/**
 * Grid rings, as a fraction of full. Three reads as a scale; two read as noise.
 * The outermost is the plot's frame and is drawn brighter than the two inside
 * it — see `GRID` in the theme for the measured tiers.
 */
const RINGS = [
  { scale: 1, colour: GRID.edge },
  { scale: 0.66, colour: GRID.rings },
  { scale: 0.33, colour: GRID.rings },
];

/** Height of one fill band. Four is under the eye's threshold for banding. */
const BAND = 4;

/** Straight up for the first axis, then clockwise. */
export const angleOf = (i) => (i * 2 * Math.PI) / N - Math.PI / 2;

/**
 * Where axis `i` sits at `value`, in the radar's own coordinates.
 * @param {number} i
 * @param {number} value  0-100
 */
export const pointFor = (i, value) => {
  const r = (Math.max(0, Math.min(STAT_CAP, value)) / STAT_CAP) * RADAR_R;
  return {
    x: RADAR_CENTRE + r * Math.cos(angleOf(i)),
    y: RADAR_CENTRE + r * Math.sin(angleOf(i)),
  };
};

/**
 * Horizontal spans covering the polygon, one set per band.
 *
 * @param {{x: number, y: number}[]} points
 * @returns {{y: number, x: number, w: number}[]}
 */
export function fillBands(points) {
  const bands = [];
  for (let y = 0; y < RADAR_SIZE; y += BAND) {
    const mid = y + BAND / 2;
    const crossings = [];
    for (let i = 0; i < N; i++) {
      const a = points[i];
      const b = points[(i + 1) % N];
      // Half-open on purpose: a vertex sitting exactly on the band counts once,
      // so the crossings stay even and the pairing below cannot slip.
      if ((a.y <= mid && b.y > mid) || (b.y <= mid && a.y > mid)) {
        crossings.push(a.x + ((mid - a.y) / (b.y - a.y)) * (b.x - a.x));
      }
    }
    crossings.sort((p, q) => p - q);
    for (let k = 0; k + 1 < crossings.length; k += 2) {
      const w = crossings[k + 1] - crossings[k];
      if (w > 0.5) bands.push({ y, x: crossings[k], w });
    }
  }
  return bands;
}

/** A hairline View rotated to join two points. */
function Edge({ from, to, colour, weight = StyleSheet.hairlineWidth * 2 }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return (
    <View
      style={{
        position: 'absolute',
        left: from.x,
        top: from.y,
        width: Math.hypot(dx, dy),
        height: weight,
        backgroundColor: colour,
        transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
        transformOrigin: 'left center',
      }}
    />
  );
}

/** One pentagon of the background grid. */
function Ring({ scale, colour }) {
  const pts = STAT_NAMES.map((_, i) => pointFor(i, STAT_CAP * scale));
  return pts.map((p, i) => (
    <Edge key={`r${scale}-${i}`} from={p} to={pts[(i + 1) % N]} colour={colour} />
  ));
}

export default function StatRadar({ stats, signature, colour }) {
  const points = STAT_NAMES.map((name, i) => pointFor(i, stats[name] ?? 0));
  const bands = fillBands(points);

  return (
    <View style={s.wrap} accessibilityElementsHidden importantForAccessibility="no">
      {RINGS.map((ring) => (
        <Ring key={`ring${ring.scale}`} scale={ring.scale} colour={ring.colour} />
      ))}

      {STAT_NAMES.map((_, i) => (
        <Edge
          key={`spoke${i}`}
          from={{ x: RADAR_CENTRE, y: RADAR_CENTRE }}
          to={pointFor(i, STAT_CAP)}
          colour={GRID.spokes}
        />
      ))}

      {/* Fill first, so the outline and the dots stay crisp on top of it. */}
      {bands.map((b, i) => (
        <View
          key={`band${i}`}
          style={{
            position: 'absolute',
            left: b.x,
            top: b.y,
            width: b.w,
            height: BAND,
            backgroundColor: colour,
            opacity: FILL_OPACITY,
          }}
        />
      ))}

      {points.map((p, i) => (
        <Edge
          key={`edge${i}`}
          from={p}
          to={points[(i + 1) % N]}
          colour={colour}
          weight={2}
        />
      ))}

      {points.map((p, i) => {
        const isSignature = STAT_NAMES[i] === signature;
        const d = isSignature ? 6 : 3.5;
        return (
          <View
            key={`dot${i}`}
            style={{
              position: 'absolute',
              left: p.x - d / 2,
              top: p.y - d / 2,
              width: d,
              height: d,
              borderRadius: d / 2,
              backgroundColor: isSignature ? colour : C.dim,
            }}
          />
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    width: RADAR_SIZE,
    height: RADAR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
