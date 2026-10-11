import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { activeQuests, giveReward, offerFeathers, questEvent, turnIn } from '../src/rules/quests';
import { startingState, type GameState } from '../src/rules/state';
import { makeHero } from './helpers';

/** The real campaign's story, played through its flags and feathers (no dungeons walked). */
function newCampaign(): GameState {
  const s = startingState();
  const hero = makeHero('knight', 'Hero', 'human', 'h1');
  s.roster.push(hero);
  s.party.push(hero.id);
  return s;
}

const main = (s: GameState): string | undefined => activeQuests(s).find((q) => q.kind === 'main')?.id;
const step = (s: GameState, id: string): number => s.quests[id].step;

describe('the campaign', () => {
  it('runs from the Roost through the Gurgle to the Clocktower', () => {
    const s = newCampaign();
    expect(main(s)).toBe('mq-roost');

    // The Roost's three bosses, and the feathers taken home.
    giveReward(s, { feather: 'crown' });
    offerFeathers(s);
    giveReward(s, { feather: 'grave' });
    questEvent(s, { kind: 'flag', flag: 'grackle-defeated' });
    giveReward(s, { feather: 'altar', item: 'sewerkey' });
    expect(main(s)).toBe('mq-roost');
    offerFeathers(s);
    expect(s.quests['mq-roost'].status).toBe('done');

    // Into the Gurgle: through the grate, both feathers, home again.
    expect(main(s)).toBe('mq-gurgle');
    expect(step(s, 'mq-gurgle')).toBe(0);
    questEvent(s, { kind: 'flag', flag: 'gurgle-entered' });
    expect(step(s, 'mq-gurgle')).toBe(1);
    giveReward(s, { feather: 'drain' });
    expect(step(s, 'mq-gurgle')).toBe(1);
    giveReward(s, { feather: 'sceptre' });
    expect(step(s, 'mq-gurgle')).toBe(2);
    const city = offerFeathers(s);
    expect(city.some((line) => line.includes('Five feathers'))).toBe(true);
    expect(s.quests['mq-gurgle'].status).toBe('done');
    expect(main(s)).toBe('mq-clocktower');
  });

  it("the Gurgle's side tasks finish when their flags are set, and bounties need the Guild", () => {
    const s = newCampaign();
    s.quests['sq-sewermen'] = { step: 0, count: 0, status: 'active' };
    for (const n of [1, 2, 3]) questEvent(s, { kind: 'flag', flag: `sewerman-${n}` });
    expect(s.quests['sq-sewermen'].status).toBe('done');

    // Snapjaw's hide is a story item: the bounty takes it and pays in armour.
    s.feathers = ['crown', 'grave', 'altar'];
    s.quests['b-hide'] = { step: 0, count: 0, status: 'active' };
    giveReward(s, { item: 'gatorhide' });
    questEvent(s, { kind: 'check' });
    expect(s.quests['b-hide'].status).toBe('ready');
    turnIn(s, 'b-hide');
    const hero = s.roster[0];
    expect(hero.inventory).not.toContain('gatorhide');
    expect(hero.inventory).toContain('gatorarmor');
  });

  it('every main quest leads somewhere until the chapters still being built', () => {
    for (const q of content.quests.values()) {
      if (q.kind !== 'main') continue;
      if (q.id === 'mq-clocktower') continue;
      expect(q.next?.length, q.id).toBeGreaterThan(0);
    }
  });
});
