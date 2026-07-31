import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { CATALOG } from '../src/species.js';

const CSV = new URL('../../docs/species.csv', import.meta.url);

/**
 * The checked-in CSV is a convenience copy, so the only real risk is that it
 * quietly stops matching the catalogue. This is the cheapest possible guard:
 * if someone adds a haunt and forgets to regenerate, the suite says so.
 */
describe('docs/species.csv', () => {
  const lines = readFileSync(CSV, 'utf8').trim().split('\n');

  it('has a row per species plus a header', () => {
    assert.equal(
      lines.length,
      CATALOG.length + 1,
      'stale — regenerate with: node prototype/catalog.js --csv > docs/species.csv',
    );
  });

  it('lists every species id', () => {
    const inFile = new Set(lines.slice(1).map((l) => l.split(',')[0]));
    for (const s of CATALOG) {
      assert.ok(inFile.has(s.id), `${s.id} missing — regenerate the CSV`);
    }
  });
});
