/**
 * Local storage. No backend, nothing uploaded.
 *
 * Two implementations behind one interface:
 *
 *   MemoryStore  — used by the simulation and tests here (Node 18 has no
 *                  built-in SQLite, and the prototype should need no installs).
 *   expo-sqlite  — the app. Run SCHEMA, then implement the same five methods.
 *                  Nothing above this layer changes.
 *
 * @typedef {import('./spawner.js').Catch} Catch
 */

import { CATALOG } from './species.js';

/** Run this once on the expo-sqlite database. Mirrors MemoryStore's shape. */
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS catches (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    day           TEXT    NOT NULL,
    species_id    TEXT    NOT NULL,
    rarity        TEXT    NOT NULL,
    stats_json    TEXT    NOT NULL,
    total         INTEGER NOT NULL,
    place_name    TEXT    NOT NULL,
    osm_tag       TEXT    NOT NULL,
    caught_at     INTEGER NOT NULL,
    dwell_seconds INTEGER NOT NULL,
    weather       TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_catches_day ON catches(day);
CREATE INDEX IF NOT EXISTS idx_catches_species ON catches(species_id);
`;

export class MemoryStore {
  constructor() {
    /** @type {Array<Catch & {id: number, day: string}>} */
    this.rows = [];
    this.nextId = 1;
  }

  /**
   * @param {string} day  ISO date, e.g. '2026-07-30'
   * @param {Catch} c
   * @returns {number} row id
   */
  add(day, c) {
    const id = this.nextId++;
    this.rows.push({ ...c, id, day });
    return id;
  }

  /** @param {string} day */
  forDay(day) {
    return this.rows
      .filter((r) => r.day === day)
      .sort((a, b) => a.caughtAt - b.caughtAt);
  }

  /** @param {string} speciesId */
  bestOfSpecies(speciesId) {
    const matches = this.rows.filter((r) => r.speciesId === speciesId);
    if (matches.length === 0) return null;
    return matches.reduce((best, r) => (r.total > best.total ? r : best));
  }

  /**
   * The collection headline.
   * @returns {{seen: number, total: number}}
   */
  dexProgress() {
    return {
      seen: new Set(this.rows.map((r) => r.speciesId)).size,
      total: CATALOG.length,
    };
  }

  close() {}
}
