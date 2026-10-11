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

/** Spells that can be cast from the camp menu (outside combat): heals and bringing back the fallen. */
export const isCampSpell = (spell: SpellDef): boolean =>
  (spell.effect.kind === 'heal' && (spell.target === 'ally' || spell.target === 'party')) || spell.effect.kind === 'revive';

/** Whether a camp spell needs someone picked (a party heal doesn't). */
export const campSpellNeedsTarget = (spell: SpellDef): boolean => spell.target !== 'party';

/** Casts a healing or reviving spell outside combat, on `target` (ignored for party heals). */
export function castCampSpell(
  caster: Character,
  spellId: string,
  target: Character,
  rng: Rng = gameRng,
  party: Character[] = [target],
): string {
  const spell = content.spell(spellId);
  if (!isCampSpell(spell) || !canCast(caster, spell)) return `${caster.name} can't cast that now.`;
  const e = spell.effect;
  if (e.kind === 'revive') {
    if (target.hp > 0) return `${target.name} is alive and well; ${spell.name} is for the fallen.`;
    caster.sp -= spell.cost;
    target.hp = Math.max(1, Math.floor(target.maxHp * e.share));
    return `${caster.name} casts ${spell.name}: ${target.name} is back on their feet with ${target.hp} HP.`;
  }
  if (spell.target === 'party') {
    caster.sp -= spell.cost;
    const total = party.filter((p) => p.hp > 0).reduce((sum, p) => sum + applyHeal(p, rollSpellDice(caster, spell, rng)), 0);
    return `${caster.name} casts ${spell.name}: the party recovers ${total} HP in all.`;
  }
  if (target.hp <= 0) return `${target.name} is beyond ${spell.name}. Try the temple.`;
  caster.sp -= spell.cost;
  const healed = applyHeal(target, rollSpellDice(caster, spell, rng));
  return `${caster.name} casts ${spell.name}: ${target.name} recovers ${healed} HP.`;
}
