/**
 * The artwork panel — the right-hand column of the card.
 *
 * The figure is the ground the chart is laid over, not a thumbnail sitting
 * beside it. That is the composition being borrowed.
 *
 * ## Why `contain` over a transparent panel, and not `cover`
 *
 * The first pass cropped art to fill a tall portrait frame. The real sprites
 * turned out to be square, transparent, and *landscape* once trimmed — every
 * one of the seven examples is wider than it is tall. Cropping those to a
 * portrait would cut the vines off both sides of every haunt.
 *
 * So the panel keeps the art's own aspect and lets it float on the card
 * instead of boxing it — the figure is cut out, not framed, which is how the
 * source material treats it too.
 *
 * Nothing is drawn behind the figure. A type-coloured aura sat there for a
 * while; it gave the cut-out a ground and doubled as the placeholder's
 * backdrop, but against real artwork it read as a halo the sprite had not
 * asked for. The placeholder's monogram now stands on its own.
 *
 * Scale consistency is handled before the file ever gets here, by
 * `tools/prep-sprites.py`. Trusting the raw canvas would have rendered one of
 * the examples at 2.7x the size of another, since each drawing carries its own
 * margin.
 *
 * The placeholder is deliberately not a "missing image" box. A grey square
 * with a broken-file glyph would make every unillustrated card look defective;
 * a monogram in the type's colour looks like a choice and keeps the type
 * legible at a glance.
 */

import { Image, StyleSheet, Text, View } from 'react-native';

import { C, TYPE_COLOR, alpha } from './theme.js';
import { spriteFor } from './sprites.js';

/**
 * Wide enough to read as the subject of the card rather than an inset. The art
 * is drawn `contain` at 100% of this, so the column's width *is* the figure's
 * size — there is no separate scale to tune.
 */
export const SPRITE_W = 164;

/** How much of the artwork's inner edge is faded back into the card. */
const SCRIM_W = 88;

/** Words that carry no identity, so the monogram skips them. */
const NOISE = new Set(['the', 'of', 'a', 'an', 'and', 'that', 'for', 'is', 'in', 'to']);

/**
 * Two letters that stand for the name.
 * "The Spirit of Aisle Seven" → SA; "Half A Wall" → HW.
 * @param {string} name
 */
export function monogram(name) {
  const words = name
    .split(/[\s'’-]+/)
    .filter((w) => /[a-z]/i.test(w) && !NOISE.has(w.toLowerCase()));
  const source = words.length > 0 ? words : name.split(/\s+/);
  return source
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

/**
 * @param {object} props
 * @param {object} props.species
 * @param {string} props.background  the card's own colour, which the fade has
 *   to start from — it is set by rarity, so this cannot be a constant.
 */
export default function HauntSprite({ species, background }) {
  const colour = TYPE_COLOR[species.type] ?? C.accent;
  const art = spriteFor(species.id);

  return (
    <View
      style={s.panel}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {art ? (
        <Image source={art} style={s.art} resizeMode="contain" />
      ) : (
        <Text style={[s.monogram, { color: colour }]}>{monogram(species.name)}</Text>
      )}

      {/*
        Fades the artwork's inner edge into the card, so the chart's right-hand
        labels have something to sit on. `experimental_backgroundImage` is core
        RN 0.86 and needs no native module — the prefix is a real caveat, so
        nothing structural depends on it: without the gradient the art simply
        meets the card on a hard edge.
      */}
      <View
        style={[
          s.scrim,
          {
            experimental_backgroundImage:
              `linear-gradient(to right, ${background} 0%, ${alpha(background, 0.72)} 45%, ${alpha(background, 0)} 100%)`,
          },
        ]}
        pointerEvents="none"
      />
    </View>
  );
}

const s = StyleSheet.create({
  /**
   * Flexes to whatever height the card's text leaves it. The place plate is a
   * sibling below, not an overlay, so a short card cannot drive the two into
   * each other — which an absolutely positioned plate did.
   */
  panel: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  art: { width: '100%', height: '100%' },
  monogram: {
    fontSize: 46,
    fontFamily: 'serif',
    fontWeight: '600',
    letterSpacing: 3,
    opacity: 0.8,
  },
  scrim: { position: 'absolute', left: 0, top: 0, bottom: 0, width: SCRIM_W },
});
