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
import type { Character, Dice, DungeonLevel, QuestDef, Slot, Special } from '../src/rules/types';
import { standardParty } from './helpers';
import { shopGear } from './sim';

/** The dungeons in the order the story visits them. */
export const STORY = ['roost', 'gurgle', 'clocktower', 'wood', 'spire'];
/** And after the ending. */
export const POST_GAME = [...STORY, 'nest'];

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
  /** Gear found or won so far (in chests, from bosses, as quest rewards), in the order it came. */
  found: string[];
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

/**
 * Treasure the party can only reach by getting past a fight (a boss's hoard, behind its guards): the
 * special letters whose every square is cut off from the start when fight squares are blocked.
 */
function behindFights(level: DungeonLevel): Set<string> {
  const blocked = (t: string) => !isWalkable(t) || level.specials[t]?.kind === 'fight' || level.specials[t]?.kind === 'building';
  const seen = new Set<string>([`${level.start.x},${level.start.y}`]);
  const queue = [[level.start.x, level.start.y]];
  while (queue.length) {
    const [x, y] = queue.pop() as number[];
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const nx = x + dx;
      const ny = y + dy;
      const t = level.grid[ny]?.[nx];
      if (t === undefined || blocked(t) || seen.has(`${nx},${ny}`)) continue;
      seen.add(`${nx},${ny}`);
      queue.push([nx, ny]);
    }
  }
  const behind = new Set<string>();
  for (const [key, s] of Object.entries(level.specials)) {
    if (s.kind !== 'treasure') continue;
    const squares = level.grid.flatMap((row, y) => [...row].flatMap((t, x) => (t === key ? [`${x},${y}`] : [])));
    if (squares.length && squares.every((sq) => !seen.has(sq))) behind.add(key);
  }
  return behind;
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

/** The story flag a special sets when the party meets it (locks and tubes only check theirs; ways in are wayIn's). */
const setsFlag = (s: Special): string | undefined =>
  s.kind === 'message' || s.kind === 'talk' || s.kind === 'fight' || s.kind === 'treasure' ? s.flag : undefined;

/** The start of the story dungeon that a way in setting `flag` (a gate, a grate) leads into. */
function wayIn(flag: string, story: string[]): [number, number] | undefined {
  for (const d of content.dungeons.values()) {
    for (const lv of d.levels) {
      for (const s of Object.values(lv.specials)) {
        if ((s.kind === 'portal' || s.kind === 'building') && s.flag === flag && s.dungeon && story.includes(s.dungeon)) return [story.indexOf(s.dungeon), 0];
      }
    }
  }
  return undefined;
}

/**
 * The first level (dungeon index, level index) where every step of a quest can be done, or null for
 * a quest outside the story (after the ending, say).
 */
function whereDone(q: QuestDef, featherAt: [number, number][], story: string[]): [number, number] | null {
  let at: [number, number] = [0, 0];
  const later = (a: [number, number], b: [number, number]) => (a[0] !== b[0] ? a[0] > b[0] : a[1] > b[1]);
  const find = (match: (lv: DungeonLevel, specials: Special[]) => boolean): [number, number] | undefined => {
    for (let d = 0; d < story.length; d++) {
      const levels = content.dungeon(story[d]).levels;
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
    } else if (g.kind === 'flag' || g.kind === 'flags') {
      // Where each flag is set: by something on a level, or by going through a way in (the start of
      // its dungeon). With several, the last of them.
      for (const flag of g.kind === 'flag' ? [g.flag] : g.flags) {
        const at = find((_, ss) => ss.some((s) => setsFlag(s) === flag)) ?? wayIn(flag, story);
        if (!at) return null;
        if (!here || later(at, here)) here = at;
      }
    } else {
      here = featherAt[g.count - 1];
    }
    if (!here) return null;
    if (later(here, at)) at = here;
  }
  return at;
}

/**
 * Plays the campaign through on paper. The party explores each level in turn (its random fights,
 * treasure and smaller set fights) before taking on the boss at the far end, then collects the
 * rewards of the quests that level finishes.
 */
export function playthrough(bosses: BossRef[], stepsPerSquare = TYPICAL_STEPS, story = STORY): Playthrough {
  const mults = standardParty().map((c) => content.cls(c.classId).xpMult);
  const heroLevels = (partyXp: number) =>
    mults.map((m) => {
      let l = 1;
      while (l < MAX_LEVEL && xpForLevel(l + 1, m) <= partyXp / mults.length) l++;
      return l;
    });

  const featherAt: [number, number][] = [];
  story.forEach((id, d) =>
    content.dungeon(id).levels.forEach((lv, l) => {
      for (const s of Object.values(lv.specials)) {
        if ((s.kind === 'fight' && s.reward?.feather) || (s.kind === 'treasure' && s.feather)) featherAt.push([d, l]);
      }
    }),
  );
  const quests = [...content.quests.values()].map((q) => ({ q, at: whereDone(q, featherAt, story) }));

  let partyXp = 0;
  let partyGold = 0;
  let feathers = 0;
  const found: string[] = [];
  const gain = (id: string | undefined) => {
    if (id && content.item(id).slot) found.push(id);
  };
  const levels: LevelReport[] = [];
  const bossReports: BossReport[] = [];
  story.forEach((id, d) => {
    content.dungeon(id).levels.forEach((lv, l) => {
      const start = { levels: heroLevels(partyXp), feathers, partyGold, found: [...found] };
      const fights = lv.encounterRate > 0 ? (squares(lv) * stepsPerSquare) / (QUIET_STEPS - 1 + 1 / lv.encounterRate) : 0;
      const per = randomPerFight(lv);
      partyXp += fights * per.xp;
      partyGold += fights * per.gold;
      const here = bosses.filter((b) => b.dungeon === id && b.level === l);
      const win = (s: Fight) => {
        partyXp += fightXp(s);
        partyGold += fightGold(s);
        if (s.reward?.feather) feathers++;
        gain(s.reward?.item);
      };
      // With a boss here, what it guards is only taken once it is beaten.
      const later = here.length ? behindFights(lv) : new Set<string>();
      const loot = (s: Special & { kind: 'treasure' }) => {
        partyGold += s.gold ?? 0;
        if (s.feather) feathers++;
        gain(s.item);
      };
      for (const [key, s] of Object.entries(lv.specials)) {
        if (s.kind === 'treasure' && !later.has(key)) loot(s);
        if (s.kind === 'fight' && !here.some((b) => b.key === key)) win(s);
      }
      for (const b of here) {
        bossReports.push({ ...b, levels: heroLevels(partyXp), feathers, partyGold, found: [...found] });
        win(lv.specials[b.key] as Fight);
      }
      for (const key of later) loot(lv.specials[key] as Special & { kind: 'treasure' });
      for (const { q, at } of quests) {
        if (!at || at[0] !== d || at[1] !== l) continue;
        partyXp += q.reward?.xp ?? 0;
        partyGold += q.reward?.gold ?? 0;
        gain(q.reward?.item);
      }
      levels.push({ dungeon: id, level: l, name: lv.name, fights, start, levels: heroLevels(partyXp) });
    });
  });
  return { levels, bosses: bossReports };
}

/** How much better `c` would be with `id` on (0 if it can't use it or it is no better). */
function upgrade(c: Character, id: string): number {
  const item = content.item(id);
  if (!item.slot || !canUse(c, item)) return 0;
  const worn = c.equipment[item.slot];
  // Archers keep to bows, fighters to melee weapons.
  if (item.slot === 'weapon' && worn && !!content.item(worn).ranged !== !!item.ranged) return 0;
  const delta = equipDelta(c, item);
  return delta ? Math.max(0, delta.dmg * 2 + delta.def + delta.hit) : 0;
}

/**
 * What each hero is wearing at each checkpoint (in the order they happen). Gear the party has found
 * goes to whoever it suits best; then it spends its gear money as it goes: the best upgrades the
 * city sells by then, dearest first, until the money runs out. Returns a gear list per hero, per
 * checkpoint (for sim.ts's `rate`).
 */
export function outfits(checkpoints: Checkpoint[], share = SPENT_ON_GEAR): string[][][] {
  const party = standardParty();
  let spent = 0;
  let handedOut = 0;
  return checkpoints.map((b) => {
    for (const id of b.found.slice(handedOut)) {
      const best = [...party].sort((x, y) => upgrade(y, id) - upgrade(x, id))[0];
      if (upgrade(best, id) > 0) best.equipment[content.item(id).slot as Slot] = id;
    }
    handedOut = Math.max(handedOut, b.found.length);
    let budget = share * b.partyGold - spent;
    const stock = shopGear(b.feathers).sort((x, y) => content.item(y).price - content.item(x).price);
    for (const id of stock) {
      const item = content.item(id);
      for (const c of party) {
        if (item.price > budget || upgrade(c, id) <= 0) continue;
        c.equipment[item.slot as Slot] = id;
        budget -= item.price;
        spent += item.price;
      }
    }
    return party.map((c) => Object.values(c.equipment).filter((id): id is string => !!id));
  });
}
