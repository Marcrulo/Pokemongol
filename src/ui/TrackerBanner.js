/**
 * Whether the machine is actually running, said plainly.
 *
 * The old control was a single button reading "Listening — tap to stop",
 * which was true about the *task* and silent about the *permission*. An app
 * granted foreground-only location shows exactly that button, runs a
 * foreground service, and records nothing at all. That happened in testing and
 * cost an evening.
 *
 * So the state shown here is derived from what Android will permit, never
 * from whether we asked it to start.
 */

import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { C } from './theme.js';

/** Long enough that a still evening at home does not trigger it. */
const STALE_SECONDS = 90 * 60;

const ago = (seconds) => {
  if (seconds < 90) return 'just now';
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.round(mins / 60);
  return hours === 1 ? 'an hour ago' : `${hours} hours ago`;
};

export default function TrackerBanner({ state, tracking, lastFix, onToggle }) {
  const now = Math.floor(Date.now() / 1000);
  const silence = lastFix === null ? null : now - lastFix;
  const stale = tracking && silence !== null && silence > STALE_SECONDS;

  if (state === 'foreground-only') {
    return (
      <View style={[s.box, s.warn]}>
        <Text style={s.title}>Recording nothing.</Text>
        <Text style={s.body}>
          Android gave Haunts location only while the app is open, which is the
          one time it isn&rsquo;t needed. It needs &ldquo;Allow all the
          time&rdquo;.
        </Text>
        <Pressable onPress={() => Linking.openSettings()}>
          <Text style={s.action}>
            Open settings → Permissions → Location → Allow all the time
          </Text>
        </Pressable>
      </View>
    );
  }

  if (!tracking) {
    return (
      <Pressable onPress={onToggle} style={[s.box, s.idle]}>
        <Text style={s.title}>Not listening.</Text>
        <Text style={s.body}>Nothing is being recorded.</Text>
        <Text style={s.action}>Start listening</Text>
      </Pressable>
    );
  }

  if (stale) {
    return (
      <View style={[s.box, s.warn]}>
        <Text style={s.title}>Nothing heard for {ago(silence)}.</Text>
        <Text style={s.body}>
          Either you have not moved, or Android has put Haunts to sleep to save
          battery. Samsung is especially keen on this.
        </Text>
        <Pressable
          onPress={() =>
            Linking.sendIntent(
              'android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS',
            ).catch(() => {})
          }
        >
          <Text style={s.action}>
            Battery settings → find Haunts → Unrestricted
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable onPress={onToggle} style={[s.box, s.on]}>
      <Text style={s.running}>
        Listening.{' '}
        {silence === null ? 'Nothing recorded yet.' : `Last fix ${ago(silence)}.`}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  box: {
    marginHorizontal: 20,
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  on: { borderColor: C.accent, backgroundColor: '#1B1430', alignItems: 'center' },
  idle: { borderColor: C.line },
  warn: { borderColor: '#8A6A2F', backgroundColor: '#241C10' },
  title: { color: C.text, fontSize: 14, fontWeight: '600' },
  body: { color: C.dim, fontSize: 12, marginTop: 4, lineHeight: 17 },
  action: { color: C.accent, fontSize: 12, marginTop: 8 },
  running: { color: C.text, fontSize: 13 },
});
