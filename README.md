# Haunts

Pokémon GO without the screen. Your phone notes where you linger; every place
has a small, petty local god, and one attaches to you if you stay five minutes.
You never play it while out — you open it in the evening to see what found you.

Design: [`docs/superpowers/specs/2026-07-30-haunts-design.md`](docs/superpowers/specs/2026-07-30-haunts-design.md)

## Getting it on an Android phone

Background location does not work in Expo Go, so this needs a real build. One
command, built in Expo's cloud, no Android SDK required:

```sh
npm install -g eas-cli
eas login                                # free Expo account
eas build --platform android --profile preview
```

That prints a link and a QR code; open it on the phone and install the APK.
Then, in Android settings, set Haunts' location permission to **Allow all the
time** — "while using the app" collects nothing, which is the whole point.

Rebuild only when native config changes. Editing JS alone does not need one:

```sh
npm start                                # Metro, for the development profile
```

## Layout

| Path | What it is |
|---|---|
| `App.js` | The one screen: Today and Collection |
| `src/tracker.js` | Background location task — one fix every 30 s |
| `src/db.js` | Local SQLite: trail, catches, place cache |
| `src/resolve.js` | Coordinates → OpenStreetMap place, via Overpass |
| `src/collect.js` | The evening: trail → stays → places → haunts |
| `src/ui/` | Card and colours |
| `prototype/` | The game rules, runnable under Node. Imported unchanged |

The rules live in `prototype/src` and have no platform imports, so they run in
the terminal (`npm test`, `node prototype/simulate.js`) and inside the app from
the same files. Nothing is duplicated.

## What leaves the phone

One thing: a coordinate sent to Overpass to ask what is there. No account, no
key, no user data, and the answer is cached per ~11 m cell so a place you visit
daily is looked up once. Trails and catches never leave the device.

Map data © OpenStreetMap contributors, ODbL.
