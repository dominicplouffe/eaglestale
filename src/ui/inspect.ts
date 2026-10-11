import { el } from '../engine/shell';
import { defense, toHit, weaponDice } from '../rules/character';
import { diceText } from '../rules/rng';
import { ATTRS, ATTR_NAMES, type Character, type ItemDef } from '../rules/types';

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

/** Attributes plus derived combat numbers, for the hero sheet. */
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
