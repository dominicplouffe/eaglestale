import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { ART_SIZE, artDef } from '../src/gfx/art';
import { PORTRAIT_DATA } from '../src/gfx/art/portraits';
import { BUST } from '../src/gfx/portrait';
import { castRay } from '../src/gfx/dungeonView';
import { texturesFor } from '../src/gfx/textures';
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

describe('monster art', () => {
  it('every monster has a drawing, and recolours name real materials', () => {
    for (const m of content.monsters.values()) {
      const def = artDef(m.sprite);
      expect(def, `${m.id} draws "${m.sprite}"`).toBeDefined();
      for (const key of Object.keys(m.palette ?? {})) {
        const known = key.length === 1 || !!def?.materials?.[key];
        expect(known, `${m.id} recolours unknown material "${key}"`).toBe(true);
      }
    }
  });

  it('drawings are 32x32 and every pixel has a colour', () => {
    for (const m of content.monsters.values()) {
      const def = artDef(m.sprite);
      if (!def) continue;
      expect(def.rows).toHaveLength(ART_SIZE);
      for (const row of def.rows) {
        expect(row.length).toBe(def.symmetric ? ART_SIZE / 2 : ART_SIZE);
        for (const ch of row) if (ch !== '.') expect(def.colors[ch], `${m.sprite} key "${ch}"`).toBeDefined();
      }
    }
  });
});

describe('textures', () => {
  it('paints every theme in the game', () => {
    for (const d of content.dungeons.values()) {
      for (const level of d.levels) {
        const t = texturesFor(level.theme);
        expect(t.wall.levels.length, `${d.id} ${level.name}`).toBeGreaterThan(0);
        expect(t.top.length).toBe(level.theme.style === 'forest' || level.theme.style === 'mountain' ? 2 : 0);
      }
    }
  });

  it('gives mountains three storeys of cliff, ragged against the sky at the top', () => {
    const t = texturesFor({ wall: '#7a7480', floor: '#dfe6ee', ceiling: '#000000', door: '#f4f8fc', style: 'mountain', sky: '#8ec0f0' });
    expect(t.storeys).toBe(3);
    const top = t.top[0].levels[t.top[0].levels.length - 1];
    // Some of the top row is sky (transparent), and none of the bottom row is.
    expect([...top.slice(0, 32)].some((px) => px === 0)).toBe(true);
    expect([...top.slice(31 * 32)].every((px) => px !== 0)).toBe(true);
  });
});

describe('portraits', () => {
  const L = PORTRAIT_DATA.layers;

  it('has a head for every race and an outfit and headgear for every class', () => {
    for (const r of content.races.values()) expect(L[`head:${r.id}`], r.id).toBeDefined();
    for (const c of content.classes.values()) {
      expect(L[`body:${c.id}`], c.id).toBeDefined();
      expect(L[`hat:${c.id}`], c.id).toBeDefined();
    }
    expect(Object.keys(L).filter((k) => k.startsWith('hair:')).length).toBeGreaterThanOrEqual(3);
  });

  it('layers are 24x24 and every key has a colour', () => {
    const dynamic = new Set('tsSjhHvcC');
    for (const [name, rows] of Object.entries(L)) {
      expect(rows, name).toHaveLength(BUST);
      for (const row of rows) {
        expect(row.length, name).toBe(BUST);
        for (const ch of row) if (ch !== '.' && !dynamic.has(ch)) expect(PORTRAIT_DATA.colors[ch], `${name} key "${ch}"`).toBeDefined();
      }
    }
  });
});
