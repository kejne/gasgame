export type Tile = '#' | '.';

/** A 15 x 15 city block: # is a building/boundary and . is walkable street. */
export const CITY_MAP = [
  '###############',
  '#.............#',
  '#.#####.#####.#',
  '#.#...#.#...#.#',
  '#.#.#.#.#.#.#.#',
  '#...#...#...#.#',
  '###.#.#.#.#.###',
  '#...#...#...#.#',
  '#.#.#.#.#.#.#.#',
  '#.#...#.#...#.#',
  '#.#####.#####.#',
  '#.............#',
  '#..#########..#',
  '#.............#',
  '###############',
] as const satisfies readonly string[];

export const MAP_WIDTH = CITY_MAP[0].length;
export const MAP_HEIGHT = CITY_MAP.length;
export const TILE_SIZE = 4;

export interface TilePosition {
  readonly x: number;
  readonly y: number;
}

export function isInBounds(position: TilePosition): boolean {
  return Number.isInteger(position.x)
    && Number.isInteger(position.y)
    && position.x >= 0
    && position.y >= 0
    && position.x < MAP_WIDTH
    && position.y < MAP_HEIGHT;
}

export function tileAt(position: TilePosition): Tile | undefined {
  if (!isInBounds(position)) return undefined;
  return CITY_MAP[position.y][position.x] as Tile;
}

export function isWalkable(position: TilePosition): boolean {
  return tileAt(position) === '.';
}
