import { content } from '../content/registry';
import type { Game } from '../engine/game';
import { el } from '../engine/shell';
import {
  MAX_INVENTORY,
  canUse,
  equipItem,
  giveItem,
  isAlive,
  knownSpells,
  unequipItem,
  useItemOn,
  xpToNext,
} from '../rules/character';
import { campSpellNeedsTarget, castCampSpell, isCampSpell } from '../rules/spells';
import { SLOTS, type Character } from '../rules/types';
import { statBlock } from './inspect';

/** A choice of target in progress, shown right under the row that started it. */
type Picking =
  | { kind: 'cast'; ownerId: string; spellId: string }
  | { kind: 'use' | 'give'; ownerId: string; index: number };

interface SheetOptions {
  startId?: string;
  onClose: () => void;
}

/** Full-screen character sheet: stats, equipment, pack and spells for each party member. */
export function openCharSheet(game: Game, opts: SheetOptions): void {
  let selectedId = opts.startId ?? game.party[0]?.id;
  let picking: Picking | null = null;

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
            picking = null;
            redraw();
          },
        }),
      );
    }
    tabs.append(el('button', { class: 'btn', text: 'Close (Esc)', onclick: opts.onClose }));
    root.append(tabs);

    const c = party.find((p) => p.id === selectedId);
    if (!c) return root;

    const done = (): void => {
      picking = null;
      redraw();
    };
    const targetRow = (
      label: string,
      choices: { who: Character; note?: string; disabled?: boolean }[],
      pick: (who: Character) => void,
    ): HTMLElement => {
      const row = el('div', { class: 'tabs' }, el('span', { class: 'gold', text: label }));
      for (const { who, note, disabled } of choices) {
        row.append(
          el('button', { class: 'btn small', text: note ? `${who.name} (${note})` : who.name, disabled, onclick: () => pick(who) }),
        );
      }
      row.append(el('button', { class: 'btn small', text: 'Cancel', onclick: done }));
      return row;
    };
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
            title: 'Choose who drinks it',
            onclick: () => {
              picking = { kind: 'use', ownerId: c.id, index };
              redraw();
            },
          }),
        );
      }
      if (party.length > 1) {
        row.append(
          el('button', {
            class: 'btn small',
            text: 'Give',
            title: "Move it to another hero's pack",
            onclick: () => {
              picking = { kind: 'give', ownerId: c.id, index };
              redraw();
            },
          }),
        );
      }
      if (!item.quest) {
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
      }
      root.append(row);

      if (picking?.kind === 'use' && picking.ownerId === c.id && picking.index === index && item.use) {
        const sp = item.use.kind === 'restoreSp';
        const choices = party.map((t) => ({
          who: t,
          note: !isAlive(t) ? 'dead' : sp ? `SP ${t.sp}/${t.maxSp}` : `HP ${t.hp}/${t.maxHp}`,
          disabled: !isAlive(t),
        }));
        root.append(
          targetRow(`Use ${item.name} on: `, choices, (t) => {
            const r = useItemOn(c, index, t);
            game.audio.sfx(r.ok ? 'heal' : 'error');
            game.say(r.message, r.ok ? 'good' : 'bad');
            done();
          }),
        );
      }
      if (picking?.kind === 'give' && picking.ownerId === c.id && picking.index === index) {
        const choices = party
          .filter((t) => t !== c)
          .map((t) => {
            const full = t.inventory.length >= MAX_INVENTORY;
            return { who: t, note: full ? 'pack full' : undefined, disabled: full };
          });
        root.append(
          targetRow(`Give ${item.name} to: `, choices, (t) => {
            const err = giveItem(c, index, t);
            game.audio.sfx(err ? 'error' : 'buy');
            game.say(err ?? `${c.name} hands the ${item.name} to ${t.name}.`, err ? 'bad' : 'good');
            done();
          }),
        );
      }
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
                if (!campSpellNeedsTarget(s)) {
                  game.audio.sfx('heal');
                  game.say(castCampSpell(c, s.id, c, undefined, game.party), 'good');
                  return done();
                }
                picking = { kind: 'cast', ownerId: c.id, spellId: s.id };
                redraw();
              },
            }),
          );
        }
        root.append(row);
        if (picking?.kind === 'cast' && picking.ownerId === c.id && picking.spellId === s.id) {
          const choices = party.map((t) => ({ who: t, note: isAlive(t) ? `HP ${t.hp}/${t.maxHp}` : 'dead' }));
          root.append(
            targetRow(`Cast ${s.name} on: `, choices, (t) => {
              game.audio.sfx('heal');
              game.say(castCampSpell(c, s.id, t), 'good');
              done();
            }),
          );
        }
      }
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
