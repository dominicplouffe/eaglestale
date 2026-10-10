import { content } from '../content/registry';
import { el } from '../engine/shell';
import { BUST, drawPortrait } from '../gfx/portrait';
import {
  FRONT_ROW_SIZE,
  MAX_INVENTORY,
  defense,
  isAlive,
  knownSpells,
  toHit,
  weaponDice,
  xpToNext,
} from '../rules/character';
import { diceText } from '../rules/rng';
import { ATTRS, ATTR_NAMES, SLOTS, type Character, type ItemDef } from '../rules/types';

/** One-line summary of an item's numbers, e.g. "dmg 1d8, hit +1". */
export function itemStats(item: ItemDef): string {
  const bits: string[] = [];
  if (item.damage) bits.push(`dmg ${diceText(item.damage)}`);
  if (item.hit) bits.push(`hit +${item.hit}`);
  if (item.ac) bits.push(`def +${item.ac}`);
  if (item.ranged) bits.push('ranged');
  if (item.use) bits.push(item.use.kind === 'heal' ? `heals ${item.use.amount}` : `+${item.use.amount} SP`);
  return bits.join(', ');
}

/** Attributes plus derived combat numbers. Shared by the inspect panel and the party sheet. */
export function statBlock(c: Character): HTMLElement {
  const hit = toHit(c);
  const block = el('div', {}, el('h3', { text: 'Attributes' }));
  for (const a of ATTRS) block.append(el('div', { text: `${ATTR_NAMES[a].padEnd(13)} ${c.stats[a]}` }));
  block.append(
    el('h3', { text: 'Combat' }),
    el('div', { text: `HP ${c.hp}/${c.maxHp}   SP ${c.sp}/${c.maxSp}` }),
    el('div', { text: `Defense ${defense(c)}   To-hit ${hit >= 0 ? '+' : ''}${hit}` }),
    el('div', { text: `Damage ${diceText(weaponDice(c))}` }),
  );
  return block;
}

/** Read-only view of one hero, opened by clicking their card in the party panel. */
export function inspectPanel(c: Character, partyIndex: number, onClose: () => void): HTMLElement {
  const cls = content.cls(c.classId);
  const next = xpToNext(c);
  const row = partyIndex < FRONT_ROW_SIZE ? 'front row' : 'back row';
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
          el('div', { class: 'dim', text: `XP ${c.xp}${next ? ` / ${next}` : ' (max level)'}` }),
        ),
      ),
      el('button', { class: 'btn small', text: 'Close (Esc)', onclick: onClose }),
    ),
  );

  const equipment = el('div', {}, el('h3', { text: 'Equipment' }));
  for (const slot of SLOTS) {
    const id = c.equipment[slot];
    const item = id ? content.item(id) : undefined;
    equipment.append(
      el(
        'div',
        { class: 'row' },
        el('span', { class: 'dim', text: slot.padEnd(8) }),
        el('span', { class: `grow${item ? '' : ' dim'}`, text: item?.name ?? '-', title: item?.desc }),
        el('span', { class: 'dim', text: item ? itemStats(item) : '' }),
      ),
    );
  }
  root.append(el('div', { class: 'cols' }, statBlock(c), equipment));

  root.append(el('h3', { text: `Pack (${c.inventory.length}/${MAX_INVENTORY})` }));
  if (c.inventory.length === 0) root.append(el('div', { class: 'dim', text: 'Empty.' }));
  for (const id of c.inventory) {
    const item = content.item(id);
    root.append(
      el(
        'div',
        { class: 'row' },
        el('span', { class: 'grow', text: item.name, title: item.desc }),
        el('span', { class: 'dim', text: itemStats(item) || item.desc }),
      ),
    );
  }

  const spells = knownSpells(c);
  if (spells.length > 0) {
    root.append(el('h3', { text: 'Spells' }));
    for (const s of spells) {
      root.append(
        el(
          'div',
          { class: 'row' },
          el('span', { class: 'grow', text: `${s.name}  (${s.cost} SP)` }),
          el('span', { class: 'dim', text: s.desc }),
        ),
      );
    }
  }
  return root;
}
