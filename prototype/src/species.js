/**
 * The species catalog: 30 haunts, each tied to one OpenStreetMap tag.
 *
 * A species declares only its tag. Its **type is derived** from
 * `types.js`, so the catalog and the tag mapping can never drift apart.
 *
 * @typedef {Object} Species
 * @property {string} id
 * @property {string} name
 * @property {string} osmTag
 * @property {string} type    derived — one of the five
 * @property {string} blurb
 * @property {string|null} [art]   filled in later; nothing depends on it yet
 */

import { typeForTag } from './types.js';

/** @type {Array<Omit<Species, 'type'>>} */
const RAW = [
  // --- Water ---
  { id: 'foam_lad', name: 'The Lad of the Foam', osmTag: 'natural=beach',
    blurb: 'Has been about to go in for two hours.' },
  { id: 'slow_brown_god', name: 'The Slow Brown God', osmTag: 'waterway=river',
    blurb: 'Carries one shopping trolley everywhere it goes.' },
  { id: 'duckwater_nan', name: 'Duckwater Nan', osmTag: 'natural=water',
    blurb: 'Feeds bread to the ducks. The ducks have asked her to stop.' },
  { id: 'ankle_deep_alan', name: 'Ankle-Deep Alan', osmTag: 'natural=wetland',
    blurb: "Knows exactly which tussock holds your weight. Won't say." },

  // --- Forest ---
  { id: 'twig_snapper', name: 'The Thing That Snaps Twigs Deliberately', osmTag: 'natural=wood',
    blurb: 'It is always the same distance behind you. It is being polite.' },
  { id: 'unmown_corner', name: 'Keeper of the Unmown Corner', osmTag: 'leisure=park',
    blurb: 'Guards the one patch the council forgot. Fiercely.' },
  { id: 'six_fields', name: 'Six Fields of Nothing', osmTag: 'landuse=farmland',
    blurb: 'Grows a crop nobody ordered, on a schedule nobody set.' },
  { id: 'hat_taker', name: 'The Wind That Takes Your Hat', osmTag: 'natural=peak',
    blurb: 'Waits for the summit photo. Times it perfectly.' },

  // --- Occupations ---
  { id: 'aisle_seven', name: 'The Spirit of Aisle Seven', osmTag: 'shop=supermarket',
    blurb: 'Has been restocking the same shelf for eleven years. Nobody asked it to.' },
  { id: 'night_clerk', name: 'Night Clerk Eternal', osmTag: 'shop=convenience',
    blurb: 'The shift ended in 2009. It has not been informed.' },
  { id: 'second_opinion', name: 'Our Lady of the Second Opinion', osmTag: 'amenity=pharmacy',
    blurb: 'Will read the label to you slowly, until you feel foolish.' },
  { id: 'wet_break_bell', name: 'The Wet-Break Bell', osmTag: 'amenity=school',
    blurb: 'Smells permanently of poster paint and disappointment.' },
  { id: 'four_am_proof', name: 'The Four A.M. Proof', osmTag: 'shop=bakery',
    blurb: 'Awake before everyone. Insufferable about it.' },
  { id: 'third_flat_white', name: 'The Third Flat White', osmTag: 'amenity=cafe',
    blurb: 'You did not need this one. It knew that when it arrived.' },
  { id: 'last_orders', name: 'Last Orders', osmTag: 'amenity=pub',
    blurb: 'Has one more anecdote. It is the same anecdote.' },
  { id: 'table_for_one', name: 'Table For One', osmTag: 'amenity=restaurant',
    blurb: 'Reads the menu twice to look busy. Everyone understands.' },
  { id: 'warm_drum', name: 'Warm Drum Wendy', osmTag: 'shop=laundry',
    blurb: 'The single most comforting entity in this catalog. No contest.' },
  { id: 'half_inch_off', name: 'Half An Inch Off', osmTag: 'shop=hairdresser',
    blurb: 'You said a little shorter. It heard something else.' },
  { id: 'level_three_bay', name: 'Level Three, Bay Forty', osmTag: 'amenity=parking',
    blurb: 'Circulates a crisp packet endlessly. Has done for some time.' },
  { id: 'pump_four', name: 'Pump Four (Out Of Order)', osmTag: 'amenity=fuel',
    blurb: 'The sign has been laminated. This is a permanent arrangement.' },
  { id: 'cone_lord', name: 'The Cone Lord', osmTag: 'landuse=construction',
    blurb: 'Coned off a stretch of road in March. No work has occurred.' },
  { id: 'aisle_of_screws', name: "The Aisle Of Screws You Don't Need", osmTag: 'shop=doityourself',
    blurb: 'Sold you the wrong size with total confidence. Twice.' },
  { id: 'timetable_liar', name: 'The Timetable, Lying', osmTag: 'highway=bus_stop',
    blurb: 'The bus is due. The bus has been due for some time.' },
  { id: 'platform_wind', name: 'Platform Wind', osmTag: 'railway=station',
    blurb: 'Announces something crucial, inaudibly, at the worst moment.' },
  { id: 'corridor_hum', name: 'The Corridor Hum', osmTag: 'amenity=hospital',
    blurb: 'Has seen every kind of waiting there is.' },

  // --- Cultural ---
  { id: 'gallery_fourteen', name: 'The Hush of Gallery Fourteen', osmTag: 'tourism=museum',
    blurb: 'Stands closer to the painting than the rope allows. Nobody stops it.' },
  { id: 'overdue_shelf', name: 'The Overdue Shelf', osmTag: 'amenity=library',
    blurb: 'Keeps a list. You are on it. It has never mentioned this.' },
  { id: 'under_the_span', name: 'Under The Span', osmTag: 'bridge=yes',
    blurb: 'Repeats your footsteps back at you, slightly wrong.' },
  { id: 'cold_pew', name: 'The Cold Of The Back Pew', osmTag: 'amenity=place_of_worship',
    blurb: 'Does not mind that you only came in to look at the ceiling.' },

  // --- Graveyard ---
  { id: 'plot_forty', name: 'The Well-Tended Plot', osmTag: 'landuse=cemetery',
    blurb: 'Someone still comes on Sundays. It has noticed. It is grateful.' },
];

/** @type {readonly Species[]} */
export const CATALOG = Object.freeze(RAW.map((s) => {
  const type = typeForTag(s.osmTag);
  if (type === null) {
    throw new Error(`species '${s.id}' has tag '${s.osmTag}' with no type mapping`);
  }
  return Object.freeze({ ...s, type });
}));

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

export { TYPES } from './types.js';
