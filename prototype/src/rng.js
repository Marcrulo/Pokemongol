/**
 * Seeded RNG. `Math.random` cannot be seeded, and the spawner must be
 * reproducible — the same day and seed always produce the same haunts, so
 * balance can be tuned and regression-tested.
 *
 * mulberry32: small, fast, good enough for game rolls. Not cryptographic.
 */

/**
 * @param {number} seed
 * @returns {{random(): number, choice<T>(items: T[]): T, int(n: number): number}}
 */
export function makeRng(seed) {
  let a = seed >>> 0;
  const random = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    random,
    int: (n) => Math.floor(random() * n),
    choice: (items) => items[Math.floor(random() * items.length)],
  };
}

/**
 * Derive a stable seed from strings/numbers, so a given day at a given place
 * always rolls the same haunt even if the app is reinstalled.
 * @param {...(string|number)} parts
 * @returns {number}
 */
export function seedFrom(...parts) {
  let h = 2166136261 >>> 0;
  for (const ch of parts.join('|')) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
