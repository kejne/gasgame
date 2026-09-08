# gasgame

A small Three.js grid-movement experiment.

## Prerequisites

- Node.js 20.19+ (or 22.12+)
- npm 10+

## Install and run locally

Install dependencies from the lockfile:

```sh
npm ci
```

Start the Vite development server:

```sh
npm run dev
```

Then open the local URL printed by Vite. `npm start` is also available as an
equivalent start command.

The app must be served through Vite. Do not open `index.html` directly with a
`file://` URL; the module imports and development server behavior require an
HTTP server.

## Controls

- `W`: move one tile forward
- `S`: move one tile backward
- `A`: turn left
- `D`: turn right
- `Space`: open a store when standing beside its door and facing it
- `L` or `Escape`: leave an open store
- `1`–`4`: open the Mage, Knight, Priest, or Monk character screen
- `Escape`, `Backspace`, `B`, or the Back button: close a character screen

Movement stays on walkable grid tiles, and turns change facing without moving.
Successful moves and turns animate between exact tile/facing states. Use the
visible `MOVE DURATION` slider to tune the animation from 150 to 1200 ms while
the app is running; keyboard input is serialized until the current action
finishes.
The city includes The Corner Cupboard, whose door is on the east side of the
building at tile `(6, 2)`; approach it from tile `(7, 2)` while facing west.
The lower HUD shows the fixed four-member party. Character screens pause world
controls until they are closed.

## Validation, tests, and production build

Run the complete local validation contract (unit tests, production build,
headless browser smoke checks, and `git diff --check`):

```sh
npm run validate
```

Validation requires a headless Firefox or Chromium executable with working
headless WebGL. Set `VISUAL_BROWSER_PATH` to select a specific executable when
browser auto-discovery is unsuitable. Visual screenshots and `server.log` are
written to `.artifacts/visual-smoke/`; inspect or attach them with UI changes,
along with the command output and any relevant diff. The smoke check keeps
base HUD, character-dialog, and store-dialog captures at desktop and narrow
sizes. It also asserts the 15×15 minimap, marker tile/facing transitions, and
that modal panels remain inside the viewport and above the HUD. Geometry checks
allow at most 2 CSS pixels for fractional-layout/browser rounding; they are
not image snapshots, so screenshots remain useful failure artifacts without
pixel-diff flakiness.

Run only the unit tests:

```sh
npm test
```

Create the production build:

```sh
npm run build
```

`npm run package` is an alias for the same production build. The generated
static output is written to `dist/`.

Preview the production build locally:

```sh
npm run preview
```
