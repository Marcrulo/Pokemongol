/**
 * One haunt. The only thing in the app you actually look at.
 *
 * Three things carry meaning here, deliberately redundantly:
 *
 *   type      the signature stat's colour, and the word
 *   rarity    the enclosed area of the radar, a mark, and the frame
 *   record    a sentence, because a number cannot say "your best yet"
 *
 * Rarity used to be a coloured word and nothing else, which made a 1-in-100
 * Reaper and a more-than-half-of-everything Shade nearly identical, and put
 * all the weight on colour — bad for the eye and worse for a screen reader.
 */

import { StyleSheet, Text, View } from 'react-native';

import { summarize } from '../../prototype/src/conditions.js';
import { BY_ID } from '../../prototype/src/species.js';
import { STAT_CAP, STAT_NAMES } from '../../prototype/src/spawner.js';
import { SIGNATURE_STAT } from '../../prototype/src/types.js';
import StatRadar from './StatRadar.js';
import { C, RARITY_COLOR, RARITY_MARK, TYPE_COLOR, isFormal } from './theme.js';

const minutes = (seconds) => `${Math.round(seconds / 60)} min`;

/**
 * Catches from before weather measurement kept a free-text string; newer ones
 * carry a reading. Prefer the reading, fall back to whatever was stored.
 */
function conditions(item) {
  const said = summarize(item.weather);
  return said === 'unknown' ? (item.weatherText ?? 'unknown') : said;
}

/** One sentence for a screen reader, rather than a dozen orphaned fragments. */
function describe(item, species) {
  const stats = STAT_NAMES.map((n) => `${n} ${item.stats[n]}`).join(', ');
  return (
    `${species.name}, a ${item.rarity}. ${species.type}. ${stats}. ` +
    `${item.total} total. Caught at ${item.placeName}, ` +
    `${minutes(item.dwellSeconds)}, ${conditions(item)}.`
  );
}

export default function HauntCard({ item, verdict }) {
  const species = BY_ID.get(item.speciesId);
  if (!species) return null;

  const signature = SIGNATURE_STAT[species.type];
  const typeColour = TYPE_COLOR[species.type] ?? C.accent;
  const rarityColour = RARITY_COLOR[item.rarity] ?? C.dim;
  const formal = isFormal(item.rarity);

  return (
    <View
      style={[
        s.card,
        { borderColor: rarityColour },
        formal && s.formal,
      ]}
      accessible
      accessibilityLabel={describe(item, species)}
    >
      <View style={s.head}>
        <Text style={[s.name, formal && s.nameFormal]}>{species.name}</Text>
        <Text style={[s.rarity, { color: rarityColour }]}>
          {RARITY_MARK[item.rarity]} {item.rarity}
        </Text>
      </View>

      <Text style={s.blurb}>{species.blurb}</Text>

      {verdict ? (
        <View style={s.verdictRow}>
          {verdict.badge ? (
            <Text style={[s.badge, { color: typeColour, borderColor: typeColour }]}>
              {verdict.badge}
            </Text>
          ) : null}
          <Text style={s.verdict}>{verdict.line}</Text>
        </View>
      ) : null}

      <View style={s.body}>
        <StatRadar stats={item.stats} signature={signature} colour={typeColour} />
        <View style={s.numbers}>
          {STAT_NAMES.map((name) => {
            const isSig = name === signature;
            return (
              <Text
                key={name}
                style={[s.stat, isSig && { color: typeColour, fontWeight: '600' }]}
              >
                {name.slice(0, 3).toLowerCase()}{' '}
                {String(item.stats[name]).padStart(3, ' ')}
              </Text>
            );
          })}
          <Text style={s.total}>{item.total}</Text>
        </View>
      </View>

      <Text style={s.where}>
        {item.placeName} · {minutes(item.dwellSeconds)} ·{' '}
        <Text style={{ color: typeColour }}>{species.type}</Text>
      </Text>
      <Text style={s.conditions}>{conditions(item)}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderLeftWidth: 3,
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  },
  /** Only the top two tiers get a full frame, so the shift stays rare. */
  formal: {
    borderWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 3,
  },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  name: { color: C.text, fontSize: 18, fontWeight: '600', flexShrink: 1, fontFamily: 'serif' },
  nameFormal: { fontSize: 20 },
  rarity: { fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', marginLeft: 8 },
  blurb: { color: C.dim, fontSize: 13, fontStyle: 'italic', marginTop: 6 },
  verdictRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  badge: {
    fontSize: 9,
    letterSpacing: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  verdict: { color: C.text, fontSize: 12, flexShrink: 1 },
  body: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 14 },
  numbers: { flex: 1 },
  stat: { color: C.dim, fontSize: 12, fontFamily: 'monospace', lineHeight: 18 },
  total: {
    color: C.text,
    fontSize: 14,
    fontFamily: 'monospace',
    marginTop: 6,
    fontWeight: '600',
  },
  where: { color: C.dim, fontSize: 12, marginTop: 12 },
  conditions: { color: C.dim, fontSize: 12, marginTop: 2 },
});
