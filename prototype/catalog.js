/**
 * Print the species catalogue.
 *
 * Generated, never stored: a checked-in CSV would drift from `species.js` the
 * first time anyone added a haunt and forgot. This reads the real catalogue,
 * so it cannot be wrong.
 *
 *   node catalog.js            grouped table, for reading
 *   node catalog.js --csv      csv, for a spreadsheet
 *   node catalog.js --md       one markdown table, every haunt
 *   node catalog.js --gaps     tags that map to a type but have no species
 */

import { CATALOG } from './src/species.js';
import { SIGNATURE_STAT, TAG_TO_TYPE, TYPES } from './src/types.js';

const csvCell = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

function asCsv() {
  const rows = [['id', 'name', 'type', 'signature', 'osm_tag', 'blurb']];
  for (const s of CATALOG) {
    rows.push([s.id, s.name, s.type, SIGNATURE_STAT[s.type], s.osmTag, s.blurb]);
  }
  return rows.map((r) => r.map(csvCell).join(',')).join('\n');
}

function asTable() {
  const out = [];
  for (const type of TYPES) {
    const members = CATALOG.filter((s) => s.type === type);
    out.push(
      '',
      `${type.toUpperCase()}  — signature ${SIGNATURE_STAT[type]}  (${members.length} species)`,
      '─'.repeat(78),
    );
    const w = Math.max(...members.map((s) => s.name.length));
    for (const s of members) {
      out.push(`  ${s.name.padEnd(w)}  ${s.osmTag}`);
      out.push(`  ${' '.repeat(w)}  ${s.blurb}`);
    }
  }
  const covered = Object.values(TAG_TO_TYPE).length;
  out.push(
    '',
    `${CATALOG.length} species across ${TYPES.length} types. ` +
      `${covered} OSM tags map to a type; ${CATALOG.length} of them have a haunt.`,
  );
  return out.join('\n');
}

/** One row per haunt, sorted by type then name. */
function asMarkdown() {
  const order = new Map(TYPES.map((t, i) => [t, i]));
  const rows = [...CATALOG].sort(
    (a, b) => order.get(a.type) - order.get(b.type) || a.name.localeCompare(b.name),
  );
  const out = [
    '| # | Haunt | Type | Signature | Found at | Blurb |',
    '|---|---|---|---|---|---|',
  ];
  rows.forEach((s, i) => {
    out.push(
      `| ${i + 1} | **${s.name}** | ${s.type} | ${SIGNATURE_STAT[s.type]} | \`${s.osmTag}\` | ${s.blurb} |`,
    );
  });
  return out.join('\n');
}

/** Tags that classify correctly and then yield nothing. */
function asGaps() {
  const have = new Set(CATALOG.map((s) => s.osmTag));
  const out = [];
  for (const type of TYPES) {
    const missing = Object.entries(TAG_TO_TYPE)
      .filter(([tag, t]) => t === type && !have.has(tag))
      .map(([tag]) => tag);
    out.push(`\n${type} — ${missing.length} tags with no haunt:`, `  ${missing.join(', ')}`);
  }
  return out.join('\n');
}

const arg = process.argv[2];
const render =
  { '--csv': asCsv, '--md': asMarkdown, '--gaps': asGaps }[arg] ?? asTable;
console.log(render());
