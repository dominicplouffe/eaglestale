/**
 * Boss balance: simulated six-hero parties (full health, sensible orders) against each chapter boss.
 * Each boss should stop an under-levelled party and fall to one at the expected level, so the
 * difficulty curve can't drift silently. Real players arrive hurt, so real fights are harder.
 */
import { describe, expect, it } from 'vitest';
import { Battle, type Order } from '../src/rules/combat';
import { addXp, isAlive, knownSpells, xpForLevel } from '../src/rules/character';
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
function partyAt(level: number) {
  const p = standardParty();
  for (const c of p) { addXp(c, xpForLevel(level, content.cls(c.classId).xpMult), new Rng(level)); c.hp = c.maxHp; c.sp = c.maxSp; }
  return p;
}
type Groups = { monster: string; count: number; distance?: number }[];
function rate(level: number, groups: Groups, n = 40): number {
  let wins = 0;
  for (let seed = 1; seed <= n; seed++) {
    // The same groups, at the same distances, as the fight in the dungeon.
    const b = new Battle(partyAt(level), groups.map((g) => ({ ...g })), new Rng(seed));
    for (let r = 0; r < 60 && b.outcome === 'ongoing'; r++) b.resolveRound(orders(b));
    if (b.outcome === 'victory') wins++;
  }
  return wins / n;
}
const bossFight = (level: number, key: string): Groups =>
  (content.dungeon('roost').levels[level].specials[key] as { groups: Groups }).groups;

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
});
