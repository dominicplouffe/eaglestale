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

export const isWalkable = (tile: string): boolean => tile !== '#' && tile !== ' ';

/** Tiles that are neither plain floor nor stairs nor door are authored special tiles. */
export const isSpecialTile = (tile: string): boolean => !'#. +<>'.includes(tile);

export const specialKey = (dungeon: string, level: number, x: number, y: number): string =>
  `${dungeon}:${level}:${x},${y}`;

export const levelKey = (dungeon: string, level: number): string => `${dungeon}:${level}`;

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
    else specs.push({ monster: entry.monster, count, distance: i === 0 ? rng.int(0, 1) : rng.int(1, 2) });
  }
  return specs;
}
