import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import {
  addXp, createCharacter, defense, equipItem, knownSpells, meetsRequirements, unequipItem, xpForLevel,
} from '../src/rules/character';
import { Rng } from '../src/rules/rng';
import { makeHero } from './helpers';

describe('character creation', () => {
  it('equips the starting kit', () => {
    const k = makeHero('knight');
    expect(k.equipment.weapon).toBe('longsword');
    expect(k.equipment.body).toBe('leather');
    expect(k.equipment.shield).toBe('buckler');
    expect(k.inventory).toEqual([]);
  });

  it('gives casters spell points and fighters none', () => {
    expect(makeHero('mage').maxSp).toBeGreaterThan(0);
    expect(makeHero('knight').maxSp).toBe(0);
  });

  it('enforces class requirements', () => {
    const weak = { str: 8, iq: 8, dex: 8, con: 8, lck: 8 };
    expect(meetsRequirements('mage', weak)).toBe(false);
    expect(meetsRequirements('rogue', weak)).toBe(true);
    expect(() => createCharacter({ id: 'x', name: 'X', raceId: 'human', classId: 'mage', stats: weak })).toThrow();
  });
});

describe('equipment', () => {
  it('refuses items the class cannot use', () => {
    const mage = makeHero('mage');
    mage.inventory.push('plate');
    expect(equipItem(mage, 0)).toMatch(/can't use/);
    expect(mage.equipment.body).toBe('robe');
  });

  it('swaps equipped items back into the pack', () => {
    const k = makeHero('knight');
    k.inventory.push('plate');
    expect(equipItem(k, 0)).toBeNull();
    expect(k.equipment.body).toBe('plate');
    expect(k.inventory).toEqual(['leather']);
  });

  it('unequips into the pack unless full', () => {
    const k = makeHero('knight');
    expect(unequipItem(k, 'shield')).toBeNull();
    expect(k.inventory).toEqual(['buckler']);
    k.inventory = Array(8).fill('draught');
    expect(unequipItem(k, 'body')).toMatch(/full/);
  });

  it('armor raises defense', () => {
    const k = makeHero('knight');
    const base = defense(k);
    k.inventory.push('plate');
    equipItem(k, 0);
    expect(defense(k)).toBe(base + 4);
  });
});

describe('progression', () => {
  it('needs more XP at each level', () => {
    expect(xpForLevel(2, 1)).toBe(200);
    expect(xpForLevel(3, 1)).toBeGreaterThan(xpForLevel(2, 1));
    expect(xpForLevel(2, 1.3)).toBeGreaterThan(xpForLevel(2, 1));
  });

  it('levels up, grows HP and learns spells', () => {
    const mage = makeHero('mage');
    const hp = mage.maxHp;
    const msgs = addXp(mage, 300, new Rng(3));
    expect(mage.level).toBeGreaterThanOrEqual(2);
    expect(mage.maxHp).toBeGreaterThan(hp);
    expect(msgs.join(' ')).toMatch(/level 2/);
    expect(knownSpells(mage).map((s) => s.id)).toContain('snooze');
  });

  it('can level more than once from a big award', () => {
    const k = makeHero('knight');
    addXp(k, 5000, new Rng(1));
    expect(k.level).toBeGreaterThanOrEqual(5);
  });

  it('every class definition is playable at level 1', () => {
    for (const cls of content.classes.values()) {
      const stats = { str: 14, iq: 14, dex: 14, con: 14, lck: 14 };
      expect(() => createCharacter({ id: cls.id, name: cls.name, raceId: 'human', classId: cls.id, stats })).not.toThrow();
    }
  });
});
