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
  /** Keys and other story items: they can't be sold or dropped. */
  quest?: boolean;
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
  /** How the spell looks in battle. Defaults by effect: damage 'bolt', sleep 'sleep', heal 'heal', defense 'ward'. */
  look?: 'bolt' | 'fire' | 'ice' | 'holy' | 'sleep' | 'song' | 'ward' | 'heal';
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
  /** A named individual such as a boss: battle text says "Malachar hits", not "The Malachar hits". */
  unique?: boolean;
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
  /** Items each one may drop when the party wins (e.g. rat tails for a bounty). */
  drops?: { item: string; chance: number }[];
}

export interface EncounterEntry {
  monster: string;
  min: number;
  max: number;
  weight: number;
}

/** What a won fight, a found treasure or a finished quest gives the party. */
export interface Reward {
  gold?: number;
  item?: string;
  /** One of Aquila's feathers (see FeatherDef). */
  feather?: string;
  /** Experience shared among the living. */
  xp?: number;
}

/**
 * Special squares. Most fire when the party steps on them; `lock` and `secret` squares block the way
 * until opened or found. `flag` names a story flag set when the special is done (a fight won, a
 * treasure taken, a talk had), which quests can wait for.
 */
export type Special =
  | { kind: 'message'; text: string; flag?: string }
  | { kind: 'trap'; dice: Dice; text: string }
  | { kind: 'treasure'; text: string; gold?: number; item?: string; feather?: string; flag?: string }
  | { kind: 'fountain'; text: string }
  | {
      kind: 'fight';
      text: string;
      /** Every group starts within melee range unless given a `distance` (1 = one step away). */
      groups: { monster: string; count: number; distance?: number }[];
      reward?: Reward;
      /** Ends the game with the victory screen when won. */
      finale?: boolean;
      flag?: string;
    }
  | {
      /** A door that stays shut until the party carries `key` (an item) and/or `feathers` feathers. */
      kind: 'lock';
      text: string;
      opened: string;
      key?: string;
      feathers?: number;
    }
  | {
      /** Looks like wall. Walking into it opens a passage; a rogue in the party senses a draught nearby. */
      kind: 'secret';
      text: string;
    }
  | {
      /** Someone to talk to. The first time, they say `text` (and may start `quest`); afterwards `after`. */
      kind: 'talk';
      name: string;
      text: string;
      after: string;
      quest?: string;
      flag?: string;
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
  /**
   * How the first-person textures are painted: 'brick' (with wall torches), 'stone' (large mossy
   * blocks) or 'rune' (dressed stone with glowing runes). Defaults to 'brick'.
   */
  style?: 'brick' | 'stone' | 'rune';
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

/** One of Aquila's great feathers, the main quest's collectibles. */
export interface FeatherDef {
  id: string;
  name: string;
  /** Who held it, for the journal. */
  desc: string;
}

/** How Talonreach recovers as feathers are returned to the Eagle Tower. */
export interface CityStage {
  /** Feathers offered at the tower needed to reach this stage. */
  feathers: number;
  /** Told when the stage is reached, and summarised in the journal. */
  text: string;
  /** Items the Emporium starts selling. */
  stock?: string[];
}

export type QuestGoal =
  | { kind: 'kill'; monster: string; count: number }
  /** Carry `count` of an item (in any hero's pack). Bounty items are handed over at the end. */
  | { kind: 'collect'; item: string; count: number }
  /** A story flag, set by a special (a fight won, a treasure taken, someone talked to). */
  | { kind: 'flag'; flag: string }
  /** Feathers found so far. */
  | { kind: 'feathers'; count: number }
  /** Feathers returned to the Eagle Tower. */
  | { kind: 'offered'; count: number };

export interface QuestStep {
  /** The journal line while this step is current. */
  text: string;
  goal: QuestGoal;
}

export interface QuestDef {
  id: string;
  name: string;
  kind: 'main' | 'side';
  /**
   * 'start': active from the beginning. 'board': offered on the Guild's bounty board.
   * 'given': started by someone (a talk special) or by another quest's `next`.
   */
  source: 'start' | 'board' | 'given';
  summary: string;
  /** Before it can be offered on the board. */
  requires?: { quests?: string[]; feathers?: number };
  steps: QuestStep[];
  reward?: Reward;
  /** Said when the quest is finished. */
  done: string;
  /** Quests that start when this one is finished (how the main story moves on). */
  next?: string[];
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
  quests?: QuestDef[];
  feathers?: FeatherDef[];
  /** Replaces the city's stages if given (later packs can extend the story). */
  cityStages?: CityStage[];
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
