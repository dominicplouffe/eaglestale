import { content } from '../content/registry';
import type { Game } from '../engine/game';
import { el } from '../engine/shell';
import {
  MAX_INVENTORY,
  applyItemUse,
  canUse,
  equipItem,
  isAlive,
  knownSpells,
  unequipItem,
  xpToNext,
} from '../rules/character';
import { castCampSpell, isCampSpell } from '../rules/spells';
import { SLOTS } from '../rules/types';
import { statBlock } from './inspect';

interface SheetOptions {
  startId?: string;
  onClose: () => void;
}

/** Full-screen character sheet: stats, equipment, pack and spells for each party member. */
export function openCharSheet(game: Game, opts: SheetOptions): void {
  let selectedId = opts.startId ?? game.party[0]?.id;
  let casting: { casterId: string; spellId: string } | null = null;

  const redraw = (): void => {
    game.refreshParty(selectedId);
    game.shell.setOverlay(build());
  };

  const build = (): HTMLElement => {
    const party = game.party;
    const root = el('div', { class: 'panel' }, el('h2', { text: 'Party Sheet' }));
    const tabs = el('div', { class: 'tabs' });
    for (const p of party) {
      tabs.append(
        el('button', {
          class: `btn${p.id === selectedId ? ' active' : ''}`,
          text: p.name,
          onclick: () => {
            selectedId = p.id;
            casting = null;
            redraw();
          },
        }),
      );
    }
    tabs.append(el('button', { class: 'btn', text: 'Close (Esc)', onclick: opts.onClose }));
    root.append(tabs);

    const c = party.find((p) => p.id === selectedId);
    if (!c) return root;
    const cls = content.cls(c.classId);
    const next = xpToNext(c);

    root.append(
      el('div', {
        text: `${c.name} - ${content.race(c.raceId).name} ${cls.name}, level ${c.level}`,
        class: 'gold',
      }),
      el('div', { class: 'dim', text: `XP ${c.xp}${next ? ` / ${next}` : ' (max level)'}   Gold ${game.state.gold}` }),
    );

    const stats = el('div', { class: 'cols' }, statBlock(c));

    const right = el('div', {});
    right.append(el('h3', { text: 'Equipment' }));
    for (const slot of SLOTS) {
      const id = c.equipment[slot];
      const row = el('div', { class: 'row' }, el('span', { class: 'dim', text: slot.padEnd(8) }));
      if (id) {
        const item = content.item(id);
        row.append(
          el('span', { class: 'grow', text: item.name, title: item.desc }),
          el('button', {
            class: 'btn small',
            text: 'Remove',
            onclick: () => {
              const err = unequipItem(c, slot);
              if (err) game.say(err, 'bad');
              redraw();
            },
          }),
        );
      } else row.append(el('span', { class: 'grow dim', text: '-' }));
      right.append(row);
    }
    stats.append(right);
    root.append(stats);

    root.append(el('h3', { text: `Pack (${c.inventory.length}/${MAX_INVENTORY})` }));
    if (c.inventory.length === 0) root.append(el('div', { class: 'dim', text: 'Empty.' }));
    c.inventory.forEach((id, index) => {
      const item = content.item(id);
      const row = el('div', { class: 'row' }, el('span', { class: 'grow', text: item.name, title: item.desc }));
      row.append(el('span', { class: 'dim', text: item.desc }));
      if (item.slot) {
        const ok = canUse(c, item);
        row.append(
          el('button', {
            class: 'btn small',
            text: ok ? 'Equip' : "Can't use",
            disabled: !ok,
            onclick: () => {
              const err = equipItem(c, index);
              if (err) game.say(err, 'bad');
              redraw();
            },
          }),
        );
      }
      if (item.use) {
        row.append(
          el('button', {
            class: 'btn small',
            text: 'Use',
            onclick: () => {
              if (!isAlive(c)) {
                game.say(`${c.name} is in no condition to drink anything.`, 'bad');
                return;
              }
              c.inventory.splice(index, 1);
              if (item.use) applyItemUse(c, item.use);
              game.audio.sfx('heal');
              game.say(`${c.name} uses ${item.name}.`, 'good');
              redraw();
            },
          }),
        );
      }
      row.append(
        el('button', {
          class: 'btn small',
          text: 'Drop',
          onclick: () => {
            if (!window.confirm(`Drop ${item.name}? It will be gone for good.`)) return;
            c.inventory.splice(index, 1);
            redraw();
          },
        }),
      );
      root.append(row);
    });

    const spells = knownSpells(c);
    if (spells.length > 0) {
      root.append(el('h3', { text: 'Spells' }));
      for (const s of spells) {
        const row = el(
          'div',
          { class: 'row' },
          el('span', { class: 'grow', text: `${s.name}  (${s.cost} SP)` }),
          el('span', { class: 'dim', text: s.desc }),
        );
        if (isCampSpell(s)) {
          row.append(
            el('button', {
              class: 'btn small',
              text: 'Cast',
              disabled: c.sp < s.cost || !isAlive(c),
              onclick: () => {
                casting = { casterId: c.id, spellId: s.id };
                redraw();
              },
            }),
          );
        }
        root.append(row);
      }
    }

    if (casting && casting.casterId === c.id) {
      const spellId = casting.spellId;
      const row = el('div', { class: 'tabs' }, el('span', { class: 'gold', text: `Cast ${content.spell(spellId).name} on: ` }));
      for (const t of party) {
        row.append(
          el('button', {
            class: 'btn small',
            text: t.name,
            onclick: () => {
              const msg = castCampSpell(c, spellId, t);
              game.audio.sfx('heal');
              game.say(msg, 'good');
              casting = null;
              redraw();
            },
          }),
        );
      }
      root.append(row);
    }
    return root;
  };

  game.shell.setKeyHandler((e) => {
    if (e.key === 'Escape') {
      opts.onClose();
      return true;
    }
    return false;
  });
  redraw();
}
