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

  // --- Water, second wave ---
  { id: 'brook_insists', name: 'The Brook That Insists', osmTag: 'waterway=stream',
    blurb: 'Small. Loud. Convinced it is a river.' },
  { id: 'straight_water', name: 'Straight Water', osmTag: 'waterway=canal',
    blurb: 'Was dug. Has never entirely forgiven anyone for that.' },
  { id: 'first_cold_mouthful', name: 'The First Cold Mouthful', osmTag: 'natural=spring',
    blurb: 'Older than the town that grew around it. Unimpressed by the town.' },
  { id: 'rope_against_mast', name: 'Rope Against Mast', osmTag: 'leisure=marina',
    blurb: 'Clinks all night. Sleeps all day. Owns nothing.' },
  { id: 'end_of_the_boards', name: 'The End Of The Boards', osmTag: 'man_made=pier',
    blurb: 'Everyone walks to the end, turns around, walks back. It counts.' },
  { id: 'everyones_change', name: "Everyone's Loose Change", osmTag: 'amenity=fountain',
    blurb: 'Holds four thousand wishes. Has granted none. Keeps them anyway.' },

  // --- Forest, second wave ---
  { id: 'one_good_tree', name: 'The One Good Tree', osmTag: 'natural=tree',
    blurb: 'The whole street is named after it. Nobody has ever told it so.' },
  { id: 'planted_rows', name: 'The Planted Rows', osmTag: 'landuse=forest',
    blurb: 'Grew exactly where it was told. Resents the straight lines.' },
  { id: 'bed_that_was_weeded', name: 'The Bed That Was Weeded', osmTag: 'leisure=garden',
    blurb: 'Someone knelt here for an hour. It remembers which hour.' },
  { id: 'waist_high', name: 'Waist-High And Full Of Insects', osmTag: 'landuse=meadow',
    blurb: 'Looks soft from the gate. Is not soft.' },
  { id: 'shed_eleven', name: 'Shed Number Eleven', osmTag: 'landuse=allotments',
    blurb: 'Contains one chair, one radio, and forty years.' },
  { id: 'cold_that_comes_out', name: 'The Cold That Comes Out', osmTag: 'natural=cave_entrance',
    blurb: 'Breathes out in summer and in during winter. Nobody enjoys this.' },

  // --- Occupations, second wave ---
  { id: 'ice_machine', name: 'The Ice Machine Is Broken', osmTag: 'amenity=fast_food',
    blurb: 'It is broken. It has always been broken. It will be broken.' },
  { id: 'queue_one_teller', name: 'The Queue For One Teller', osmTag: 'amenity=bank',
    blurb: 'Four windows. One open. This is not an accident.' },
  { id: 'form_filled_wrong', name: 'The Form You Filled In Wrong', osmTag: 'amenity=post_office',
    blurb: 'Section 4b. It knew at the time. It let you finish.' },
  { id: 'something_apology', name: 'Something For An Apology', osmTag: 'shop=florist',
    blurb: 'Can tell what you did from which bouquet you reach for.' },
  { id: 'table_near_door', name: "The Table Of Books You Won't Read", osmTag: 'shop=books',
    blurb: 'Face out, by the door, full of hope. It believes in you regardless.' },
  { id: 'reading_week', name: "The Reading Week That Wasn't", osmTag: 'amenity=university',
    blurb: 'Everyone said they would start on the Monday.' },
  { id: 'january_membership', name: 'The January Membership', osmTag: 'leisure=fitness_centre',
    blurb: 'Signed up with genuine conviction. Attended twice.' },

  // --- Cultural, second wave ---
  { id: 'draughty_hall', name: 'The Draughty Great Hall', osmTag: 'historic=castle',
    blurb: 'Was never comfortable. Was never intended to be.' },
  { id: 'public_subscription', name: 'Erected By Public Subscription', osmTag: 'historic=monument',
    blurb: 'The plaque lists every donor. It does not list the reason.' },
  { id: 'names_alphabetical', name: 'The Names In Alphabetical Order', osmTag: 'historic=memorial',
    blurb: 'Reads them all through each night, reaches the end, and begins again.' },
  { id: 'half_a_wall', name: 'Half A Wall', osmTag: 'historic=ruins',
    blurb: 'Was something once. Declines to say what.' },
  { id: 'understudy_waiting', name: 'The Understudy, Waiting', osmTag: 'amenity=theatre',
    blurb: 'Knows every line of it. Has never once been needed.' },
  { id: 'trailers_started', name: 'The Trailers Have Started', osmTag: 'amenity=cinema',
    blurb: 'You are late. It began without you. It does not mind.' },

  // --- Graveyard, second wave ---
  { id: 'churchyard_yew', name: 'The Churchyard Yew', osmTag: 'amenity=grave_yard',
    blurb: 'Older than the church. Has opinions about the church.' },
  { id: 'very_careful_man', name: 'The Very Careful Man', osmTag: 'amenity=crematorium',
    blurb: 'Learned to say every name properly. All of them. Every one.' },
  { id: 'name_worn_smooth', name: 'The Name Worn Smooth', osmTag: 'historic=grave',
    blurb: 'Cannot remember it either. You two have that much in common.' },
  { id: 'family_still_arguing', name: 'The Family, Still Arguing', osmTag: 'historic=mausoleum',
    blurb: 'Six of them. One room. Ninety years. No resolution.' },
  { id: 'good_sandwiches', name: 'The Good Sandwiches', osmTag: 'amenity=funeral_hall',
    blurb: 'Nobody expected the sandwiches to be this good. It is quietly proud.' },
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
