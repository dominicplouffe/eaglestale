import type { Game, Screen } from '../engine/game';
import { el } from '../engine/shell';
import { drawPlace } from '../gfx/scenes';
import { isAlive } from '../rules/character';
import { townScreen } from './town';

const reviveCost = (level: number): number => 100 * level;

export const templeScreen: Screen = {
  enter(game: Game) {
    game.shell.setLocation('Temple of the Gentle Peck');
    game.shell.setDraw((ctx, t) => drawPlace(ctx, 'temple', t));
    game.say('A priest in a feathered stole beams at you. "Peace, travellers. Donations are encouraged. Mandatory, even."', 'story');
    const leave = (): void => game.go(townScreen);
    game.shell.setMenu([{ key: 'l', label: 'Leave the temple', action: leave }]);
    game.shell.setKeyHandler((e) => {
      if (e.key === 'Escape') {
        leave();
        return true;
      }
      return false;
    });

    const render = (): void => {
      game.refreshParty();
      const root = el('div', { class: 'panel' }, el('h2', { text: 'Temple of the Gentle Peck' }));
      root.append(el('div', { class: 'gold', text: `Gold: ${game.state.gold}` }));
      if (game.party.length === 0) root.append(el('div', { class: 'dim', text: 'Nobody to tend to.' }));
      for (const c of game.party) {
        const row = el('div', { class: 'row' }, el('span', { class: 'grow', text: `${c.name}  HP ${c.hp}/${c.maxHp}${isAlive(c) ? '' : '  (dead)'}` }));
        if (!isAlive(c)) {
          const cost = reviveCost(c.level);
          // Short of the fee, the temple takes whatever gold is left (if any) and revives at 1 HP.
          const charity = game.state.gold < cost;
          const offering = game.state.gold;
          row.append(
            el('span', { class: 'price', text: charity ? (offering > 0 ? `${offering}g` : 'charity') : `${cost}g` }),
            el('button', {
              class: 'btn small',
              text: 'Revive',
              title: charity ? `You cannot cover the ${cost}g donation, so the temple accepts what you have (revives at 1 HP)` : '',
              onclick: () => {
                if (charity) {
                  game.state.gold = 0;
                  c.hp = 1;
                  game.say(
                    offering > 0
                      ? `The priest accepts your last ${offering}g and revives ${c.name}. Barely. (1 HP)`
                      : `The priest takes pity and revives ${c.name} for free. Barely. (1 HP)`,
                    'good',
                  );
                } else {
                  game.state.gold -= cost;
                  c.hp = Math.max(1, Math.floor(c.maxHp / 2));
                  game.say(`${c.name} gasps back to life.`, 'good');
                }
                game.audio.sfx('heal');
                render();
              },
            }),
          );
        } else if (c.hp < c.maxHp) {
          const cost = c.maxHp - c.hp;
          row.append(
            el('span', { class: 'price', text: `${cost}g` }),
            el('button', {
              class: 'btn small',
              text: 'Heal',
              disabled: game.state.gold < cost,
              onclick: () => {
                game.state.gold -= cost;
                c.hp = c.maxHp;
                game.audio.sfx('heal');
                game.say(`${c.name} is patched up (1g per HP).`, 'good');
                render();
              },
            }),
          );
        }
        root.append(row);
      }
      game.shell.setOverlay(root);
    };
    render();
  },
};
