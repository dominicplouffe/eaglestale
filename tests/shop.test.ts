import { describe, expect, it } from 'vitest';
import { equipDelta } from '../src/rules/character';
import { content } from '../src/content';
import { buyAndEquip, buyItem, sellItem, sellPrice } from '../src/rules/shop';
import { newGameState } from '../src/rules/state';
import { makeHero } from './helpers';

describe('shop', () => {
  it('buys with gold and fills the pack', () => {
    const s = newGameState();
    const k = makeHero('knight');
    s.gold = 100;
    expect(buyItem(s, k, 'draught').ok).toBe(true);
    expect(s.gold).toBe(60);
    expect(k.inventory).toEqual(['draught']);
  });

  it('refuses when poor or pack full', () => {
    const s = newGameState();
    const k = makeHero('knight');
    s.gold = 10;
    expect(buyItem(s, k, 'plate').ok).toBe(false);
    s.gold = 9999;
    k.inventory = Array(8).fill('draught');
    expect(buyItem(s, k, 'dagger').ok).toBe(false);
    expect(s.gold).toBe(9999);
  });

  it('sells for half price from pack or equipment', () => {
    const s = newGameState();
    const k = makeHero('knight');
    s.gold = 0;
    expect(sellItem(s, k, { slot: 'weapon' }).ok).toBe(true);
    expect(s.gold).toBe(sellPrice('longsword'));
    expect(k.equipment.weapon).toBeUndefined();
    k.inventory.push('draught');
    expect(sellItem(s, k, { inventory: 0 }).ok).toBe(true);
    expect(sellItem(s, k, { inventory: 0 }).ok).toBe(false);
  });

  it('buys and equips in one go, moving the old item to the pack', () => {
    const s = newGameState();
    const k = makeHero('knight');
    s.gold = 1000;
    const r = buyAndEquip(s, k, 'battleaxe');
    expect(r.ok).toBe(true);
    expect(k.equipment.weapon).toBe('battleaxe');
    expect(k.inventory).toContain('longsword');
    expect(buyAndEquip(s, k, 'draught').ok).toBe(false);
    expect(buyAndEquip(s, makeHero('mage'), 'plate').ok).toBe(false); // mages can't wear plate
  });

  it('compares gear against what is equipped', () => {
    const k = makeHero('knight');
    expect(equipDelta(k, content.item('plate'))?.def).toBe(4); // leather 2 -> plate 6
    expect(equipDelta(k, content.item('dagger'))?.dmg).toBeLessThan(0); // longsword -> dagger
    expect(equipDelta(k, content.item('draught'))).toBeNull();
  });
});
