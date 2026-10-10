import { describe, expect, it } from 'vitest';
import { buyItem, sellItem, sellPrice } from '../src/rules/shop';
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
});
