import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { Battle } from '../src/rules/combat';
import {
  availableBounties,
  cityStage,
  collectLoot,
  gainFeather,
  giveItem,
  giveReward,
  lockedBecause,
  offerFeathers,
  questEvent,
  shopStock,
  startOpeningQuests,
  progressText,
  repairQuests,
  startQuest,
  useUpKey,
  takeBounty,
  turnIn,
} from '../src/rules/quests';
import { Rng } from '../src/rules/rng';
import { newGameState, type GameState } from '../src/rules/state';
import { makeHero } from './helpers';

// A small test pack, so these rules are checked independently of the real story content.
content.register({
  id: 'quest-test',
  items: [
    { id: 'test-tail', name: 'Test Tail', desc: '', price: 1 },
    { id: 'test-letter', name: 'Test Letter', desc: '', price: 0, quest: true },
  ],
  feathers: [
    { id: 'test-f1', name: 'the First Test Feather', desc: '' },
    { id: 'test-f2', name: 'the Second Test Feather', desc: '' },
  ],
  cityStages: [{ feathers: 1, text: 'The test bakery opens.', stock: ['test-tail'] }],
  quests: [
    {
      id: 'test-main',
      name: 'Test Main',
      kind: 'main',
      source: 'start',
      summary: '',
      steps: [
        { text: 'Beat the test boss.', goal: { kind: 'flag', flag: 'test-boss' } },
        { text: 'Find two feathers.', goal: { kind: 'feathers', count: 2 } },
      ],
      reward: { gold: 100 },
      done: 'Main done.',
      next: ['test-epilogue'],
    },
    { id: 'test-epilogue', name: 'Test Epilogue', kind: 'main', source: 'given', summary: '', steps: [{ text: 'Offer them.', goal: { kind: 'offered', count: 2 } }], done: 'Epilogue done.' },
    {
      id: 'test-bounty',
      name: 'Test Bounty',
      kind: 'side',
      source: 'board',
      summary: '',
      steps: [
        { text: 'Kill 3 rats.', goal: { kind: 'kill', monster: 'rat', count: 3 } },
        { text: 'Bring 2 tails.', goal: { kind: 'collect', item: 'test-tail', count: 2 } },
      ],
      reward: { gold: 50 },
      done: 'Bounty done.',
    },
    {
      id: 'test-fetch',
      name: 'Test Fetch',
      kind: 'side',
      source: 'given',
      summary: '',
      steps: [
        { text: 'Find the letter.', goal: { kind: 'collect', item: 'test-letter', count: 1 } },
        { text: 'And a tail.', goal: { kind: 'collect', item: 'test-tail', count: 1 } },
      ],
      done: 'Fetched.',
    },
    {
      id: 'test-bells',
      name: 'Test Bells',
      kind: 'side',
      source: 'given',
      summary: '',
      steps: [{ text: 'Ring the test bells.', goal: { kind: 'flags', flags: ['tb-1', 'tb-2', 'tb-3'], verb: 'rung' } }],
      done: 'All rung.',
    },
    { id: 'test-later', name: 'Later Bounty', kind: 'side', source: 'board', summary: '', requires: { quests: ['test-bounty'] }, steps: [{ text: 'x', goal: { kind: 'flag', flag: 'never' } }], done: '' },
  ],
});

function game(): GameState {
  const s = newGameState();
  const hero = makeHero('knight', 'Hero', 'human', 'h1');
  s.roster.push(hero);
  s.party.push(hero.id);
  startOpeningQuests(s);
  return s;
}

describe('quests', () => {
  it('starts opening quests and moves through steps', () => {
    const s = game();
    expect(s.quests['test-main']).toMatchObject({ step: 0, status: 'active' });
    questEvent(s, { kind: 'flag', flag: 'test-boss' });
    expect(s.quests['test-main'].step).toBe(1);
    gainFeather(s, 'test-f1');
    expect(s.quests['test-main'].status).toBe('active');
    const gold = s.gold;
    const log = gainFeather(s, 'test-f2');
    expect(s.quests['test-main'].status).toBe('done');
    expect(s.gold).toBe(gold + 100);
    expect(log.join('\n')).toMatch(/Main done/);
    expect(s.quests['test-epilogue'].status).toBe('active'); // the story moves on
  });

  it('skips steps whose goal is already met', () => {
    const s = game();
    gainFeather(s, 'test-f1');
    gainFeather(s, 'test-f2');
    questEvent(s, { kind: 'flag', flag: 'test-boss' });
    expect(s.quests['test-main'].status).toBe('done');
  });

  it('bounties count kills, wait for collected items and are handed in at the Guild', () => {
    const s = game();
    expect(availableBounties(s).map((q) => q.id)).toContain('test-bounty');
    expect(availableBounties(s).map((q) => q.id)).not.toContain('test-later');
    takeBounty(s, 'test-bounty');
    questEvent(s, { kind: 'kill', monster: 'rat', count: 2 });
    questEvent(s, { kind: 'kill', monster: 'bat', count: 5 });
    expect(s.quests['test-bounty'].step).toBe(0);
    questEvent(s, { kind: 'kill', monster: 'rat', count: 1 });
    expect(s.quests['test-bounty'].step).toBe(1);
    const hero = s.roster[0];
    hero.inventory.push('test-tail', 'test-tail', 'test-tail');
    questEvent(s, { kind: 'check' });
    expect(s.quests['test-bounty'].status).toBe('ready');
    const gold = s.gold;
    turnIn(s, 'test-bounty');
    expect(s.quests['test-bounty'].status).toBe('done');
    expect(s.gold).toBe(gold + 50);
    expect(hero.inventory.filter((i) => i === 'test-tail')).toHaveLength(1); // two handed over
    expect(availableBounties(s).map((q) => q.id)).toContain('test-later');
  });

  it('offering feathers moves the city along and stocks the shop', () => {
    const s = game();
    expect(cityStage(s)).toBeUndefined();
    expect(offerFeathers(s)).toEqual([]);
    gainFeather(s, 'test-f1');
    expect(offerFeathers(s)).toContain('The test bakery opens.');
    expect(cityStage(s)?.text).toBe('The test bakery opens.');
    expect(shopStock(s, ['dagger'])).toEqual(['dagger', 'test-tail']);
  });

  it('battles count kills by monster', () => {
    const b = new Battle([makeHero('knight')], [{ monster: 'rat', count: 2 }], new Rng(1));
    for (let i = 0; i < 20 && b.outcome === 'ongoing'; i++) b.resolveRound(new Map([['knight', { kind: 'attack', group: 0 }]]));
    expect(b.outcome).toBe('victory');
    expect(b.kills).toEqual({ rat: 2 });
  });

  it('a given quest takes the story items it asked for, but the party keeps the rest', () => {
    const s = game();
    const hero = s.roster[0];
    hero.inventory.push('test-letter', 'test-tail');
    startQuest(s, 'test-fetch');
    expect(s.quests['test-fetch'].status).toBe('done');
    expect(hero.inventory).toContain('test-tail');
    expect(hero.inventory).not.toContain('test-letter');
  });

  it('a story key is left behind once its door is open for good, but ordinary items are kept', () => {
    const s = game();
    s.roster[0].inventory.push('test-letter', 'test-tail');
    expect(useUpKey(s, 'test-letter')).toMatch(/leaves the Test Letter behind/);
    expect(s.roster[0].inventory).toEqual(expect.not.arrayContaining(['test-letter']));
    expect(useUpKey(s, 'test-tail')).toBeNull();
    expect(s.roster[0].inventory).toContain('test-tail');
  });

  it('never loses a story item or a reward to a full pack, though a stray drop is left behind', () => {
    const s = game();
    const hero = s.roster[0];
    hero.inventory.push(...Array(8).fill('test-tail'));
    expect(giveItem(s, 'test-tail')).toMatch(/left behind/);
    expect(hero.inventory).toHaveLength(8);
    expect(giveItem(s, 'test-letter')).toMatch(/Hero crams the Test Letter in on top/);
    expect(giveReward(s, { item: 'test-tail' })[0]).toMatch(/crams/);
    expect(hero.inventory).toHaveLength(10);
  });

  it('trophies go in the pouch, not a pack, and only while a bounty wants them', () => {
    const s = game();
    expect(collectLoot(s, ['rattail', 'rattail'])).toEqual([]);
    expect(s.trophies).toEqual({});
    takeBounty(s, 'b-rats');
    expect(collectLoot(s, Array(12).fill('rattail'))).toEqual(['Into the trophy pouch: 10 x Rat Tail.']);
    expect(s.trophies).toEqual({ rattail: 10 });
    expect(s.roster[0].inventory).toEqual([]);
    questEvent(s, { kind: 'check' });
    expect(s.quests['b-rats'].status).toBe('ready');
    turnIn(s, 'b-rats');
    expect(s.trophies).toEqual({});
  });

  it('says plainly how far along a counted goal is, as it moves', () => {
    const s = game();
    takeBounty(s, 'test-bounty');
    expect(questEvent(s, { kind: 'kill', monster: 'rat', count: 1 })).toEqual(['Test Bounty: 1 of 3 defeated, 2 to go.']);
    // Finishing the step says what's next instead.
    expect(questEvent(s, { kind: 'kill', monster: 'rat', count: 2 })).toEqual(['Test Bounty: Bring 2 tails.']);
    s.roster[0].inventory.push('test-tail');
    expect(questEvent(s, { kind: 'check' })).toEqual(['Test Bounty: 1 of 2 collected, 1 to go.']);
    expect(questEvent(s, { kind: 'check' })).toEqual([]);
    expect(progressText({ kind: 'feathers', count: 12 }, 12, 12)).toBe('all 12 found');
  });

  it('a goal of several flags can be done in any order, counting as it goes', () => {
    const s = game();
    startQuest(s, 'test-bells');
    expect(questEvent(s, { kind: 'flag', flag: 'tb-3' })).toEqual(['Test Bells: 1 of 3 rung, 2 to go.']);
    expect(questEvent(s, { kind: 'flag', flag: 'tb-1' })).toEqual(['Test Bells: 2 of 3 rung, 1 to go.']);
    expect(questEvent(s, { kind: 'flag', flag: 'tb-2' })).toEqual(['All rung.']);
    expect(s.quests['test-bells'].status).toBe('done');
  });

  it('a save from when the quest had more steps goes back to a step it has', () => {
    const s = game();
    s.quests['test-bells'] = { step: 2, count: 0, status: 'active' };
    s.story['tb-1'] = true;
    repairQuests(s);
    expect(s.quests['test-bells']).toEqual({ step: 0, count: 0, status: 'active' });
    s.story['tb-2'] = true;
    s.story['tb-3'] = true;
    s.quests['test-bells'].step = 1;
    expect(repairQuests(s)).toEqual(['All rung.']);
  });

  it('a lock can wait on a story flag (a wheel turned somewhere else)', () => {
    const s = game();
    expect(lockedBecause(s, { flag: 'test-wheel' })).toBe("It won't budge.");
    questEvent(s, { kind: 'flag', flag: 'test-wheel' });
    expect(lockedBecause(s, { flag: 'test-wheel' })).toBeNull();
  });

  it('locks say what is missing until the party has it', () => {
    const s = game();
    const lock = { key: 'test-tail', feathers: 1 };
    expect(lockedBecause(s, lock)).toBe("You need the Test Tail and 1 of Aquila's feathers (you have 0).");
    s.roster[0].inventory.push('test-tail');
    gainFeather(s, 'test-f1');
    expect(lockedBecause(s, lock)).toBeNull();
  });
});
