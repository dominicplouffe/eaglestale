import { content } from '../content/registry';
import type { Game } from '../engine/game';
import { el } from '../engine/shell';
import { BUST, drawPortrait } from '../gfx/portrait';
import {
  FRONT_ROW_SIZE,
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
import { itemStats, statBlock } from './inspect';

/** A choice of target in progress, shown right under the row that started it. */
type Picking =
  | { kind: 'cast'; ownerId: string; spellId: string }
  | { kind: 'use' | 'give'; ownerId: string; index: number };

let picking: Picking | null = null;

/** Drops any target choice in progress (when the sheet closes). */
export function forgetPicking(): void {
  picking = null;
}

/**
 * The hero sheet: portrait, attributes, equipment, pack and spells for one party member, with tabs
 * to switch to the others. It is the same sheet whether it is opened from a hero's card or from
 * camp. When `editable`, gear can be put on and taken off, potions used, items given or dropped
 * and healing spells cast; in battle it is look-only, since the battle menu does those things.
 */
export function heroSheet(game: Game, c: Character, editable: boolean, onClose: () => void): HTMLElement {
  if (picking && picking.ownerId !== c.id) picking = null;
  const party = game.party;
  const redraw = (): void => game.refreshParty();
  const done = (): void => {
    picking = null;
    redraw();
  };

  const cls = content.cls(c.classId);
  const next = xpToNext(c);
  const index = party.indexOf(c);
  const row = index < FRONT_ROW_SIZE ? 'front row' : 'back row';
  const portrait = el('canvas');
  portrait.width = BUST;
  portrait.height = BUST;
  drawPortrait(portrait, c, !isAlive(c));
  const root = el(
    'div',
    { class: 'panel' },
    el(
      'div',
      { class: 'row' },
      el(
        'div',
        { class: 'inspect-head grow' },
        portrait,
        el(
          'div',
          {},
          el('h2', { text: c.name }),
          el('div', {
            class: 'gold',
            text: `${content.race(c.raceId).name} ${cls.name}, level ${c.level}, ${row}${isAlive(c) ? '' : ' (dead)'}`,
          }),
          el('div', { class: 'dim', text: `XP ${c.xp}${next ? ` / ${next}` : ' (max level)'}   Party gold ${game.state.gold}` }),
        ),
      ),
      el('button', { class: 'btn small', text: 'Close (Esc)', onclick: onClose }),
    ),
  );
  if (party.length > 1) {
    const tabs = el('div', { class: 'tabs' });
    for (const p of party) {
      tabs.append(el('button', { class: `btn small${p === c ? ' active' : ''}`, text: p.name, onclick: () => game.inspect(p.id) }));
    }
    root.append(tabs);
  }
  if (!editable) root.append(el('div', { class: 'dim', text: 'In battle: look only. Use the battle menu to drink a potion or cast a spell.' }));

  const targetRow = (
    label: string,
    choices: { who: Character; note?: string; disabled?: boolean }[],
    pick: (who: Character) => void,
  ): HTMLElement => {
    const r = el('div', { class: 'tabs' }, el('span', { class: 'gold', text: label }));
    for (const { who, note, disabled } of choices) {
      r.append(el('button', { class: 'btn small', text: note ? `${who.name} (${note})` : who.name, disabled, onclick: () => pick(who) }));
    }
    r.append(el('button', { class: 'btn small', text: 'Cancel', onclick: done }));
    return r;
  };
  const button = (text: string, onclick: () => void, extra: { title?: string; disabled?: boolean } = {}): HTMLElement =>
    el('button', { class: 'btn small', text, onclick, ...extra });

  // ---- Equipment ----
  const equipment = el('div', {}, el('h3', { text: 'Equipment' }));
  for (const slot of SLOTS) {
    const id = c.equipment[slot];
    const item = id ? content.item(id) : undefined;
    const r = el(
      'div',
      { class: 'row' },
      el('span', { class: 'dim', text: slot.padEnd(8) }),
      el('span', { class: `grow${item ? '' : ' dim'}`, text: item?.name ?? '-', title: item?.desc }),
      el('span', { class: 'dim', text: item ? itemStats(item) : '' }),
    );
    if (item && editable) {
      r.append(
        button('Remove', () => {
          const err = unequipItem(c, slot);
          if (err) game.say(err, 'bad');
          redraw();
        }),
      );
    }
    equipment.append(r);
  }
  root.append(el('div', { class: 'cols' }, statBlock(c), equipment));

  // ---- Pack ----
  root.append(el('h3', { text: `Pack (${c.inventory.length}/${MAX_INVENTORY})` }));
  if (c.inventory.length === 0) root.append(el('div', { class: 'dim', text: 'Empty.' }));
  c.inventory.forEach((id, at) => {
    const item = content.item(id);
    const r = el(
      'div',
      { class: 'row' },
      el('span', { class: 'grow', text: item.name, title: item.desc }),
      el('span', { class: 'dim', text: itemStats(item) || item.desc }),
    );
    if (editable) {
      if (item.slot) {
        const ok = canUse(c, item);
        r.append(
          button(ok ? 'Equip' : "Can't use", () => {
            const err = equipItem(c, at);
            if (err) game.say(err, 'bad');
            redraw();
          }, { disabled: !ok }),
        );
      }
      if (item.use) {
        r.append(button('Use', () => { picking = { kind: 'use', ownerId: c.id, index: at }; redraw(); }, { title: 'Choose who drinks it' }));
      }
      if (party.length > 1) {
        r.append(button('Give', () => { picking = { kind: 'give', ownerId: c.id, index: at }; redraw(); }, { title: "Move it to another hero's pack" }));
      }
      if (!item.quest) {
        r.append(
          button('Drop', () => {
            if (!window.confirm(`Drop ${item.name}? It will be gone for good.`)) return;
            c.inventory.splice(at, 1);
            done();
          }),
        );
      }
    }
    root.append(r);

    if (picking?.kind === 'use' && picking.ownerId === c.id && picking.index === at && item.use) {
      const sp = item.use.kind === 'restoreSp';
      const choices = party.map((t) => ({
        who: t,
        note: !isAlive(t) ? 'dead' : sp ? `SP ${t.sp}/${t.maxSp}` : `HP ${t.hp}/${t.maxHp}`,
        disabled: !isAlive(t),
      }));
      root.append(
        targetRow(`Use ${item.name} on: `, choices, (t) => {
          const result = useItemOn(c, at, t);
          game.audio.sfx(result.ok ? 'heal' : 'error');
          game.say(result.message, result.ok ? 'good' : 'bad');
          done();
        }),
      );
    }
    if (picking?.kind === 'give' && picking.ownerId === c.id && picking.index === at) {
      const choices = party
        .filter((t) => t !== c)
        .map((t) => {
          const full = t.inventory.length >= MAX_INVENTORY;
          return { who: t, note: full ? 'pack full' : undefined, disabled: full };
        });
      root.append(
        targetRow(`Give ${item.name} to: `, choices, (t) => {
          const err = giveItem(c, at, t);
          game.audio.sfx(err ? 'error' : 'buy');
          game.say(err ?? `${c.name} hands the ${item.name} to ${t.name}.`, err ? 'bad' : 'good');
          done();
        }),
      );
    }
  });

  // ---- Spells ----
  const spells = knownSpells(c);
  if (spells.length > 0) {
    root.append(el('h3', { text: 'Spells' }));
    for (const s of spells) {
      const r = el(
        'div',
        { class: 'row' },
        el('span', { class: 'grow', text: `${s.name}  (${s.cost} SP)` }),
        el('span', { class: 'dim', text: s.desc }),
      );
      if (editable && isCampSpell(s)) {
        r.append(
          button('Cast', () => {
            if (!campSpellNeedsTarget(s)) {
              game.audio.sfx('heal');
              game.say(castCampSpell(c, s.id, c, undefined, game.party), 'good');
              return done();
            }
            picking = { kind: 'cast', ownerId: c.id, spellId: s.id };
            redraw();
          }, { disabled: c.sp < s.cost || !isAlive(c) }),
        );
      }
      root.append(r);
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
}
