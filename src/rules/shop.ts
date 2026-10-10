import { content } from '../content/registry';
import { MAX_INVENTORY, canUse, equipItem } from './character';
import type { GameState } from './state';
import type { Character, Slot } from './types';

export interface TradeResult {
  ok: boolean;
  message: string;
}

const fail = (message: string): TradeResult => ({ ok: false, message });

export const sellPrice = (itemId: string): number => Math.floor(content.item(itemId).price / 2);

export function buyItem(state: GameState, buyer: Character, itemId: string): TradeResult {
  const item = content.item(itemId);
  if (state.gold < item.price) return fail(`You can't afford ${item.name}. (${item.price}g)`);
  if (buyer.inventory.length >= MAX_INVENTORY) return fail(`${buyer.name}'s pack is full.`);
  state.gold -= item.price;
  buyer.inventory.push(itemId);
  const warning = canUse(buyer, item) ? '' : ` (Warning: ${buyer.name} can't use this.)`;
  return { ok: true, message: `${buyer.name} buys ${item.name} for ${item.price}g.${warning}` };
}

/** Buys an item and equips it straight away; whatever it replaces goes to the pack. */
export function buyAndEquip(state: GameState, buyer: Character, itemId: string): TradeResult {
  const item = content.item(itemId);
  if (!item.slot || !canUse(buyer, item)) return fail(`${buyer.name} can't equip ${item.name}.`);
  const bought = buyItem(state, buyer, itemId);
  if (!bought.ok) return bought;
  equipItem(buyer, buyer.inventory.length - 1);
  return { ok: true, message: `${buyer.name} buys and equips ${item.name} for ${item.price}g.` };
}

/** Sells an inventory item, or the equipped item in a slot. */
export function sellItem(
  state: GameState,
  seller: Character,
  source: { inventory: number } | { slot: Slot },
): TradeResult {
  const itemId = 'inventory' in source ? seller.inventory[source.inventory] : seller.equipment[source.slot];
  if (!itemId) return fail('Nothing to sell there.');
  if (content.item(itemId).quest) {
    return fail(`Dusty Gizzard won't touch the ${content.item(itemId).name}. "That's yours to deal with."`);
  }
  if ('inventory' in source) seller.inventory.splice(source.inventory, 1);
  else delete seller.equipment[source.slot];
  const price = sellPrice(itemId);
  state.gold += price;
  return { ok: true, message: `${seller.name} sells ${content.item(itemId).name} for ${price}g.` };
}
