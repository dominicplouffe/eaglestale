import { content } from '../content/registry';
import type { Game, Screen } from '../engine/game';
import { el } from '../engine/shell';
import { drawPlace } from '../gfx/scenes';
import { MAX_INVENTORY, canUse, equipDelta } from '../rules/character';
import { shopStock } from '../rules/quests';
import { buyAndEquip, buyItem, sellItem, sellPrice, type TradeResult } from '../rules/shop';
import { SLOTS, type Character, type ItemDef } from '../rules/types';
import { itemStats } from '../ui/inspect';
import { townScreen } from './town';

const SHOP_ID = 'emporium';

/** "+2 def, -1 hit" compared with what the hero has on now, coloured by whether it's an upgrade. */
function comparison(c: Character, item: ItemDef): HTMLElement | null {
  const d = equipDelta(c, item);
  if (!d) return null;
  const parts: string[] = [];
  const signed = (n: number): string => (n > 0 ? `+${n}` : `${n}`);
  if (d.def) parts.push(`${signed(d.def)} def`);
  if (d.hit) parts.push(`${signed(d.hit)} hit`);
  if (d.dmg) parts.push(`${signed(Math.round(d.dmg * 10) / 10)} dmg`);
  const values = [d.def, d.hit, d.dmg];
  const better = values.some((v) => v > 0) && values.every((v) => v >= 0);
  const worse = values.some((v) => v < 0) && values.every((v) => v <= 0);
  const current = item.slot ? c.equipment[item.slot] : undefined;
  return el('span', {
    class: `compare${better ? ' good' : worse ? ' warn' : ' dim'}`,
    text: parts.length ? parts.join(', ') : 'no change',
    title: `Compared with ${current ? content.item(current).name : 'nothing'} in the ${item.slot} slot`,
  });
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
        for (const id of shopStock(game.state, shop.stock)) {
          const item = content.item(id);
          const usable = canUse(buyer, item);
          const cantBuy = game.state.gold < item.price || buyer.inventory.length >= MAX_INVENTORY;
          const row = el(
            'div',
            { class: 'row' },
            el('span', { class: `grow${usable ? '' : ' dim'}`, text: item.name, title: item.desc }),
            el('span', { class: 'dim', text: `${itemStats(item)}${usable ? '' : ' (cannot use)'}` }),
          );
          const compare = usable ? comparison(buyer, item) : null;
          if (compare) row.append(compare);
          row.append(
            el('span', { class: 'price', text: `${item.price}g` }),
            el('button', {
              class: 'btn small',
              text: 'Buy',
              disabled: cantBuy,
              onclick: () => report(buyItem(game.state, buyer, id)),
            }),
          );
          if (item.slot && usable) {
            row.append(
              el('button', {
                class: 'btn small',
                text: 'Buy & equip',
                disabled: cantBuy,
                onclick: () => report(buyAndEquip(game.state, buyer, id)),
              }),
            );
          }
          root.append(row);
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
