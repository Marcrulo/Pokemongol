/**
 * The species catalog: 30 location types, one haunt each.
 *
 * A flat data table on purpose. Adding location types later is data entry, not
 * code — nothing else in the app reads the length of this list.
 *
 * @typedef {Object} Species
 * @property {string} id
 * @property {string} name
 * @property {string} osmTag
 * @property {string} type
 * @property {string} blurb
 * @property {string|null} [art]   filled in later; nothing depends on it yet
 */

/** @type {readonly Species[]} */
export const CATALOG = Object.freeze([
  // --- Water ---
  { id: 'foam_lad', name: 'The Lad of the Foam', osmTag: 'natural=beach', type: 'Water',
    blurb: 'Has been about to go in for two hours.' },
  { id: 'slow_brown_god', name: 'The Slow Brown God', osmTag: 'waterway=river', type: 'Water',
    blurb: 'Carries one shopping trolley everywhere it goes.' },
  { id: 'duckwater_nan', name: 'Duckwater Nan', osmTag: 'natural=water', type: 'Water',
    blurb: 'Feeds bread to the ducks. The ducks have asked her to stop.' },
  { id: 'ankle_deep_alan', name: 'Ankle-Deep Alan', osmTag: 'natural=wetland', type: 'Water',
    blurb: "Knows exactly which tussock holds your weight. Won't say." },

  // --- Green ---
  { id: 'twig_snapper', name: 'The Thing That Snaps Twigs Deliberately', osmTag: 'natural=wood', type: 'Green',
    blurb: 'It is always the same distance behind you. It is being polite.' },
  { id: 'unmown_corner', name: 'Keeper of the Unmown Corner', osmTag: 'leisure=park', type: 'Green',
    blurb: 'Guards the one patch the council forgot. Fiercely.' },
  { id: 'six_fields', name: 'Six Fields of Nothing', osmTag: 'landuse=farmland', type: 'Green',
    blurb: 'Grows a crop nobody ordered, on a schedule nobody set.' },
  { id: 'hat_taker', name: 'The Wind That Takes Your Hat', osmTag: 'natural=peak', type: 'Green',
    blurb: 'Waits for the summit photo. Times it perfectly.' },

  // --- Fluorescent ---
  { id: 'aisle_seven', name: 'The Spirit of Aisle Seven', osmTag: 'shop=supermarket', type: 'Fluorescent',
    blurb: 'Has been restocking the same shelf for eleven years. Nobody asked it to.' },
  { id: 'night_clerk', name: 'Night Clerk Eternal', osmTag: 'shop=convenience', type: 'Fluorescent',
    blurb: 'The shift ended in 2009. It has not been informed.' },
  { id: 'second_opinion', name: 'Our Lady of the Second Opinion', osmTag: 'amenity=pharmacy', type: 'Fluorescent',
    blurb: 'Will read the label to you slowly, until you feel foolish.' },
  { id: 'wet_break_bell', name: 'The Wet-Break Bell', osmTag: 'amenity=school', type: 'Fluorescent',
    blurb: 'Smells permanently of poster paint and disappointment.' },

  // --- Hearth ---
  { id: 'four_am_proof', name: 'The Four A.M. Proof', osmTag: 'shop=bakery', type: 'Hearth',
    blurb: 'Awake before everyone. Insufferable about it.' },
  { id: 'third_flat_white', name: 'The Third Flat White', osmTag: 'amenity=cafe', type: 'Hearth',
    blurb: 'You did not need this one. It knew that when it arrived.' },
  { id: 'last_orders', name: 'Last Orders', osmTag: 'amenity=pub', type: 'Hearth',
    blurb: 'Has one more anecdote. It is the same anecdote.' },
  { id: 'table_for_one', name: 'Table For One', osmTag: 'amenity=restaurant', type: 'Hearth',
    blurb: 'Reads the menu twice to look busy. Everyone understands.' },
  { id: 'warm_drum', name: 'Warm Drum Wendy', osmTag: 'shop=laundry', type: 'Hearth',
    blurb: 'The single most comforting entity in this catalog. No contest.' },
  { id: 'half_inch_off', name: 'Half An Inch Off', osmTag: 'shop=hairdresser', type: 'Hearth',
    blurb: 'You said a little shorter. It heard something else.' },

  // --- Stone ---
  { id: 'gallery_fourteen', name: 'The Hush of Gallery Fourteen', osmTag: 'tourism=museum', type: 'Stone',
    blurb: 'Stands closer to the painting than the rope allows. Nobody stops it.' },
  { id: 'overdue_shelf', name: 'The Overdue Shelf', osmTag: 'amenity=library', type: 'Stone',
    blurb: 'Keeps a list. You are on it. It has never mentioned this.' },
  { id: 'under_the_span', name: 'Under The Span', osmTag: 'bridge=yes', type: 'Stone',
    blurb: 'Repeats your footsteps back at you, slightly wrong.' },

  // --- Rust ---
  { id: 'level_three_bay', name: 'Level Three, Bay Forty', osmTag: 'amenity=parking', type: 'Rust',
    blurb: 'Circulates a crisp packet endlessly. Has done for some time.' },
  { id: 'pump_four', name: 'Pump Four (Out Of Order)', osmTag: 'amenity=fuel', type: 'Rust',
    blurb: 'The sign has been laminated. This is a permanent arrangement.' },
  { id: 'cone_lord', name: 'The Cone Lord', osmTag: 'landuse=construction', type: 'Rust',
    blurb: 'Coned off a stretch of road in March. No work has occurred.' },
  { id: 'aisle_of_screws', name: "The Aisle Of Screws You Don't Need", osmTag: 'shop=doityourself', type: 'Rust',
    blurb: 'Sold you the wrong size with total confidence. Twice.' },

  // --- Transit ---
  { id: 'timetable_liar', name: 'The Timetable, Lying', osmTag: 'highway=bus_stop', type: 'Transit',
    blurb: 'The bus is due. The bus has been due for some time.' },
  { id: 'platform_wind', name: 'Platform Wind', osmTag: 'railway=station', type: 'Transit',
    blurb: 'Announces something crucial, inaudibly, at the worst moment.' },

  // --- Sacred ---
  { id: 'cold_pew', name: 'The Cold Of The Back Pew', osmTag: 'amenity=place_of_worship', type: 'Sacred',
    blurb: 'Does not mind that you only came in to look at the ceiling.' },

  // --- Bone ---
  { id: 'plot_forty', name: 'The Well-Tended Plot', osmTag: 'landuse=cemetery', type: 'Bone',
    blurb: 'Someone still comes on Sundays. It has noticed. It is grateful.' },
  { id: 'corridor_hum', name: 'The Corridor Hum', osmTag: 'amenity=hospital', type: 'Bone',
    blurb: 'Has seen every kind of waiting there is.' },
]);

export const TYPES = Object.freeze([
  'Water', 'Green', 'Fluorescent', 'Hearth',
  'Stone', 'Rust', 'Transit', 'Sacred', 'Bone',
]);

export const BY_TAG = new Map(CATALOG.map((s) => [s.osmTag, s]));
export const BY_ID = new Map(CATALOG.map((s) => [s.id, s]));

/**
 * The haunt that lives at this kind of place, if any is catalogued yet.
 * @param {string} osmTag
 * @returns {Species|null}
 */
export function forTag(osmTag) {
  return BY_TAG.get(osmTag) ?? null;
}
