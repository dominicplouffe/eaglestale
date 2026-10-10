import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { Battle } from '../src/rules/combat';
import {
  availableBounties,
  cityStage,
  gainFeather,
  offerFeathers,
  questEvent,
  shopStock,
  startOpeningQuests,
  takeBounty,
  turnIn,
} from '../src/rules/quests';
import { Rng } from '../src/rules/rng';
import { newGameState, type GameState } from '../src/rules/state';
import { makeHero } from './helpers';

// A small test pack, so these rules are checked independently of the real story content.
content.register({
  id: 'quest-test',
  items: [{ id: 'test-tail', name: 'Test Tail', desc: '', price: 1 }],
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
});
