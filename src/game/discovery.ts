import { MAP_HEIGHT, MAP_WIDTH, tileAt, type TilePosition } from './map';
import type { Facing, PlayerState } from './movement';

/** Number of tiles the player can reveal in front of them at a time. */
export const VIEW_RADIUS = 3;

export type DiscoveredTiles = ReadonlySet<string>;

const FACING_VECTORS: Record<Facing, TilePosition> = {
  north: { x: 0, y: -1 },
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 },
};

export function tileKey(position: TilePosition): string {
  return `${position.x},${position.y}`;
}

function isWithinMap(position: TilePosition): boolean {
  return position.x >= 0 && position.y >= 0 && position.x < MAP_WIDTH && position.y < MAP_HEIGHT;
}

/**
 * The view is a square-radius forward cone. The current tile and the tiles
 * directly ahead are always included; turning exposes the next side of the
 * same radius without ever removing earlier discoveries.
 */
export function isVisibleFrom(position: TilePosition, viewer: PlayerState, radius = VIEW_RADIUS): boolean {
  const offsetX = position.x - viewer.tile.x;
  const offsetY = position.y - viewer.tile.y;
  const distance = Math.max(Math.abs(offsetX), Math.abs(offsetY));
  if (distance > radius) return false;

  const direction = FACING_VECTORS[viewer.facing];
  return offsetX * direction.x + offsetY * direction.y >= 0;
}

export function visibleTiles(viewer: PlayerState, radius = VIEW_RADIUS): TilePosition[] {
  const tiles: TilePosition[] = [];
  for (let y = 0; y < MAP_HEIGHT; y += 1) {
    for (let x = 0; x < MAP_WIDTH; x += 1) {
      const position = { x, y };
      if (isVisibleFrom(position, viewer, radius)) tiles.push(position);
    }
  }
  return tiles;
}

function hasLineOfSight(viewer: PlayerState, target: TilePosition): boolean {
  let x = viewer.tile.x;
  let y = viewer.tile.y;
  const deltaX = Math.abs(target.x - x);
  const deltaY = Math.abs(target.y - y);
  const stepX = x < target.x ? 1 : -1;
  const stepY = y < target.y ? 1 : -1;
  let error = deltaX - deltaY;

  while (x !== target.x || y !== target.y) {
    const doubledError = error * 2;
    if (doubledError > -deltaY) {
      error -= deltaY;
      x += stepX;
    }
    if (doubledError < deltaX) {
      error += deltaX;
      y += stepY;
    }

    // The blocking tile is visible, but nothing beyond it is.
    if (tileAt({ x, y }) === '#') return x === target.x && y === target.y;
  }

  return true;
}

export function revealTiles(viewer: PlayerState, discovered: DiscoveredTiles = new Set()): Set<string> {
  const next = new Set(discovered);
  for (const position of visibleTiles(viewer)) {
    if (isWithinMap(position) && hasLineOfSight(viewer, position)) next.add(tileKey(position));
  }
  return next;
}

export function isDiscovered(discovered: DiscoveredTiles, position: TilePosition): boolean {
  return discovered.has(tileKey(position));
}
