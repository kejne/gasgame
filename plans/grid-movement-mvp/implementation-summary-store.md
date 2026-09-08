---
schema: gc.build.implementation-summary.v1
workflow: {id: ga-15t, formula: do-work}
methodology: {pack: gascity, name: build-basic}
producer: {formula: do-work, stage: implement, attempt: 1}
status: approved
trace:
  upstream:
    - path: beads/ga-pp6
      hash: bead:ga-pp6
    - path: README.md
      hash: sha256:2b43d914b3285b4057f00a262ced71d2a2a3a5bc0311bb218950616cbed8ca1a
    - path: src/main.ts
      hash: sha256:2246b351dcc380962b9e0bf8b0a81072b9f0ed9a0251c43f3b56d306f7c7e192
    - path: src/style.css
      hash: sha256:c69f2aab907e558e14921c93590b15018938de7efa4318227f40501a8a989ddc
    - path: src/game/store.ts
      hash: sha256:3cf4ad115d2c3340c368878a750df41cafcf2d1ce3becda97701a45fc7111c93
    - path: src/game/store.test.ts
      hash: sha256:5d8bf3fb3dd712137c9a881d4322a1525933a977c5455d8d74be9c35418b83b8
  coverage:
    - id: GG-NEXT-STORE-001
      status: covered
    - id: GG-NEXT-STORE-002
      status: covered
    - id: GG-NEXT-STORE-003
      status: covered
    - id: GG-NEXT-STORE-004
      status: covered
    - id: GG-NEXT-STORE-005
      status: covered
    - id: GG-NEXT-STORE-006
      status: covered
---

# Implementation Summary: Store Door and Static Shop Dialogue

## Summary

Added the first data-driven store interaction to the city. The Corner Cupboard
has a rendered street-facing door, exact approach/facing eligibility, a modal
shopkeeper dialogue view, selectable replies, and a persistent Leave action.

## Intended Behavior

The player approaches tile `(7, 2)` facing west toward the store door on
building tile `(6, 2)` and presses Space. The store overlay captures the
interaction, shows a CSS pixel-art portrait and static dialogue, and suspends
movement/world input until the player chooses `(L)eave` or presses L/Escape.
Selecting a reply changes the displayed response while keeping the same store
session. Leaving does not mutate the authoritative player tile or facing.

## Changed Files

- `src/game/store.ts`: store definitions, eligibility, and session transitions.
- `src/game/store.test.ts`: focused eligibility and session tests.
- `src/main.ts`: store door/handle meshes, Space gating, and modal UI wiring.
- `src/style.css`: store overlay, response controls, and pixel portrait styling.
- `README.md`: store controls and approach location.

## Verification

- First verification command: `npm test` — PASS (2 files, 13 tests).
- `npm run build` — PASS (`tsc -b` and Vite production build).
- `git diff --check` — PASS.
- Final proof command: `GC_BEAD_ID=ga-9lm build-artifact-valid.sh` from the launcher rig context — PASS (`gc.build.implementation-summary.v1` validated).

## Remaining Risks

- Browser/WebGL smoke behavior was not automated in this unit-test environment;
  the interaction uses native buttons and does not require external assets.
- Additional stores can be added to `STORES` with their own approach tile,
  door-facing direction, dialogue, portrait, and options.

| ID | Status |
| --- | --- |
| GG-NEXT-STORE-001 | covered |
| GG-NEXT-STORE-002 | covered |
| GG-NEXT-STORE-003 | covered |
| GG-NEXT-STORE-004 | covered |
| GG-NEXT-STORE-005 | covered |
| GG-NEXT-STORE-006 | covered |
