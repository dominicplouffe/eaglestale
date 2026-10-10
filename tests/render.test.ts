import { describe, expect, it } from 'vitest';
import { castRay } from '../src/gfx/dungeonView';
import { textWidth } from '../src/gfx/font';
import type { DungeonLevel } from '../src/rules/types';

const level = (grid: string[]): DungeonLevel => ({
  name: 'test',
  grid,
  start: { x: 1, y: 1, dir: 0 },
  encounters: [],
  encounterRate: 0,
  specials: {},
  theme: { wall: '#888888', floor: '#444444', ceiling: '#222222', door: '#884422' },
});

describe('first-person raycaster', () => {
  const room = level([
    '#####',
    '#...#',
    '#.#.#',
    '#...#',
    '#####',
  ]);

  it('measures the distance to the wall straight ahead', () => {
    // From the middle of (1,3) looking north: open squares at y=2 and y=1, wall at y=0.
    const hit = castRay(room, 1.5, 3.5, 0, -1);
    expect(hit.dist).toBeCloseTo(2.5);
    expect(hit.side).toBe(1);
    expect([hit.cellX, hit.cellY]).toEqual([1, 0]);
  });

  it('hits east/west faces with side 0 and reports where along the face', () => {
    const hit = castRay(room, 1.5, 1.25, 1, 0);
    expect(hit.dist).toBeCloseTo(2.5);
    expect(hit.side).toBe(0);
    expect(hit.u).toBeGreaterThan(0);
    expect(hit.u).toBeLessThan(1);
  });

  it('sees doorway arches only where a passage begins', () => {
    const corridor = level([
      '#####',
      '#...#',
      '##+##',
      '#...#',
      '#####',
    ]);
    const through = castRay(corridor, 2.5, 3.5, 0, -1);
    expect(through.doors).toHaveLength(1);
    expect(through.doors[0].dist).toBeCloseTo(0.5);
    expect(through.dist).toBeCloseTo(2.5); // the arch is see-through: the ray carries on to the far wall
  });
});

describe('pixel font', () => {
  it('measures text including the gaps between letters', () => {
    expect(textWidth('')).toBe(0);
    expect(textWidth('A')).toBe(5);
    expect(textWidth('AA')).toBe(11);
    expect(textWidth('AA', 3)).toBe(33);
  });
});
