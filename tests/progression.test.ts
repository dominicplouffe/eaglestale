/**
 * The campaign, played through on paper (see progression.ts): the levels a party has when it gets
 * to each fight, and the gear it has found and bought, checked against simulated battles. This
 * keeps the difficulty curve honest as content is added: XP, gold, loot, shop stock and monsters
 * all feed in.
 */
import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { MAX_LEVEL } from '../src/rules/character';
import type { Assist, Special } from '../src/rules/types';
import { POST_GAME, STORY, TYPICAL_STEPS, outfits, playthrough, type BossRef } from './progression';
import { rate, type Groups } from './sim';

type Fight = Special & { kind: 'fight' };
const fightAt = (b: BossRef) => content.dungeon(b.dungeon).levels[b.level].specials[b.key] as Fight;
const named = (b: BossRef) => `${b.dungeon} ${b.level} ${b.key} (${content.monster(fightAt(b).groups[0].monster).name})`;
const fewer = (levels: number[], n: number) => levels.map((l) => Math.max(1, l - n));
const median = (levels: number[]) => [...levels].sort((a, z) => a - z)[Math.floor(levels.length / 2)];

/** The bosses: every fight that wins a feather, or (after the story) has a named foe in it. */
const BOSSES: BossRef[] = POST_GAME.flatMap((dungeon) =>
  content.dungeon(dungeon).levels.flatMap((lv, level) =>
    Object.entries(lv.specials)
      .filter(([, s]) => s.kind === 'fight' && (!!s.reward?.feather || (!STORY.includes(dungeon) && s.groups.some((g) => content.monster(g.monster).unique))))
      .map(([key]) => ({ dungeon, level, key })),
  ),
);
const inStory = (b: BossRef) => STORY.includes(b.dungeon);

const typical = playthrough(BOSSES, TYPICAL_STEPS, POST_GAME);
const hasty = playthrough(BOSSES, 1.2, POST_GAME);
const thorough = playthrough(BOSSES, 2.8, POST_GAME);
const bossGear = outfits(typical.bosses);
const levelGear = outfits(typical.levels.map((l) => l.start));
/** Levels when the story ends (the top of the Spire). */
const storyEnd = (p: typeof typical) => p.levels.filter((l) => STORY.includes(l.dungeon)).pop()?.levels ?? [];

describe('the campaign, played through', () => {
  it('has a boss for every feather but the one on the pendulum', () => {
    expect(BOSSES.filter(inStory).length).toBe(content.feathers.size - 1);
  });

  it('a typical party, in the gear it has found and bought, can beat each boss when it gets there', () => {
    typical.bosses.forEach((b, i) => {
      if (!inStory(b)) return;
      const fight = fightAt(b);
      expect(rate(b.levels, fight.groups as Groups, bossGear[i], 40, fight.assist), `${named(b)} at ${b.levels}`).toBeGreaterThanOrEqual(0.8);
    });
  });

  it('but not by skipping ahead: three levels sooner, every boss is a real danger', () => {
    typical.bosses.forEach((b, i) => {
      const fight = fightAt(b);
      expect(rate(fewer(b.levels, 3), fight.groups as Groups, bossGear[i], 40, fight.assist), named(b)).toBeLessThanOrEqual(0.75);
    });
  });

  it("every other set fight can be won by a party that has only just arrived on its level", () => {
    typical.levels.forEach((lv, i) => {
      const specials = content.dungeon(lv.dungeon).levels[lv.level].specials;
      for (const [key, s] of Object.entries(specials)) {
        if (s.kind !== 'fight' || BOSSES.some((b) => b.dungeon === lv.dungeon && b.level === lv.level && b.key === key)) continue;
        expect(rate(lv.start.levels, s.groups as Groups, levelGear[i], 40), `${lv.name} ${key} at ${lv.start.levels}`).toBeGreaterThanOrEqual(0.85);
      }
    });
  });

  it('Malachar is too much for a party alone, but not with Aquila', () => {
    const i = typical.bosses.findIndex((b) => fightAt(b).assist);
    const b = typical.bosses[i];
    const fight = fightAt(b);
    expect(rate(b.levels, fight.groups as Groups, bossGear[i], 40)).toBeLessThanOrEqual(0.3);
    expect(rate(b.levels, fight.groups as Groups, bossGear[i], 40, fight.assist as Assist)).toBeGreaterThanOrEqual(0.8);
  });

  it('every dungeon is worth at least a level, and no single level of one hands out more than two', () => {
    for (const dungeon of POST_GAME) {
      const levels = typical.levels.filter((l) => l.dungeon === dungeon);
      expect(median(levels[levels.length - 1].levels) - median(levels[0].start.levels), dungeon).toBeGreaterThanOrEqual(1);
      for (const l of levels) expect(median(l.levels) - median(l.start.levels), l.name).toBeLessThanOrEqual(2);
    }
  });

  it('the level cap is still out of reach at the end of the story, however thorough the party', () => {
    expect(Math.max(...storyEnd(thorough))).toBeLessThan(MAX_LEVEL);
    expect(Math.max(...storyEnd(typical))).toBeLessThanOrEqual(MAX_LEVEL - 2);
  });

  it('a hasty party falls behind, but only by a level or two', () => {
    hasty.bosses.forEach((b, i) => {
      if (!inStory(b)) return;
      const gap = median(typical.bosses[i].levels) - median(b.levels);
      expect(gap, named(b)).toBeGreaterThanOrEqual(0);
      expect(gap, named(b)).toBeLessThanOrEqual(2);
    });
  });

  it('models a typical party as meeting 50-90 random fights on a full-sized level', () => {
    for (const l of typical.levels.filter((l) => l.dungeon !== 'spire')) {
      expect(l.fights, l.name).toBeGreaterThan(50);
      expect(l.fights, l.name).toBeLessThan(90);
    }
  });
});

describe('after the story: Mount Talon', () => {
  const nest = typical.levels.filter((l) => !STORY.includes(l.dungeon));

  it('has levels left to give, and a thorough party reaches the cap at the top', () => {
    expect(median(nest[0].start.levels)).toBeLessThan(MAX_LEVEL - 1);
    expect(median(nest[nest.length - 1].levels)).toBeGreaterThanOrEqual(MAX_LEVEL - 1);
    expect(Math.min(...thorough.levels[thorough.levels.length - 1].levels)).toBe(MAX_LEVEL);
  });

  it('saves the hardest fights for last: beatable with what the mountain gives, but not two levels sooner', () => {
    typical.bosses.forEach((b, i) => {
      if (inStory(b)) return;
      const groups = fightAt(b).groups as Groups;
      expect(rate(b.levels, groups, bossGear[i], 60), `${named(b)} at ${b.levels}`).toBeGreaterThanOrEqual(0.55);
      expect(rate(fewer(b.levels, 2), groups, bossGear[i], 60), named(b)).toBeLessThanOrEqual(0.6);
    });
  });
});
