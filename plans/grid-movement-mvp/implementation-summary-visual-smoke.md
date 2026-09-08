---
schema: gc.build.implementation-summary.v1
workflow: {id: ga-c944, formula: do-work}
methodology: {pack: gascity, name: build-basic}
producer: {formula: do-work, stage: implement, attempt: 1}
status: approved
trace:
  upstream:
    - path: beads/ga-c66o
      hash: bead:ga-c66o
    - path: AGENTS.md
      hash: sha256:f51d7d74d4949a113c8e036216ed819fce7b0f54b553957144f738de25f8f088
    - path: .gitignore
      hash: sha256:771374dd54aa866db8ae66f97b9d3c5487a923c7332545ab62d5b09e42002dee
    - path: package.json
      hash: sha256:341bf13d2e40e596730d705fa8bae3ac86213b3685ccbca36cec6f90eedc4b91
    - path: package-lock.json
      hash: sha256:cd5e6b34d082171b4dd77907a0c654c3e0fa51a3361ddb90a258cd3d455f9f92
    - path: scripts/visual-smoke.mjs
      hash: sha256:3c1be20c392b5de4ab5e48c79a0aec1e23b958c2888c9ec39b9cfed55702a2f9
  coverage:
    - id: VISUAL-SMOKE-001
      status: covered
    - id: VISUAL-SMOKE-002
      status: covered
    - id: VISUAL-SMOKE-003
      status: covered
    - id: VISUAL-SMOKE-004
      status: covered
    - id: VISUAL-SMOKE-005
      status: covered
---

## Summary

Added a deterministic browser visual smoke workflow for the Three.js app. It
starts Vite on an ephemeral local port, uses an already-installed Firefox or
Chromium-family browser through `playwright-core`, verifies the initial canvas
and overlay state, exercises character and store open/close interactions, and
captures desktop, narrow, and interaction-state screenshots. Server cleanup
is bounded and process-group based so failed browser launches do not leave Vite
running.

| ID | Status |
| --- | --- |
| VISUAL-SMOKE-001 | covered |
| VISUAL-SMOKE-002 | covered |
| VISUAL-SMOKE-003 | covered |
| VISUAL-SMOKE-004 | covered |
| VISUAL-SMOKE-005 | covered |

## Intended Behavior

- `npm run visual:smoke` runs Vite on a local ephemeral port and always cleans
  up its child server.
- The smoke runner detects a configured or system browser, fails with an
  actionable diagnostic when headless automation/WebGL is unavailable, and
  preserves `server.log` under `.artifacts/visual-smoke/`.
- A usable browser run checks a non-empty canvas, hidden initial store and
  character overlays, character open/close, store approach/open/close, and
  desktop plus narrow viewport screenshots.

## Changed Files

- `AGENTS.md`: documents the required smoke command, screenshot artifacts,
  interaction states, and browser/WebGL fallback behavior.
- `.gitignore`: ignores generated visual smoke artifacts.
- `package.json` and `package-lock.json`: add the `visual:smoke` script and
  pinned `playwright-core` development dependency.
- `scripts/visual-smoke.mjs`: implements the Vite lifecycle, browser checks,
  overlay assertions, screenshots, artifact checks, and cleanup.

## Verification

- First verification command: `npm test` — passed; 4 files and 20 tests.
- `npm run build` — passed; TypeScript compilation and Vite production bundle
  completed successfully.
- `npm run visual:smoke` — failed as designed in this environment; the
  installed `/usr/bin/firefox` launches headlessly but never completes the
  Playwright protocol handshake and reports
  `RenderCompositorSWGL failed mapping default framebuffer, no dt`. The
  command exits non-zero with an actionable browser/WebGL diagnostic, writes
  `.artifacts/visual-smoke/server.log`, and leaves no Vite/browser child
  process running. No screenshots were produced because the browser was not
  usable.
- `git diff --check` — passed.
- Final proof command: `GC_BEAD_ID=ga-y9eq build-artifact-valid.sh` from the
  launcher rig context — passed; the local `.gc/scripts/checks` wrapper is
  absent, so the pinned Gas City validator was invoked directly and validated
  this artifact successfully.

## Remaining Risks

The current environment has no compatible headless browser/WebGL backend for
Playwright, so screenshot assertions could not be observed here. A CI or
developer environment with a compatible existing browser will produce the
four screenshots and exercise the full interaction path; browser binaries are
intentionally not downloaded by this workflow.
