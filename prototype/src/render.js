/**
 * Terminal rendering of the evening review.
 *
 * The app will draw a real radar chart; bars are the honest stand-in here. What
 * this is actually testing is whether the reveal reads well — the wording, the
 * ordering, and whether a good roll is visibly exciting.
 *
 * @typedef {import('./spawner.js').Catch} Catch
 */

import { STAT_CAP, STAT_NAMES } from './spawner.js';
import { summarize } from './conditions.js';
import { BY_ID } from './species.js';
import { signatureFor } from './types.js';

const BAR_W = 22;
/** Every card line is exactly this wide between the borders. */
const INNER = 46;
const RARITY_MARK = {
  Shade: '·', Phantom: '∘', Wraith: '+', Revenant: '*', Reaper: '★',
};
const LABEL_W = Math.max(...STAT_NAMES.map((s) => s.length));

export { INNER };

/** @param {number} seconds */
export function clock(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** @param {number} value */
export function bar(value) {
  const filled = Math.round((BAR_W * value) / STAT_CAP);
  return '█'.repeat(filled) + '░'.repeat(BAR_W - filled);
}

/** One card line, truncated or padded to the exact inner width. */
const row = (content) => `│${content.slice(0, INNER).padEnd(INNER)}│`;
const rule = (left, right) => left + '─'.repeat(INNER) + right;

/** @param {string} text @param {number} width */
function wrap(text, width) {
  const out = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (line && line.length + 1 + word.length > width) {
      out.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) out.push(line);
  return out;
}

/**
 * @param {Catch} c
 * @returns {string}
 */
export function card(c) {
  const sp = BY_ID.get(c.speciesId);
  const mark = RARITY_MARK[c.rarity] ?? '?';
  const mins = Math.floor(c.dwellSeconds / 60);

  const lines = [
    rule('┌', '┐'),
    row(` ${sp.name}`),
    row(` ${mark} ${c.rarity} · ${sp.type}`),
    rule('├', '┤'),
  ];
  const signature = signatureFor(sp.type);
  for (const name of STAT_NAMES) {
    const v = c.stats[name];
    const mark = name === signature ? '▸' : ' ';
    lines.push(row(`${mark} ${name.padEnd(LABEL_W)} ${bar(v)} ${String(v).padStart(3)}`));
  }
  lines.push(
    rule('├', '┤'),
    row(`  Total ${c.total}`),
    row(`  ${c.placeName}`),
    row(`  ${clock(c.caughtAt)} · stayed ${mins} min`),
    // Conditions get their own line: at 46 columns the summary does not fit
    // beside the time, and truncating it loses the daylight band on the end.
    row(`  ${summarize(c.weather)}`),
    rule('├', '┤'),
  );
  for (const chunk of wrap(sp.blurb, INNER - 4)) lines.push(row(`  ${chunk}`));
  lines.push(rule('└', '┘'));
  return lines.join('\n');
}

/**
 * The one screen that matters.
 * @param {string} day
 * @param {Catch[]} catches
 * @param {number} steps
 * @param {number} seen
 * @param {number} total
 * @returns {string}
 */
export function review(day, catches, steps, seen, total) {
  const head = [
    '',
    '═'.repeat(48),
    `  ${day}`,
    `  ${steps.toLocaleString('en-US')} steps · ${catches.length} haunt(s) attached`,
    `  Dex ${seen}/${total}`,
    '═'.repeat(48),
    '',
  ];
  if (catches.length === 0) {
    head.push(
      '  Nothing stayed with you today.',
      '  You have to linger somewhere for 5 minutes.',
      '',
    );
    return head.join('\n');
  }
  const body = [...catches]
    .sort((a, b) => a.caughtAt - b.caughtAt)
    .map(card);
  return `${head.join('\n')}${body.join('\n\n')}\n`;
}
