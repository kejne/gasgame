import type { TilePosition } from './map';

export const FACINGS = ['north', 'east', 'south', 'west'] as const;
export type Facing = (typeof FACINGS)[number];

export interface PlayerState {
  readonly tile: TilePosition;
  readonly facing: Facing;
}

export const START_STATE: PlayerState = {
  tile: { x: 1, y: 1 },
  facing: 'east',
};

/** True when a position can represent an authoritative grid tile. */
export function isIntegerTile(position: TilePosition): boolean {
  return Number.isInteger(position.x) && Number.isInteger(position.y);
}

/** Snap an interpolated render position back to an exact tile coordinate. */
export function snapToTile(position: TilePosition): TilePosition {
  return { x: Math.round(position.x), y: Math.round(position.y) };
}
