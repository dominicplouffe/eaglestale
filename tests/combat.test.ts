import { describe, expect, it } from 'vitest';
import { Battle, type Order } from '../src/rules/combat';
import { castCampSpell } from '../src/rules/spells';
import { Rng } from '../src/rules/rng';
import { addXp, isAlive } from '../src/rules/character';
import type { Character } from '../src/rules/types';
import { content } from '../src/content';
import { rollEncounter } from '../src/rules/dungeon';
import { makeHero, standardParty } from './helpers';

function autoOrders(b: Battle): Map<string, Order> {
  const orders = new Map<string, Order>();
  for (const c of b.party) {
    if (!isAlive(c)) continue;
    const spells = c.sp > 0 ? (c.classId === 'mage' ? 'spark' : c.classId === 'healer' ? 'smite' : '') : '';
    const reach = b.reachableGroups(c);
    if (spells && b.liveGroupIndexes().length) orders.set(c.id, { kind: 'cast', spell: spells, group: b.liveGroupIndexes()[0] });
    else if (reach.length) orders.set(c.id, { kind: 'attack', group: reach[0] });
    else orders.set(c.id, { kind: 'defend' });
  }
  return orders;
}

function fight(party: Character[], specs: ConstructorParameters<typeof Battle>[1], seed: number) {
  const b = new Battle(party, specs, new Rng(seed));
  for (let i = 0; i < 60 && b.outcome === 'ongoing'; i++) b.resolveRound(autoOrders(b));
  return b;
}

describe('battle', () => {
  it('a fresh party beats a few rats most of the time', () => {
    let wins = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const b = fight(standardParty(), [{ monster: 'rat', count: 4 }], seed);
      if (b.outcome === 'victory') wins++;
    }
    expect(wins).toBeGreaterThanOrEqual(38);
  });

  it('level-1 parties survive typical cellar encounters', () => {
    const specs = [
      [{ monster: 'kobold', count: 3 }],
      [{ monster: 'goblin', count: 2 }, { monster: 'rat', count: 3, distance: 1 }],
      [{ monster: 'bat', count: 3 }, { monster: 'blob', count: 2, distance: 1 }],
    ];
    let wins = 0, total = 0;
    for (const s of specs) for (let seed = 1; seed <= 30; seed++) { total++; if (fight(standardParty(), s, seed).outcome === 'victory') wins++; }
    expect(wins / total).toBeGreaterThan(0.85);
  });

  it('the final boss is a serious threat to a fresh party', () => {
    let wins = 0;
    for (let seed = 1; seed <= 20; seed++) {
      if (fight(standardParty(), [{ monster: 'malachar', count: 1 }], seed).outcome === 'victory') wins++;
    }
    expect(wins).toBeLessThanOrEqual(2);
  });

  it('back-row melee fighters cannot reach adjacent groups, but archers can', () => {
    const party = standardParty();
    const b = new Battle(party, [{ monster: 'goblin', count: 2 }], new Rng(1));
    expect(b.reachableGroups(party[0])).toEqual([0]);
    expect(b.reachableGroups(party[4])).toEqual([]); // healer in the back
    expect(b.reachableGroups(party[3])).toEqual([0]); // ranger, bow
  });

  it('distant groups can only be hit by ranged attackers until they close in', () => {
    const party = standardParty();
    const b = new Battle(party, [{ monster: 'goblin', count: 2, distance: 2 }], new Rng(1));
    expect(b.reachableGroups(party[0])).toEqual([]);
    expect(b.reachableGroups(party[3])).toEqual([0]);
    b.resolveRound(new Map());
    expect(b.groups[0].distance).toBe(1);
  });

  it('sleep keeps monsters from acting and wakes them on damage', () => {
    const mage = makeHero('mage');
    mage.sp = 10;
    mage.level = 3;
    const tank = makeHero('knight');
    const b = new Battle([tank, mage], [{ monster: 'goblin', count: 6 }], new Rng(5));
    b.resolveRound(new Map([[mage.id, { kind: 'cast', spell: 'snooze', group: 0 }]]));
    expect(b.groups[0].members.some((m) => m.asleep > 0)).toBe(true);
  });

  it('awards experience to survivors only', () => {
    const party = standardParty();
    party[0].hp = 0;
    const b = new Battle(party, [{ monster: 'rat', count: 1 }], new Rng(1));
    b.xpEarned = 50;
    b.awardExperience();
    expect(party[0].xp).toBe(0);
    expect(party[1].xp).toBe(10);
  });

  it('fleeing ends the battle', () => {
    const party = standardParty();
    let fled = false;
    for (let seed = 1; seed < 30 && !fled; seed++) {
      const b = new Battle(standardParty(), [{ monster: 'rat', count: 2 }], new Rng(seed));
      b.resolveRound(new Map([[b.party[0].id, { kind: 'run' }]]));
      fled = b.outcome === 'fled';
    }
    expect(fled).toBe(true);
    expect(party).toBeDefined();
  });

  it('names unique monsters without "the" and others with it', () => {
    const b = new Battle(standardParty(), [{ monster: 'pinion', count: 1 }, { monster: 'goblin', count: 1 }], new Rng(3));
    const log = [0, 1, 2].flatMap(() => b.resolveRound(autoOrders(b))).map((e) => e.text).join('\n');
    expect(log).toMatch(/^Professor Pinion /m);
    expect(log).not.toMatch(/the Professor Pinion/i);
    expect(log).toMatch(/the Goblin/i);
  });

  it('a weaker defense spell does not replace a stronger one', () => {
    const healer = makeHero('healer');
    healer.level = 3; // knows Sanctuary (+3)
    healer.sp = 20;
    const minstrel = makeHero('minstrel'); // knows Rousing Tune (+1)
    minstrel.sp = 20;
    const b = new Battle([healer, minstrel], [{ monster: 'rat', count: 1, distance: 2 }], new Rng(1));
    b.resolveRound(new Map([[healer.id, { kind: 'cast', spell: 'sanctuary' }]]));
    expect(b.partyDefenseBonus).toBe(3);
    const events = b.resolveRound(new Map([[minstrel.id, { kind: 'cast', spell: 'rousing' }]]));
    expect(b.partyDefenseBonus).toBe(3);
    expect(events.map((e) => e.text).join('\n')).toMatch(/stronger ward/);
  });

  it('defeat when everyone is dead', () => {
    const party = [makeHero('mage')];
    party[0].hp = 1;
    const b = new Battle(party, [{ monster: 'malachar', count: 1 }], new Rng(2));
    for (let i = 0; i < 10 && b.outcome === 'ongoing'; i++) b.resolveRound(new Map());
    expect(b.outcome).toBe('defeat');
  });
});

describe('camp spells', () => {
  it('heals an ally and spends SP', () => {
    const healer = makeHero('healer');
    const knight = makeHero('knight');
    knight.hp = 1;
    const sp = healer.sp;
    castCampSpell(healer, 'mend', knight, new Rng(1));
    expect(knight.hp).toBeGreaterThan(1);
    expect(healer.sp).toBe(sp - 1);
  });

  it('does not heal the dead or cast unknown spells', () => {
    const healer = makeHero('healer');
    const knight = makeHero('knight');
    knight.hp = 0;
    expect(castCampSpell(healer, 'mend', knight)).toMatch(/temple/);
    expect(castCampSpell(healer, 'hailstorm', healer)).toMatch(/can't cast/);
    addXp(healer, 0);
  });
});

describe('higher spells and machines', () => {
  content.register({
    id: 'combat-test',
    monsters: [
      { id: 'testcog', name: 'Test Cog', plural: 'Test Cogs', hp: [40, 1], def: 0, toHit: 0, speed: 1, xp: 1, gold: [0, 0], attacks: [{ verb: 'clanks at', dice: [1, 1] }], sprite: 'blob', construct: true },
    ],
  });
  const caster = (classId: string, level: number): Character => {
    const c = makeHero(classId, classId, 'human', `${classId}-${level}`);
    c.level = level;
    c.sp = 99;
    return c;
  };

  it('machines never fall asleep', () => {
    const mage = caster('mage', 5);
    const b = new Battle([mage], [{ monster: 'testcog', count: 4 }], new Rng(3));
    const events = b.resolveRound(new Map([[mage.id, { kind: 'cast', spell: 'snooze', group: 0 }]]));
    expect(b.groups[0].members.every((m) => m.asleep === 0)).toBe(true);
    expect(events.map((e) => e.text)).toContain("Machines don't sleep.");
  });

  it('rust hits machines twice as hard', () => {
    const mage = caster('mage', 5);
    const b = new Battle([mage], [{ monster: 'testcog', count: 1 }], new Rng(4));
    const events = b.resolveRound(new Map([[mage.id, { kind: 'cast', spell: 'rustbolt', group: 0 }]]));
    const hit = events.find((e) => e.text.includes('(it rusts!)'));
    expect(hit).toBeDefined();
    const amount = Number(/takes (\d+)/.exec(hit?.text ?? '')?.[1]);
    expect(amount % 2).toBe(0);
    expect(40 - b.groups[0].members[0].hp).toBe(amount);
  });

  it('a party heal mends every living hero', () => {
    const healer = caster('healer', 8);
    const a = makeHero('knight', 'A', 'human', 'a');
    const z = makeHero('rogue', 'Z', 'human', 'z');
    a.hp = 1;
    z.hp = 1;
    const b = new Battle([a, z, healer], [{ monster: 'testcog', count: 1 }], new Rng(5));
    b.resolveRound(new Map([[healer.id, { kind: 'cast', spell: 'massmend' }]]));
    expect(a.hp).toBeGreaterThan(1);
    expect(z.hp).toBeGreaterThan(1);
  });

  it('revive brings back the fallen, in battle and at camp', () => {
    const healer = caster('healer', 10);
    const a = makeHero('knight', 'A', 'human', 'a');
    a.hp = 0;
    const b = new Battle([a, healer], [{ monster: 'testcog', count: 1 }], new Rng(6));
    b.resolveRound(new Map([[healer.id, { kind: 'cast', spell: 'revive', ally: a.id }]]));
    expect(a.hp).toBe(Math.max(1, Math.floor(a.maxHp / 4)));

    const z = makeHero('rogue', 'Z', 'human', 'z');
    z.hp = 0;
    expect(castCampSpell(healer, 'revive', z)).toMatch(/back on their feet/);
    expect(z.hp).toBeGreaterThan(0);
    expect(castCampSpell(healer, 'revive', z)).toMatch(/alive and well/);
  });

  it('an ally arrives on its round, strikes every foe and raises the fallen', () => {
    const a = makeHero('knight', 'A', 'human', 'a');
    const z = makeHero('rogue', 'Z', 'human', 'z');
    z.hp = 0;
    const assist = { name: 'Aquila', round: 2, text: 'Aquila dives!', dice: [3, 1] as [number, number], heal: [5, 1] as [number, number] };
    const b = new Battle([a, z], [{ monster: 'testcog', count: 2 }], new Rng(7), assist);
    const first = b.resolveRound(new Map([[a.id, { kind: 'defend' }]]));
    expect(first.some((e) => e.text === 'Aquila dives!')).toBe(false);
    const hpBefore = b.groups[0].members.map((m) => m.hp);
    const second = b.resolveRound(new Map([[a.id, { kind: 'defend' }]]));
    expect(second[0].text).toBe('Aquila dives!');
    expect(b.groups[0].members.map((m) => m.hp)).toEqual(hpBefore.map((hp) => hp - 3));
    expect(z.hp).toBeGreaterThan(0);
    // Once only.
    const third = b.resolveRound(new Map([[a.id, { kind: 'defend' }]]));
    expect(third.some((e) => e.text === 'Aquila dives!')).toBe(false);
  });

  it('every class learns its spells by level 12, and all of them exist', () => {
    for (const cls of content.classes.values()) {
      for (const entry of cls.spellbook) {
        expect(content.spells.has(entry.spell), `${cls.id} ${entry.spell}`).toBe(true);
        expect(entry.level).toBeLessThanOrEqual(12);
      }
    }
  });
});

describe('battle distance', () => {
  it('random encounters mostly start within reach', () => {
    const rng = new Rng(11);
    let groups = 0;
    let far = 0;
    for (const level of content.dungeon('roost').levels) {
      for (let i = 0; i < 500; i++) {
        const specs = rollEncounter(level, rng);
        expect(specs[0].distance).toBe(0);
        groups += specs.length;
        far += specs.filter((s) => (s.distance ?? 0) > 0).length;
      }
    }
    expect(far / groups).toBeLessThan(0.25);
  });

  it('ranged monsters close in too, so melee heroes can reach them', () => {
    const party = standardParty();
    const b = new Battle(party, [{ monster: 'ghost', count: 1, distance: 1 }], new Rng(3));
    expect(b.reachableGroups(party[0])).toEqual([]);
    b.resolveRound(new Map());
    if (b.outcome === 'ongoing') expect(b.reachableGroups(party[0])).toEqual([0]);
  });
});
