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

  it('the final level has exactly one finale fight', () => {
    const d = content.dungeon('roost');
    const last = d.levels[d.levels.length - 1];
    const finales = Object.values(last.specials).filter((s) => s.kind === 'fight' && s.finale);
    expect(finales).toHaveLength(1);
  });
});
