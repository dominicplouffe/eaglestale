import { describe, expect, it } from 'vitest';
import { content } from '../src/content';
import { isSpecialTile, isWalkable, tileAt } from '../src/rules/dungeon';
import { ATTRS } from '../src/rules/types';
import './helpers';

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
        expect(tileAt(level, x, y)).toBe('<');
        const seen = new Set<string>([`${x},${y}`]);
        const queue: [number, number][] = [[x, y]];
        for (let i = 0; i < queue.length; i++) {
          const [cx, cy] = queue[i];
          for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
            const k = `${cx + dx},${cy + dy}`;
            if (isWalkable(tileAt(level, cx + dx, cy + dy)) && !seen.has(k)) {
              seen.add(k);
              queue.push([cx + dx, cy + dy]);
            }
          }
        }
        const walkable = level.grid.join('').split('').filter(isWalkable).length;
        expect(seen.size, `${dungeon.id} level ${li} connectivity`).toBe(walkable);

        const letters = new Set(level.grid.join('').split('').filter(isSpecialTile));
        for (const l of letters) expect(level.specials[l], `${li} tile ${l}`).toBeDefined();
        for (const e of level.encounters) expect(content.monsters.has(e.monster)).toBe(true);
        const hasDown = level.grid.some((r) => r.includes('>'));
        expect(hasDown).toBe(li < dungeon.levels.length - 1);
        for (const s of Object.values(level.specials)) {
          if (s.kind === 'fight') for (const g of s.groups) expect(content.monsters.has(g.monster)).toBe(true);
          if ((s.kind === 'treasure' && s.item) || (s.kind === 'fight' && s.reward?.item)) {
            const id = s.kind === 'treasure' ? s.item : s.reward?.item;
            expect(content.items.has(id as string)).toBe(true);
          }
        }
      });
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

  it('every level can be finished: keys and feathers are found before the doors that need them', () => {
    const DIRS4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    let feathersSoFar = new Set<string>();
    for (const dungeon of content.dungeons.values()) {
      dungeon.levels.forEach((level, li) => {
        const items = new Set<string>();
        const featherCount = (): number => feathersSoFar.size;
        // Walk outward from the start; a lock is passable once its key and feathers have been found.
        let reached = new Set<string>();
        for (let pass = 0; pass < 20; pass++) {
          const before = reached.size;
          reached = new Set([`${level.start.x},${level.start.y}`]);
          const queue = [[level.start.x, level.start.y]];
          for (let i = 0; i < queue.length; i++) {
            const [x, y] = queue[i];
            const s = level.specials[tileAt(level, x, y)];
            if (s?.kind === 'treasure' && s.item) items.add(s.item);
            if (s?.kind === 'treasure' && s.feather) feathersSoFar.add(s.feather);
            if (s?.kind === 'fight' && s.reward?.item) items.add(s.reward.item);
            if (s?.kind === 'fight' && s.reward?.feather) feathersSoFar.add(s.reward.feather);
            for (const [dx, dy] of DIRS4) {
              const nx = x + dx;
              const ny = y + dy;
              const t = tileAt(level, nx, ny);
              const sp = level.specials[t];
              const open = isWalkable(t) && !(sp?.kind === 'lock' && ((sp.key && !items.has(sp.key)) || (sp.feathers ?? 0) > featherCount()));
              if (open && !reached.has(`${nx},${ny}`)) {
                reached.add(`${nx},${ny}`);
                queue.push([nx, ny]);
              }
            }
          }
          if (reached.size === before) break;
        }
        const walkable = level.grid.join('').split('').filter(isWalkable).length;
        expect(reached.size, `${dungeon.id} level ${li}: every square reachable`).toBe(walkable);
      });
      feathersSoFar = new Set(feathersSoFar);
    }
  });
});
