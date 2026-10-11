import { content } from '../content/registry';
import { MAX_INVENTORY, MAX_PARTY } from './character';
import { isWalkable, tileAt } from './dungeon';
import { catchUpQuests, isTrophy, recoverStoryItems, repairQuests, startOpeningQuests, type QuestProgress } from './quests';
import { SLOTS, type Character } from './types';

export interface DungeonPosition {
  dungeon: string;
  level: number;
  x: number;
  y: number;
  dir: number;
}

export interface GameState {
  version: number;
  roster: Character[];
  /** Character ids in formation order (first three are the front row). */
  party: string[];
  gold: number;
  /** null while in town. */
  location: DungeonPosition | null;
  /** One-shot dungeon events already triggered, keyed by `dungeon:level:x,y`. */
  flags: Record<string, true>;
  /** Visited tiles for the auto-map, keyed by `dungeon:level`. */
  explored: Record<string, string[]>;
  stepsSinceFight: number;
  nextId: number;
  won: boolean;
  /** Quests taken or started, by quest id. */
  quests: Record<string, QuestProgress>;
  /** Ids of Aquila's feathers the party has recovered. */
  feathers: string[];
  /** How many of them have been returned to the Eagle Tower (the city's recovery). */
  offered: number;
  /** Story flags set by specials (bosses beaten, people met), which quests wait for. */
  story: Record<string, true>;
  /** The trophy pouch: monster drops kept for bounties (they take no room in a pack), by item id. */
  trophies: Record<string, number>;
  /** The Guild chest: items left in town for later, by item id (as many as you like). */
  stash: string[];
}

export const SAVE_VERSION = 4;
export const STARTING_GOLD = 500;

export function newGameState(): GameState {
  return {
    version: SAVE_VERSION,
    roster: [],
    party: [],
    gold: STARTING_GOLD,
    location: null,
    flags: {},
    explored: {},
    stepsSinceFight: 0,
    nextId: 1,
    won: false,
    quests: {},
    feathers: [],
    offered: 0,
    story: {},
    trophies: {},
    stash: [],
  };
}

/** A fresh game, with the opening quests already in the journal. */
export function startingState(): GameState {
  const s = newGameState();
  startOpeningQuests(s);
  return s;
}

export const partyMembers = (s: GameState): Character[] =>
  s.party.map((id) => s.roster.find((c) => c.id === id)).filter((c): c is Character => !!c);

export function addToParty(s: GameState, id: string): string | null {
  if (s.party.includes(id)) return null;
  if (s.party.length >= MAX_PARTY) return `The party is full (${MAX_PARTY} members).`;
  s.party.push(id);
  return null;
}

export function removeFromParty(s: GameState, id: string): void {
  s.party = s.party.filter((p) => p !== id);
}

export function movePartyMember(s: GameState, id: string, delta: -1 | 1): void {
  const i = s.party.indexOf(id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= s.party.length) return;
  [s.party[i], s.party[j]] = [s.party[j], s.party[i]];
}

/** Puts an item from a hero's pack in the Guild chest. Returns why not, or null. */
export function storeItem(s: GameState, hero: Character, index: number): string | null {
  const id = hero.inventory[index];
  if (id === undefined) return 'Nothing there.';
  if (content.item(id).quest) return 'Story items stay with the party.';
  hero.inventory.splice(index, 1);
  s.stash.push(id);
  return null;
}

/** Takes one of an item out of the Guild chest and into a hero's pack. Returns why not, or null. */
export function takeFromStash(s: GameState, itemId: string, hero: Character): string | null {
  const at = s.stash.indexOf(itemId);
  if (at < 0) return 'That is not in the chest.';
  if (hero.inventory.length >= MAX_INVENTORY) return `${hero.name}'s pack is full.`;
  s.stash.splice(at, 1);
  hero.inventory.push(itemId);
  return null;
}

export function deleteCharacter(s: GameState, id: string): void {
  removeFromParty(s, id);
  s.roster = s.roster.filter((c) => c.id !== id);
}

export function allocateCharacterId(s: GameState): string {
  return `c${s.nextId++}`;
}

export function serialize(s: GameState): string {
  return JSON.stringify(s);
}

export type LoadResult =
  | { ok: true; state: GameState; /** Repairs made while loading, worth telling the player. */ notes: string[] }
  | { ok: false; reason: string };

type SaveData = Record<string, unknown>;

/**
 * Upgrades a save from version N to N + 1. When the save format changes, bump SAVE_VERSION and add a
 * step here, e.g. `1: (old) => ({ ...old, newField: defaultValue })`, so existing saves keep loading.
 * A step can add a line to `notes` to tell the player what changed.
 */
const MIGRATIONS: Record<number, (old: SaveData, notes: string[]) => SaveData> = {
  // Version 2 adds quests and feathers, and rebuilds the Roost: its old squares no longer line up,
  // so the party returns to town and the Roost's map and one-time events start fresh.
  1: (old, notes) => {
    const notRoost = <T,>(rec: unknown): Record<string, T> =>
      Object.fromEntries(Object.entries(isObject(rec) ? rec : {}).filter(([k]) => !k.startsWith('roost:'))) as Record<string, T>;
    const loc = isObject(old.location) && old.location.dungeon === 'roost' ? null : old.location;
    notes.push('The Roost Below has been rebuilt since you last played: its maps start fresh, and your party waits in town.');
    return { ...old, location: loc ?? null, flags: notRoost(old.flags), explored: notRoost(old.explored), quests: {}, feathers: [], offered: 0, story: {} };
  },
  // Version 3 adds the trophy pouch: monster drops (rat tails and the like) move out of packs into it.
  2: (old, notes) => {
    const trophies: Record<string, number> = {};
    let moved = 0;
    const roster = Array.isArray(old.roster)
      ? old.roster.map((c: unknown) => {
          if (!isObject(c) || !Array.isArray(c.inventory)) return c;
          const inventory = c.inventory.filter((id: unknown) => {
            if (typeof id !== 'string' || !isTrophy(id)) return true;
            trophies[id] = (trophies[id] ?? 0) + 1;
            moved += 1;
            return false;
          });
          return { ...c, inventory };
        })
      : old.roster;
    if (moved > 0) notes.push(`Trophies (rat tails and the like) no longer take up room in packs: ${moved} moved to the party's trophy pouch.`);
    return { ...old, roster, trophies };
  },
  // Version 4 adds the Guild chest.
  3: (old) => ({ ...old, stash: [] }),
};

const DAMAGED = 'The save file is damaged.';

export function deserialize(raw: string): LoadResult {
  let data: SaveData;
  try {
    data = JSON.parse(raw) as SaveData;
  } catch {
    return { ok: false, reason: DAMAGED };
  }
  if (!data || typeof data !== 'object' || typeof data.version !== 'number') return { ok: false, reason: DAMAGED };
  let version = data.version;
  if (version > SAVE_VERSION) return { ok: false, reason: 'The save is from a newer version of the game.' };
  const notes: string[] = [];
  while (version < SAVE_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) return { ok: false, reason: `Saves from version ${version} of the game can no longer be loaded.` };
    data = { ...step(data, notes), version: version + 1 };
    version += 1;
  }
  if (!hasStateShape(data)) return { ok: false, reason: DAMAGED };
  const result = checkContent(data);
  if (result.ok) result.notes.unshift(...notes);
  return result;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function hasStateShape(d: SaveData): d is SaveData & GameState {
  return (
    Array.isArray(d.roster) &&
    d.roster.every(
      (c: unknown) =>
        isObject(c) &&
        ['id', 'name', 'raceId', 'classId'].every((k) => typeof c[k] === 'string') &&
        ['level', 'xp', 'hp', 'maxHp', 'sp', 'maxSp'].every((k) => typeof c[k] === 'number') &&
        isObject(c.stats) &&
        isObject(c.equipment) &&
        Array.isArray(c.inventory),
    ) &&
    Array.isArray(d.party) &&
    typeof d.gold === 'number' &&
    typeof d.nextId === 'number' &&
    typeof d.stepsSinceFight === 'number' &&
    isObject(d.flags) &&
    isObject(d.explored) &&
    isObject(d.quests) &&
    Array.isArray(d.feathers) &&
    typeof d.offered === 'number' &&
    isObject(d.story) &&
    isObject(d.trophies) &&
    Array.isArray(d.stash) &&
    (d.location === null || isObject(d.location))
  );
}

/** Makes sure the save only refers to content this version of the game has, repairing what it safely can. */
function checkContent(state: GameState): LoadResult {
  const notes: string[] = [];
  for (const c of state.roster) {
    if (!content.races.has(c.raceId) || !content.classes.has(c.classId)) {
      return { ok: false, reason: `${c.name}'s race or class no longer exists in this version of the game.` };
    }
    const inventory = c.inventory.filter((id) => content.items.has(id));
    let lost = c.inventory.length - inventory.length;
    c.inventory = inventory;
    for (const slot of SLOTS) {
      const id = c.equipment[slot];
      if (id !== undefined && !content.items.has(id)) {
        delete c.equipment[slot];
        lost += 1;
      }
    }
    if (lost > 0) notes.push(`${lost} of ${c.name}'s items no longer exist and were removed.`);
  }
  state.party = state.party.filter((id) => state.roster.some((c) => c.id === id)).slice(0, MAX_PARTY);
  state.feathers = state.feathers.filter((id) => content.feathers.has(id));
  const stash = state.stash.filter((id) => typeof id === 'string' && content.items.has(id));
  if (stash.length < state.stash.length) notes.push(`${state.stash.length - stash.length} items in the Guild chest no longer exist and were removed.`);
  state.stash = stash;
  // New content may bring new opening quests (e.g. a new chapter): start them for old saves too.
  notes.push(...[...startOpeningQuests(state), ...catchUpQuests(state)].filter((line) => line.startsWith('New')));
  repairQuests(state);
  // Story items once lost to a full pack come back, so the story can't get stuck.
  notes.push(...recoverStoryItems(state));
  const loc = state.location;
  if (loc) {
    const level = content.dungeons.get(loc.dungeon)?.levels[loc.level];
    if (!level || !isWalkable(tileAt(level, loc.x, loc.y))) {
      state.location = null;
      notes.push('That part of the dungeon has changed, so the party is back in town.');
    }
  }
  return { ok: true, state, notes };
}
