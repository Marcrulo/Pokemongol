# Haunts — domain prototype

The game rules, runnable. Plain ES modules with **no dependencies and no
platform imports**, so they run under Node today and import unchanged into the
React Native app later.

Design: [`../docs/superpowers/specs/2026-07-30-haunts-design.md`](../docs/superpowers/specs/2026-07-30-haunts-design.md)

## Run

```sh
node simulate.js              # simulate a day, print the evening review
node simulate.js --verbose    # also show the GPS trail and which stays qualified
node --test "test/**/*.test.js"   # 104 tests
node catalog.js               # the species catalogue, grouped
node catalog.js --csv         # the same, for a spreadsheet
node catalog.js --md          # one markdown table, every haunt

# docs/species.csv is a checked-in copy; regenerate after adding a haunt:
node catalog.js --csv > ../docs/species.csv
node catalog.js --gaps        # tags that classify but yield nothing
```

Flags: `--seed N`, `--steps N`, `--weather "..."`, `--day YYYY-MM-DD`.

Try `--steps 0` against `--steps 20000` to see the rarity curve move.

The simulated day starts at **Kollegiebakken 1, 2800 Kgs. Lyngby** and walks a
loop around DTU. Place names and coordinates in `ITINERARY` are real, from
OpenStreetMap via Nominatim (data © OpenStreetMap contributors, ODbL); the
durations are invented. Edit `ITINERARY` in `simulate.js` to walk a different
day.

## Layout

| File | What it is |
|---|---|
| `src/types.js` | The 5 haunt types, their signature stats, and 130+ OSM tags |
| `src/species.js` | The 60-species catalog, keyed to OpenStreetMap tags |
| `src/dwell.js` | The 5-minute rule: GPS trail → stays |
| `src/spawner.js` | Pure function: stay → catch. Rarity curve and stat rolls |
| `src/rng.js` | Seeded RNG, so a given day is reproducible |
| `src/store.js` | Store interface + in-memory impl + `expo-sqlite` schema |
| `src/render.js` | Terminal stand-in for the review screen |
| `simulate.js` | Stands in for the Expo tracker; builds a synthetic trail |

## What this prototype is for

The Expo shell is the predictable part. The risk is in the rules — whether the
dwell threshold, the rarity curve, and the reveal actually feel good. All of
that is here, tunable in seconds without walking anywhere.

Two things it deliberately fakes:

- **Location resolution.** `resolve()` in `simulate.js` matches against a known
  itinerary. The app queries Overpass and caches.
- **Storage.** `MemoryStore` instead of SQLite, because Node 18 has no built-in
  SQLite and the prototype should need no installs. `SCHEMA` in `src/store.js`
  is the real table.

## Known open question

GPS drift splits one long visit into two qualifying stays on roughly **26% of
simulated days**, so a single 41-minute trip to the park can yield two haunts.
The dwell detector is correct — it reports what the trail says. The fix is a
game rule one layer up and is still undecided; see the spec.
