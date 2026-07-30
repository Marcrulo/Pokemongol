/**
 * The five haunt types, their signature stats, and the OpenStreetMap mapping.
 *
 * This is the single source of truth for "what kind of place is this?". A
 * species declares only its OSM tag; its type is derived from this table, so
 * the two can never drift apart.
 *
 * Lookup order in `typeForTag`:
 *   1. exact tag       'shop=supermarket'
 *   2. key wildcard    'office='        (any office is an Occupation)
 * Exact entries win, so `historic=tomb` is a Graveyard even though every other
 * `historic=` is Cultural.
 */

export const TYPES = Object.freeze([
  'Occupations', 'Cultural', 'Forest', 'Water', 'Graveyard',
]);

/** Each type leans on one stat. This is what gives a haunt its identity. */
export const SIGNATURE_STAT = Object.freeze({
  Occupations: 'Dread',
  Cultural: 'Anchor',
  Forest: 'Insight',
  Water: 'Presence',
  Graveyard: 'Power',
});

const OCCUPATIONS = [
  // food and drink
  'shop=supermarket', 'shop=convenience', 'shop=bakery', 'shop=butcher',
  'shop=greengrocer', 'shop=deli', 'shop=seafood', 'shop=cheese',
  'shop=confectionery', 'shop=pastry', 'shop=alcohol', 'shop=beverages',
  'shop=wine', 'shop=coffee', 'shop=tea', 'shop=farm',
  'amenity=cafe', 'amenity=restaurant', 'amenity=fast_food', 'amenity=pub',
  'amenity=bar', 'amenity=biergarten', 'amenity=food_court',
  'amenity=ice_cream', 'amenity=marketplace',
  // body and care
  'shop=hairdresser', 'shop=beauty', 'shop=massage', 'shop=tattoo',
  'shop=optician', 'shop=chemist', 'shop=herbalist', 'amenity=pharmacy',
  'amenity=doctors', 'amenity=dentist', 'amenity=clinic', 'amenity=hospital',
  'amenity=veterinary', 'leisure=fitness_centre', 'leisure=sports_centre',
  // services and trades
  'shop=laundry', 'shop=dry_cleaning', 'shop=tailor', 'shop=shoe_repair',
  'shop=locksmith', 'shop=copyshop', 'shop=travel_agency', 'shop=funeral_directors',
  'shop=car_repair', 'shop=car_parts', 'shop=tyres', 'shop=bicycle',
  'shop=hardware', 'shop=doityourself', 'shop=trade', 'shop=paint',
  'shop=electrical', 'shop=garden_centre', 'shop=florist',
  'amenity=car_wash', 'amenity=car_rental', 'amenity=bank',
  'amenity=bureau_de_change', 'amenity=post_office', 'amenity=police',
  'amenity=fire_station', 'amenity=driving_school',
  // retail
  'shop=clothes', 'shop=shoes', 'shop=jewelry', 'shop=watches', 'shop=bag',
  'shop=books', 'shop=stationery', 'shop=newsagent', 'shop=gift', 'shop=toys',
  'shop=electronics', 'shop=mobile_phone', 'shop=computer', 'shop=video_games',
  'shop=music', 'shop=musical_instrument', 'shop=furniture', 'shop=kitchen',
  'shop=bed', 'shop=carpet', 'shop=houseware', 'shop=pet', 'shop=photo',
  'shop=sports', 'shop=outdoor', 'shop=car', 'shop=motorcycle',
  'shop=charity', 'shop=second_hand', 'shop=variety_store',
  'shop=department_store', 'shop=mall', 'shop=kiosk',
  // schooling and work
  'amenity=school', 'amenity=kindergarten', 'amenity=college',
  'amenity=university', 'amenity=language_school', 'amenity=music_school',
  'amenity=coworking_space', 'landuse=industrial', 'landuse=retail',
  'landuse=commercial', 'landuse=construction', 'man_made=works',
  // getting about
  'amenity=parking', 'amenity=fuel', 'amenity=charging_station',
  'amenity=bicycle_parking', 'amenity=bus_station', 'amenity=ferry_terminal',
  'highway=bus_stop', 'highway=services', 'highway=rest_area',
  'railway=station', 'railway=halt', 'railway=tram_stop',
  'railway=subway_entrance', 'public_transport=station', 'aeroway=terminal',
];

const CULTURAL = [
  'tourism=museum', 'tourism=gallery', 'tourism=artwork', 'tourism=attraction',
  'tourism=viewpoint', 'tourism=theme_park', 'tourism=zoo', 'tourism=aquarium',
  'historic=castle', 'historic=monument', 'historic=memorial', 'historic=ruins',
  'historic=archaeological_site', 'historic=fort', 'historic=city_gate',
  'historic=manor', 'historic=church', 'historic=tower', 'historic=aqueduct',
  'historic=wayside_cross', 'historic=wayside_shrine', 'historic=battlefield',
  'historic=heritage', 'historic=building',
  'amenity=place_of_worship', 'amenity=library', 'amenity=theatre',
  'amenity=cinema', 'amenity=arts_centre', 'amenity=community_centre',
  'amenity=townhall', 'amenity=courthouse', 'amenity=embassy',
  'amenity=monastery', 'amenity=public_bookcase', 'amenity=clock',
  'man_made=lighthouse', 'man_made=obelisk', 'man_made=tower',
  'man_made=windmill', 'man_made=watermill', 'man_made=cross',
  'building=cathedral', 'building=church', 'building=chapel', 'building=mosque',
  'building=synagogue', 'building=temple', 'building=castle',
  'bridge=yes', 'bridge=viaduct', 'tourism=information',
];

const FOREST = [
  'natural=wood', 'natural=tree', 'natural=tree_row', 'natural=scrub',
  'natural=heath', 'natural=grassland', 'natural=moor', 'natural=fell',
  'natural=shrubbery', 'natural=bare_rock', 'natural=cliff', 'natural=peak',
  'natural=ridge', 'natural=saddle', 'natural=valley', 'natural=cave_entrance',
  'natural=sand', 'natural=dune', 'natural=rock', 'natural=stone',
  'landuse=forest', 'landuse=meadow', 'landuse=farmland', 'landuse=orchard',
  'landuse=vineyard', 'landuse=allotments', 'landuse=grass',
  'landuse=greenfield', 'landuse=village_green', 'landuse=recreation_ground',
  'leisure=park', 'leisure=garden', 'leisure=nature_reserve', 'leisure=common',
  'leisure=dog_park', 'leisure=picnic_table', 'leisure=firepit',
  'boundary=national_park', 'boundary=protected_area',
  'tourism=camp_site', 'tourism=caravan_site', 'tourism=wilderness_hut',
];

const WATER = [
  'natural=water', 'natural=bay', 'natural=beach', 'natural=coastline',
  'natural=spring', 'natural=hot_spring', 'natural=geyser', 'natural=wetland',
  'natural=marsh', 'natural=strait', 'natural=shoal', 'natural=reef',
  'natural=glacier', 'natural=cape', 'natural=isthmus',
  'waterway=river', 'waterway=stream', 'waterway=canal', 'waterway=riverbank',
  'waterway=waterfall', 'waterway=dock', 'waterway=weir', 'waterway=dam',
  'waterway=lock_gate', 'waterway=boatyard',
  'landuse=basin', 'landuse=reservoir', 'landuse=salt_pond',
  'landuse=aquaculture',
  'leisure=swimming_pool', 'leisure=water_park', 'leisure=marina',
  'leisure=slipway', 'leisure=fishing',
  'man_made=pier', 'man_made=breakwater', 'man_made=groyne',
  'man_made=water_well', 'man_made=reservoir_covered',
  'amenity=fountain', 'amenity=public_bath', 'harbour=yes', 'port=yes',
];

const GRAVEYARD = [
  'landuse=cemetery', 'amenity=grave_yard', 'amenity=crematorium',
  'amenity=funeral_hall', 'amenity=mortuary',
  'historic=tomb', 'historic=grave', 'historic=mausoleum',
  'historic=cemetery', 'historic=charnel_house',
  'building=chapel_of_rest', 'building=mausoleum',
  'man_made=mausoleum', 'cemetery=grave', 'cemetery=sector',
  'place_of_worship=cemetery',
];

/** @type {Readonly<Record<string, string>>} exact OSM tag → haunt type */
export const TAG_TO_TYPE = Object.freeze(Object.fromEntries([
  ...OCCUPATIONS.map((t) => [t, 'Occupations']),
  ...CULTURAL.map((t) => [t, 'Cultural']),
  ...FOREST.map((t) => [t, 'Forest']),
  ...WATER.map((t) => [t, 'Water']),
  ...GRAVEYARD.map((t) => [t, 'Graveyard']),
]));

/**
 * Fallbacks by tag key, for whole OSM namespaces where every value fits one
 * type. Checked only when there is no exact match.
 */
export const KEY_FALLBACK = Object.freeze({
  'office=': 'Occupations',
  'craft=': 'Occupations',
  'healthcare=': 'Occupations',
  'historic=': 'Cultural',
  'waterway=': 'Water',
});

/**
 * Which of the five types a place belongs to, or null if unmapped.
 * @param {string} osmTag  e.g. 'shop=supermarket'
 * @returns {string|null}
 */
export function typeForTag(osmTag) {
  const exact = TAG_TO_TYPE[osmTag];
  if (exact) return exact;
  const eq = osmTag.indexOf('=');
  if (eq === -1) return null;
  return KEY_FALLBACK[osmTag.slice(0, eq + 1)] ?? null;
}

/**
 * The stat this type leans on.
 * @param {string} type
 * @returns {string}
 */
export function signatureFor(type) {
  const stat = SIGNATURE_STAT[type];
  if (!stat) throw new Error(`unknown haunt type: ${type}`);
  return stat;
}
