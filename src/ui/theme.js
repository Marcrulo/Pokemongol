export const C = {
  bg: '#0E0B14',
  card: '#181322',
  line: '#2A2338',
  text: '#EDE9F5',
  dim: '#8B82A3',
  accent: '#7C5CFF',
};

/**
 * A translucent version of any of the colours here. Gradients and scrims need
 * alpha; the palette is opaque by design, and a card's fade has to start from
 * whatever background that particular card is using.
 */
const channels = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(', ');
export const alpha = (hex, a) => `rgba(${channels(hex)}, ${a})`;

/**
 * The card's background, by rarity.
 *
 * ## Why these are hue shifts and not tints
 *
 * The obvious build — blend the rarity colour into `C.card` — runs out almost
 * immediately. Every step toward the rarity colour lightens the card, and the
 * card is carrying 10.5pt text at 5.04:1 and a chart grid whose faintest tier
 * sits at 1.54:1. Both start failing at around 7% blend, which is far too
 * little tint to see. The background would have cost legibility and still not
 * looked coloured.
 *
 * So each of these takes the rarity colour's *hue* and solves for the
 * lightness that reproduces `C.card`'s exact relative luminance. Nothing drawn
 * on the card shifts by more than 0.02 of a contrast ratio against any of
 * them — a Reaper's card measures the same as a Shade's — while the hue is
 * free to move the whole way round.
 *
 * Saturation then ramps with the tier, 0.10 to 0.46, so the background says
 * *how rare* as well as *which*: a Shade is very nearly the neutral card it
 * always was, and a Reaper is unmistakably warm. That makes this the fourth
 * redundant carrier of rarity, after the enclosed area, the mark and word, and
 * the frame on the top two tiers.
 */
export const RARITY_BG = {
  Shade: '#161519',
  Phantom: '#11161B',
  Wraith: '#0D1713',
  Revenant: '#1C1125',
  Reaper: '#1D130B',
};

/**
 * The radar's grid, in three tiers.
 *
 * `C.line` measures 1.21:1 against the card — a divider that is meant to be
 * felt rather than seen, which is right for a rule between rows and wrong for
 * a chart, where it simply vanished. These are measured against `C.card` and
 * chosen to stack in a legible order, strongest last:
 *
 *   rings  1.54:1   the 33% and 66% references, deliberately faintest
 *   spokes 2.01:1   the five axes
 *   edge   3.06:1   the outer pentagon, which frames the whole plot
 *
 * The plotted polygon sits on top of all three at the type colour's full
 * strength — around 5-6:1 — so the data always outranks the scaffolding.
 */
export const GRID = {
  rings: '#3C3350',
  spokes: '#4E4368',
  edge: '#6B5C8C',
};

/**
 * Opacity of the polygon's fill. At 0.22 the fill measured below the grid it
 * was drawn over, which read as a mistake; 0.34 puts it just above.
 */
export const FILL_OPACITY = 0.34;

/**
 * Rarity is the one place colour is allowed to shout — but never alone.
 *
 * Shade was #6E6880, which measures 3.44:1 against the card and fails AA at
 * 12px. The most common tier was the least legible thing on the card.
 */
export const RARITY_COLOR = {
  Shade: '#8B8399',
  Phantom: '#5B8FB9',
  Wraith: '#4FB286',
  Revenant: '#C77DFF',
  Reaper: '#FF9F45',
};

/** The same marks the terminal renderer uses, so the two agree. */
export const RARITY_MARK = {
  Shade: '·',
  Phantom: '∘',
  Wraith: '+',
  Revenant: '✳',
  Reaper: '★',
};

/**
 * The top two tiers get a full frame and a larger name. Restraint that
 * suddenly turns formal reads as a headstone; a glow would read as a jackpot,
 * which is the wrong game.
 */
export const isFormal = (rarity) => rarity === 'Revenant' || rarity === 'Reaper';

export const TYPE_COLOR = {
  Occupations: '#B9705B',
  Cultural: '#C0A15B',
  Forest: '#5FA463',
  Water: '#4E93B8',
  Graveyard: '#8C7BA6',
};
