# Agent verification guidance

Run the visual smoke check from the repository root with:

```sh
npm run visual:smoke
```

The command starts Vite on a local ephemeral port, opens the app in an
already-installed headless browser, and always cleans up the Vite child
process. It writes `desktop.png`, `narrow.png`, `character-open.png`,
`narrow-character-open.png`, `store-open.png`, `narrow-store-open.png`, and
`server.log` to `.artifacts/visual-smoke/`. The
directory is ignored by Git so agents and humans can inspect the generated
screenshots without adding build artifacts to a change.

The check verifies that the initial canvas is visible and non-empty, both
store and character overlays start hidden, the character screen opens and
closes, and the store opens and closes after walking to its known approach
tile. It runs at desktop and narrow viewport sizes, checking the minimap,
responsive geometry, modal accessibility, focus behavior, and pointer hit
targets. The browser can be selected with `VISUAL_BROWSER_PATH=/path/to/browser`;
Firefox and Chromium family executables are detected when available.

If no usable browser is installed, or headless WebGL cannot initialize, the
command fails with an actionable diagnostic and preserves `server.log` for
inspection. Do not treat a missing browser or WebGL backend as a passing
smoke check.
