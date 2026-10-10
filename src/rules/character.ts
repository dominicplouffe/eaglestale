import { content } from '../content/registry';
import { gameRng, type Rng } from './rng';
import {
  ATTRS,
  type Attr,
  type Character,
  type Dice,
  type ItemDef,
  type ItemUse,
  type Slot,
  type SpellDef,
  type Stats,
} from './types';

export const MAX_LEVEL = 20;
export const MAX_INVENTORY = 8;
export const MAX_PARTY = 6;
export const MAX_STAT = 18;
/** Characters in party slots 0-2 fight in the front row. */
export const FRONT_ROW_SIZE = 3;

export const mod = (value: number): number => Math.floor((value - 10) / 2);

export const isAlive = (c: Character): boolean => c.hp > 0;

export function xpForLevel(level: number, xpMult: number): number {
  return level <= 1 ? 0 : Math.round(100 * xpMult * (level - 1) * level);
}

export function xpToNext(c: Character): number | null {
  if (c.level >= MAX_LEVEL) return null;
  return xpForLevel(c.level + 1, content.cls(c.classId).xpMult);
}

export const rollBonusPool = (rng: Rng = gameRng): number => 10 + rng.int(1, 6);

/** Spends `pool` bonus points sensibly for a class: mostly its primary stat, then CON and DEX. */
export function autoAllocate(raceId: string, classId: string, pool = 12): Stats {
  const stats = { ...content.race(raceId).stats };
  const cls = content.cls(classId);
  const order: Attr[] = [cls.primary, cls.primary, 'con', 'dex', cls.primary, 'lck'];
  for (let i = 0, spent = 0; spent < pool && i < 200; i++) {
    const attr = order[i % order.length];
    if (stats[attr] < MAX_STAT) {
      stats[attr] += 1;
      spent += 1;
    }
  }
  return stats;
}

export function meetsRequirements(classId: string, stats: Stats): boolean {
  const req = content.cls(classId).requires ?? {};
  return ATTRS.every((a) => stats[a] >= (req[a] ?? 0));
}

export interface NewCharacterOptions {
  id: string;
  name: string;
  raceId: string;
  classId: string;
  /** Final attributes (race base + spent bonus points). */
  stats: Stats;
}

export function createCharacter(opts: NewCharacterOptions): Character {
  const cls = content.cls(opts.classId);
  content.race(opts.raceId);
  if (!meetsRequirements(opts.classId, opts.stats)) {
    throw new Error(`${opts.name} does not meet the requirements for ${cls.name}`);
  }
  const maxHp = Math.max(1, cls.hitDie + mod(opts.stats.con));
  const maxSp = spGain(cls.spPerLevel, opts.stats.iq);
  const c: Character = {
    id: opts.id,
    name: opts.name.trim() || 'Nameless',
    raceId: opts.raceId,
    classId: opts.classId,
    level: 1,
    xp: 0,
    stats: { ...opts.stats },
    hp: maxHp,
    maxHp,
    sp: maxSp,
    maxSp,
    equipment: {},
    inventory: [],
  };
  for (const itemId of cls.kit) {
    c.inventory.push(itemId);
    equipItem(c, c.inventory.length - 1);
  }
  return c;
}

const spGain = (spPerLevel: number, iq: number): number =>
  spPerLevel > 0 ? Math.max(1, spPerLevel + mod(iq)) : 0;

// ---- Equipment -------------------------------------------------------------

export function canUse(c: Character, item: ItemDef): boolean {
  return !item.proficiency || content.cls(c.classId).canUse.includes(item.proficiency);
}

export function equippedItems(c: Character): ItemDef[] {
  return Object.values(c.equipment).map((id) => content.item(id));
}

export const weaponOf = (c: Character): ItemDef | undefined =>
  c.equipment.weapon ? content.item(c.equipment.weapon) : undefined;

/** Equips the inventory item at `index`, returning any displaced item to the pack. */
export function equipItem(c: Character, index: number): string | null {
  const itemId = c.inventory[index];
  const item = itemId ? content.item(itemId) : undefined;
  if (!item?.slot) return `${item?.name ?? 'That'} can't be equipped.`;
  if (!canUse(c, item)) return `${content.cls(c.classId).name}s can't use ${item.name}.`;
  const slot: Slot = item.slot;
  const previous = c.equipment[slot];
  c.inventory.splice(index, 1);
  if (previous) c.inventory.push(previous);
  c.equipment[slot] = item.id;
  return null;
}

export function unequipItem(c: Character, slot: Slot): string | null {
  const itemId = c.equipment[slot];
  if (!itemId) return null;
  if (c.inventory.length >= MAX_INVENTORY) return 'Your pack is full.';
  delete c.equipment[slot];
  c.inventory.push(itemId);
  return null;
}

// ---- Derived stats ---------------------------------------------------------

export const defense = (c: Character): number =>
  equippedItems(c).reduce((sum, it) => sum + (it.ac ?? 0), 0) + mod(c.stats.dex);

export function toHit(c: Character): number {
  const cls = content.cls(c.classId);
  const weapon = weaponOf(c);
  const attr = weapon?.ranged ? c.stats.dex : c.stats.str;
  return Math.floor(c.level * cls.toHitPerLevel) + mod(attr) + (weapon?.hit ?? 0);
}

export const UNARMED: Dice = [1, 2];

export const weaponDice = (c: Character): Dice => weaponOf(c)?.damage ?? UNARMED;

/** Average damage of a normal weapon hit, as combat rolls it (Strength only counts in melee). */
export function averageDamage(c: Character): number {
  const [count, sides, bonus = 0] = weaponDice(c);
  const strength = weaponOf(c)?.ranged ? 0 : mod(c.stats.str);
  return Math.max(1, (count * (sides + 1)) / 2 + bonus + strength);
}

/** How defense, to-hit and average damage would change if `c` wore or wielded `item`. */
export function equipDelta(c: Character, item: ItemDef): { def: number; hit: number; dmg: number } | null {
  if (!item.slot) return null;
  const trial: Character = { ...c, equipment: { ...c.equipment, [item.slot]: item.id } };
  return {
    def: defense(trial) - defense(c),
    hit: toHit(trial) - toHit(c),
    dmg: averageDamage(trial) - averageDamage(c),
  };
}

export function knownSpells(c: Character): SpellDef[] {
  return content
    .cls(c.classId)
    .spellbook.filter((e) => e.level <= c.level)
    .map((e) => content.spell(e.spell));
}

// ---- Progression -----------------------------------------------------------

/** Adds XP and applies any level-ups. Returns messages describing what happened. */
export function addXp(c: Character, amount: number, rng: Rng = gameRng): string[] {
  const out: string[] = [];
  c.xp += amount;
  while (c.level < MAX_LEVEL && c.xp >= (xpToNext(c) as number)) {
    out.push(levelUp(c, rng));
  }
  return out;
}

function levelUp(c: Character, rng: Rng): string {
  const cls = content.cls(c.classId);
  c.level += 1;
  const hpGain = Math.max(1, rng.int(1, cls.hitDie) + mod(c.stats.con));
  c.maxHp += hpGain;
  c.hp += hpGain;
  let msg = `${c.name} reaches level ${c.level}! (+${hpGain} HP`;
  const spUp = spGain(cls.spPerLevel, c.stats.iq);
  if (spUp > 0) {
    c.maxSp += spUp;
    c.sp += spUp;
    msg += `, +${spUp} SP`;
  }
  if (c.stats[cls.primary] < MAX_STAT && rng.chance(0.3)) {
    c.stats[cls.primary] += 1;
    msg += `, +1 ${cls.primary.toUpperCase()}`;
  }
  msg += ')';
  const learned = cls.spellbook.filter((e) => e.level === c.level);
  for (const e of learned) msg += ` Learned ${content.spell(e.spell).name}!`;
  return msg;
}

export function restoreFully(c: Character): void {
  c.hp = c.maxHp;
  c.sp = c.maxSp;
}

/** Moves the pack item at `index` from one hero to another. Returns an error message, or null on success. */
export function giveItem(from: Character, index: number, to: Character): string | null {
  const itemId = from.inventory[index];
  if (!itemId) return 'Nothing to give.';
  if (from === to) return null;
  if (to.inventory.length >= MAX_INVENTORY) return `${to.name}'s pack is full.`;
  from.inventory.splice(index, 1);
  to.inventory.push(itemId);
  return null;
}

/**
 * Uses the consumable at `index` in `owner`'s pack on `target` outside combat.
 * The item is only spent if it actually restores something.
 */
export function useItemOn(owner: Character, index: number, target: Character): { ok: boolean; message: string } {
  const itemId = owner.inventory[index];
  const item = itemId ? content.item(itemId) : undefined;
  if (!item?.use) return { ok: false, message: `${item?.name ?? 'That'} can't be used.` };
  if (!isAlive(target)) return { ok: false, message: `${target.name} is beyond any potion. Try the temple.` };
  const what = item.use.kind === 'heal' ? 'HP' : 'SP';
  const full = item.use.kind === 'heal' ? target.hp >= target.maxHp : target.sp >= target.maxSp;
  if (full) return { ok: false, message: `${target.name} is already at full ${what}.` };
  owner.inventory.splice(index, 1);
  const restored = applyItemUse(target, item.use);
  const who = owner === target ? `${owner.name} drinks` : `${owner.name} gives ${target.name}`;
  return { ok: true, message: `${who} the ${item.name}: +${restored} ${what}.` };
}

/** Applies a consumable's effect to `target` and returns the HP or SP actually restored. */
export function applyItemUse(target: Character, use: ItemUse): number {
  if (use.kind === 'heal') {
    const healed = Math.min(use.amount, target.maxHp - target.hp);
    target.hp += healed;
    return healed;
  }
  const gained = Math.min(use.amount, target.maxSp - target.sp);
  target.sp += gained;
  return gained;
}
