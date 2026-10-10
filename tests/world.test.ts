import { describe, expect, it } from 'vitest';
import { generateMaze } from '../src/content/maze';
import { content } from '../src/content';
import { rollEncounter, turn } from '../src/rules/dungeon';
import { Rng } from '../src/rules/rng';
import {
  addToParty, deleteCharacter, deserialize, movePartyMember, newGameState, removeFromParty, serialize, startingState,
} from '../src/rules/state';
import { autoAllocate, createCharacter } from '../src/rules/character';
import { starterParty } from '../src/content/base/story';
import { makeHero } from './helpers';

describe('maze generator', () => {
  const opts = { seed: 99, w: 6, h: 6, loops: 4, doorChance: 0.2, downStairs: true, specials: ['a', 'b', 'c'] };

  it('is deterministic for a seed', () => {
    expect(generateMaze(opts).grid).toEqual(generateMaze(opts).grid);
    expect(generateMaze({ ...opts, seed: 100 }).grid).not.toEqual(generateMaze(opts).grid);
  });

  it('places stairs, specials and a legal start', () => {
    const m = generateMaze(opts);
    const flat = m.grid.join('');
    expect(flat.split('<')).toHaveLength(2);
    expect(flat.split('>')).toHaveLength(2);
    for (const l of 'abc') expect(flat).toContain(l);
    expect(m.grid[m.start.y][m.start.x]).toBe('<');
    expect(m.grid.every((r) => r.length === 13)).toBe(true);
  });

  it('uses the end key instead of stairs down on the last level', () => {
    const m = generateMaze({ ...opts, downStairs: false, endKey: 'Z' });
    expect(m.grid.join('')).not.toContain('>');
    expect(m.grid.join('')).toContain('Z');
  });
});

describe('dungeon helpers', () => {
  it('turns through all four directions', () => {
    expect(turn(0, -1)).toBe(3);
    expect(turn(3, 1)).toBe(0);
    expect(turn(1, 2)).toBe(3);
  });

  it('rolls encounters from the level table', () => {
    const level = content.dungeon('roost').levels[0];
    const names = new Set(level.encounters.map((e) => e.monster));
    const rng = new Rng(4);
    for (let i = 0; i < 50; i++) {
      const specs = rollEncounter(level, rng);
      expect(specs.length).toBeGreaterThan(0);
      expect(specs.length).toBeLessThanOrEqual(3);
      for (const s of specs) {
        expect(names.has(s.monster)).toBe(true);
        expect(s.count).toBeGreaterThan(0);
      }
    }
  });
});

describe('party and saves', () => {
  it('manages formation', () => {
    const s = newGameState();
    const heroes = ['a', 'b', 'c'].map((id) => makeHero('knight', id, 'human', id));
    s.roster.push(...heroes);
    for (const h of heroes) addToParty(s, h.id);
    movePartyMember(s, 'c', -1);
    expect(s.party).toEqual(['a', 'c', 'b']);
    movePartyMember(s, 'a', -1);
    expect(s.party).toEqual(['a', 'c', 'b']);
    removeFromParty(s, 'c');
    expect(s.party).toEqual(['a', 'b']);
    deleteCharacter(s, 'a');
    expect(s.roster.map((c) => c.id)).toEqual(['b', 'c']);
    expect(s.party).toEqual(['b']);
  });

  it('caps the party at six', () => {
    const s = newGameState();
    for (let i = 0; i < 7; i++) {
      const h = makeHero('knight', `k${i}`, 'human', `k${i}`);
      s.roster.push(h);
      const err = addToParty(s, h.id);
      expect(err === null).toBe(i < 6);
    }
    expect(s.party).toHaveLength(6);
  });

  it('round-trips through serialisation and rejects junk', () => {
    const s = startingState();
    s.gold = 77;
    s.roster.push(makeHero('mage', 'Merlin'));
    expect(deserialize(serialize(s))).toEqual({ ok: true, state: s, notes: [] });
    expect(deserialize('not json').ok).toBe(false);
    expect(deserialize(JSON.stringify({ version: 1, roster: 'nope' })).ok).toBe(false);
    expect(deserialize(JSON.stringify({ version: 999, roster: [] }))).toMatchObject({ ok: false, reason: /newer/ });
    expect(deserialize(JSON.stringify({ ...s, version: 0 }))).toMatchObject({ ok: false, reason: /version 0/ });
  });

  it('repairs saves that refer to content that no longer exists', () => {
    const s = startingState();
    const hero = makeHero('knight', 'Bonk');
    hero.inventory.push('long-lost-relic');
    hero.equipment.trinket = 'retired-charm';
    s.roster.push(hero);
    s.party.push(hero.id, 'ghost-of-a-deleted-hero');
    s.location = { dungeon: 'nowhere', level: 0, x: 1, y: 1, dir: 0 }; // a dungeon that doesn't exist
    const r = deserialize(serialize(s));
    if (!r.ok) throw new Error(r.reason);
    expect(r.state.roster[0].inventory).not.toContain('long-lost-relic');
    expect(r.state.roster[0].equipment.trinket).toBeUndefined();
    expect(r.state.party).toEqual([hero.id]);
    expect(r.state.location).toBeNull();
    expect(r.notes).toHaveLength(2);
  });

  it('refuses saves whose heroes have a class that no longer exists', () => {
    const s = newGameState();
    const hero = makeHero('knight', 'Bonk');
    hero.classId = 'bard-of-yore';
    s.roster.push(hero);
    expect(deserialize(serialize(s))).toMatchObject({ ok: false, reason: /Bonk/ });
  });

  it('auto-allocated heroes are always legal for their class', () => {
    for (const cls of content.classes.values()) {
      for (const race of content.races.values()) {
        const stats = autoAllocate(race.id, cls.id);
        // Not every race/class pair is legal (e.g. a Half-Orc mage), but creation must agree with the rule.
        const legal = Object.entries(cls.requires ?? {}).every(([a, v]) => stats[a as keyof typeof stats] >= (v as number));
        const make = (): unknown => createCharacter({ id: 'x', name: 'x', raceId: race.id, classId: cls.id, stats });
        if (legal) expect(make).not.toThrow();
        else expect(make).toThrow();
      }
    }
  });

  it('the quick-start party can all be created', () => {
    for (const p of starterParty) {
      const stats = autoAllocate(p.race, p.cls);
      expect(() => createCharacter({ id: p.name, name: p.name, raceId: p.race, classId: p.cls, stats })).not.toThrow();
    }
  });

  it('migrates version 1 saves: the rebuilt Roost starts fresh and quests begin', () => {
    const v1 = {
      version: 1, roster: [makeHero('knight', 'Old', 'human', 'o1')], party: ['o1'], gold: 42,
      location: { dungeon: 'roost', level: 1, x: 3, y: 3, dir: 0 },
      flags: { 'roost:0:5,5': true }, explored: { 'roost:0': ['1,1'] }, stepsSinceFight: 0, nextId: 2, won: false,
    };
    const r = deserialize(JSON.stringify(v1));
    if (!r.ok) throw new Error(r.reason);
    expect(r.state.version).toBe(2);
    expect(r.state.location).toBeNull();
    expect(r.state.flags).toEqual({});
    expect(r.state.explored).toEqual({});
    expect(r.state.gold).toBe(42);
    expect(r.state.quests['mq-roost']?.status).toBe('active');
    expect(r.notes.join(' ')).toMatch(/rebuilt/);
  });
});
