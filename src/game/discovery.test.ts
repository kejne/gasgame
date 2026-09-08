import { describe, expect, it } from 'vitest';
import { isDiscovered, isVisibleFrom, revealTiles, tileKey, VIEW_RADIUS } from './discovery';
import type { PlayerState } from './movement';

const state = (x: number, y: number, facing: PlayerState['facing']): PlayerState => ({ tile: { x, y }, facing });

describe('fog-of-war discovery', () => {
  it('reveals the current tile and the forward half of the view radius', () => {
    const viewer = state(1, 1, 'east');
    const discovered = revealTiles(viewer);

    expect(isDiscovered(discovered, { x: 1, y: 1 })).toBe(true);
    expect(isDiscovered(discovered, { x: 1 + VIEW_RADIUS, y: 1 })).toBe(true);
    expect(isDiscovered(discovered, { x: 1 - 1, y: 1 })).toBe(false);
    expect(isDiscovered(discovered, { x: 1 + VIEW_RADIUS + 1, y: 1 })).toBe(false);
  });

  it('turning reveals the new direction and never hides prior discoveries', () => {
    const east = state(7, 7, 'east');
    const eastDiscoveries = revealTiles(east);
    const turned = state(7, 7, 'north');
    const northDiscoveries = revealTiles(turned, eastDiscoveries);

    expect(isVisibleFrom({ x: 7, y: 7 - VIEW_RADIUS }, turned)).toBe(true);
    expect(isDiscovered(northDiscoveries, { x: 7, y: 7 - VIEW_RADIUS })).toBe(true);
    for (const key of eastDiscoveries) expect(northDiscoveries.has(key)).toBe(true);
  });

  it('tracks blocked and walkable cells by their shared map coordinates', () => {
    const discovered = revealTiles(state(1, 1, 'east'));

    expect(discovered.has(tileKey({ x: 2, y: 1 }))).toBe(true);
    expect(discovered.has(tileKey({ x: 3, y: 0 }))).toBe(true);
    expect(discovered.has(tileKey({ x: 0, y: 1 }))).toBe(false);
    expect(tileKey({ x: 4, y: 3 })).toBe('4,3');
  });

  it('reveals an obstruction but not terrain behind it', () => {
    const discovered = revealTiles(state(1, 2, 'east'));

    expect(discovered.has(tileKey({ x: 2, y: 2 }))).toBe(true);
    expect(discovered.has(tileKey({ x: 3, y: 2 }))).toBe(false);
  });
});
