/**
 * Battle simulation helpers: standard six-hero parties at a given level and gear, playing sensible
 * orders against a set of monster groups, many times over.
 */
import { Battle, type Order } from '../src/rules/combat';
import { addXp, canUse, equipDelta, isAlive, knownSpells, xpForLevel } from '../src/rules/character';
import type { Assist, Character } from '../src/rules/types';
import { content } from '../src/content';
import { Rng } from '../src/rules/rng';
import { standardParty } from './helpers';
import { canCast } from '../src/rules/spells';

export function orders(b: Battle): Map<string, Order> {
  const o = new Map<string, Order>();
  for (const c of b.party) {
    if (!isAlive(c)) continue;
    const hurt = b.party.filter(isAlive).sort((a, z) => a.hp / a.maxHp - z.hp / z.maxHp)[0];
    const spells = knownSpells(c).filter((s) => canCast(c, s));
    const heal = spells.find((s) => s.effect.kind === 'heal');
    const dmg = spells.filter((s) => s.effect.kind === 'damage').sort((a, z) => z.cost - a.cost)[0];
    if (heal && hurt.hp < hurt.maxHp * 0.5) o.set(c.id, { kind: 'cast', spell: heal.id, ally: hurt.id });
    else if (dmg) o.set(c.id, { kind: 'cast', spell: dmg.id, group: b.liveGroupIndexes()[0] });
    else if (b.reachableGroups(c).length) o.set(c.id, { kind: 'attack', group: b.reachableGroups(c)[0] });
    else o.set(c.id, { kind: 'defend' });
  }
  return o;
}
/** Puts on the best of `gear` each hero can use (archers keep to bows, fighters to melee weapons). */
export function gearUp(party: Character[], gear: string[]): void {
  for (const c of party) {
    for (const id of gear) {
      const item = content.item(id);
      if (!item.slot || !canUse(c, item)) continue;
      const worn = c.equipment[item.slot];
      if (item.slot === 'weapon' && worn && !!content.item(worn).ranged !== !!item.ranged) continue;
      const d = equipDelta(c, item);
      if (d && d.dmg * 2 + d.def + d.hit > 0) c.equipment[item.slot] = id;
    }
  }
}

/** Gear for the whole party, or (a list per hero) what each hero wears. */
export type Gear = string[] | string[][];

/** A standard party at `level` (or a level per hero), wearing `gear`, fresh from the inn. */
export function partyAt(level: number | number[], gear: Gear = []) {
  const p = standardParty();
  if (gear.length && Array.isArray(gear[0])) p.forEach((c, i) => gearUp([c], (gear as string[][])[i] ?? []));
  else gearUp(p, gear as string[]);
  p.forEach((c, i) => {
    const l = typeof level === 'number' ? level : level[i];
    addXp(c, xpForLevel(l, content.cls(c.classId).xpMult), new Rng(l));
    c.hp = c.maxHp;
    c.sp = c.maxSp;
  });
  return p;
}

/** What the Emporium sells once `feathers` feathers are home (its own stock plus the city's stages). */
export const shopGear = (feathers: number): string[] => [
  ...content.shop('emporium').stock,
  ...content.cityStages.filter((st) => st.feathers <= feathers).flatMap((st) => st.stock ?? []),
];
export type Groups = { monster: string; count: number; distance?: number }[];
export function rate(level: number | number[], groups: Groups, gear: Gear = [], n = 40, assist?: Assist): number {
  let wins = 0;
  for (let seed = 1; seed <= n; seed++) {
    // The same groups, at the same distances, as the fight in the dungeon.
    const b = new Battle(partyAt(level, gear), groups.map((g) => ({ ...g })), new Rng(seed), assist);
    for (let r = 0; r < 60 && b.outcome === 'ongoing'; r++) b.resolveRound(orders(b));
    if (b.outcome === 'victory') wins++;
  }
  return wins / n;
}
export const bossFight = (level: number, key: string, dungeon = 'roost'): Groups =>
  (content.dungeon(dungeon).levels[level].specials[key] as { groups: Groups }).groups;
