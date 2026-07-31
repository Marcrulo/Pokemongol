/**
 * The five stats as a pentagon.
 *
 * The design doc always called for a radar; bars were a terminal-era
 * stand-in. But the reason a radar earns its place here is not the one you
 * would expect. Because the signature stat is highest on ~94% of haunts, the
 * *shape* barely discriminates — every Forest haunt leans the same way.
 *
 * What a radar shows brilliantly is **area**, and area is the points budget.
 * A Reaper encloses roughly three times a Shade. So the chart is really the
 * rarity display, and it says so without a colour, a word, or a number.
 *
 * Built from plain Views on purpose. Filling an arbitrary polygon needs SVG,
 * which is a native module and a rebuild; an unfilled hairline wireframe is
 * both free and better suited to the tone. A glowing filled blob would look
 * like a mobile RPG.
 */

import { StyleSheet, View } from 'react-native';

import { STAT_CAP, STAT_NAMES } from '../../prototype/src/spawner.js';
import { C } from './theme.js';

const SIZE = 132;
const R = SIZE / 2 - 12;
const CENTRE = SIZE / 2;
const N = STAT_NAMES.length;

/** Straight up for the first axis, then clockwise. */
const angleOf = (i) => (i * 2 * Math.PI) / N - Math.PI / 2;

const pointFor = (i, value) => {
  const r = (Math.max(0, Math.min(STAT_CAP, value)) / STAT_CAP) * R;
  return {
    x: CENTRE + r * Math.cos(angleOf(i)),
    y: CENTRE + r * Math.sin(angleOf(i)),
  };
};

/** A hairline View rotated to join two points. */
function Edge({ from, to, colour }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return (
    <View
      style={{
        position: 'absolute',
        left: from.x,
        top: from.y,
        width: Math.hypot(dx, dy),
        height: StyleSheet.hairlineWidth * 2,
        backgroundColor: colour,
        transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
        transformOrigin: 'left center',
      }}
    />
  );
}

export default function StatRadar({ stats, signature, colour }) {
  const points = STAT_NAMES.map((name, i) => pointFor(i, stats[name] ?? 0));

  return (
    <View style={s.wrap} accessibilityElementsHidden importantForAccessibility="no">
      {/* Reference rings at 100 and 50, so area has a scale to be read against. */}
      <View style={[s.ring, { width: R * 2, height: R * 2, borderRadius: R }]} />
      <View style={[s.ring, { width: R, height: R, borderRadius: R / 2 }]} />

      {STAT_NAMES.map((_, i) => (
        <Edge
          key={`spoke${i}`}
          from={{ x: CENTRE, y: CENTRE }}
          to={pointFor(i, STAT_CAP)}
          colour={C.line}
        />
      ))}

      {points.map((p, i) => (
        <Edge
          key={`edge${i}`}
          from={p}
          to={points[(i + 1) % N]}
          colour={colour}
        />
      ))}

      {points.map((p, i) => {
        const isSignature = STAT_NAMES[i] === signature;
        const d = isSignature ? 7 : 4;
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
  wrap: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
});
