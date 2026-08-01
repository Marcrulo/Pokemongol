/**
 * One haunt, laid out as a Stand chart.
 *
 * ## The composition
 *
 * It is landscape and it is layered, which is the whole point — the chart is
 * not a panel beside the artwork, it is drawn *over* it:
 *
 *   ┌───────────────────────────────────────────┐
 *   │ The One                          ╭────────┤
 *   │ Good Tree                        │  ,__,  │
 *   │ + Wraith · Forest                │ (o o)  │
 *   │ "blurb"                          │ /)_)   │
 *   │        POWER                     │  " "   │
 *   │    E     ▲     B  DREAD          │ ──     │
 *   │  INSIGHT   ◆   C  ANCHOR         │ Netto  │
 *   │      D  PRESENCE                 │ 7 min  │
 *   └───────────────────────────────────────────┘
 *
 * The artwork is anchored to the right edge with a left-to-right fade over its
 * inner edge, and the type and chart are drawn over the top. The fade is what
 * makes the overlap safe — the chart's right-hand labels and the name both
 * cross into the artwork's column, and without it they would sit on whatever
 * pixels the sprite happened to have there.
 *
 * The place plate is stacked *under* the artwork rather than laid over it, the
 * one deliberate departure from the source, where [STAND MASTER] sits on the
 * art. It began as a workaround for cards of different heights driving the
 * plate into the figure; the heights are fixed now, so it could go back to
 * being an overlay — it stays stacked because small text on arbitrary pixel
 * art was the harder thing to keep legible, not because it has to.
 *
 * There are no `[HAUNT]` / `[PLACE]` headings. The source brackets its
 * sections because it has room to; at 320dp they spent a line each saying what
 * the content already said, and the card reads better with the name simply
 * starting it. The rule above the place block is what survives of them.
 *
 * Only the chart is fixed-width and left-anchored; the artwork and the place
 * plate hang off the right edge. So the layout absorbs a wider screen by
 * opening a gap in the middle rather than by breaking, and 360dp — where the
 * two columns just touch — is the tight case everything was measured against.
 *
 * ## What the card still has to say
 *
 * Rarity is carried three ways on purpose: the enclosed area of the polygon,
 * the mark and word under the name, and a full frame on the top two tiers.
 * Colour alone was never enough — bad for the eye and worse for a screen
 * reader. The per-stat numbers live in the accessibility label, where they are
 * unambiguous; on screen the letter grades replace them, because two encodings
 * of the same five values side by side made the block read as a spreadsheet.
 */

import { StyleSheet, Text, View } from 'react-native';

import { summarize } from '../../prototype/src/conditions.js';
import { gradeLabel } from '../../prototype/src/grade.js';
import { BY_ID } from '../../prototype/src/species.js';
import { STAT_NAMES } from '../../prototype/src/spawner.js';
import { SIGNATURE_STAT } from '../../prototype/src/types.js';
import HauntSprite, { SPRITE_W } from './HauntSprite.js';
import StandChart, { CHART_H } from './StandChart.js';
import {
  C, GRID, RARITY_BG, RARITY_COLOR, RARITY_MARK, TYPE_COLOR, isFormal,
} from './theme.js';

/**
 * Text has to stop before the artwork does. The chart is allowed past this —
 * it is the thing the fade exists for — but a wrapped line of body copy
 * running under a sprite is just unreadable.
 */
const TEXT_W = 176;

/**
 * ## Why every block below has a fixed height
 *
 * The card used to size itself to its contents, and the contents vary: names
 * run to one line or two, and blurbs likewise. A list of those is visibly
 * ragged, and worse, the chart sat at a different height on every card — so
 * the one element that is supposed to be compared across cards was the one
 * element that never lined up.
 *
 * So each block reserves its worst case and the card's height is their sum. A
 * one-line name is centred in the two-line box. The cost is some deliberate
 * white space on the short cards, which is the right trade for a chart that
 * lands in the same place every time.
 */
const PAD_V = 12;
/** Two lines at the *formal* line height, so the top two tiers fit too. */
const NAME_H = 50;
const META_H = 14;
const BLURB_H = 30;

const CARD_H = PAD_V + NAME_H + 5 + META_H + 6 + BLURB_H + 6 + CHART_H + PAD_V;

/**
 * Text scales with the OS font setting, which would push these fixed blocks
 * out of shape. Capping the multiplier keeps the card's geometry intact while
 * still passing most of the user's preference through.
 */
const FONT_CAP = 1.2;

const minutes = (seconds) => `${Math.round(seconds / 60)} min`;

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * `2026-08-01` → `Aug 01 2026`.
 *
 * Split rather than `new Date(...)`: the stored day is already a *local*
 * calendar date from `dayOf`, and handing that string to the Date constructor
 * parses it as UTC, which drops a catch onto the previous day for anyone west
 * of Greenwich.
 *
 * @param {string} day  YYYY-MM-DD
 */
export function formatDay(day) {
  const parts = String(day ?? '').split('-');
  if (parts.length !== 3) return String(day ?? '');
  const month = MONTHS[Number(parts[1]) - 1];
  return month ? `${month} ${parts[2]} ${parts[0]}` : String(day);
}

/**
 * Catches from before weather measurement kept a free-text string; newer ones
 * carry a reading. Prefer the reading, fall back to whatever was stored.
 */
function conditions(item) {
  const said = summarize(item.weather);
  return said === 'unknown' ? (item.weatherText ?? 'unknown') : said;
}

/**
 * One sentence for a screen reader, rather than a dozen orphaned fragments.
 *
 * Both encodings go in: the grade because that is what is on screen, the
 * number because "grade C" alone cannot be compared against another card.
 *
 * The total is spoken even though it no longer prints. A sighted reader gets
 * it from the area the polygon encloses; without that, the five numbers would
 * have to be added up by hand to learn the same thing.
 */
function describe(item, species) {
  const stats = STAT_NAMES.map(
    (n) => `${n} ${gradeLabel(item.stats[n])}, ${item.stats[n]}`,
  ).join('. ');
  return (
    `${species.name}, a ${item.rarity}. ${species.type}. ${stats}. ` +
    `${item.total} total. Caught at ${item.placeName}, ` +
    `${minutes(item.dwellSeconds)}, ${conditions(item)}.`
  );
}

export default function HauntCard({ item }) {
  const species = BY_ID.get(item.speciesId);
  if (!species) return null;

  const signature = SIGNATURE_STAT[species.type];
  const typeColour = TYPE_COLOR[species.type] ?? C.accent;
  const rarityColour = RARITY_COLOR[item.rarity] ?? C.dim;
  const background = RARITY_BG[item.rarity] ?? C.card;
  const formal = isFormal(item.rarity);

  return (
    <View
      style={[
        s.card,
        { backgroundColor: background, borderColor: rarityColour },
        formal && s.formal,
      ]}
      accessible
      accessibilityLabel={describe(item, species)}
    >
      {/*
        The artwork column, with the provenance plate stacked under it rather
        than laid over it. The plate started out absolutely positioned, the way
        [STAND MASTER] sits on the art in the source — but the card's height is
        driven by how many lines the name takes, and on a short card the
        artwork and the plate collided. Stacking them costs the overlay and
        buys a layout that cannot break.
      */}
      <View style={s.artColumn}>
        <HauntSprite species={species} background={background} />

        {/* A rule rather than a heading: the block underneath is self-evidently
            the place, and the card has no room for a word that says so. */}
        <View style={s.plate}>
          <View style={[s.plateRule, { backgroundColor: rarityColour }]} />
          <Text style={s.where} numberOfLines={2} maxFontSizeMultiplier={FONT_CAP}>
            {item.placeName}
          </Text>
          <Text style={s.date} numberOfLines={1} maxFontSizeMultiplier={FONT_CAP}>
            {formatDay(item.day)}
          </Text>
          <Text style={s.conditions} numberOfLines={2} maxFontSizeMultiplier={FONT_CAP}>
            {conditions(item)}
          </Text>
        </View>
      </View>

      <View style={s.content}>
        <View style={s.nameBox}>
          <Text
            style={[s.name, formal && s.nameFormal]}
            numberOfLines={2}
            maxFontSizeMultiplier={FONT_CAP}
          >
            {species.name}
          </Text>
        </View>

        <Text style={s.line} numberOfLines={1} maxFontSizeMultiplier={FONT_CAP}>
          <Text style={{ color: rarityColour }}>
            {RARITY_MARK[item.rarity]} {item.rarity}
          </Text>
          <Text style={s.sep}> · </Text>
          <Text style={{ color: typeColour }}>{species.type}</Text>
        </Text>

        <Text style={s.blurb} numberOfLines={2} maxFontSizeMultiplier={FONT_CAP}>
          {species.blurb}
        </Text>

        <StandChart
          stats={item.stats}
          signature={signature}
          colour={typeColour}
          style={s.chart}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    position: 'relative',
    height: CARD_H,
    borderLeftWidth: 3,
    borderRadius: 10,
    marginBottom: 12,
    overflow: 'hidden',
  },
  /** Only the top two tiers get a full frame, so the shift stays rare. */
  formal: {
    borderWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 3,
  },

  artColumn: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: SPRITE_W,
  },

  content: { paddingTop: PAD_V, paddingLeft: 14, paddingBottom: PAD_V },

  /** A one-line name centres in the two-line box rather than floating at its top. */
  nameBox: { height: NAME_H, width: TEXT_W, justifyContent: 'center' },
  name: {
    color: C.text,
    fontSize: 19,
    lineHeight: 23,
    fontWeight: '600',
    fontFamily: 'serif',
  },
  nameFormal: { fontSize: 21, lineHeight: 25 },

  line: {
    fontSize: 10.5,
    lineHeight: META_H,
    letterSpacing: 0.8,
    marginTop: 5,
    width: TEXT_W,
  },
  sep: { color: GRID.spokes },

  blurb: {
    color: C.dim,
    fontSize: 11.5,
    lineHeight: 15,
    fontStyle: 'italic',
    marginTop: 6,
    height: BLURB_H,
    width: TEXT_W,
  },

  /**
   * Pulled out past the content padding, so the polygon sits under the type
   * rather than indented from it — and, at 360dp, so the chart's right-hand
   * labels clear the place plate by more than a hair.
   */
  chart: { marginTop: 6, marginLeft: -14 },

  plate: { paddingLeft: 10, paddingRight: 12, paddingBottom: PAD_V, paddingTop: 4 },
  plateRule: { width: 22, height: 2, opacity: 0.7 },
  where: { color: C.text, fontSize: 11.5, lineHeight: 14, marginTop: 5 },
  /** Tabular figures so the date column lines up down a list of cards. */
  date: {
    color: C.dim,
    fontSize: 10.5,
    lineHeight: 13,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.3,
  },
  conditions: { color: C.dim, fontSize: 10.5, lineHeight: 13 },
});
