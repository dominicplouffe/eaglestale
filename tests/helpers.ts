import { loadContent, content } from '../src/content';
import { createCharacter, rollBonusPool } from '../src/rules/character';
import { Rng } from '../src/rules/rng';
import { ATTRS, type Character, type Stats } from '../src/rules/types';

loadContent();

/** Builds a character with the race's base stats plus a simple spread of bonus points. */
export function makeHero(classId: string, name = classId, raceId = 'human', id = name): Character {
  const stats: Stats = { ...content.race(raceId).stats };
  const cls = content.cls(classId);
  stats[cls.primary] += 4;
  stats.con += 3;
  for (const a of ATTRS) stats[a] = Math.min(18, stats[a]);
  return createCharacter({ id, name, raceId, classId, stats });
}

export const bonusPool = (): number => rollBonusPool(new Rng(1));

export function standardParty(): Character[] {
  return ['knight', 'paladin', 'rogue', 'ranger', 'healer', 'mage'].map((c, i) =>
    makeHero(c, `Hero${i}`, 'human', `h${i}`),
  );
}
