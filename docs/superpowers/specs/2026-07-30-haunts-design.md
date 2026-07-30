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

## Location catalog

30 location types at launch, each mapped to an OpenStreetMap tag. The catalog is
a flat data table so it extends to hundreds of location types later without any
code change.

| Water | Green | Fluorescent | Hearth |
|---|---|---|---|
| `natural=beach` | `natural=wood` | `shop=supermarket` | `shop=bakery` |
| `waterway=river` | `leisure=park` | `shop=convenience` | `amenity=cafe` |
| `natural=water` | `landuse=farmland` | `amenity=pharmacy` | `amenity=pub` |
| `natural=wetland` | `natural=peak` | `amenity=school` | `amenity=restaurant` |
| | | | `shop=laundry` |
| | | | `shop=hairdresser` |

| Stone | Rust | Transit | Sacred | Bone |
|---|---|---|---|---|
| `tourism=museum` | `amenity=parking` | `highway=bus_stop` | `amenity=place_of_worship` | `landuse=cemetery` |
| `amenity=library` | `amenity=fuel` | `railway=station` | | `amenity=hospital` |
| `bridge=yes` | `landuse=construction` | | | |
| | `shop=doityourself` | | | |

Nine types, 30 locations, one authored species each.

## Data model

The key split is **species vs. catch**.

- **Species** — 30 rows, authored once, shipped in the bundle. Name, location
  tag, type, description, art slot.
- **Catch** — unlimited, generated. A species plus a rarity roll plus rolled
  stats plus timestamp, place name, and weather.

30 species, infinite catches. Your fifth Spirit of Aisle Seven is a different
creature from your first, and only one of them is worth keeping.

### Stats

Six axes, shown as a radar chart, identical across all species so any two
haunts are comparable:

**Rizz · Gooning · Sigma · Aura · Skibidi · Sussy**

Values are random. Rarity sets the total point budget; the roll distributes it
randomly across the six axes, capped at 100 each.

| Rarity | Budget | Base chance |
|---|---|---|
| Common | 120 | 70% |
| Uncommon | 200 | 22% |
| Rare | 300 | 7% |
| Mythic | 420 | 1% |

Steps walked that day shift the distribution away from Common toward the higher
tiers, saturating at 20,000 steps. More walking means better haunts, never more
haunts — the number you get is governed by where you lingered.

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
  jitter without merging adjacent shops.
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

## Deferred

- **Weather** is recorded on every catch but does not yet affect rolls. Left as
  an explicit hook — deepening weather's influence is the next design pass.
- **Illustration.** Cards are typographic for now; species carry an art slot
  that can be filled without touching anything else.
- **Location catalog expansion** beyond 30, which is pure data entry.
