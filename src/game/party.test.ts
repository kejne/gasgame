import { describe, expect, it } from 'vitest';
import {
  closeCharacterScreen,
  findPartyMember,
  openCharacterScreen,
  PARTY_MEMBER_IDS,
  PARTY_MEMBERS,
  partyMemberAtIndex,
  switchCharacterScreen,
} from './party';

describe('party data', () => {
  it('defines the four fixed members with readable pixel-art portraits', () => {
    expect(PARTY_MEMBERS.map((member) => member.id)).toEqual([...PARTY_MEMBER_IDS]);
    expect(PARTY_MEMBERS.every((member) => member.portrait.length >= 8)).toBe(true);
    expect(PARTY_MEMBERS.every((member) => member.portrait.every((row) => row.length === 8))).toBe(true);
    expect(PARTY_MEMBERS.every((member) => member.paperDoll.every((row) => row.length === 10))).toBe(true);
  });

  it('selects members by the matching party slot', () => {
    expect(partyMemberAtIndex(0)?.className).toBe('Mage');
    expect(partyMemberAtIndex(3)?.className).toBe('Monk');
    expect(partyMemberAtIndex(4)).toBeUndefined();
  });

  it('keeps character screen state separate from the player state', () => {
    const session = openCharacterScreen('mage');
    expect(session).toEqual({ memberId: 'mage' });
    expect(switchCharacterScreen(session, 'priest')).toEqual({ memberId: 'priest' });
    expect(closeCharacterScreen()).toBeNull();
  });
});

describe('starter inventories', () => {
  it('contains class-appropriate data for every member', () => {
    expect(findPartyMember('mage').inventory.map((item) => item.name)).toEqual([
      'Birch Wand',
      'Arcane Focus',
      'Mana Tonic',
    ]);
    expect(findPartyMember('knight').inventory.map((item) => item.name)).toContain('Iron Sword');
    expect(findPartyMember('priest').inventory.map((item) => item.name)).toContain('Healing Herb');
    expect(findPartyMember('monk').inventory.map((item) => item.name)).toContain('Oak Bo Staff');
    expect(PARTY_MEMBERS.every((member) => member.inventory.length >= 3)).toBe(true);
  });
});
