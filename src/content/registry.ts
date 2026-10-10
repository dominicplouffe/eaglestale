import type {
  ClassDef,
  ContentPack,
  DungeonDef,
  ItemDef,
  MonsterDef,
  RaceDef,
  ShopDef,
  SpellDef,
} from '../rules/types';

/**
 * Central lookup for all game content. Packs are merged in registration order;
 * a later pack may override an earlier one by reusing an id.
 */
class ContentRegistry {
  readonly races = new Map<string, RaceDef>();
  readonly classes = new Map<string, ClassDef>();
  readonly items = new Map<string, ItemDef>();
  readonly spells = new Map<string, SpellDef>();
  readonly monsters = new Map<string, MonsterDef>();
  readonly dungeons = new Map<string, DungeonDef>();
  readonly shops = new Map<string, ShopDef>();
  readonly packs: string[] = [];

  register(pack: ContentPack): void {
    this.packs.push(pack.id);
    for (const r of pack.races ?? []) this.races.set(r.id, r);
    for (const c of pack.classes ?? []) this.classes.set(c.id, c);
    for (const i of pack.items ?? []) this.items.set(i.id, i);
    for (const s of pack.spells ?? []) this.spells.set(s.id, s);
    for (const m of pack.monsters ?? []) this.monsters.set(m.id, m);
    for (const d of pack.dungeons ?? []) this.dungeons.set(d.id, d);
    for (const s of pack.shops ?? []) this.shops.set(s.id, s);
  }

  race = (id: string): RaceDef => lookup(this.races, id, 'race');
  cls = (id: string): ClassDef => lookup(this.classes, id, 'class');
  item = (id: string): ItemDef => lookup(this.items, id, 'item');
  spell = (id: string): SpellDef => lookup(this.spells, id, 'spell');
  monster = (id: string): MonsterDef => lookup(this.monsters, id, 'monster');
  dungeon = (id: string): DungeonDef => lookup(this.dungeons, id, 'dungeon');
  shop = (id: string): ShopDef => lookup(this.shops, id, 'shop');
}

function lookup<T>(map: Map<string, T>, id: string, what: string): T {
  const found = map.get(id);
  if (!found) throw new Error(`Unknown ${what} "${id}"`);
  return found;
}

export const content = new ContentRegistry();
