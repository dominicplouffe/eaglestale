import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { isSpecialTile, isWalkable, tileAt } from '../src/rules/dungeon';
import { ATTRS, type DungeonLevel } from '../src/rules/types';
import './helpers';

/** Squares the party can stand on (a building's door is in a wall; locks and secrets count as open). */
const canStand = (level: DungeonLevel, t: string): boolean => isWalkable(t) && level.specials[t]?.kind !== 'building';

describe('content integrity', () => {
  it('classes reference real items and spells', () => {
    for (const cls of content.classes.values()) {
      for (const id of cls.kit) expect(content.items.has(id), `${cls.id} kit ${id}`).toBe(true);
      for (const e of cls.spellbook) expect(content.spells.has(e.spell), `${cls.id} spell ${e.spell}`).toBe(true);
    }
  });

  it('every class can use its starting kit', () => {
    for (const cls of content.classes.values()) {
      for (const id of cls.kit) {
        const prof = content.item(id).proficiency;
        expect(!prof || cls.canUse.includes(prof), `${cls.id} cannot use ${id}`).toBe(true);
      }
    }
  });

  it('shops sell real items', () => {
    for (const shop of content.shops.values()) {
      for (const id of shop.stock) expect(content.items.has(id), id).toBe(true);
    }
  });

  it('races have sane attributes', () => {
    for (const race of content.races.values()) {
      for (const a of ATTRS) expect(race.stats[a]).toBeGreaterThan(0);
    }
  });

  it('monsters have attacks', () => {
    for (const m of content.monsters.values()) expect(m.attacks.length, m.id).toBeGreaterThan(0);
  });

  it('dungeon levels are fully connected and reference real content', () => {
    for (const dungeon of content.dungeons.values()) {
      dungeon.levels.forEach((level, li) => {
        const { x, y } = level.start;
        // Dungeon levels start on the stairs up; the city starts in its square.
        if (!dungeon.city) expect(tileAt(level, x, y)).toBe('<');
        expect(canStand(level, tileAt(level, x, y)), `${dungeon.id} start`).toBe(true);
        const seen = new Set<string>([`${x},${y}`]);
        const queue: [number, number][] = [[x, y]];
        for (let i = 0; i < queue.length; i++) {
          const [cx, cy] = queue[i];
          for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
            const k = `${cx + dx},${cy + dy}`;
            if (canStand(level, tileAt(level, cx + dx, cy + dy)) && !seen.has(k)) {
              seen.add(k);
              queue.push([cx + dx, cy + dy]);
            }
          }
        }
        const walkable = level.grid.join('').split('').filter((t) => canStand(level, t)).length;
        expect(seen.size, `${dungeon.id} level ${li} connectivity`).toBe(walkable);

        const letters = new Set(level.grid.join('').split('').filter(isSpecialTile));
        for (const l of letters) expect(level.specials[l], `${li} tile ${l}`).toBeDefined();
        for (const e of level.encounters) expect(content.monsters.has(e.monster)).toBe(true);
        const hasDown = level.grid.some((r) => r.includes('>'));
        if (!dungeon.city) expect(hasDown).toBe(li < dungeon.levels.length - 1);
        for (const s of Object.values(level.specials)) {
          if (s.kind === 'fight') for (const g of s.groups) expect(content.monsters.has(g.monster)).toBe(true);
          if ((s.kind === 'treasure' && s.item) || (s.kind === 'fight' && s.reward?.item)) {
            const id = s.kind === 'treasure' ? s.item : s.reward?.item;
            expect(content.items.has(id as string)).toBe(true);
          }
          if (s.kind === 'portal' || (s.kind === 'building' && s.dungeon)) {
            expect(content.dungeons.has(s.dungeon as string), `way into ${s.dungeon}`).toBe(true);
          }
          if ((s.kind === 'portal' || s.kind === 'lock' || s.kind === 'building') && s.key) expect(content.items.has(s.key), `key ${s.key}`).toBe(true);
          if (s.kind === 'teleport') {
            const target = dungeon.levels[s.level ?? li];
            expect(target, `teleport to level ${s.level}`).toBeDefined();
            expect(target.grid.some((row) => row.includes(s.to)), `teleport to ${s.to}`).toBe(true);
          }
          if (s.kind === 'talk' && s.quest) expect(content.quests.has(s.quest), `talk starts ${s.quest}`).toBe(true);
        }
        for (const a of [...(level.areas ?? []), ...(level.landmarks ?? [])]) {
          expect(a.x >= 0 && a.y >= 0 && a.x + a.w <= level.grid[0].length && a.y + a.h <= level.grid.length, `area at ${a.x},${a.y}`).toBe(true);
        }
      });
    }
  });

  it('there is one city, and every dungeon can be reached from it (and climbed out of to it)', () => {
    const cities = [...content.dungeons.values()].filter((d) => d.city);
    expect(cities).toHaveLength(1);
    const city = cities[0].levels[0];
    // Ways in are steps and grates (portals) or front doors with a dungeon behind them, in town or
    // inside another dungeon (a path from the Wood to the Spire, say).
    const reached = new Set([cities[0].id]);
    for (let pass = 0; pass < 10; pass++) {
      for (const id of [...reached]) {
        for (const level of content.dungeon(id).levels) {
          for (const s of Object.values(level.specials)) {
            if ((s.kind === 'portal' || s.kind === 'building') && s.dungeon) reached.add(s.dungeon);
          }
        }
      }
    }
    for (const d of content.dungeons.values()) expect(reached.has(d.id), `a way into ${d.id}`).toBe(true);
    // Building doors sit in walls, with a street square in front of them.
    city.grid.forEach((row, y) => {
      [...row].forEach((t, x) => {
        if (city.specials[t]?.kind !== 'building') return;
        const fronts = [[0, -1], [1, 0], [0, 1], [-1, 0]].filter(([dx, dy]) => canStand(city, tileAt(city, x + dx, y + dy)));
        expect(fronts.length, `door ${t} at ${x},${y}`).toBeGreaterThan(0);
      });
    });
  });

  it('every way that waits on a story flag can open: a quest or something in a dungeon sets it', () => {
    const set = new Set<string>();
    for (const q of content.quests.values()) if (q.flag) set.add(q.flag);
    for (const d of content.dungeons.values()) {
      for (const level of d.levels) {
        for (const s of Object.values(level.specials)) {
          if ((s.kind === 'message' || s.kind === 'talk' || s.kind === 'fight' || s.kind === 'treasure') && s.flag) set.add(s.flag);
        }
      }
    }
    for (const d of content.dungeons.values()) {
      for (const level of d.levels) {
        for (const s of Object.values(level.specials)) {
          if ((s.kind === 'portal' || s.kind === 'building') && s.needs) expect(set.has(s.needs), `${s.name} needs ${s.needs}`).toBe(true);
        }
      }
    }
  });

  it('a finale fight, wherever there is one, sits on the last level of its dungeon', () => {
    let finales = 0;
    for (const d of content.dungeons.values()) {
      d.levels.forEach((level, li) => {
        for (const s of Object.values(level.specials)) {
          if (s.kind === 'fight' && s.finale) {
            finales += 1;
            expect(li, `${d.id} finale`).toBe(d.levels.length - 1);
          }
        }
      });
    }
    expect(finales).toBeLessThanOrEqual(1);
  });

  it('quests, feathers and city stages reference real content', () => {
    for (const q of content.quests.values()) {
      expect(q.steps.length, q.id).toBeGreaterThan(0);
      for (const step of q.steps) {
        const g = step.goal;
        if (g.kind === 'kill') expect(content.monsters.has(g.monster), `${q.id} kills ${g.monster}`).toBe(true);
        if (g.kind === 'collect') expect(content.items.has(g.item), `${q.id} collects ${g.item}`).toBe(true);
      }
      for (const n of q.next ?? []) expect(content.quests.has(n), `${q.id} -> ${n}`).toBe(true);
      for (const r of q.requires?.quests ?? []) expect(content.quests.has(r), `${q.id} requires ${r}`).toBe(true);
      if (q.reward?.item) expect(content.items.has(q.reward.item)).toBe(true);
      if (q.reward?.feather) expect(content.feathers.has(q.reward.feather)).toBe(true);
    }
    for (const st of content.cityStages) for (const id of st.stock ?? []) expect(content.items.has(id), `stage stock ${id}`).toBe(true);
    for (const m of content.monsters.values()) for (const d of m.drops ?? []) expect(content.items.has(d.item), `${m.id} drops ${d.item}`).toBe(true);
    expect(content.feathers.size).toBe(12);
  });

  it('every level can be finished: keys, feathers and wheels are found before the doors that need them', () => {
    const DIRS4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const feathers = new Set<string>();
    for (const dungeon of content.dungeons.values()) {
      const items = new Set<string>();
      const flags = new Set<string>();
      const reachedBy = new Map<number, Set<string>>();
      // Walk every level outward from its start, again and again, so a key or feather found on a later
      // level can open a door on an earlier one (going back is allowed); stop when nothing changes.
      for (let pass = 0; pass < 20; pass++) {
        let grew = false;
        dungeon.levels.forEach((level, li) => {
          const reached = new Set([`${level.start.x},${level.start.y}`]);
          const queue = [[level.start.x, level.start.y]];
          for (let i = 0; i < queue.length; i++) {
            const [x, y] = queue[i];
            const s = level.specials[tileAt(level, x, y)];
            if (s?.kind === 'treasure' && s.item) items.add(s.item);
            if (s?.kind === 'treasure' && s.feather) feathers.add(s.feather);
            if (s?.kind === 'fight' && s.reward?.item) items.add(s.reward.item);
            if (s?.kind === 'fight' && s.reward?.feather) feathers.add(s.reward.feather);
            if (s && 'flag' in s && s.kind !== 'lock' && s.flag) flags.add(s.flag);
            for (const [dx, dy] of DIRS4) {
              const nx = x + dx;
              const ny = y + dy;
              const t = tileAt(level, nx, ny);
              const sp = level.specials[t];
              const shut = sp?.kind === 'lock' && ((sp.key && !items.has(sp.key)) || (sp.feathers ?? 0) > feathers.size || (sp.flag && !flags.has(sp.flag)));
              if (canStand(level, t) && !shut && !reached.has(`${nx},${ny}`)) {
                reached.add(`${nx},${ny}`);
                queue.push([nx, ny]);
              }
            }
          }
          if (reached.size !== (reachedBy.get(li)?.size ?? 0)) grew = true;
          reachedBy.set(li, reached);
        });
        if (!grew) break;
      }
      dungeon.levels.forEach((level, li) => {
        const walkable = level.grid.join('').split('').filter((t) => canStand(level, t)).length;
        expect(reachedBy.get(li)?.size, `${dungeon.id} level ${li}: every square reachable`).toBe(walkable);
      });
    }
  });
});
