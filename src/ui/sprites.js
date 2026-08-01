/**
 * Species artwork.
 *
 * ## Why this is a hand-written map
 *
 * Metro resolves `require` at build time from a literal path. There is no
 * `require(`../assets/sprites/${id}.png`)` — it does not fail at runtime, it
 * fails to bundle — so the only way to ship an image is to name it here. That
 * is the whole reason this file exists rather than a directory scan.
 *
 * ## Adding art for a haunt
 *
 *   1. Draw it, and put the source in `sprites/`
 *   2. `python3 tools/prep-sprites.py` — trims to the figure and resamples to
 *      twice the display width, so every haunt reads the same size and pixel
 *      art stays crisp. Skipping this is the difference between a card that
 *      looks composed and one where the figure is a speck
 *   3. Rename the output in `assets/sprites/` to the species id
 *   4. Add one line below
 *
 * Anything not listed draws the monogram placeholder in `HauntSprite.js`, so a
 * half-illustrated catalogue still renders. The `art` field on a species is
 * not consulted: keeping the mapping beside the `require` calls means one
 * place to look when a sprite does not appear.
 *
 * The seven below are placeholders — the Bulbasaur line standing in for Forest
 * haunts, so the green reads against the Forest type colour while the real art
 * is drawn.
 */

/** @type {Record<string, number>} species id → Metro asset handle */
export const SPRITES = {
  bed_that_was_weeded: require('../../assets/sprites/bed_that_was_weeded.png'),
  one_good_tree: require('../../assets/sprites/one_good_tree.png'),
  planted_rows: require('../../assets/sprites/planted_rows.png'),
  six_fields: require('../../assets/sprites/six_fields.png'),
  twig_snapper: require('../../assets/sprites/twig_snapper.png'),
  unmown_corner: require('../../assets/sprites/unmown_corner.png'),
  waist_high: require('../../assets/sprites/waist_high.png'),
};

/**
 * @param {string} speciesId
 * @returns {number|null} the asset handle, or null to fall back
 */
export function spriteFor(speciesId) {
  return SPRITES[speciesId] ?? null;
}
