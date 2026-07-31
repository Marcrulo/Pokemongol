# Haunts

Pokémon GO without the screen. The phone tracks where you linger; a haunt
attaches if you stay somewhere five minutes. You review the day in the evening.
Android only, React Native + Expo, all user data local.

Design docs live in `docs/superpowers/specs/`. Read
`2026-07-30-haunts-design.md` before changing game rules.

## Toolchain — read this first

The system `node` is 18 and **has no npm**. A private Node 22 is installed:

```sh
export PATH=$HOME/.local/node/bin:$PATH     # required before any npm/expo command
export PATH=$HOME/.local/platform-tools:$PATH  # adb
```

Neither is on the default PATH. Commands fail confusingly without them.

## Layout

The Expo project is at the **repo root**, not in `app/`. This is deliberate:
Metro only bundles files under its project root, and the game rules live in
`prototype/`. Root placement lets the app import
`../prototype/src/spawner.js` directly. **Do not move the app into a
subdirectory** — it would force a duplicate copy of the rules.

| Path | What |
|---|---|
| `prototype/src/` | Game rules. Dependency-free ES modules, no platform imports |
| `prototype/simulate.js` | Walks a synthetic DTU trail through the real rules |
| `src/` | Everything that touches the phone — tracker, db, resolver, UI |
| `App.js` | The one screen |

`prototype/` runs under Node *and* imports unchanged into React Native. Keep it
free of `expo-*` imports or that breaks.

## Adding a haunt

Append to `RAW` in `prototype/src/species.js`. Type is derived from the OSM tag
via `types.js`, so a tag with no mapping throws at import — that is deliberate.

`docs/species.csv` is a generated copy and must stay in step. A pre-commit hook
regenerates and stages it automatically, but **hooks are local config and do
not survive a clone**:

```sh
git config core.hooksPath .githooks    # once per clone
```

Without that the hook silently does nothing. A test in
`prototype/test/csv.test.js` is the backstop and names the fix when it fails.

`node prototype/catalog.js --gaps` lists tags that classify correctly and still
yield nothing — the argument for which haunt to write next.

## Tests

```sh
npm test        # 59 tests
```

Node 22 will not resolve `node --test test/`; the glob is required and the
script already has it.

## Rebuild vs. live reload

Native changes need a 15-minute EAS rebuild. JavaScript does not.

| Changed | Rebuild? |
|---|---|
| Any `.js` | No — Metro live-reloads it |
| `app.json` permissions or plugins | Yes |
| Adding a native module | Yes |

**A development build with no Metro server shows the dev-launcher screen and
runs none of the app's JavaScript.** The foreground service still runs, so
`dumpsys` looks healthy while nothing is being recorded. This has already
caused one false bug report.

## Debugging on the device

```sh
adb reverse tcp:8081 tcp:8081     # Metro over USB, no shared Wi-Fi needed
npx expo start --dev-client
```

To read the app's database, pull **all three** files — the main `.db` is often
nearly empty because the data is still in the WAL:

```sh
for f in haunts.db haunts.db-wal haunts.db-shm; do
  adb exec-out run-as dk.marcrulo.haunts cat files/SQLite/$f > /tmp/$f
done
```

`run-as` only works on the development build. Package is `dk.marcrulo.haunts`.

## Things that look wrong but aren't

- **Identical GPS coordinates across many fixes.** Android replays cached
  locations while the phone is still. `recorded_at` (sample time) is what the
  trail uses; `t` is the provider's stamp and may be stale. Both are stored.
- **Fixes arriving in bursts, then long silence.** Delivery tracks the app's
  lifecycle, not the 30-second timer. `recordFix` throttles the bursts away and
  `MAX_GAP_SECONDS` stops the silences being counted as time spent.
- **A permanent notification.** Android forbids hiding a foreground service.
  It is part of the design, not a bug to fix.
- **The signature stat dominating.** By design, on ~94% of haunts.

## Tuning constants are measured, not chosen

`SIGNATURE_SHARE = 0.35` and `SIGNATURE_WEIGHT = 2.0` in
`prototype/src/spawner.js` came from a sweep over 20,000 rolls. A test pins the
signature-is-highest rate between 90% and 99% **in both directions**. If that
test fails, do not widen the bounds — something changed the distribution.

`CLUSTER_RADIUS_M = 50` absorbs GPS jitter without merging adjacent shops. Any
location accuracy setting coarser than that cannot resolve it.

## Do not run

- `git push` — the remote is HTTPS with no credential helper; Marcus pushes.
- `eas build`, `eas update` — spends build quota or ships to a real device.
