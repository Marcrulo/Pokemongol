/**
 * Local SQLite. Everything the app knows lives here and nowhere else.
 *
 * Three tables:
 *   fixes   — the raw GPS trail, pruned after a week. Written by the
 *             background task, read by the collector.
 *   catches — the collection. Never pruned.
 *   places  — a cache of Overpass answers, so the same corner is looked up
 *             once and then never again.
 */

import * as SQLite from 'expo-sqlite';

import { summarize } from '../prototype/src/conditions.js';
import { mayReplaceDay } from '../prototype/src/day.js';
import { SCHEMA } from '../prototype/src/store.js';

/**
 * `recorded_at` is when we sampled; `t` is what the provider stamped on the
 * location. They differ when Android replays a cached fix, which it does
 * freely while you stand still.
 *
 * The trail is keyed on `recorded_at`, because the honest claim is "at 22:30
 * the best known position was here" — not "we heard about 21:37 again". An
 * earlier version made `t` the primary key and used INSERT OR REPLACE, so
 * every replayed fix silently overwrote one existing row and the trail stopped
 * growing while the task ran perfectly.
 */
const EXTRA_SCHEMA = `
CREATE TABLE IF NOT EXISTS fixes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    recorded_at INTEGER NOT NULL,
    t           INTEGER NOT NULL,
    day         TEXT    NOT NULL,
    lat         REAL    NOT NULL,
    lon         REAL    NOT NULL,
    accuracy_m  REAL
);
CREATE INDEX IF NOT EXISTS idx_fixes_day ON fixes(day);
CREATE INDEX IF NOT EXISTS idx_fixes_recorded ON fixes(recorded_at);

CREATE TABLE IF NOT EXISTS places (
    cell       TEXT PRIMARY KEY,
    osm_tag    TEXT NOT NULL,
    place_name TEXT NOT NULL,
    fetched_at INTEGER NOT NULL
);

-- One row per day per coarse cell: the whole 24-hour array in one blob, so a
-- day costs a single request no matter how many places you lingered in.
CREATE TABLE IF NOT EXISTS weather_days (
    cell       TEXT NOT NULL,
    day        TEXT NOT NULL,
    hourly     TEXT NOT NULL,
    fetched_at INTEGER NOT NULL,
    PRIMARY KEY (cell, day)
);
`;

const SCHEMA_VERSION = 2;

/** Columns added to `catches` in version 2. Nullable, so old rows stay valid. */
const WEATHER_COLUMNS = [
  'temp_c REAL',
  'precip_mm REAL',
  'cloud_pct REAL',
  'sun_altitude REAL',
  'weather_source TEXT',
];

/**
 * Catches are never dropped — they are the only rows that matter. The trail is
 * a seven-day scratch buffer and can be rebuilt by walking, so version 1 drops
 * it outright rather than reshaping rows.
 *
 * @param {SQLite.SQLiteDatabase} d
 */
async function migrate(d) {
  const row = await d.getFirstAsync('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  if (version >= SCHEMA_VERSION) return;

  if (version < 1) {
    // `t` was the primary key with INSERT OR REPLACE, so replayed locations
    // silently overwrote rows instead of extending the trail.
    await d.execAsync('DROP TABLE IF EXISTS fixes');
    version = 1;
  }

  if (version < 2) {
    // Only reached by a database that predates weather measurement; a fresh
    // install gets these from SCHEMA directly.
    const existing = await d.getAllAsync('PRAGMA table_info(catches)');
    const have = new Set(existing.map((c) => c.name));
    for (const column of WEATHER_COLUMNS) {
      const name = column.split(' ')[0];
      if (!have.has(name)) {
        await d.execAsync(`ALTER TABLE catches ADD COLUMN ${column}`);
      }
    }
    version = 2;
  }

  await d.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}

/** @type {Promise<SQLite.SQLiteDatabase>|null} */
let handle = null;

/** Opens once per process, including inside the background task. */
export function db() {
  if (!handle) {
    handle = (async () => {
      const d = await SQLite.openDatabaseAsync('haunts.db');
      await d.execAsync('PRAGMA journal_mode = WAL;');
      // Order matters: SCHEMA creates `catches` so the migration can inspect
      // it, and the migration drops the old `fixes` before EXTRA_SCHEMA
      // recreates it in the new shape.
      await d.execAsync(SCHEMA);
      await migrate(d);
      await d.execAsync(EXTRA_SCHEMA);
      return d;
    })();
  }
  return handle;
}

/** Local calendar date, which is what a "day" means to a person. */
export function dayOf(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const FIX_RETENTION_DAYS = 7;

export async function recordFix({ t, lat, lon, accuracy = null }) {
  const d = await db();
  const recordedAt = Math.floor(Date.now() / 1000);
  await d.runAsync(
    `INSERT INTO fixes (recorded_at, t, day, lat, lon, accuracy_m)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [recordedAt, t, dayOf(new Date(recordedAt * 1000)), lat, lon, accuracy],
  );
  const cutoff = recordedAt - FIX_RETENTION_DAYS * 86400;
  await d.runAsync('DELETE FROM fixes WHERE recorded_at < ?', [cutoff]);
}

/** Trail for one day, in the shape `findStays` wants: t is seconds past midnight. */
export async function trailForDay(day) {
  const d = await db();
  const rows = await d.getAllAsync(
    'SELECT recorded_at AS t, lat, lon FROM fixes WHERE day = ? ORDER BY recorded_at',
    [day],
  );
  if (rows.length === 0) return [];
  const midnight = new Date(rows[0].t * 1000);
  midnight.setHours(0, 0, 0, 0);
  const base = Math.floor(midnight.getTime() / 1000);
  return rows.map((r) => ({ t: r.t - base, lat: r.lat, lon: r.lon }));
}

/** Every day that has fixes, newest first. */
export async function daysWithFixes() {
  const d = await db();
  const rows = await d.getAllAsync(
    'SELECT DISTINCT day FROM fixes ORDER BY day DESC',
  );
  return rows.map((r) => r.day);
}

/**
 * Catches are derived from the trail and are deterministic, so re-collecting a
 * day replaces it rather than appending.
 *
 * **A recomputation that finds nothing is never allowed to delete something.**
 * Replacement is only sound while the trail that produced the catches still
 * exists, and it does not always: the trail is pruned after a week, and a
 * schema migration once dropped it outright. In both cases the day recomputes
 * to zero catches — not because nothing happened, but because the evidence is
 * gone. Deleting on that basis silently erodes the collection, which is the
 * one thing in this app that cannot be regenerated by walking again.
 *
 * @returns {Promise<boolean>} whether the day was written
 */
export async function replaceDay(day, catches) {
  const d = await db();

  const existing = await d.getFirstAsync(
    'SELECT COUNT(*) AS n FROM catches WHERE day = ?',
    [day],
  );
  if (!mayReplaceDay(catches.length, existing?.n ?? 0)) return false;

  await d.withTransactionAsync(async () => {
    await d.runAsync('DELETE FROM catches WHERE day = ?', [day]);
    for (const c of catches) {
      const w = c.weather ?? {};
      await d.runAsync(
        `INSERT INTO catches
           (day, species_id, rarity, stats_json, total, place_name, osm_tag,
            caught_at, dwell_seconds, weather,
            temp_c, precip_mm, cloud_pct, sun_altitude, weather_source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          day, c.speciesId, c.rarity, JSON.stringify(c.stats), c.total,
          c.placeName, c.osmTag, c.caughtAt, c.dwellSeconds, summarize(w),
          w.tempC ?? null, w.precipMm ?? null, w.cloudPct ?? null,
          w.sunAltitude ?? null, w.source ?? 'none',
        ],
      );
    }
  });
  return true;
}

/**
 * Throw away a day's catches so it can be collected again.
 *
 * Development only — the normal `replaceDay` guard deliberately refuses to
 * delete, so re-catching at one desk needs an explicit way to say "yes, really".
 */
export async function clearDay(day) {
  const d = await db();
  await d.runAsync('DELETE FROM catches WHERE day = ?', [day]);
}

const hydrate = (r) => ({
  id: r.id,
  day: r.day,
  speciesId: r.species_id,
  rarity: r.rarity,
  stats: JSON.parse(r.stats_json),
  total: r.total,
  placeName: r.place_name,
  osmTag: r.osm_tag,
  caughtAt: r.caught_at,
  dwellSeconds: r.dwell_seconds,
  /** The human-readable line. Catches from before weather measurement keep theirs. */
  weatherText: r.weather,
  weather: {
    tempC: r.temp_c ?? null,
    precipMm: r.precip_mm ?? null,
    cloudPct: r.cloud_pct ?? null,
    sunAltitude: r.sun_altitude ?? null,
    source: r.weather_source ?? 'none',
  },
});

export async function catchesForDay(day) {
  const d = await db();
  const rows = await d.getAllAsync(
    'SELECT * FROM catches WHERE day = ? ORDER BY caught_at',
    [day],
  );
  return rows.map(hydrate);
}

/** One row per species ever caught — the best of each. The collection screen. */
export async function bestPerSpecies() {
  const d = await db();
  const rows = await d.getAllAsync(`
    SELECT * FROM catches
    WHERE id IN (SELECT id FROM catches c2
                 WHERE c2.species_id = catches.species_id
                 ORDER BY total DESC, caught_at ASC LIMIT 1)
    ORDER BY total DESC
  `);
  return rows.map(hydrate);
}

/** Cache key: ~11 m cells, small enough not to merge neighbouring shops. */
const cellOf = (lat, lon) => `${lat.toFixed(4)},${lon.toFixed(4)}`;

export async function cachedPlace(lat, lon) {
  const d = await db();
  const row = await d.getFirstAsync('SELECT * FROM places WHERE cell = ?', [
    cellOf(lat, lon),
  ]);
  if (!row) return undefined; // never looked up
  if (row.osm_tag === '') return null; // looked up, nothing there
  return { osmTag: row.osm_tag, placeName: row.place_name };
}

export async function cachePlace(lat, lon, place) {
  const d = await db();
  await d.runAsync(
    'INSERT OR REPLACE INTO places (cell, osm_tag, place_name, fetched_at) VALUES (?, ?, ?, ?)',
    [
      cellOf(lat, lon),
      place ? place.osmTag : '',
      place ? place.placeName : '',
      Math.floor(Date.now() / 1000),
    ],
  );
}

/**
 * @returns {Promise<{hourly: object, fetchedAt: number}|null>} null when the
 *   day has never been fetched for that cell.
 */
export async function cachedWeatherDay(cell, day) {
  const d = await db();
  const row = await d.getFirstAsync(
    'SELECT hourly, fetched_at FROM weather_days WHERE cell = ? AND day = ?',
    [cell, day],
  );
  if (!row) return null;
  try {
    return { hourly: JSON.parse(row.hourly), fetchedAt: row.fetched_at };
  } catch {
    return null; // a corrupt blob should just be refetched
  }
}

export async function cacheWeatherDay(cell, day, hourly) {
  const d = await db();
  await d.runAsync(
    `INSERT OR REPLACE INTO weather_days (cell, day, hourly, fetched_at)
     VALUES (?, ?, ?, ?)`,
    [cell, day, JSON.stringify(hourly), Math.floor(Date.now() / 1000)],
  );
}
