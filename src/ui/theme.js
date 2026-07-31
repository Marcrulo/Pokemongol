export const C = {
  bg: '#0E0B14',
  card: '#181322',
  line: '#2A2338',
  text: '#EDE9F5',
  dim: '#8B82A3',
  accent: '#7C5CFF',
};

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
