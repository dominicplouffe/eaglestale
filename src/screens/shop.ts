import { content } from '../content/registry';
import type { Game, Screen } from '../engine/game';
import { el } from '../engine/shell';
import { drawPlace } from '../gfx/scenes';
import { MAX_INVENTORY, canUse } from '../rules/character';
import { diceText } from '../rules/rng';
import { buyItem, sellItem, sellPrice, type TradeResult } from '../rules/shop';
import { SLOTS, type ItemDef } from '../rules/types';
import { townScreen } from './town';

const SHOP_ID = 'emporium';

function itemStats(item: ItemDef): string {
  const bits: string[] = [];
  if (item.damage) bits.push(`dmg ${diceText(item.damage)}`);
  if (item.hit) bits.push(`hit +${item.hit}`);
  if (item.ac) bits.push(`def +${item.ac}`);
  if (item.ranged) bits.push('ranged');
  if (item.use) bits.push(item.use.kind === 'heal' ? `heals ${item.use.amount}` : `+${item.use.amount} SP`);
  return bits.join(', ');
}

export const shopScreen: Screen = {
  enter(game: Game) {
    const shop = content.shop(SHOP_ID);
    let mode: 'buy' | 'sell' = 'buy';
    let selectedId = game.party[0]?.id;

    game.shell.setLocation(shop.name);
    game.shell.setDraw((ctx, t) => drawPlace(ctx, 'shop', t));
    game.say(shop.greeting, 'story');
    const leave = (): void => game.go(townScreen);
    game.shell.setMenu([{ key: 'l', label: 'Leave the shop', action: leave }]);
    game.shell.setKeyHandler((e) => {
      if (e.key === 'Escape') {
        leave();
        return true;
      }
      return false;
    });

    const report = (r: TradeResult): void => {
      game.audio.sfx(r.ok ? 'buy' : 'error');
      game.say(r.message, r.ok ? 'good' : 'bad');
      render();
    };

    const render = (): void => {
      game.refreshParty(selectedId);
      const root = el('div', { class: 'panel' }, el('h2', { text: shop.name }));
      if (game.party.length === 0) {
        root.append(el('div', { class: 'warn', text: 'You have no party to shop for. Visit the Guild first.' }));
        game.shell.setOverlay(root);
        return;
      }
      const buyer = game.party.find((c) => c.id === selectedId) ?? game.party[0];
      selectedId = buyer.id;

      const tabs = el('div', { class: 'tabs' });
      for (const c of game.party) {
        tabs.append(
          el('button', {
            class: `btn${c.id === buyer.id ? ' active' : ''}`,
            text: c.name,
            onclick: () => { selectedId = c.id; render(); },
          }),
        );
      }
      tabs.append(
        el('button', { class: `btn${mode === 'buy' ? ' active' : ''}`, text: 'Buy', onclick: () => { mode = 'buy'; render(); } }),
        el('button', { class: `btn${mode === 'sell' ? ' active' : ''}`, text: 'Sell', onclick: () => { mode = 'sell'; render(); } }),
      );
      root.append(
        tabs,
        el('div', { class: 'gold', text: `Gold: ${game.state.gold}    ${buyer.name}'s pack: ${buyer.inventory.length}/${MAX_INVENTORY}` }),
      );

      if (mode === 'buy') {
        for (const id of shop.stock) {
          const item = content.item(id);
          const usable = canUse(buyer, item);
          root.append(
            el(
              'div',
              { class: 'row' },
              el('span', { class: `grow${usable ? '' : ' dim'}`, text: item.name, title: item.desc }),
              el('span', { class: 'dim', text: `${itemStats(item)}${usable ? '' : ' (cannot use)'}` }),
              el('span', { class: 'price', text: `${item.price}g` }),
              el('button', {
                class: 'btn small',
                text: 'Buy',
                disabled: game.state.gold < item.price || buyer.inventory.length >= MAX_INVENTORY,
                onclick: () => report(buyItem(game.state, buyer, id)),
              }),
            ),
          );
        }
      } else {
        root.append(el('h3', { text: 'Equipped' }));
        for (const slot of SLOTS) {
          const id = buyer.equipment[slot];
          if (!id) continue;
          root.append(sellRow(id, () => report(sellItem(game.state, buyer, { slot }))));
        }
        root.append(el('h3', { text: 'Pack' }));
        if (buyer.inventory.length === 0) root.append(el('div', { class: 'dim', text: 'Nothing to sell.' }));
        buyer.inventory.forEach((id, index) => {
          root.append(sellRow(id, () => report(sellItem(game.state, buyer, { inventory: index }))));
        });
      }
      game.shell.setOverlay(root);
    };

    const sellRow = (id: string, onSell: () => void): HTMLElement => {
      const item = content.item(id);
      return el(
        'div',
        { class: 'row' },
        el('span', { class: 'grow', text: item.name, title: item.desc }),
        el('span', { class: 'dim', text: itemStats(item) }),
        el('span', { class: 'price', text: `${sellPrice(id)}g` }),
        el('button', { class: 'btn small', text: 'Sell', onclick: onSell }),
      );
    };

    render();
  },
};
