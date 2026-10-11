/**
 * Boss balance: simulated six-hero parties (full health, sensible orders) against each chapter boss.
 * Each boss should stop an under-levelled party and fall to one at the expected level, so the
 * difficulty curve can't drift silently. Real players arrive hurt, so real fights are harder.
 */
import { describe, expect, it } from 'vitest';
import { Battle, type Order } from '../src/rules/combat';
import { addXp, canUse, equipDelta, isAlive, knownSpells, xpForLevel } from '../src/rules/character';
import type { Character } from '../src/rules/types';
import { content } from '../src/content';
import { Rng } from '../src/rules/rng';
import { standardParty } from './helpers';
import { canCast } from '../src/rules/spells';

function orders(b: Battle): Map<string, Order> {
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
function gearUp(party: Character[], gear: string[]): void {
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

function partyAt(level: number, gear: string[] = []) {
  const p = standardParty();
  gearUp(p, gear);
  for (const c of p) { addXp(c, xpForLevel(level, content.cls(c.classId).xpMult), new Rng(level)); c.hp = c.maxHp; c.sp = c.maxSp; }
  return p;
}

/** What the Emporium sells once `feathers` feathers are home (its own stock plus the city's stages). */
const shopGear = (feathers: number): string[] => [
  ...content.shop('emporium').stock,
  ...content.cityStages.filter((st) => st.feathers <= feathers).flatMap((st) => st.stock ?? []),
];
type Groups = { monster: string; count: number; distance?: number }[];
function rate(level: number, groups: Groups, gear: string[] = [], n = 40): number {
  let wins = 0;
  for (let seed = 1; seed <= n; seed++) {
    // The same groups, at the same distances, as the fight in the dungeon.
    const b = new Battle(partyAt(level, gear), groups.map((g) => ({ ...g })), new Rng(seed));
    for (let r = 0; r < 60 && b.outcome === 'ongoing'; r++) b.resolveRound(orders(b));
    if (b.outcome === 'victory') wins++;
  }
  return wins / n;
}
const bossFight = (level: number, key: string, dungeon = 'roost'): Groups =>
  (content.dungeon(dungeon).levels[level].specials[key] as { groups: Groups }).groups;

describe('boss balance', () => {
  it('the Kobold Chieftain needs a level 3 party', () => {
    expect(rate(2, bossFight(0, 'K'))).toBeLessThan(0.7);
    expect(rate(3, bossFight(0, 'K'))).toBeGreaterThanOrEqual(0.8);
  });

  it('the Bone Warden needs a level 4-5 party', () => {
    expect(rate(3, bossFight(1, 'B'))).toBeLessThan(0.5);
    expect(rate(5, bossFight(1, 'B'))).toBeGreaterThanOrEqual(0.7);
  });

  it('High Priest Grackle needs a level 6 party', () => {
    expect(rate(5, bossFight(2, 'G'))).toBeLessThan(0.5);
    expect(rate(7, bossFight(2, 'G'))).toBeGreaterThanOrEqual(0.8);
  });

  it('Old Snapjaw needs a level 7-8 party', () => {
    expect(rate(6, bossFight(0, 'J', 'gurgle'))).toBeLessThan(0.5);
    expect(rate(8, bossFight(0, 'J', 'gurgle'))).toBeGreaterThanOrEqual(0.8);
  });

  it('the Rat King needs a level 10 party', () => {
    expect(rate(8, bossFight(1, 'K', 'gurgle'), [], 80)).toBeLessThan(0.5);
    expect(rate(11, bossFight(1, 'K', 'gurgle'), [], 80)).toBeGreaterThanOrEqual(0.75);
  });

  it("the Gurgle's ambushes are beatable by a party that has just arrived", () => {
    expect(rate(7, bossFight(0, 'f', 'gurgle'))).toBeGreaterThanOrEqual(0.9);
    expect(rate(8, bossFight(1, 'f', 'gurgle'))).toBeGreaterThanOrEqual(0.9);
    expect(rate(8, bossFight(1, 'Q', 'gurgle'))).toBeGreaterThanOrEqual(0.9);
  });

  it('the Grinder needs a level 11 party', () => {
    expect(rate(9, bossFight(1, 'G', 'clocktower'))).toBeLessThan(0.3);
    expect(rate(12, bossFight(1, 'G', 'clocktower'))).toBeGreaterThanOrEqual(0.9);
  });

  it('Professor Pinion and his Mechanical Eagle need a level 12-13 party', () => {
    expect(rate(11, bossFight(2, 'E', 'clocktower'))).toBeLessThan(0.5);
    expect(rate(13, bossFight(2, 'E', 'clocktower'))).toBeGreaterThanOrEqual(0.75);
  });

  it("the Clocktower's set fights are beatable by a party that has just arrived", () => {
    expect(rate(10, bossFight(0, 'f', 'clocktower'))).toBeGreaterThanOrEqual(0.9);
    expect(rate(10, bossFight(1, 'q', 'clocktower'))).toBeGreaterThanOrEqual(0.9);
    expect(rate(11, bossFight(2, 'Q', 'clocktower'))).toBeGreaterThanOrEqual(0.9);
  });

  it('gear from the Emporium makes a real difference', () => {
    // Grackle stops a level 5 party in its starting kit, but not one in steel bought from the city.
    expect(rate(5, bossFight(2, 'G'))).toBeLessThan(0.5);
    expect(rate(5, bossFight(2, 'G'), shopGear(3))).toBeGreaterThanOrEqual(0.9);
  });
});
