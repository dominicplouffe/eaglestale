import { content } from '../content/registry';
import { knownSpells } from './character';
import { gameRng, type Rng } from './rng';
import type { Character, SpellDef } from './types';

export function canCast(c: Character, spell: SpellDef): boolean {
  return c.hp > 0 && c.sp >= spell.cost && knownSpells(c).some((s) => s.id === spell.id);
}

/** Spell power grows slowly with the caster's level. */
export const spellBonus = (caster: Character): number => Math.floor(caster.level / 3);

export function rollSpellDice(caster: Character, spell: SpellDef, rng: Rng = gameRng): number {
  const e = spell.effect;
  if (e.kind !== 'damage' && e.kind !== 'heal') return 0;
  return rng.roll(e.dice) + spellBonus(caster);
}

/** Heals `target` and returns the HP actually restored. */
export function applyHeal(target: Character, amount: number): number {
  const healed = Math.min(amount, target.maxHp - target.hp);
  target.hp += healed;
  return healed;
}

/** Spells that can be cast from the camp menu (outside combat). */
export const isCampSpell = (spell: SpellDef): boolean =>
  spell.effect.kind === 'heal' && spell.target === 'ally';

/** Casts a healing spell on `target` outside combat. */
export function castCampSpell(
  caster: Character,
  spellId: string,
  target: Character,
  rng: Rng = gameRng,
): string {
  const spell = content.spell(spellId);
  if (!isCampSpell(spell) || !canCast(caster, spell)) return `${caster.name} can't cast that now.`;
  if (target.hp <= 0) return `${target.name} is beyond ${spell.name}. Try the temple.`;
  caster.sp -= spell.cost;
  const healed = applyHeal(target, rollSpellDice(caster, spell, rng));
  return `${caster.name} casts ${spell.name}: ${target.name} recovers ${healed} HP.`;
}
