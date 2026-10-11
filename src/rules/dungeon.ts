import type { EncounterSpec } from './combat';
import type { Rng } from './rng';
import type { DungeonLevel } from './types';

/** Directions in clockwise order: 0 = north, 1 = east, 2 = south, 3 = west. */
export const DIRS = [
  { dx: 0, dy: -1, name: 'North' },
  { dx: 1, dy: 0, name: 'East' },
  { dx: 0, dy: 1, name: 'South' },
  { dx: -1, dy: 0, name: 'West' },
] as const;

export const turn = (dir: number, delta: number): number => (dir + delta + 4) % 4;

export function tileAt(level: DungeonLevel, x: number, y: number): string {
  return level.grid[y]?.[x] ?? '#';
}

/**
 * '=' is a shut door (a lock not yet opened) and '&' a building's front door. Neither appears in level
 * grids, only in `effectiveTile`.
 */
export const isWalkable = (tile: string): boolean => tile !== '#' && tile !== ' ' && tile !== '=' && tile !== '&';

/** Tiles that are neither plain floor nor stairs nor door are authored special tiles. */
export const isSpecialTile = (tile: string): boolean => !'#. +<>=&'.includes(tile);

export const specialKey = (dungeon: string, level: number, x: number, y: number): string =>
  `${dungeon}:${level}:${x},${y}`;

export const levelKey = (dungeon: string, level: number): string => `${dungeon}:${level}`;

/**
 * How a square looks and behaves right now: a lock is a shut door '=' until opened (then a doorway),
 * a secret is wall '#' until found (then floor), a building is its front door '&', a portal looks
 * like stairs down and a teleport '^' like the mouth of a tube. `done` says whether a special has been used.
 */
export function effectiveTile(level: DungeonLevel, x: number, y: number, done: (x: number, y: number) => boolean): string {
  const t = tileAt(level, x, y);
  const s = level.specials[t];
  if (s?.kind === 'lock') return done(x, y) ? '+' : '=';
  if (s?.kind === 'secret') return done(x, y) ? '.' : '#';
  if (s?.kind === 'building') return '&';
  if (s?.kind === 'portal') return '>';
  if (s?.kind === 'teleport') return '^';
  return t;
}

/** The named area (e.g. a street) a square is in, if any. */
export function areaAt(level: DungeonLevel, x: number, y: number): string | undefined {
  return level.areas?.find((a) => x >= a.x && x < a.x + a.w && y >= a.y && y < a.y + a.h)?.name;
}

/** Rolls the monster groups for a random encounter on `level`. */
export function rollEncounter(level: DungeonLevel, rng: Rng): EncounterSpec[] {
  const pool = level.encounters;
  const groupCount = rng.chance(0.15) ? 3 : rng.chance(0.4) ? 2 : 1;
  const specs: EncounterSpec[] = [];
  for (let i = 0; i < groupCount; i++) {
    const entry = rng.weighted(pool, (e) => e.weight);
    const existing = specs.find((s) => s.monster === entry.monster);
    const count = rng.int(entry.min, entry.max);
    if (existing) existing.count += count;
    // The first group is always within reach; others usually are, or are one step away.
    else specs.push({ monster: entry.monster, count, distance: i === 0 || rng.chance(0.6) ? 0 : 1 });
  }
  return specs;
}
