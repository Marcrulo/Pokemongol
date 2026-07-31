/**
 * One haunt. The only thing in the app you actually look at.
 *
 * The signature stat is drawn in the type's colour and the rest in grey, so a
 * Graveyard haunt reads as Power at a glance without having to be labelled.
 */

import { StyleSheet, Text, View } from 'react-native';

import { summarize } from '../../prototype/src/conditions.js';
import { BY_ID } from '../../prototype/src/species.js';
import { STAT_CAP, STAT_NAMES } from '../../prototype/src/spawner.js';
import { SIGNATURE_STAT } from '../../prototype/src/types.js';
import { C, RARITY_COLOR, TYPE_COLOR } from './theme.js';

const minutes = (seconds) => `${Math.round(seconds / 60)} min`;

/**
 * Catches from before weather measurement kept a free-text string; newer ones
 * carry a reading. Prefer the reading, fall back to whatever was stored.
 */
function conditions(item) {
  const said = summarize(item.weather);
  return said === 'unknown' ? (item.weatherText ?? 'unknown') : said;
}

function Stat({ name, value, colour }) {
  return (
    <View style={s.statRow}>
      <Text style={s.statName}>{name}</Text>
      <View style={s.track}>
        <View
          style={[s.fill, { width: `${(value / STAT_CAP) * 100}%`, backgroundColor: colour }]}
        />
      </View>
      <Text style={[s.statValue, { color: colour }]}>{value}</Text>
    </View>
  );
}

export default function HauntCard({ item }) {
  const species = BY_ID.get(item.speciesId);
  if (!species) return null;

  const signature = SIGNATURE_STAT[species.type];
  const typeColour = TYPE_COLOR[species.type] ?? C.accent;
  const rarityColour = RARITY_COLOR[item.rarity] ?? C.dim;

  return (
    <View style={[s.card, { borderColor: rarityColour }]}>
      <View style={s.head}>
        <Text style={s.name}>{species.name}</Text>
        <Text style={[s.rarity, { color: rarityColour }]}>{item.rarity}</Text>
      </View>

      <Text style={s.blurb}>{species.blurb}</Text>

      <Text style={s.where}>
        {item.placeName} · {minutes(item.dwellSeconds)} ·{' '}
        <Text style={{ color: typeColour }}>{species.type}</Text>
      </Text>

      <Text style={s.conditions}>{conditions(item)}</Text>

      <View style={s.stats}>
        {STAT_NAMES.map((name) => (
          <Stat
            key={name}
            name={name}
            value={item.stats[name]}
            colour={name === signature ? typeColour : C.dim}
          />
        ))}
      </View>

      <Text style={s.total}>{item.total} total</Text>
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
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  name: { color: C.text, fontSize: 18, fontWeight: '600', flexShrink: 1 },
  rarity: { fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', marginLeft: 8 },
  blurb: { color: C.dim, fontSize: 13, fontStyle: 'italic', marginTop: 6 },
  where: { color: C.dim, fontSize: 12, marginTop: 10 },
  conditions: { color: C.dim, fontSize: 12, marginTop: 2, opacity: 0.75 },
  stats: { marginTop: 12 },
  statRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  statName: { color: C.dim, fontSize: 11, width: 62 },
  track: { flex: 1, height: 6, backgroundColor: C.line, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  statValue: { fontSize: 11, width: 28, textAlign: 'right' },
  total: { color: C.dim, fontSize: 11, marginTop: 8, textAlign: 'right' },
});
