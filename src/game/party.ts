export const PARTY_MEMBER_IDS = ['mage', 'knight', 'priest', 'monk'] as const;
export type PartyMemberId = (typeof PARTY_MEMBER_IDS)[number];

export interface InventoryItem {
  readonly name: string;
  readonly quantity: number;
}

export interface PartyMember {
  readonly id: PartyMemberId;
  readonly name: string;
  readonly className: string;
  readonly portrait: readonly string[];
  readonly paperDoll: readonly string[];
  readonly inventory: readonly InventoryItem[];
}

export interface CharacterScreenState {
  readonly memberId: PartyMemberId;
}

/** Party presentation and starter inventories live in data so the UI stays reusable. */
export const PARTY_MEMBERS: readonly PartyMember[] = [
  {
    id: 'mage',
    name: 'Mira',
    className: 'Mage',
    portrait: [
      '  SSSS  ',
      ' SSSSSS ',
      'SAAWAAAS',
      'SAAAAAAS',
      'S C  CS ',
      'S  WW  S',
      ' SSSSSS ',
      '  SSSS  ',
      '   AA   ',
      '  A  A  ',
    ],
    paperDoll: [
      '    BBBB  ',
      '   BBBBBB ',
      '  BAAAAAAB',
      '  BAAWAAAB',
      '   BBCCBB ',
      '    CC    ',
      '   CCCC   ',
      '  CAAAAAC ',
      ' CAAAAAAC ',
      '  CAAAAAC ',
      '    CC    ',
      '   C  C   ',
    ],
    inventory: [
      { name: 'Birch Wand', quantity: 1 },
      { name: 'Arcane Focus', quantity: 1 },
      { name: 'Mana Tonic', quantity: 2 },
    ],
  },
  {
    id: 'knight',
    name: 'Bran',
    className: 'Knight',
    portrait: [
      '  KKKKKK',
      ' KKKKKKK',
      'KKKKKKKK',
      'KKWWWWKK',
      'KKKCCKKK',
      ' KKKKKKK',
      '  KKKKK ',
      '  KKKKK ',
      ' KKKKKK ',
      ' KKKKKK ',
    ],
    paperDoll: [
      '   KKKKK  ',
      '  KKKKKKK ',
      ' KKKKKKKK ',
      ' KKWKKWKK ',
      '  KKKCKKK ',
      '   KKKK   ',
      '  KKKKKK  ',
      ' KKKKKKKK ',
      'KKKKKKKKKK',
      '  KKKKKK  ',
      '  KK  KK  ',
      ' KK    KK ',
    ],
    inventory: [
      { name: 'Iron Sword', quantity: 1 },
      { name: 'Kite Shield', quantity: 1 },
      { name: 'Trail Bread', quantity: 3 },
    ],
  },
  {
    id: 'priest',
    name: 'Sol',
    className: 'Priest',
    portrait: [
      '   WWWW ',
      '  WWWWW ',
      ' WWWWWW ',
      'WW  W  W',
      'WW  W  W',
      ' WWWWWW ',
      '  WWWWW ',
      '   WWWW ',
      '  WWWWW ',
      '  WWWWW ',
    ],
    paperDoll: [
      '    WW    ',
      '    WW    ',
      ' WWWWWWWW ',
      'WWWWWWWWWW',
      '    WW    ',
      '    WW    ',
      '   WWWW   ',
      '  WWWWWW  ',
      ' WWWWWWWW ',
      ' WWWWWWWW ',
      '   WW WW  ',
      '  WW  WW  ',
    ],
    inventory: [
      { name: 'Silver Mace', quantity: 1 },
      { name: 'Prayer Beads', quantity: 1 },
      { name: 'Healing Herb', quantity: 2 },
    ],
  },
  {
    id: 'monk',
    name: 'Tao',
    className: 'Monk',
    portrait: [
      '  RRRR  ',
      ' RRRRRR ',
      'RRWWWWRR',
      'RRCCCCRR',
      'RRRRRRRR',
      ' RRRRRR ',
      '  RRRR  ',
      ' RRRRRR ',
      ' RRRRRR ',
      '  RR RR ',
    ],
    paperDoll: [
      '  RRRRRR  ',
      ' RRRRRRRR ',
      ' RRRWWRRR ',
      ' RRRCCCCR ',
      '  RRRRRR  ',
      '   RRRR   ',
      '  RRRRRR  ',
      ' RRRRRRRR ',
      'RRRRRRRRRR',
      '  RRRRRR  ',
      ' RR    RR ',
      'RR      RR',
    ],
    inventory: [
      { name: 'Oak Bo Staff', quantity: 1 },
      { name: 'Training Wraps', quantity: 1 },
      { name: 'Jasmine Tea', quantity: 2 },
    ],
  },
] as const;

export function findPartyMember(id: PartyMemberId): PartyMember {
  return PARTY_MEMBERS.find((member) => member.id === id)!;
}

export function partyMemberAtIndex(index: number): PartyMember | undefined {
  return PARTY_MEMBERS[index];
}

export function openCharacterScreen(memberId: PartyMemberId): CharacterScreenState {
  return { memberId };
}

export function switchCharacterScreen(
  session: CharacterScreenState,
  memberId: PartyMemberId,
): CharacterScreenState {
  return { ...session, memberId };
}

export function closeCharacterScreen(): null {
  return null;
}
