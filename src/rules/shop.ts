import { content } from '../content/registry';
import { MAX_INVENTORY, canUse } from './character';
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

/** Sells an inventory item, or the equipped item in a slot. */
export function sellItem(
  state: GameState,
  seller: Character,
  source: { inventory: number } | { slot: Slot },
): TradeResult {
  let itemId: string | undefined;
  if ('inventory' in source) {
    itemId = seller.inventory[source.inventory];
    if (itemId) seller.inventory.splice(source.inventory, 1);
  } else {
    itemId = seller.equipment[source.slot];
    if (itemId) delete seller.equipment[source.slot];
  }
  if (!itemId) return fail('Nothing to sell there.');
  const price = sellPrice(itemId);
  state.gold += price;
  return { ok: true, message: `${seller.name} sells ${content.item(itemId).name} for ${price}g.` };
}
