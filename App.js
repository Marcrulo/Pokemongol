/**
 * Haunts — the whole app you can see.
 *
 * One screen, two tabs: what found you today, and everything you have ever
 * kept. Opening the app is what triggers collection; nothing is computed while
 * you are out except the GPS trail itself.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CATALOG } from './prototype/src/species.js';
import { collectRecent } from './src/collect.js';
import {
  bestPerSpecies,
  catchesForDay,
  clearDay,
  dayOf,
  lastFixAt,
} from './src/db.js';
import {
  DEV_DWELL_SECONDS,
  IS_DEV,
  devFlags,
  setDevFlag,
} from './src/dev.js';
import {
  isTracking,
  permissionState,
  startTracking,
  stopTracking,
} from './src/tracker.js';
import HauntCard from './src/ui/HauntCard.js';
import TrackerBanner from './src/ui/TrackerBanner.js';
import UnseenRow from './src/ui/UnseenRow.js';
import { C } from './src/ui/theme.js';

const TABS = ['Today', 'Collection'];

export default function App() {
  const [tab, setTab] = useState('Today');
  const [tracking, setTracking] = useState(false);
  const [busy, setBusy] = useState(true);
  const [today, setToday] = useState([]);
  const [collection, setCollection] = useState([]);
  const [note, setNote] = useState('');
  const [flags, setFlags] = useState(devFlags());
  const [permission, setPermission] = useState('ready');
  const [lastFix, setLastFix] = useState(null);
  const [dayShape, setDayShape] = useState({ stays: 0, steps: 0, emptyPlaces: 0 });

  const refresh = useCallback(async () => {
    setBusy(true);
    const day = dayOf();
    try {
      const { days, today: t } = await collectRecent();
      const { stays, steps, unresolved, weather, emptyPlaces } = t;
      setDayShape({ stays, steps, emptyPlaces });
      if (unresolved > 0) {
        setNote(
          `${unresolved} place${unresolved > 1 ? 's' : ''} not looked up yet — no connection.`,
        );
      } else {
        const earlier = days > 1 ? ` · ${days - 1} earlier day${days > 2 ? 's' : ''} caught up` : '';
        const summary =
          `${stays} stay${stays === 1 ? '' : 's'} · ~${steps.toLocaleString()} steps${earlier}`;
        // Daylight is always recorded; only the fetched three can be missing.
        setNote(
          weather === 'none' && stays > 0
            ? `${summary} · weather unavailable, will fill in later`
            : summary,
        );
      }
    } catch (e) {
      setNote(`Could not collect: ${e.message}`);
    }
    setToday(await catchesForDay(day));
    setCollection(await bestPerSpecies());
    setTracking(await isTracking());
    setPermission(await permissionState());
    setLastFix(await lastFixAt());
    setBusy(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggleTracking = async () => {
    if (tracking) {
      await stopTracking();
      setTracking(false);
      return;
    }
    const res = await startTracking();
    if (!res.ok) {
      setNote(
        `Location permission ${res.reason}. Haunts needs "Allow all the time" to collect while your phone is in your pocket.`,
      );
      return;
    }
    setTracking(true);
  };

  const toggleFlag = async (name) => {
    setDevFlag(name, !flags[name]);
    setFlags(devFlags());
    await refresh();
  };

  /** Wipe today and collect it again — the guard in replaceDay won't. */
  const recatch = async () => {
    await clearDay(dayOf());
    await refresh();
  };

  // The collection screen is caught haunts first, then the gaps — the gaps
  // being the part that suggests going somewhere new.
  const seen = new Set(collection.map((c) => c.speciesId));
  const unseen = CATALOG.filter((sp) => !seen.has(sp.id));
  const items =
    tab === 'Today'
      ? today
      : [
          ...collection.map((c) => ({ kind: 'caught', key: `c${c.id}`, data: c })),
          ...unseen.map((sp) => ({ kind: 'unseen', key: `u${sp.id}`, data: sp })),
        ];
  // A blank day is the common case — the five-minute rule guarantees it. Each
  // line makes the emptiness a property of the day rather than user error.
  const emptyToday = () => {
    if (!tracking && lastFix === null) {
      return 'No trail for today yet.\nHaunts hears nothing while it is not listening.';
    }
    if (dayShape.emptyPlaces > 0) {
      const n = dayShape.emptyPlaces;
      return `${n === 1 ? 'One place' : `${n} places`} held you today.\n${n === 1 ? 'It had nobody in.' : 'None of them had anyone in.'}`;
    }
    if (dayShape.steps > 3000) {
      return `${dayShape.steps.toLocaleString()} steps, and not one place\ncould get a grip on you.`;
    }
    if (collection.length === 0) {
      return 'Nothing yet.\nHaunts notices places you stay in for five minutes —\na cafe, a queue, a bench. Walking past collects nothing.';
    }
    return 'A still day. Nothing came,\nand nothing was looking.';
  };

  const empty =
    tab === 'Today'
      ? emptyToday()
      : 'Nothing kept yet. Below are the sixty things\nthat exist; every one of them is somewhere.';

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar style="light" />

      <View style={s.header}>
        <Text style={s.title}>Haunts</Text>
        <Text style={s.sub}>
          {collection.length} of {CATALOG.length} kinds seen
        </Text>
      </View>

      <TrackerBanner
        state={permission}
        tracking={tracking}
        lastFix={lastFix}
        onToggle={toggleTracking}
      />

      <View style={s.tabs}>
        {TABS.map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={s.tab}>
            <Text style={[s.tabText, tab === t && s.tabTextOn]}>{t}</Text>
          </Pressable>
        ))}
      </View>

      {IS_DEV && tab === 'Today' ? (
        <View style={s.devRow}>
          <Pressable onPress={() => toggleFlag('shortDwell')} style={s.devChip}>
            <Text style={s.devText}>
              dwell {flags.shortDwell ? `${DEV_DWELL_SECONDS}s` : '5 min'}
            </Text>
          </Pressable>
          <Pressable onPress={() => toggleFlag('repeatPlaces')} style={s.devChip}>
            <Text style={s.devText}>
              repeats {flags.repeatPlaces ? 'on' : 'off'}
            </Text>
          </Pressable>
          <Pressable onPress={recatch} style={s.devChip}>
            <Text style={s.devText}>re-catch</Text>
          </Pressable>
        </View>
      ) : null}

      {note !== '' && tab === 'Today' ? <Text style={s.note}>{note}</Text> : null}

      {busy && items.length === 0 ? (
        <ActivityIndicator color={C.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.key ?? String(item.id)}
          renderItem={({ item }) =>
            item.kind === 'unseen' ? (
              <UnseenRow species={item.data} />
            ) : item.kind === 'caught' ? (
              <HauntCard item={item.data} />
            ) : (
              <HauntCard item={item} />
            )
          }
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl refreshing={busy} onRefresh={refresh} tintColor={C.accent} />
          }
          ListEmptyComponent={<Text style={s.empty}>{empty}</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: { paddingHorizontal: 20, paddingTop: 12 },
  title: { color: C.text, fontSize: 30, fontWeight: '700', letterSpacing: 1 },
  sub: { color: C.dim, fontSize: 13, marginTop: 2 },
  tracker: {
    marginHorizontal: 20,
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  trackerOn: { borderColor: C.accent, backgroundColor: '#1B1430' },
  trackerOff: { borderColor: C.line },
  trackerText: { color: C.text, fontSize: 13 },
  tabs: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 18, gap: 20 },
  tab: { paddingBottom: 8 },
  tabText: { color: C.dim, fontSize: 15 },
  tabTextOn: { color: C.text, fontWeight: '600' },
  note: { color: C.dim, fontSize: 12, paddingHorizontal: 20, paddingBottom: 6 },
  devRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 8 },
  devChip: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  devText: { color: C.dim, fontSize: 11 },
  list: { padding: 20, paddingTop: 6, flexGrow: 1 },
  empty: { color: C.dim, textAlign: 'center', marginTop: 60, lineHeight: 22 },
});
