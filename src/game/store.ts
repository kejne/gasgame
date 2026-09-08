import type { Facing, PlayerState } from './movement';
import type { TilePosition } from './map';

export interface StoreOption {
  readonly label: string;
  readonly response: string;
}

export interface StoreDefinition {
  readonly id: string;
  readonly name: string;
  readonly buildingTile: TilePosition;
  readonly doorTile: TilePosition;
  readonly approachTile: TilePosition;
  /** The direction the player must face while standing on approachTile. */
  readonly doorFacing: Facing;
  readonly dialogue: string;
  readonly portrait: readonly string[];
  readonly options: readonly StoreOption[];
}

export interface StoreSession {
  readonly storeId: string;
  readonly selectedOption: number | null;
}

/** Store content is data-driven so more doors and dialogue can be added later. */
export const STORES: readonly StoreDefinition[] = [
  {
    id: 'corner-cupboard',
    name: 'The Corner Cupboard',
    buildingTile: { x: 6, y: 2 },
    doorTile: { x: 6, y: 2 },
    approachTile: { x: 7, y: 2 },
    doorFacing: 'west',
    dialogue: 'Welcome in, traveler! The shelves are mostly vibes today.',
    portrait: [
      '  PPPP  ',
      ' PPPPPP ',
      'PYYPPYYP',
      'PYYYYYYP',
      'P BB BBP',
      'P  WW  P',
      ' PPPPPP ',
      '  PPPP  ',
    ],
    options: [
      { label: 'Ask about the mystery shelf', response: 'It only holds dust, but it is very mysterious dust.' },
      { label: 'Compliment the shop hat', response: 'Thank you! It has excellent hat-titude.' },
      { label: 'Check the weather indoors', response: 'A gentle chance of ceiling today.' },
    ],
  },
] as const;

function sameTile(left: TilePosition, right: TilePosition): boolean {
  return left.x === right.x && left.y === right.y;
}

export function findStore(id: string): StoreDefinition | undefined {
  return STORES.find((store) => store.id === id);
}

export function storeForPlayer(player: PlayerState): StoreDefinition | undefined {
  return STORES.find((store) => sameTile(player.tile, store.approachTile) && player.facing === store.doorFacing);
}

export function openStore(player: PlayerState): StoreSession | null {
  const store = storeForPlayer(player);
  return store ? { storeId: store.id, selectedOption: null } : null;
}

export function chooseStoreOption(session: StoreSession, optionIndex: number): StoreSession {
  const store = findStore(session.storeId);
  if (!store || optionIndex < 0 || optionIndex >= store.options.length) return session;
  return { ...session, selectedOption: optionIndex };
}

export function closeStore(): null {
  return null;
}
