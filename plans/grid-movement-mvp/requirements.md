---
schema: gc.build.requirements.v1
workflow:
  id: ga-cl8
  formula: build-from-requirements
methodology:
  pack: gascity
  name: build-from-requirements
producer:
  formula: build-from-requirements
  stage: requirements
  attempt: 1
status: approved
plan_slug: grid-movement-mvp
rig: gasgame
rig_root: /home/kejne/mycity/gasgame
artifact_root: /home/kejne/mycity/gasgame/plans/grid-movement-mvp
created_at: 2026-08-22T21:55:00Z
updated_at: 2026-08-22T22:00:00Z
trace:
  upstream:
    - path: beads/ga-cl8
      hash: bead:ga-cl8
    - path: beads/ga-mu4
      hash: bead:ga-mu4
    - path: plans/grid-movement-mvp/requirements.md
      hash: sha256:45d384647574704724ad62a99754e1b0ec1336415c4dea211343d642d7486dc2
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

# Requirements: Gasgame Grid Movement MVP

## Problem Statement

Gasgame needs a playable browser-based foundation for a classic first-person
grid dungeon crawler. The MVP must prove the core movement model: a visible 3D
city map, a fixed tile grid, collision against blocked tiles, and keyboard
controls that move or rotate the player in discrete steps. Later game systems
can build on this once movement, orientation, and map state are reliable.

## W6H

| Field | Requirement |
| --- | --- |
| Who | Desktop browser players and developers iterating on the prototype locally. |
| What | A functional first-person 3D city-grid movement prototype. |
| When | During local development, after starting the app's browser development server. |
| Where | In the existing Gasgame workspace at `/home/kejne/mycity/gasgame`. |
| Why | To establish a maintainable movement foundation before objectives, combat, inventory, or progression are added. |
| How | Use structured map/player state, render a small 3D city scene, and bind keyboard input to grid-snapped movement and 90-degree turns. |

## User Stories

### GG-US-001: Load The Prototype

As a developer, I can start the local browser development server and open the
game so that movement can be tested and iterated quickly.

### GG-US-002: Move On The City Grid

As a player, I can move through the city in discrete tile steps so that
navigation feels like a classic first-person grid crawler.

### GG-US-003: Turn In Place

As a player, I can rotate my facing direction without changing tile position so
that I can orient myself inside the city map.

### GG-US-004: Extend The Movement Foundation

As a developer, I can understand and extend the map, player position, facing
direction, walkability, and input rules from maintainable code.

## Technical Stories

### GG-TS-001: Represent Grid State In Data

As a developer, I can inspect and change the map layout, tile walkability,
player tile position, and facing direction from structured source data rather
than reverse-engineering rendered geometry.

### GG-TS-002: Separate Input, Movement Rules, And Rendering

As a developer, I can modify keyboard bindings, collision rules, or rendering
without tightly coupling those concerns to each other.

### GG-TS-003: Preserve Deterministic Grid Alignment

As a developer, I can rely on movement completion to leave the player exactly
on a tile coordinate and facing one of the four cardinal grid directions.

## Behavior Requirements

| ID | Trace | Requirement |
| --- | --- | --- |
| GG-BR-001 | GG-US-001 | WHEN the local browser development server is running, THE prototype SHALL load successfully in a desktop browser. |
| GG-BR-002 | GG-US-001 | WHEN the prototype loads, THE game SHALL render a visible first-person 3D city scene with a clear starting position. |
| GG-BR-003 | GG-US-001, GG-US-002 | THE map SHALL contain approximately 15 x 15 tiles with visibly distinguishable walkable street tiles and blocked building or boundary tiles. |
| GG-BR-004 | GG-US-004, GG-TS-001 | THE map layout, player tile position, facing direction, walkability, and movement rules SHALL be represented in maintainable source data or code. |
| GG-BR-005 | GG-US-002 | WHEN the player presses `W` and the destination tile is walkable, THE player SHALL move forward by exactly one tile relative to the current facing direction. |
| GG-BR-006 | GG-US-002 | WHEN the player presses `S` and the destination tile is walkable, THE player SHALL move backward by exactly one tile relative to the current facing direction. |
| GG-BR-007 | GG-US-002, GG-TS-003 | WHEN a movement action completes, THE player SHALL be snapped exactly to a grid tile and SHALL NOT remain between tiles. |
| GG-BR-008 | GG-US-002 | WHEN a movement input targets a blocked tile or a tile outside the map, THE player SHALL remain on the current tile. |
| GG-BR-009 | GG-US-003 | WHEN the player presses `A`, THE player SHALL rotate exactly 90 degrees counterclockwise without changing tile position. |
| GG-BR-010 | GG-US-003 | WHEN the player presses `D`, THE player SHALL rotate exactly 90 degrees clockwise without changing tile position. |
| GG-BR-011 | GG-US-002, GG-US-003, GG-TS-002, GG-TS-003 | WHEN movement or turning inputs are repeated, THE prototype SHALL keep orientation, tile position, and collision behavior stable and predictable. |
| GG-BR-012 | GG-US-004 | THE MVP SHALL exclude combat, enemies, party members, inventory, quests, win states, persistence, procedural generation, mobile controls, and audio requirements. |

## Example Mapping

| Example ID | Story | Given | When | Then | Covers |
| --- | --- | --- | --- | --- | --- |
| GG-EX-001 | GG-US-001 | The development server is running and the browser opens the app URL. | The game initializes. | A first-person 3D city scene appears with streets, blocked buildings or boundaries, and a clear player start. | GG-BR-001, GG-BR-002, GG-BR-003 |
| GG-EX-002 | GG-US-002 | The player faces north and the tile north of the player is walkable. | The player presses `W`. | The player moves exactly one tile north and stops on the destination grid coordinate. | GG-BR-005, GG-BR-007 |
| GG-EX-003 | GG-US-002 | The player faces north and the tile south of the player is walkable. | The player presses `S`. | The player moves exactly one tile south and stops on the destination grid coordinate. | GG-BR-006, GG-BR-007 |
| GG-EX-004 | GG-US-002 | The player faces a blocked building tile or the map boundary. | The player presses `W` or `S` toward the blocked destination. | The player remains on the current tile. | GG-BR-008 |
| GG-EX-005 | GG-US-003 | The player is on a tile facing north. | The player presses `A`, then `D`. | The player turns west, then returns to north, without changing tile position. | GG-BR-009, GG-BR-010, GG-BR-011 |
| GG-EX-006 | GG-US-004 | A developer inspects the movement implementation. | The developer looks for map data, player state, facing state, and walkability checks. | Those concepts are represented explicitly in maintainable code. | GG-BR-004 |
| GG-EX-007 | GG-US-004 | The MVP is evaluated for scope creep. | Combat, inventory, objectives, persistence, mobile controls, or audio are considered. | Those systems are treated as out of scope for this iteration. | GG-BR-012 |

## Acceptance Criteria

| Criteria ID | Requirement | Acceptance Criteria |
| --- | --- | --- |
| GG-AC-001 | GG-BR-001 | A local development command starts the app, and the prototype loads in a desktop browser without a blank or crashed first view. |
| GG-AC-002 | GG-BR-002 | The first view contains a visible 3D city scene from a first-person perspective, with enough geometry or markers to understand the starting tile. |
| GG-AC-003 | GG-BR-003 | The implemented map is roughly 15 x 15 tiles and includes both walkable street/path areas and blocked building or boundary tiles. |
| GG-AC-004 | GG-BR-004 | Source code exposes map layout, walkability, player tile position, facing direction, and movement checks as maintainable constructs. |
| GG-AC-005 | GG-BR-005 | Pressing `W` from each cardinal facing direction moves to the adjacent forward walkable tile and no farther. |
| GG-AC-006 | GG-BR-006 | Pressing `S` from each cardinal facing direction moves to the adjacent backward walkable tile and no farther. |
| GG-AC-007 | GG-BR-007 | After every completed movement, player coordinates resolve to exact grid coordinates rather than fractional in-between positions. |
| GG-AC-008 | GG-BR-008 | Attempts to move into buildings, other blocked tiles, or outside the map do not change the player tile. |
| GG-AC-009 | GG-BR-009 | Pressing `A` rotates the facing direction counterclockwise by one cardinal direction and leaves tile coordinates unchanged. |
| GG-AC-010 | GG-BR-010 | Pressing `D` rotates the facing direction clockwise by one cardinal direction and leaves tile coordinates unchanged. |
| GG-AC-011 | GG-BR-011 | Repeated movement and turn inputs do not drift the player off grid, skip unintended tiles, or produce non-cardinal facing directions. |
| GG-AC-012 | GG-BR-012 | The delivered MVP does not require combat, enemies, party data, character stats, inventory, quests, objectives, win state, save/load, procedural generation, mobile/touch controls, or audio. |

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

## Out Of Scope

- Combat, enemies, damage, or encounters.
- Party members, character statistics, classes, or progression.
- Inventory, items, equipment, shops, or loot.
- Quests, objectives, win states, narrative progression, or scoring.
- Saving or loading game state.
- Procedural map generation.
- Audio, music, and extra visual effects beyond what is needed to make movement
  and map boundaries clear.
- Mobile, touch, controller, or remappable input controls.
- Final art direction; the visual target is a functional movement prototype.

## Open Questions

None for this MVP requirements artifact. The exact street/building layout,
visual styling, animation duration, and implementation framework choices may
be selected during planning and implementation as long as the behavior
requirements and acceptance criteria above remain satisfied.

## Approval State

Approved for downstream planning. The requirements are intentionally scoped to
the grid movement MVP and leave future gameplay systems out of scope.
