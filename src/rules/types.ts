/** Shared data shapes for the rules engine and for content packs. */

export const ATTRS = ['str', 'iq', 'dex', 'con', 'lck'] as const;
export type Attr = (typeof ATTRS)[number];
export type Stats = Record<Attr, number>;

export const ATTR_NAMES: Record<Attr, string> = {
  str: 'Strength',
  iq: 'Intellect',
  dex: 'Dexterity',
  con: 'Constitution',
  lck: 'Luck',
};

/** [count, sides, flatBonus] - e.g. [2, 6, 1] is 2d6+1. */
export type Dice = readonly [count: number, sides: number, bonus?: number];

export const SLOTS = ['weapon', 'shield', 'head', 'body', 'hands', 'trinket'] as const;
export type Slot = (typeof SLOTS)[number];

export interface RaceDef {
  id: string;
  name: string;
  desc: string;
  /** Starting attributes before the player spends bonus points. */
  stats: Stats;
  /** Colour used when drawing this race's portrait. */
  skin: string;
}

export interface SpellbookEntry {
  spell: string;
  /** Character level at which the class learns the spell. */
  level: number;
}

export interface ClassDef {
  id: string;
  name: string;
  desc: string;
  hitDie: number;
  /** Spell points gained per level (before the Intellect modifier). 0 = non-caster. */
  spPerLevel: number;
  /** To-hit bonus gained per level (fractional values are floored). */
  toHitPerLevel: number;
  /** Multiplier on the XP needed for each level. */
  xpMult: number;
  /** Attribute that may rise on level-up. */
  primary: Attr;
  /** Minimum attributes needed to pick this class. */
  requires?: Partial<Stats>;
  /** Item proficiency tags this class may use (see ItemDef.proficiency). */
  canUse: string[];
  spellbook: SpellbookEntry[];
  /** Item ids equipped in order at creation; a later item replaces an earlier one in the same slot (it goes to the pack). */
  kit: string[];
  /** Colour used when drawing this class's portrait. */
  color: string;
}

export type ItemUse = { kind: 'heal'; amount: number } | { kind: 'restoreSp'; amount: number };

export interface ItemDef {
  id: string;
  name: string;
  desc: string;
  price: number;
  slot?: Slot;
  /** Tag a class must list in `canUse` to equip this item. Omit for anyone. */
  proficiency?: string;
  damage?: Dice;
  /** To-hit bonus while equipped. */
  hit?: number;
  /** Defense bonus while equipped. */
  ac?: number;
  /** Ranged weapons can strike from the back row and at distant groups. */
  ranged?: boolean;
  use?: ItemUse;
}

export type SpellTarget = 'enemy' | 'group' | 'allEnemies' | 'ally' | 'party';

export type SpellEffect =
  | { kind: 'damage'; dice: Dice }
  | { kind: 'heal'; dice: Dice }
  | { kind: 'sleep'; turns: number }
  | { kind: 'defense'; amount: number; turns: number };

export interface SpellDef {
  id: string;
  name: string;
  desc: string;
  cost: number;
  target: SpellTarget;
  effect: SpellEffect;
}

export interface MonsterAttack {
  verb: string;
  dice: Dice;
  /** Ranged attacks can be used from a distance and ignore the front row. */
  ranged?: boolean;
  /** Hits every living party member. */
  all?: boolean;
}

export interface MonsterDef {
  id: string;
  name: string;
  plural: string;
  hp: Dice;
  def: number;
  toHit: number;
  speed: number;
  xp: number;
  gold: Dice;
  attacks: MonsterAttack[];
  /** Attacks per turn. Defaults to 1. */
  actions?: number;
  sprite: string;
  /** Overrides for the sprite palette, to reuse one drawing for several monsters. */
  palette?: Record<string, string>;
}

export interface EncounterEntry {
  monster: string;
  min: number;
  max: number;
  weight: number;
}

export type Special =
  | { kind: 'message'; text: string }
  | { kind: 'trap'; dice: Dice; text: string }
  | { kind: 'treasure'; text: string; gold?: number; item?: string }
  | { kind: 'fountain'; text: string }
  | {
      kind: 'fight';
      text: string;
      groups: { monster: string; count: number }[];
      reward?: { gold?: number; item?: string };
      /** Ends the game with the victory screen when won. */
      finale?: boolean;
    };

export interface DungeonLevel {
  name: string;
  /** '#' wall, '.' floor, '+' door, '<' stairs up, '>' stairs down, anything else is a special tile. */
  grid: string[];
  start: { x: number; y: number; dir: number };
  encounters: EncounterEntry[];
  /** Chance of an encounter on each step. */
  encounterRate: number;
  specials: Record<string, Special>;
  theme: DungeonTheme;
}

export interface DungeonTheme {
  wall: string;
  floor: string;
  ceiling: string;
  door: string;
}

export interface DungeonDef {
  id: string;
  name: string;
  levels: DungeonLevel[];
}

export interface ShopDef {
  id: string;
  name: string;
  greeting: string;
  stock: string[];
}

/** A bundle of game content. Register more packs to extend the game without touching engine code. */
export interface ContentPack {
  id: string;
  races?: RaceDef[];
  classes?: ClassDef[];
  items?: ItemDef[];
  spells?: SpellDef[];
  monsters?: MonsterDef[];
  dungeons?: DungeonDef[];
  shops?: ShopDef[];
}

export interface Character {
  id: string;
  name: string;
  raceId: string;
  classId: string;
  level: number;
  xp: number;
  stats: Stats;
  hp: number;
  maxHp: number;
  sp: number;
  maxSp: number;
  equipment: Partial<Record<Slot, string>>;
  inventory: string[];
}
