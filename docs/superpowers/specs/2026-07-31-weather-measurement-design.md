# Haunts — Weather Measurement

**Date:** 2026-07-31
**Status:** Approved for implementation
**Supersedes:** the "Weather" entry under Deferred in
[2026-07-30-haunts-design.md](2026-07-30-haunts-design.md)

## Idea

Temperature, sunlight and precipitation should eventually shape what a place
gives you. Before deciding *how*, record what the conditions actually were.

This pass builds the measurement layer and changes no game rules. Every catch
gains a structured reading; `spawn` records it and ignores it, exactly as it
already does with the free-text `weather` string.

The reason to split it this way is that the tuning we would do today would be
guesswork. After a few weeks of real days there is data: how cold a Danish
January catch actually is, how often it rains during a five-minute dwell,
what fraction of catches happen after dark. Rules written against that will be
better than rules written against imagination.

## What is measured

Four numbers per catch, sampled at the hour and place of the stay.

| Field | Unit | Source |
|---|---|---|
| `sunAltitude` | degrees above horizon, negative at night | computed locally |
| `cloudPct` | percent of sky covered | Open-Meteo |
| `tempC` | degrees Celsius | Open-Meteo |
| `precipMm` | millimetres that hour | Open-Meteo |

Plus `source`, one of `open-meteo` or `none`, so a real reading is never
confused with a gap.

**Sun altitude and cloud cover are both needed.** Altitude alone gives time of
day and season; it cannot tell a blazing noon from a grey one. Cloud cover
alone cannot tell noon from midnight. "Amount of sun" is the pair.

Sun altitude is computed rather than fetched: it is deterministic trigonometry
from latitude, longitude and timestamp. No network, no key, no failure mode,
and it works in the terminal simulation as readily as on the phone.

## Sampling

**One API call per day, hour-indexed.** Open-Meteo returns a 24-hour array for
a location in a single request. Collection fetches that array once, then each
stay reads the hour it falls in. Sun altitude is computed per stay from its own
midpoint.

The alternative of one call per stay would issue five to eight near-identical
requests a day. Sampling once per day and applying it to every catch would
discard time of day, which is one of the three factors — self-defeating.

Coordinates are rounded to roughly 11 km before being sent. Weather does not
vary meaningfully below that, and it is strictly less revealing than the
per-place coordinate already sent to Overpass.

## Data model

`weather` stops being a free-text string and becomes a reading:

```js
{ tempC: 3.4, precipMm: 0.0, cloudPct: 95, sunAltitude: -12.6, source: 'open-meteo' }
```

`spawn(rng, stay, osmTag, placeName, steps, weather)` keeps its signature; only
the type of the last argument changes. `WEATHER_MODIFIERS` stays exported and
empty — the hook for the next pass, deliberately unused here.

Storage gains four columns beside the existing `weather` text, which is kept
for the human-readable summary shown on the card. Schema version 2.

## Components

Each piece has one job and can be understood without reading the others.

| Unit | Responsibility | Depends on |
|---|---|---|
| `prototype/src/sun.js` | Sun altitude from lat, lon, timestamp | nothing |
| `src/weather.js` | Fetch and cache a day's hourly array | `db.js`, network |
| `src/collect.js` | Ask for the day's weather, hand each stay its hour | both above |
| `src/db.js` | Four columns, migration, cache table | — |
| `src/ui/HauntCard.js` | Render the conditions | — |

`sun.js` lives in the domain layer because it is pure and the simulation needs
it. `weather.js` lives in the app layer because it touches the network, mirroring
how `resolve.js` already sits apart from the rules.

## Failure handling

**Offline is partial, never fatal.** Sun altitude always succeeds. If
Open-Meteo cannot be reached, the other three are recorded as `null` with
`source: 'none'`, and collection proceeds. Because collecting a day is
deterministic and re-runnable, the next open backfills the reading without
rerolling the catch — the same property that already lets Overpass failures
recover.

Open-Meteo serves historical hours, so backfill works for past days too, within
the seven-day window the trail is kept.

**Nothing is retroactive.** Catches made before this ships keep their old
string and are not given invented readings.

## Testing

- `sun.js` against known almanac values: solar noon at a known date and place,
  and the sign flip at sunrise and sunset. Pure function, so exact assertions.
- The hour-indexing logic against a fixed 24-hour array — a stay at 21:40 must
  read hour 21, and a stay spanning an hour boundary must read its midpoint.
- Offline path: a stubbed fetch that throws must yield `source: 'none'` with a
  real `sunAltitude` and three nulls.
- The simulation gains a `--weather` reading so terminal output shows the same
  shape the phone records.

## Out of scope

- Any effect on rarity, stats or availability. That is the next pass, and it
  should be written against collected data.
- Weather-gated species. Attractive, but it needs the data first and new
  species authored per condition; the species catalogue is already lopsided.
- Wind, humidity, pressure. Add later if a rule wants them.
