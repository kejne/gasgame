import type { TilePosition } from './map';
import { isWalkable } from './map';

export const FACINGS = ['north', 'east', 'south', 'west'] as const;
export type Facing = (typeof FACINGS)[number];

export interface PlayerState {
  readonly tile: TilePosition;
  readonly facing: Facing;
}

export type MoveIntent = 'forward' | 'backward';
export type TurnIntent = 'left' | 'right';

const DELTAS: Record<Facing, TilePosition> = {
  north: { x: 0, y: -1 },
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
};

export const START_STATE: PlayerState = {
  tile: { x: 1, y: 1 },
  facing: 'east',
};

export function forwardDelta(facing: Facing): TilePosition {
  return DELTAS[facing];
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
