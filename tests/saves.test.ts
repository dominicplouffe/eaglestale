import { describe, expect, it } from 'vitest';
import { SaveSlots, ago, describeSave, type Store } from '../src/engine/saves';
import { serialize, startingState } from '../src/rules/state';
import { makeHero } from './helpers';

function memoryStore(): Store & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, read: (k) => data.get(k) ?? null, write: (k, v) => (data.set(k, v), true) };
}

function stateWithParty(levels: number[]) {
  const s = startingState();
  levels.forEach((level, i) => {
    const c = makeHero('knight', `H${i}`, 'human', `h${i}`);
    c.level = level;
    s.roster.push(c);
    s.party.push(c.id);
  });
  return s;
}

describe('save slots', () => {
  it('saves and loads each slot separately', () => {
    const slots = new SaveSlots(memoryStore());
    const a = stateWithParty([1]);
    const b = stateWithParty([2, 3]);
    b.gold = 999;
    expect(slots.write('1', a)).toBe(true);
    expect(slots.write('3', b)).toBe(true);
    const loaded = slots.load('3');
    expect(loaded.ok && loaded.state.gold).toBe(999);
    expect(slots.info('2').empty).toBe(true);
    expect(slots.load('2').ok).toBe(false);
  });

  it('continues from the most recently written slot', () => {
    let t = 1000;
    const slots = new SaveSlots(memoryStore(), () => t);
    expect(slots.latest()).toBeNull();
    slots.write('2', startingState());
    t = 2000;
    slots.write('auto', startingState());
    expect(slots.latest()).toBe('auto');
    t = 3000;
    slots.write('1', startingState());
    expect(slots.latest()).toBe('1');
  });

  it('finds a save from before slots existed in slot 1', () => {
    const store = memoryStore();
    store.data.set('eagles-tale:save', serialize(stateWithParty([4])));
    const slots = new SaveSlots(store);
    expect(slots.latest()).toBe('1');
    expect(slots.info('1')).toMatchObject({ empty: false, savedAt: 0 });
    expect(slots.load('1').ok).toBe(true);
  });

  it('still lists a damaged save, saying what is wrong', () => {
    const store = memoryStore();
    store.data.set('eagles-tale:save:2', '{not json');
    const info = new SaveSlots(store).info('2');
    expect(info.empty).toBe(false);
    expect(info.summary).toMatch(/damaged/);
  });

  it('reports a write the browser refused', () => {
    const store: Store = { read: () => null, write: () => false };
    expect(new SaveSlots(store).write('1', startingState())).toBe(false);
  });
});

describe('save descriptions', () => {
  it('summarises the party, place and feathers', () => {
    const s = stateWithParty([2, 3, 3]);
    expect(describeSave(s)).toBe('3 heroes, level 2-3 · Talonreach · 0 feathers');
    s.location = { dungeon: 'roost', level: 0, x: 1, y: 1, dir: 0 };
    s.feathers = ['crown'];
    expect(describeSave(s)).toMatch(/^3 heroes, level 2-3 · .+ · 1 feather$/);
    expect(describeSave(startingState())).toBe('no party yet · Talonreach · 0 feathers');
  });

  it('says how long ago', () => {
    const now = 10 * 86_400_000;
    expect(ago(now - 10_000, now)).toBe('just now');
    expect(ago(now - 5 * 60_000, now)).toBe('5 min ago');
    expect(ago(now - 3 * 3_600_000, now)).toBe('3 h ago');
    expect(ago(now - 86_400_000, now)).toBe('1 day ago');
    expect(ago(0, now)).toBe('a while ago');
  });
});
