---
schema: gc.build.plan.v1
workflow:
  id: ga-cl8
  formula: build-from-requirements
methodology:
  pack: gascity
  name: build-from-requirements
producer:
  formula: build-from-requirements
  stage: plan
  attempt: 1
status: approved
plan_slug: grid-movement-mvp
rig: gasgame
rig_root: /home/kejne/mycity/gasgame
artifact_root: /home/kejne/mycity/gasgame/plans/grid-movement-mvp
created_at: 2026-08-22T22:18:00Z
updated_at: 2026-08-22T22:18:00Z
trace:
  upstream:
    - path: beads/ga-cl8
      hash: bead:ga-cl8
    - path: beads/ga-mu4
      hash: bead:ga-mu4
    - path: beads/ga-dgh
      hash: bead:ga-dgh
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

# Implementation Plan: Gasgame Grid Movement MVP

## Summary

Build a small browser-based first-person grid movement prototype in the
Gasgame rig root. The implementation should create a maintainable Vite +
TypeScript + Three.js application because the current workspace contains
planning and Gas City files but no runnable game source or package manifest.

The MVP proves a classic dungeon-crawler movement foundation in a city-grid
setting: a fixed approximately 15 x 15 map, visible walkable streets and
blocked buildings or boundaries, discrete forward/backward tile movement,
90-degree turns, collision against blocked/out-of-map destinations, and exact
grid snapping after every action. Later gameplay systems stay outside this
plan.

Coverage matrix:

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

## Current System

The rig root is `/home/kejne/mycity/gasgame`. It currently contains Gas City
runtime/config files, Beads metadata, a nested `gasgame/.codex/hooks.json`, and
the approved requirements artifact at
`plans/grid-movement-mvp/requirements.md`. No `package.json`, `src/`, `public/`,
or browser application files are present.

This means implementation is a greenfield app scaffold, not a modification to
an existing game. The source should live at the rig root with conventional
frontend paths such as `src/`, `public/`, `package.json`, and `index.html`.
Planning artifacts under `plans/` and Gas City/Beads state under `.gc/` and
`.beads/` must remain planning/runtime data, not application code.

The requirements artifact is approved and is the behavioral source of truth.
The implementation should treat its behavior requirement IDs as stable
traceability anchors for code organization, tests, and later decomposition.

## Proposed Implementation

Use a minimal TypeScript game architecture with explicit data boundaries:

- Project scaffold: create a Vite TypeScript app at the rig root with scripts
  for `dev`, `build`, `test`, and a browser smoke/e2e check. Add Three.js for
  rendering and Vitest for movement-rule unit tests. Add Playwright only if the
  implementation includes automated browser/canvas verification.
- Map data: define an approximately 15 x 15 grid in source data, using stable
  tile symbols or objects for walkable streets, blocked buildings, and boundary
  walls. Keep tile size, map dimensions, start tile, and start facing direction
  in one inspectable module.
- Movement domain: represent player state as integer tile coordinates plus one
  cardinal facing value. Implement pure helpers for `turnLeft`, `turnRight`,
  `forwardDelta`, `backwardDelta`, `isWalkable`, and `tryMove`.
- Input controller: bind `W`, `S`, `A`, and `D` to movement/turn intents. Gate
  repeated key events through a small action state so repeated input remains
  predictable and never queues movement into blocked tiles.
- Grid snapping: keep authoritative state in integer tile coordinates and
  cardinal directions. If movement is animated, interpolate only a render
  transform and commit back to exact tile coordinates at completion.
- Rendering: create a first-person Three.js scene with camera pose derived from
  player tile/facing state. Render streets as low floor tiles and blocked cells
  as simple building or wall volumes. Add enough light, contrast, and near-start
  markers or distinctive geometry to make the start and movement direction
  readable.
- HUD/debug overlay: include compact developer-readable state such as tile
  coordinate and facing direction. It should support local verification without
  becoming a gameplay system.

Suggested implementation sequence:

1. Scaffold the Vite/TypeScript project, package scripts, and test harness.
2. Add map/player state modules and pure movement rules with unit tests for all
   cardinal directions, blocked cells, and out-of-bounds attempts.
3. Add keyboard input that calls the pure movement rules and updates the player
   state deterministically.
4. Add the Three.js scene, map geometry generation from the same map data, and
   camera synchronization from player state.
5. Add movement/turn interpolation if desired, preserving exact state snapping
   at completion.
6. Add smoke verification for a nonblank first render and a keyboard path that
   exercises movement, collision, and turning.
7. Run build/test verification and record evidence for downstream review.

Assumptions:

- Node.js and npm are available in the implementation environment.
- A desktop keyboard/browser is the target interaction surface for this MVP.
- The exact street/building layout, visual style, animation duration, and
  package versions may be selected during implementation as long as the
  behavior requirements stay satisfied.
- The app can be implemented at the rig root despite the existing nested
  `gasgame/` folder, because that folder currently contains only Codex hooks.

Risks and mitigations:

- Empty project risk: create the smallest viable frontend scaffold and keep
  dependencies limited to rendering, build, and tests.
- Movement/render drift: keep integer tile state authoritative and derive
  render transforms from it rather than writing position floats back into game
  state.
- Collision/render desynchronization: generate visible blocked/walkable
  geometry from the same map data used by `isWalkable`.
- Key repeat instability: ignore or serialize input while an animated action is
  in progress, and test repeated movement/turn sequences.
- Visual ambiguity: include clear floor/building contrast, boundaries, lighting,
  and a readable starting view before adding decorative polish.

## Non-Goals

The MVP must not implement combat, enemies, party members, character stats,
classes, progression, inventory, items, equipment, shops, loot, quests,
objectives, scoring, win states, save/load, procedural generation, mobile or
touch controls, controller support, remappable controls, audio, music, or final
art direction.

Visual work should stay functional: streets, buildings/boundaries, lighting,
and orientation readability are in scope; production art, complex shaders,
world streaming, minimaps, and narrative UI are out of scope.

## Verification

Unit verification should cover the movement domain before relying on browser
testing:

- Initial state is on a walkable tile and has one cardinal facing.
- `W` moves exactly one tile forward for north, east, south, and west when the
  destination is walkable.
- `S` moves exactly one tile backward for north, east, south, and west when the
  destination is walkable.
- Blocked building tiles and map boundaries leave the player tile unchanged.
- `A` and `D` rotate by exactly one cardinal direction and do not change tile
  coordinates.
- Repeated movement and turn sequences never produce fractional tile
  coordinates or non-cardinal facing values.

Browser verification should cover the rendered prototype:

- `npm run dev` starts a local browser development server and loads without a
  blank or crashed first view.
- `npm run build` completes successfully.
- The first render contains a visible first-person 3D city scene with both
  walkable streets and blocked buildings/boundaries.
- A keyboard smoke path confirms visible forward movement, backward movement,
  left turn, right turn, and a blocked movement attempt.
- If Playwright is added, include a canvas nonblank pixel check and screenshots
  at a desktop viewport. A small mobile viewport smoke screenshot may be useful
  for framing regression detection, but mobile/touch controls remain out of
  scope.

Handoff criteria for implementation review:

- Source files expose map layout, walkability, player tile position, facing
  direction, and movement checks as maintainable constructs.
- Automated tests or documented manual evidence map back to the behavior
  requirements in the coverage matrix.
- The delivered app remains scoped to the movement MVP and does not add the
  excluded gameplay systems.
