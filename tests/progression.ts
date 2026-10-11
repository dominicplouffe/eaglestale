/**
 * A model of a whole playthrough: how much XP and gold a party earns as it explores each level of
 * the campaign (random encounters, set fights, treasure, quests and bounties), what level it has
 * reached when it meets each boss, and what gear its gold has bought by then. It works from
 * expected values, so it is instant and deterministic, and it reads the content, so it notices
 * when the content changes.
 */
import { content } from '../src/content';
import { isWalkable } from '../src/rules/dungeon';
import { MAX_LEVEL, canUse, equipDelta, xpForLevel } from '../src/rules/character';
import type { Dice, DungeonLevel, QuestDef, Special } from '../src/rules/types';
import { standardParty } from './helpers';
import { shopGear } from './sim';

/** The dungeons in the order the story visits them. */
export const STORY = ['roost', 'gurgle', 'clocktower', 'wood', 'spire'];

/**
 * How many steps a party takes on a level, per square it can stand on: every corridor walked,
 * dead ends walked back out of, and trips back to town to rest. 2 is a typical player; a hasty
 * one might take 1.2 and a completist 2.8.
 */
export const TYPICAL_STEPS = 2;
/** Of the gold it earns, how much a party spends on gear (the rest goes on the inn, the temple and potions). */
export const SPENT_ON_GEAR = 0.6;
/** Steps after a fight before the next can start (the screen's MIN_STEPS_BETWEEN_FIGHTS). */
const QUIET_STEPS = 4;
/** rollEncounter: 1 group 51%, 2 groups 34%, 3 groups 15%. */
const GROUPS_PER_ENCOUNTER = 0.51 + 2 * 0.34 + 3 * 0.15;

const avgDice = ([n, sides, plus = 0]: Dice): number => Math.max(0, (n * (sides + 1)) / 2 + plus);

type Fight = Special & { kind: 'fight' };
export interface BossRef {
  dungeon: string;
  level: number;
  key: string;
}

/** Where the party stands at some moment. */
export interface Checkpoint {
  /** Each standard hero's level. */
  levels: number[];
  /** Feathers already won, and so how much of the city's stock is on sale. */
  feathers: number;
  /** All the gold earned so far. */
  partyGold: number;
}

export interface LevelReport {
  dungeon: string;
  level: number;
  name: string;
  fights: number;
  /** How the party stands when it arrives on this level. */
  start: Checkpoint;
  /** Each standard hero's level when it leaves (after the quests the level finishes). */
  levels: number[];
}

/** How the party stands when it reaches a boss. */
export type BossReport = BossRef & Checkpoint;

export interface Playthrough {
  levels: LevelReport[];
  bosses: BossReport[];
}

function squares(level: DungeonLevel): number {
  return level.grid
    .join('')
    .split('')
    .filter((t) => isWalkable(t) && level.specials[t]?.kind !== 'building').length;
}

function randomPerFight(level: DungeonLevel): { xp: number; gold: number } {
  const total = level.encounters.reduce((n, e) => n + e.weight, 0);
  let xp = 0;
  let gold = 0;
  for (const e of level.encounters) {
    const m = content.monster(e.monster);
    const count = (e.min + e.max) / 2;
    xp += (e.weight / total) * count * m.xp;
    gold += (e.weight / total) * count * avgDice(m.gold);
  }
  return { xp: xp * GROUPS_PER_ENCOUNTER, gold: gold * GROUPS_PER_ENCOUNTER };
}

const fightXp = (s: Fight): number => s.groups.reduce((n, g) => n + g.count * content.monster(g.monster).xp, 0);
const fightGold = (s: Fight): number =>
  s.groups.reduce((n, g) => n + g.count * avgDice(content.monster(g.monster).gold), 0) + (s.reward?.gold ?? 0);

/** The first level (dungeon index, level index) where every step of a quest can be done. */
function whereDone(q: QuestDef, featherAt: [number, number][]): [number, number] {
  let at: [number, number] = [0, 0];
  const later = (a: [number, number], b: [number, number]) => (a[0] !== b[0] ? a[0] > b[0] : a[1] > b[1]);
  const find = (match: (lv: DungeonLevel, specials: Special[]) => boolean): [number, number] | undefined => {
    for (let d = 0; d < STORY.length; d++) {
      const levels = content.dungeon(STORY[d]).levels;
      for (let l = 0; l < levels.length; l++) if (match(levels[l], Object.values(levels[l].specials))) return [d, l];
    }
    return undefined;
  };
  const drops = (monster: string, item: string) => !!content.monster(monster).drops?.some((d) => d.item === item);
  for (const { goal: g } of q.steps) {
    let here: [number, number] | undefined;
    if (g.kind === 'kill') {
      here = find((lv, ss) =>
        lv.encounters.some((e) => e.monster === g.monster) ||
        ss.some((s) => s.kind === 'fight' && s.groups.some((x) => x.monster === g.monster)));
    } else if (g.kind === 'collect') {
      here = find((lv, ss) =>
        lv.encounters.some((e) => drops(e.monster, g.item)) ||
        ss.some((s) =>
          (s.kind === 'treasure' && s.item === g.item) ||
          (s.kind === 'fight' && (s.reward?.item === g.item || s.groups.some((x) => drops(x.monster, g.item))))));
    } else if (g.kind === 'flag') {
      // Where the flag is set (locks, portals and buildings only check it).
      here = find((_, ss) => ss.some((s) => s.kind !== 'lock' && s.kind !== 'portal' && s.kind !== 'building' && 'flag' in s && s.flag === g.flag));
    } else {
      here = featherAt[g.count - 1];
    }
    if (here && later(here, at)) at = here;
  }
  return at;
}

/**
 * Plays the campaign through on paper. The party explores each level in turn (its random fights,
 * treasure and smaller set fights) before taking on the boss at the far end, then collects the
 * rewards of the quests that level finishes.
 */
export function playthrough(bosses: BossRef[], stepsPerSquare = TYPICAL_STEPS): Playthrough {
  const mults = standardParty().map((c) => content.cls(c.classId).xpMult);
  const heroLevels = (partyXp: number) =>
    mults.map((m) => {
      let l = 1;
      while (l < MAX_LEVEL && xpForLevel(l + 1, m) <= partyXp / mults.length) l++;
      return l;
    });

  const featherAt: [number, number][] = [];
  STORY.forEach((id, d) =>
    content.dungeon(id).levels.forEach((lv, l) => {
      for (const s of Object.values(lv.specials)) {
        if ((s.kind === 'fight' && s.reward?.feather) || (s.kind === 'treasure' && s.feather)) featherAt.push([d, l]);
      }
    }),
  );
  const quests = [...content.quests.values()].map((q) => ({ q, at: whereDone(q, featherAt) }));

  let partyXp = 0;
  let partyGold = 0;
  let feathers = 0;
  const levels: LevelReport[] = [];
  const bossReports: BossReport[] = [];
  STORY.forEach((id, d) => {
    content.dungeon(id).levels.forEach((lv, l) => {
      const start = { levels: heroLevels(partyXp), feathers, partyGold };
      const fights = lv.encounterRate > 0 ? (squares(lv) * stepsPerSquare) / (QUIET_STEPS - 1 + 1 / lv.encounterRate) : 0;
      const per = randomPerFight(lv);
      partyXp += fights * per.xp;
      partyGold += fights * per.gold;
      const here = bosses.filter((b) => b.dungeon === id && b.level === l);
      const win = (s: Fight) => {
        partyXp += fightXp(s);
        partyGold += fightGold(s);
        if (s.reward?.feather) feathers++;
      };
      for (const [key, s] of Object.entries(lv.specials)) {
        if (s.kind === 'treasure') {
          partyGold += s.gold ?? 0;
          if (s.feather) feathers++;
        }
        if (s.kind === 'fight' && !here.some((b) => b.key === key)) win(s);
      }
      for (const b of here) {
        bossReports.push({ ...b, levels: heroLevels(partyXp), feathers, partyGold });
        win(lv.specials[b.key] as Fight);
      }
      for (const { q, at } of quests) {
        if (at[0] !== d || at[1] !== l) continue;
        partyXp += q.reward?.xp ?? 0;
        partyGold += q.reward?.gold ?? 0;
      }
      levels.push({ dungeon: id, level: l, name: lv.name, fights, start, levels: heroLevels(partyXp) });
    });
  });
  return { levels, bosses: bossReports };
}

/**
 * What each hero is wearing at each checkpoint (in the order they happen), if the party spends its
 * gear money as it goes: the best upgrades the city sells by then, dearest first, until the money
 * runs out. Returns a gear list per hero, per checkpoint (for sim.ts's `rate`).
 */
export function outfits(checkpoints: Checkpoint[], share = SPENT_ON_GEAR): string[][][] {
  const party = standardParty();
  let spent = 0;
  return checkpoints.map((b) => {
    let budget = share * b.partyGold - spent;
    const stock = shopGear(b.feathers).sort((x, y) => content.item(y).price - content.item(x).price);
    for (const id of stock) {
      const item = content.item(id);
      for (const c of party) {
        if (!item.slot || !canUse(c, item) || item.price > budget) continue;
        const worn = c.equipment[item.slot];
        if (item.slot === 'weapon' && worn && !!content.item(worn).ranged !== !!item.ranged) continue;
        const delta = equipDelta(c, item);
        if (!delta || delta.dmg * 2 + delta.def + delta.hit <= 0) continue;
        c.equipment[item.slot] = id;
        budget -= item.price;
        spent += item.price;
      }
    }
    return party.map((c) => Object.values(c.equipment).filter((id): id is string => !!id));
  });
}
