import { describe, expect, it } from 'vitest';
import {
  backwardDelta,
  forwardDelta,
  turn,
  tryMove,
  type Facing,
  type PlayerState,
} from './movement';
import { CITY_MAP, isInBounds, isWalkable } from './map';
import { isIntegerTile, snapToTile } from './player';

const state = (x: number, y: number, facing: Facing): PlayerState => ({ tile: { x, y }, facing });

describe('city map', () => {
  it('is a 15 by 15 grid with streets and blocked cells', () => {
    expect(CITY_MAP).toHaveLength(15);
    expect(CITY_MAP.every((row) => row.length === 15)).toBe(true);
    expect(CITY_MAP.flatMap((row) => [...row])).toEqual(expect.arrayContaining(['.', '#']));
    expect(isWalkable({ x: 1, y: 1 })).toBe(true);
    expect(isWalkable({ x: 0, y: 0 })).toBe(false);
    expect(isInBounds({ x: 1.5, y: 1 })).toBe(false);
    expect(isWalkable({ x: 1.5, y: 1 })).toBe(false);
  });
});

describe('grid movement', () => {
  it.each([
    ['north', { x: 0, y: -1 }],
    ['east', { x: 1, y: 0 }],
    ['south', { x: 0, y: 1 }],
    ['west', { x: -1, y: 0 }],
  ] as const)('calculates the %s direction', (facing, expected) => {
    expect(forwardDelta(facing)).toEqual(expected);
    expect(backwardDelta(facing)).toEqual({ x: -expected.x, y: -expected.y });
  });

  it('moves one walkable tile forward for every cardinal facing', () => {
    expect(tryMove(state(1, 2, 'north'), 'forward')).toEqual(state(1, 1, 'north'));
    expect(tryMove(state(1, 1, 'east'), 'forward')).toEqual(state(2, 1, 'east'));
    expect(tryMove(state(1, 1, 'south'), 'forward')).toEqual(state(1, 2, 'south'));
    expect(tryMove(state(2, 1, 'west'), 'forward')).toEqual(state(1, 1, 'west'));
  });

  it('moves one walkable tile backward for every cardinal facing', () => {
    expect(tryMove(state(1, 1, 'north'), 'backward')).toEqual(state(1, 2, 'north'));
    expect(tryMove(state(2, 1, 'east'), 'backward')).toEqual(state(1, 1, 'east'));
    expect(tryMove(state(1, 2, 'south'), 'backward')).toEqual(state(1, 1, 'south'));
    expect(tryMove(state(1, 1, 'west'), 'backward')).toEqual(state(2, 1, 'west'));
  });

  it('rejects buildings and out-of-bounds destinations without changing state', () => {
    const building = state(1, 1, 'north');
    const boundary = state(1, 1, 'west');
    expect(tryMove(building, 'forward')).toBe(building);
    expect(tryMove(boundary, 'forward')).toBe(boundary);
  });

  it('turns exactly one quarter-turn without changing tile coordinates', () => {
    const initial = state(4, 1, 'north');
    expect(turn(initial, 'left')).toEqual(state(4, 1, 'west'));
    expect(turn(initial, 'right')).toEqual(state(4, 1, 'east'));
    expect(turn(turn(initial, 'right'), 'right')).toEqual(state(4, 1, 'south'));
  });

  it('keeps repeated actions on integer coordinates and cardinal facings', () => {
    let current = state(1, 1, 'east');
    for (let i = 0; i < 100; i += 1) {
      current = tryMove(current, i % 2 === 0 ? 'forward' : 'backward');
      current = turn(current, i % 2 === 0 ? 'left' : 'right');
    }
    expect(isIntegerTile(current.tile)).toBe(true);
    expect(['north', 'east', 'south', 'west']).toContain(current.facing);
  });

  it('snaps interpolated positions to exact integer tiles', () => {
    expect(snapToTile({ x: 3.49, y: 7.51 })).toEqual({ x: 3, y: 8 });
    expect(isIntegerTile(snapToTile({ x: 3.49, y: 7.51 }))).toBe(true);
  });
});
