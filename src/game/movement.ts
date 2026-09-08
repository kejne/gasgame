import type { TilePosition } from './map';
import { isWalkable } from './map';
import {
  FACINGS,
  type Facing,
  type PlayerState,
} from './player';

export {
  FACINGS,
  START_STATE,
  type Facing,
  type PlayerState,
} from './player';

export type MoveIntent = 'forward' | 'backward';
export type TurnIntent = 'left' | 'right';

const DELTAS: Record<Facing, TilePosition> = {
  north: { x: 0, y: -1 },
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
};

export function forwardDelta(facing: Facing): TilePosition {
  const delta = DELTAS[facing];
  return { x: delta.x, y: delta.y };
}

export function backwardDelta(facing: Facing): TilePosition {
  const delta = DELTAS[facing];
  return { x: -delta.x, y: -delta.y };
}

export function turnLeft(facing: Facing): Facing {
  const index = FACINGS.indexOf(facing);
  return FACINGS[(index + FACINGS.length - 1) % FACINGS.length];
}

export function turnRight(facing: Facing): Facing {
  const index = FACINGS.indexOf(facing);
  return FACINGS[(index + 1) % FACINGS.length];
}

export function tryMove(state: PlayerState, intent: MoveIntent): PlayerState {
  const delta = intent === 'forward' ? forwardDelta(state.facing) : backwardDelta(state.facing);
  const destination = {
    x: state.tile.x + delta.x,
    y: state.tile.y + delta.y,
  };

  if (!isWalkable(destination)) {
    return state;
  }

  return { ...state, tile: destination };
}

export function turn(state: PlayerState, intent: TurnIntent): PlayerState {
  return {
    ...state,
    facing: intent === 'left' ? turnLeft(state.facing) : turnRight(state.facing),
  };
}
