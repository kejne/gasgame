import { describe, expect, it } from 'vitest';
import { chooseStoreOption, closeStore, findStore, openStore, storeForPlayer } from './store';
import type { PlayerState } from './movement';

const atDoor: PlayerState = { tile: { x: 7, y: 2 }, facing: 'west' };

describe('store eligibility', () => {
  it('finds the store only from its adjacent approach tile and facing', () => {
    expect(storeForPlayer(atDoor)?.id).toBe('corner-cupboard');
    expect(storeForPlayer({ ...atDoor, facing: 'east' })).toBeUndefined();
    expect(storeForPlayer({ ...atDoor, tile: { x: 7, y: 1 } })).toBeUndefined();
  });

  it('keeps store content data separate from the player movement state', () => {
    const session = openStore(atDoor);
    expect(session).toEqual({ storeId: 'corner-cupboard', selectedOption: null });
    expect(atDoor).toEqual({ tile: { x: 7, y: 2 }, facing: 'west' });
  });
});

describe('store session transitions', () => {
  it('updates dialogue selection without closing the store', () => {
    const session = openStore(atDoor);
    expect(session).not.toBeNull();
    expect(chooseStoreOption(session!, 1)).toEqual({ storeId: 'corner-cupboard', selectedOption: 1 });
    expect(chooseStoreOption(session!, 99)).toBe(session);
  });

  it('always supports leaving and restores no movement state', () => {
    const session = openStore(atDoor);
    expect(closeStore()).toBeNull();
    expect(findStore(session!.storeId)?.options.length).toBeGreaterThanOrEqual(2);
  });
});
