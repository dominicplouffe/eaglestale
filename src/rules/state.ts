import { MAX_PARTY } from './character';
import type { Character } from './types';

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
}

export const SAVE_VERSION = 1;
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
  };
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

export function deserialize(raw: string): GameState | null {
  try {
    const data = JSON.parse(raw) as GameState;
    if (data.version !== SAVE_VERSION || !Array.isArray(data.roster)) return null;
    return data;
  } catch {
    return null;
  }
}
