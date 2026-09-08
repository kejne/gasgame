---
schema: gc.build.decomposition.v1
workflow:
  id: ga-cl8
  formula: build-from-requirements
methodology:
  pack: gascity
  name: decomposition-base
producer:
  formula: decomposition-base
  stage: decompose
  attempt: 1
status: approved
trace:
  upstream:
    - path: beads/ga-cl8
      hash: bead:ga-cl8
    - path: plans/grid-movement-mvp/requirements.md
      hash: sha256:1c5616761ba94b03d8b666fe9f14c02773d50820ac2de357cb41eb91c1e3740a
      ids:
        - GG-BR-001
        - GG-BR-002
        - GG-BR-003
        - GG-BR-004
        - GG-BR-005
        - GG-BR-006
        - GG-BR-007
        - GG-BR-008
        - GG-BR-009
        - GG-BR-010
        - GG-BR-011
        - GG-BR-012
    - path: plans/grid-movement-mvp/implementation-plan.md
      hash: sha256:97eb6174a776748a4d2b6672e915482017e2617bf2d72a1a3991f5d3a4f7be9b
    - path: plans/grid-movement-mvp/plan-review.md
      hash: sha256:40f11c2922c7e85399d94ca0ec543af08782dabd49b43f1cf7184adab949fb61
  coverage:
    - id: GG-BR-001
      status: covered
    - id: GG-BR-002
      status: covered
    - id: GG-BR-003
      status: covered
    - id: GG-BR-004
      status: covered
    - id: GG-BR-005
      status: covered
    - id: GG-BR-006
      status: covered
    - id: GG-BR-007
      status: covered
    - id: GG-BR-008
      status: covered
    - id: GG-BR-009
      status: covered
    - id: GG-BR-010
      status: covered
    - id: GG-BR-011
      status: covered
    - id: GG-BR-012
      status: covered
---

## Summary

The approved Gasgame Grid Movement MVP plan is decomposed into four runnable
implementation beads in convoy `ga-7tk`. The work is intentionally sequential:
the app scaffold enables domain work, the domain enables presentation work, and
the presentation enables final browser/build verification. The implementation
must remain a greenfield Vite + TypeScript + Three.js movement prototype and
must preserve the exclusions in GG-BR-012.

| ID | Status |
| --- | --- |
| GG-BR-001 | covered |
| GG-BR-002 | covered |
| GG-BR-003 | covered |
| GG-BR-004 | covered |
| GG-BR-005 | covered |
| GG-BR-006 | covered |
| GG-BR-007 | covered |
| GG-BR-008 | covered |
| GG-BR-009 | covered |
| GG-BR-010 | covered |
| GG-BR-011 | covered |
| GG-BR-012 | covered |

## Selected Downstream Formulas

- `implement` drains the implementation convoy using the configured
  `gc.implementation-worker` target.
- `do-work-item` is the per-bead implementation formula selected by the
  separate-drain implementation path.
- No planning, review, publish, or workflow-control bead is included in this
  convoy; those remain downstream workflow responsibilities.

## Implementation Convoy

- Convoy ID: `ga-7tk`
- Convoy name: `grid-movement-mvp-implementation`
- Source/launch convoy: `ga-b59` (not reused)
- Drain policy: `separate`
- Implementation target: `gc.implementation-worker`
- Ordering: `ga-8ju` → `ga-e9t` → `ga-06v` → `ga-fr4`

## Work Items

### ga-8ju — Scaffold Vite TypeScript Three.js app and test harness

- Requirements: GG-BR-001, GG-BR-002, GG-BR-004.
- Plan trace: Summary; Current System; Proposed Implementation steps 1 and 7.
- Expected files/assets: `package.json`, lockfile if generated,
  `index.html`, `src/main.ts`, `src/style.css`, and Vite/TypeScript/Vitest
  configuration.
- Runnable outcome: a local Vite app shell, dependency/test scripts, and a
  passing production build; no gameplay systems.
- Verification: dependency installation, `npm run build`, `npm test`, and a
  dev-server/app-shell load check.
- Dependency: first item; no predecessor.

### ga-e9t — Implement grid map, player state, movement rules, and unit tests

- Requirements: GG-BR-003 through GG-BR-011.
- Plan trace: Proposed Implementation — Map data, Movement domain, Grid
  snapping; Verification — unit verification.
- Expected files/assets: `src/game/map.ts`, `src/game/player.ts` or
  `src/game/movement.ts`, and focused Vitest tests.
- Runnable outcome: approximately 15 x 15 structured map data; integer tile
  and cardinal player state; pure walkability, collision, movement, and turn
  helpers; deterministic tests for all directions, blocked/out-of-bounds
  movement, and repeated actions.
- Verification: `npm test` and `npm run build`.
- Dependency: blocked by `ga-8ju`.

### ga-06v — Build first-person Three.js city scene and keyboard controller

- Requirements: GG-BR-001 through GG-BR-011.
- Plan trace: Proposed Implementation — Input controller, Grid snapping,
  Rendering, HUD/debug overlay; Verification — browser verification.
- Expected files/assets: `src/main.ts`, scene/rendering and input modules,
  `src/style.css`, and related app files.
- Runnable outcome: nonblank first-person city scene generated from shared map
  data; visible street/building contrast and start marker; W/S/A/D bindings;
  stable repeated-input handling; camera/HUD synchronized to exact grid and
  cardinal state.
- Verification: `npm run build`, local dev-server render, and desktop keyboard
  smoke path for movement, both turns, blocked movement, and HUD evidence.
- Dependency: blocked by `ga-e9t`.

### ga-fr4 — Verify grid movement MVP build and browser smoke path

- Requirements: GG-BR-001 through GG-BR-012, including explicit scope checks
  for the exclusions in GG-BR-012.
- Plan trace: Verification, Non-Goals, and Handoff criteria.
- Expected files/assets: smoke-test configuration or tests only when useful;
  no new gameplay systems.
- Runnable outcome: recorded reproducible unit/build/browser evidence covering
  successful forward/backward movement, both 90-degree turns, blocked and
  out-of-bounds collision, repeated input stability, nonblank scene load, and
  exact grid/cardinal state.
- Verification: `npm test`, `npm run build`, `npm run dev`, and a desktop
  browser smoke path with observed results recorded on the bead.
- Dependency: blocked by `ga-06v`.

## Skipped Work

- Combat, enemies, party members, character stats, progression, inventory,
  quests, objectives, win states, persistence, procedural generation, mobile or
  touch controls, controller support, remappable controls, audio, music, final
  art direction, minimaps, and production visual polish are skipped as
  explicitly out of scope under GG-BR-012.
- A separate Playwright bead is not created: browser automation is optional in
  the approved plan, and the final verification bead may add a lightweight
  check only if it remains low-scope and practical.

## Blocked Work

No work is currently blocked. The sequential dependencies are intentional
execution ordering, not unresolved requirements. The approved requirements
have no open questions, and the plan review reported no blocking findings.
