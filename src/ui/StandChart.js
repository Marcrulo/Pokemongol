/**
 * The stat block, drawn the way a Stand chart is drawn.
 *
 * A wireframe polygon with the axis name and a letter grade sitting just
 * outside each vertex. The polygon carries the magnitude, the letters carry
 * the reading — and having both means the card survives being glanced at,
 * which the radar alone did not: a Wraith and a Revenant enclose visibly
 * different areas only when they are side by side.
 *
 * Everything is absolutely positioned against the same geometry the polygon
 * uses, so a label always lands on its own axis.
 *
 * The five axes, first straight up then clockwise:
 *
 *              Power
 *      Insight   ·   Dread
 *        Presence  Anchor
 */

import { StyleSheet, Text, View } from 'react-native';

import { gradeFor } from '../../prototype/src/grade.js';
import { STAT_NAMES } from '../../prototype/src/spawner.js';
import StatRadar, { RADAR_SIZE, pointFor } from './StatRadar.js';
import { C } from './theme.js';

/** Room either side of the polygon for a label block. */
const GUTTER = 48;
/**
 * Vertical padding is asymmetric because the pentagon is. The top vertex needs
 * a whole label block stacked above it; the bottom two sit well inside the
 * polygon's own box and their labels are centred on them, so almost nothing is
 * needed underneath. Padding both ends to the top's requirement left a visible
 * hole below the chart.
 */
const PAD_TOP = 28;
const PAD_BOTTOM = 2;
/** How far a label stands off its vertex, along the axis. */
const STANDOFF = 9;

/** 44pt is exactly what "PRESENCE" needs at 8pt with 0.8 of tracking. */
const LABEL_W = GUTTER - 4;
const LABEL_H = 26;

export const CHART_W = RADAR_SIZE + GUTTER * 2;
export const CHART_H = RADAR_SIZE + PAD_TOP + PAD_BOTTOM;

/**
 * Where a label block sits, and how its text lines up.
 *
 * A pentagon puts one vertex at the top and two down each side, so there are
 * only three cases. Side labels are pushed out horizontally and centred on
 * their vertex; the top one is centred over it and pushed up.
 *
 * @param {number} i  axis index
 * @returns {object}  absolute-position style
 */
function placementFor(i) {
  // The vertex at full extent, moved into the wrapper's coordinates.
  const p = pointFor(i, 100);
  const x = p.x + GUTTER;
  const y = p.y + PAD_TOP;

  if (i === 0) {
    return {
      left: x - LABEL_W / 2,
      top: y - STANDOFF - LABEL_H,
      width: LABEL_W,
      alignItems: 'center',
    };
  }
  const onTheRight = i === 1 || i === 2;
  return {
    left: onTheRight ? x + STANDOFF : x - STANDOFF - LABEL_W,
    top: y - LABEL_H / 2,
    width: LABEL_W,
    alignItems: onTheRight ? 'flex-start' : 'flex-end',
  };
}

export default function StandChart({ stats, signature, colour, style }) {
  return (
    <View
      style={[s.wrap, style]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <View style={s.radar}>
        <StatRadar stats={stats} signature={signature} colour={colour} />
      </View>

      {STAT_NAMES.map((name, i) => {
        const isSignature = name === signature;
        return (
          <View key={name} style={[s.label, placementFor(i)]}>
            <Text
              style={[s.axis, isSignature && { color: colour }]}
              numberOfLines={1}
            >
              {name.toUpperCase()}
            </Text>
            <Text
              style={[
                s.grade,
                isSignature && { color: colour, fontWeight: '700' },
              ]}
            >
              {gradeFor(stats[name] ?? 0)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { width: CHART_W, height: CHART_H },
  radar: { position: 'absolute', left: GUTTER, top: PAD_TOP },
  label: { position: 'absolute', height: LABEL_H, justifyContent: 'center' },
  /**
   * 7.5 rather than 8: "PRESENCE" is the longest axis name and at 8pt it filled
   * the label box exactly, leaving nothing for a font that measures differently
   * than assumed. It is clipped to one line so a bad measurement can only cost
   * a few letters, never the chart's alignment.
   */
  axis: { color: C.dim, fontSize: 7.5, letterSpacing: 0.5 },
  /**
   * Serif, because the letter is the one piece of the card that is supposed to
   * feel stamped rather than printed. It is also the largest thing in the
   * chart on purpose — the grade is the reading, the polygon is the evidence.
   */
  grade: {
    color: C.text,
    fontSize: 18,
    lineHeight: 21,
    fontFamily: 'serif',
    fontWeight: '600',
  },
});
