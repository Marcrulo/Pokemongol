# Haunts — Design

**Date:** 2026-07-30
**Status:** Approved for prototype

## Idea

Pokémon GO without the screen. The app tracks where you go and collects
creatures for you. You never play it while walking — you open it once, in the
evening, to see what found you today.

## Theme

Every place has a small, petty local god born from that spot. A supermarket, a
bus stop, a puddle. These are **haunts** — a haunt is both a spirit and a place
you frequent, so the word already carries the whole idea.

The theme was chosen because it justifies three things the idea needs rather
than merely decorating them:

- Mundane places spawning creatures makes sense — every place has a spirit.
- Types are automatic: a pond spirit *is* Water. No separate typing rule.
- Absurd stats read as characterisation, not as noise.

## Core loop

Fully passive with an evening review. The app auto-collects everything
silently. No notifications, no map, no buttons to press while out. You open it
once a day and it shows you what attached to you.

**A haunt only attaches if you stay within the same area for at least 5
minutes.** Walking past a supermarket collects nothing; doing your shopping
collects the Spirit of Aisle Seven. This is the central rule — it makes
lingering the verb of the game.

## Types and the location catalog

Five haunt types. Each owns exactly one stat — its **signature** — which is what
gives a haunt of that type its character.

| Type | Signature stat | Where it is found |
|---|---|---|
| **Occupations** | Dread | Shops, trades, services, schools, transit, industry |
| **Cultural** | Anchor | Monuments, castles, museums, churches, libraries, theatres |
| **Forest** | Insight | Woods, parks, fields, peaks, moors — nature generally |
| **Water** | Presence | Lakes, rivers, coast, wetlands, springs, harbours |
| **Graveyard** | Power | Cemeteries, tombs, mausoleums, crematoria |

Every stat is a signature for exactly one type, so no stat is anonymous.

### Mapping OpenStreetMap onto five types

`src/types.js` maps **130+ OSM tags** into the five types, resolved in two steps:

1. **Exact tag** — `shop=butcher` → Occupations, `historic=castle` → Cultural.
2. **Key fallback** — whole namespaces where every value fits one type:
   `office=` and `craft=` → Occupations, `waterway=` → Water, `historic=` →
   Cultural.

Exact entries beat the fallback, which is how `historic=tomb` lands in Graveyard
while every other `historic=` is Cultural. Unmapped tags return `null` and yield
nothing — a dormitory is not a haunt.

This table is the single source of truth for place classification. A species
declares only its OSM tag and **derives** its type, so the two cannot drift.

Adding coverage is data entry: append a tag to the right list.

## Data model

The key split is **species vs. catch**.

- **Species** — 30 rows, authored once, shipped in the bundle. Name, OSM tag,
  description, art slot. Type is derived, not stored.
- **Catch** — unlimited, generated. A species plus a rarity roll plus rolled
  stats plus timestamp, place name, and weather.

30 species, infinite catches. Your fifth Spirit of Aisle Seven is a different
creature from your first, and only one of them is worth keeping.

### Stats

Five axes, shown as a radar chart, identical across all species so any two
haunts are comparable. **Each axis is scored 0–100.**

| Stat | Meaning |
|---|---|
| **Power** | Raw force |
| **Dread** | Scariness |
| **Anchor** | Durability — how firmly it holds its place in the world |
| **Presence** | Aura, "feltness" |
| **Insight** | Intelligence and wisdom |

Rarity sets how many points there are to distribute across the five:

| Rarity | Points | Base chance | Chance at 20k steps |
|---|---|---|---|
| Shade | 50 | 55% | 15% |
| Phantom | 75 | 27% | 22% |
| Wraith | 100 | 13% | 30% |
| Revenant | 125 | 4% | 23% |
| Reaper | 150 | 1% | 10% |

Steps walked that day shift the distribution away from Shade toward the higher
tiers, saturating at 20,000 steps. More walking means better haunts, never more
haunts — the number you get is governed by where you lingered.

### Allocating the points

Stats are **not** uniformly random: the spread has to read as the haunt's
identity. A Graveyard Reaper should look like raw Power, a Forest one like
Insight. Allocation runs in two stages:

1. **Reserve** 35% of the budget for the type's signature stat.
2. **Distribute** the remainder with Dirichlet(1,…,1) weights — uniform over the
   simplex, so the four non-signature axes are treated alike and spiky rolls are
   common — with the signature's weight doubled.

Clamping at 100 leaves a remainder, handed back out one point at a time so the
total lands exactly on the budget.

Both dials were tuned empirically over 20,000 rolls:

| Reserve | Weight | Signature is highest | Signature's share | Spread (sd) |
|---|---|---|---|---|
| 0.30 | 1.0 | 76% | 44% | 11 |
| **0.35** | **2.0** | **94%** | **54%** | **13** |
| 0.40 | 2.5 | 99% | 60% | 12 |

0.35 / 2.0 is the chosen point: identity is unmistakable on ~94% of haunts,
while roughly one in sixteen still surprises you. Pushing higher makes every
haunt of a type look the same. A regression test pins the rate between 90% and
99% in both directions.

## Platform

**JavaScript, via React Native + Expo.** A plain web app or PWA is ruled out:
browsers cannot read location once the tab is closed, so a web build could only
collect while held open on-screen — the exact opposite of the idea. JS in a
native wrapper is fine, and keeps the domain logic reusable.

Verified constraints:

- `expo-location`'s `startLocationUpdatesAsync` + `expo-task-manager` gives real
  background tracking, with `timeInterval: 30000` for the 30-second cadence.
- Requires `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE`, and
  `FOREGROUND_SERVICE_LOCATION`, enabled through the config plugin's
  `isAndroidBackgroundLocationEnabled` / `isAndroidForegroundServiceEnabled`.
- **Needs a development build.** Background location does not work in Expo Go
  on Android.
- **A persistent notification is mandatory.** Android will not let a foreground
  service hide, so the "invisible" app always occupies one line in the
  notification shade. Treat its wording as part of the design rather than
  something to fight.
- `expo-sqlite` for local storage.

The domain logic (catalog, dwell detection, spawner) is plain ES modules with no
platform imports, so it runs under Node for testing and imports unchanged into
the app.

## Architecture

Five components, each independently testable.

- **Tracker** — Expo background location task backed by an Android foreground
  service. One GPS fix every 30 seconds. Writes a location trail. The only
  battery-sensitive component.
- **Dwell detector** — trail → list of stays. Consecutive fixes within 50 m of a
  cluster anchor; a cluster lasting ≥ 5 minutes is a stay. 50 m absorbs GPS
  jitter without merging adjacent shops. A cluster also ends when the trail
  goes quiet for more than four intervals: on real hardware Android delivers
  in bursts and then nothing for minutes, and unobserved time must not count
  as time spent.
- **Resolver** — stay coordinates → location tag, via a cached Overpass query.
  Behind an interface, with an offline fallback so the rest of the app never
  depends on the network.
- **Spawner** — pure function:
  `(location tag, steps, weather, time, seed) → Catch`. No I/O, so balance can
  be tuned and tested without walking anywhere.
- **Store** — local SQLite via `expo-sqlite`. All user data stays on the device.
- **Review UI** — the one screen that matters. Opens on "here's what found you
  today."

## Locality

All user data — trails, stays, catches — lives in a local SQLite database.
There is no backend and nothing is uploaded.

The single exception is the Resolver: deciding that a coordinate is a
supermarket requires map data, which is inherently external. It is a read-only,
aggressively cached public Overpass query (no API key, no billing, no user data
sent beyond a coordinate). It sits behind an interface so it can be swapped for
a bundled offline extract later.

## Prototype scope

Built now, in `prototype/`, as runnable ES modules under Node — the same files
the app will import:

- The 30-species catalog
- Dwell detection over a synthetic GPS trail at the real 30-second cadence
- The spawner: rarity curve, stat rolls, seeded and reproducible
- A store interface, with an in-memory implementation and the SQL schema for
  `expo-sqlite`
- A terminal renderer for the daily review
- 38 tests, including statistical checks that the rarity sampler matches its
  own weights and that no stat axis is favoured

Deliberately out of scope for the prototype: the Expo shell, the real location
task, Overpass resolution, and illustration. Each has a defined seam.

## Open question found by the prototype

**GPS drift double-collects long visits.** Across 300 simulated days with ~13 m
of positional noise, 26% split a single long visit into two qualifying stays —
so one 41-minute trip to the park yields two haunts. The dwell detector is
behaving correctly; it reports what the trail says. The rule needs to live one
layer up, and it is a game-design decision rather than a bug fix:

- **One haunt per place per day** — simplest, and makes each place a daily
  ration. Recommended.
- **Merge stays** at the same resolved place within some gap (say 20 minutes)
  before spawning.
- **Leave it** — treat re-attachment as legitimate, since you really were there
  for ages.

Unresolved; the prototype currently does none of these, so the raw behaviour
stays visible.

## Open: species coverage is lopsided

280 OSM tags now map to a type, but only 30 have a species, and they are not
spread evenly:

| Type | Tags mapped | Species |
|---|---|---|
| Occupations | 127 | 17 |
| Cultural | 52 | 4 |
| Forest | 42 | 4 |
| Water | 43 | 4 |
| Graveyard | 16 | 1 |

So a crematorium, a mausoleum and a tomb all classify correctly as Graveyard and
then yield nothing, because only `landuse=cemetery` has a haunt. Roughly 15–20
new species would balance this. Not yet written.

Two ways to close it, undecided:

- **Author a species per popular tag** — keeps every haunt specific and
  characterful, but the catalog has to keep growing forever.
- **Add a generic fallback haunt per type** — any mapped place then yields
  something, and specific species become the treat. Caps the authoring work at
  five extra entries.

## Next step

Turn this spec into an implementation plan for the Expo app. Blocked on nothing
except the species question above, which can also be settled later — the seams
already exist.

Note: `npm` is not on PATH on the development machine even though `node` is;
that needs fixing before `create-expo-app`.

## Deferred

- **Weather** is recorded on every catch but does not yet affect rolls. The
  measurement layer is specified in
  [2026-07-31-weather-measurement-design.md](2026-07-31-weather-measurement-design.md);
  what conditions *do* to a haunt is deliberately left until there is real data.
- **Illustration.** Cards are typographic for now; species carry an art slot
  that can be filled without touching anything else.
- **Location catalog expansion** beyond 30, which is pure data entry.
