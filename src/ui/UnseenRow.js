/**
 * A haunt you have not met yet.
 *
 * The collection screen previously showed only what you had caught, which
 * meant an empty screen said nothing and a full one said nothing either. The
 * gaps are the interesting part: they are the reason to go somewhere.
 *
 * Names stay hidden — a species is a small surprise and printing the list
 * spends all of them at once. The type and the kind of place are enough to
 * point you outdoors.
 */

import { StyleSheet, Text, View } from 'react-native';

import { C, TYPE_COLOR } from './theme.js';

/** `shop=butcher` → `a butcher`, which reads as a hint rather than a label. */
function hint(osmTag) {
  const value = osmTag.split('=')[1].replace(/_/g, ' ');
  const article = /^[aeiou]/.test(value) ? 'an' : 'a';
  return `${article} ${value}`;
}

export default function UnseenRow({ species }) {
  const colour = TYPE_COLOR[species.type] ?? C.dim;
  return (
    <View style={s.row}>
      <View style={[s.dot, { backgroundColor: colour }]} />
      <Text style={s.text} numberOfLines={1}>
        Somewhere there is {hint(species.osmTag)}
      </Text>
      <Text style={[s.type, { color: colour }]}>{species.type}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 10, opacity: 0.5 },
  text: { color: C.dim, fontSize: 13, flex: 1, opacity: 0.65 },
  type: { fontSize: 10, opacity: 0.6, marginLeft: 8 },
});
