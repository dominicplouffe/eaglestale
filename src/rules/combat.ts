import { content } from '../content/registry';
import {
  FRONT_ROW_SIZE,
  addXp,
  applyItemUse,
  defense,
  isAlive,
  mod,
  toHit,
  weaponDice,
  weaponOf,
} from './character';
import { gameRng, type Rng } from './rng';
import { applyHeal, canCast, rollSpellDice } from './spells';
import type { Character, MonsterAttack, MonsterDef } from './types';

export type SfxName =
  | 'hit'
  | 'miss'
  | 'crit'
  | 'spell'
  | 'heal'
  | 'death'
  | 'monsterHit'
  | 'monsterDeath'
  | 'levelup';

/** What an event did, so the battle screen can animate it. Presentation only; rules never read it. */
export type BattleFx =
  | { kind: 'hit'; group: number; target: MonsterInstance; amount: number; crit?: boolean }
  | { kind: 'death'; group: number; target: MonsterInstance }
  | { kind: 'cast'; spell: string; groups: number[] }
  | { kind: 'heal'; hero: string; amount: number }
  | { kind: 'ward'; spell: string }
  | { kind: 'partyHit'; group: number; hero: string; amount: number }
  | { kind: 'monsterMiss'; group: number };

export interface BattleEvent {
  text: string;
  sfx?: SfxName;
  fx?: BattleFx;
}

export interface MonsterInstance {
  hp: number;
  maxHp: number;
  /** Rounds of sleep remaining. */
  asleep: number;
}

export interface MonsterGroup {
  def: MonsterDef;
  members: MonsterInstance[];
  /** 0 = melee range; larger values are farther away. Melee attackers must close in first. */
  distance: number;
}

export interface EncounterSpec {
  monster: string;
  count: number;
  distance?: number;
}

export type Order =
  | { kind: 'attack'; group: number }
  | { kind: 'cast'; spell: string; group?: number; ally?: string }
  | { kind: 'item'; itemId: string; ally: string }
  | { kind: 'defend' }
  | { kind: 'run' };

export type Outcome = 'ongoing' | 'victory' | 'defeat' | 'fled';

const DEFEND_BONUS = 4;
const SLEEP_SUCCESS = 0.65;

/** "the Goblin", or the bare name for a unique monster ("Malachar the Plucker"). */
const withArticle = (def: MonsterDef, name = def.name): string => (def.unique ? name : `the ${name}`);
const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

export class Battle {
  readonly groups: MonsterGroup[];
  outcome: Outcome = 'ongoing';
  round = 1;
  xpEarned = 0;
  goldEarned = 0;
  private partyBuff = { amount: 0, turns: 0 };

  constructor(
    readonly party: Character[],
    specs: EncounterSpec[],
    private readonly rng: Rng = gameRng,
  ) {
    this.groups = specs.map((s) => {
      const def = content.monster(s.monster);
      return {
        def,
        distance: s.distance ?? 0,
        members: Array.from({ length: s.count }, () => {
          const hp = Math.max(1, this.rng.roll(def.hp));
          return { hp, maxHp: hp, asleep: 0 };
        }),
      };
    });
  }

  // ---- Queries -------------------------------------------------------------

  /** Defense bonus the whole party currently has from spells. */
  get partyDefenseBonus(): number {
    return this.partyBuff.amount;
  }

  liveMembers(group: MonsterGroup): MonsterInstance[] {
    return group.members.filter((m) => m.hp > 0);
  }

  liveGroupIndexes(): number[] {
    return this.groups.flatMap((g, i) => (this.liveMembers(g).length > 0 ? [i] : []));
  }

  groupName(index: number): string {
    const g = this.groups[index];
    return this.liveMembers(g).length > 1 ? g.def.plural : g.def.name;
  }

  /** Groups a character can currently strike with a weapon attack. */
  reachableGroups(c: Character): number[] {
    const ranged = weaponOf(c)?.ranged ?? false;
    const inFront = this.party.indexOf(c) < FRONT_ROW_SIZE;
    return this.liveGroupIndexes().filter((i) =>
      ranged ? true : inFront && this.groups[i].distance === 0,
    );
  }

  // ---- Round resolution ----------------------------------------------------

  /** Resolves one full round. Characters without an order defend. */
  resolveRound(orders: Map<string, Order>): BattleEvent[] {
    const events: BattleEvent[] = [];
    const defending = new Set<string>();
    const actors: { init: number; act: () => void }[] = [];

    for (const c of this.party) {
      if (!isAlive(c)) continue;
      const order = orders.get(c.id) ?? { kind: 'defend' as const };
      if (order.kind === 'defend') defending.add(c.id);
      actors.push({
        init: this.rng.int(1, 20) + mod(c.stats.dex),
        act: () => this.partyAct(c, order, events),
      });
    }
    this.groups.forEach((g, gi) => {
      for (const m of g.members) {
        actors.push({
          init: this.rng.int(1, 20) + g.def.speed,
          act: () => this.monsterAct(gi, m, defending, events),
        });
      }
    });

    actors.sort((a, b) => b.init - a.init);
    for (const actor of actors) {
      if (this.outcome !== 'ongoing') break;
      actor.act();
      this.checkEnd(events);
    }
    if (this.outcome === 'ongoing') this.endRound(events);
    return events;
  }

  private endRound(events: BattleEvent[]): void {
    this.round += 1;
    for (const g of this.groups) {
      for (const m of g.members) if (m.asleep > 0) m.asleep -= 1;
    }
    if (this.partyBuff.turns > 0 && --this.partyBuff.turns === 0) this.partyBuff.amount = 0;
    this.groups.forEach((g, i) => {
      const live = this.liveMembers(g);
      const closes = live.some((m) => m.asleep === 0) && !g.def.attacks.some((a) => a.ranged);
      if (g.distance > 0 && live.length > 0 && closes) {
        g.distance -= 1;
        const verb = live.length > 1 ? 'close' : 'closes';
        if (g.distance === 0) events.push({ text: `${capitalize(withArticle(g.def, this.groupName(i)))} ${verb} in!` });
      }
    });
  }

  private checkEnd(events: BattleEvent[]): void {
    if (this.liveGroupIndexes().length === 0) {
      this.outcome = 'victory';
    } else if (!this.party.some(isAlive)) {
      this.outcome = 'defeat';
      events.push({ text: 'Your party has fallen. The dungeon is unimpressed.' });
    }
  }

  // ---- Party actions -------------------------------------------------------

  private partyAct(c: Character, order: Order, events: BattleEvent[]): void {
    if (!isAlive(c)) return;
    switch (order.kind) {
      case 'defend':
        events.push({ text: `${c.name} braces for impact.` });
        return;
      case 'attack':
        return this.attack(c, order.group, events);
      case 'cast':
        return this.cast(c, order, events);
      case 'item':
        return this.useItem(c, order.itemId, order.ally, events);
      case 'run':
        return this.run(c, events);
    }
  }

  private attack(c: Character, wanted: number, events: BattleEvent[]): void {
    const reachable = this.reachableGroups(c);
    if (reachable.length === 0) {
      events.push({ text: `${c.name} has nothing within reach.` });
      return;
    }
    const gi = reachable.includes(wanted) ? wanted : reachable[0];
    const group = this.groups[gi];
    const target = this.rng.pick(this.liveMembers(group));
    const weapon = weaponOf(c);
    const roll = this.rng.int(1, 20);
    const sleeping = target.asleep > 0;
    const hit = sleeping || roll === 20 || (roll !== 1 && roll + toHit(c) >= 10 + group.def.def);
    if (!hit) {
      events.push({ text: `${c.name} swings at ${withArticle(group.def)} and misses.`, sfx: 'miss' });
      return;
    }
    const strength = weapon?.ranged ? 0 : mod(c.stats.str);
    const crit = roll === 20;
    let damage = Math.max(1, this.rng.roll(weaponDice(c)) + strength);
    if (crit) damage *= 2;
    events.push({
      text: `${c.name} ${crit ? 'critically ' : ''}hits ${withArticle(group.def)} for ${damage}.`,
      sfx: crit ? 'crit' : 'hit',
      fx: { kind: 'hit', group: gi, target, amount: damage, crit },
    });
    this.damageMonster(group, target, damage, events);
  }

  private damageMonster(
    group: MonsterGroup,
    target: MonsterInstance,
    damage: number,
    events: BattleEvent[],
  ): void {
    target.hp -= damage;
    target.asleep = 0;
    if (target.hp > 0) return;
    this.xpEarned += group.def.xp;
    this.goldEarned += Math.max(0, this.rng.roll(group.def.gold));
    events.push({
      text: `${capitalize(withArticle(group.def))} is defeated!`,
      sfx: 'monsterDeath',
      fx: { kind: 'death', group: this.groups.indexOf(group), target },
    });
  }

  private cast(c: Character, order: Extract<Order, { kind: 'cast' }>, events: BattleEvent[]): void {
    const spell = content.spell(order.spell);
    if (!canCast(c, spell)) {
      events.push({ text: `${c.name} fumbles the words of ${spell.name}. Nothing happens.` });
      return;
    }
    c.sp -= spell.cost;
    const e = spell.effect;

    if (e.kind === 'heal') {
      const ally = this.party.find((p) => p.id === order.ally && isAlive(p)) ?? c;
      const healed = applyHeal(ally, rollSpellDice(c, spell, this.rng));
      events.push({
        text: `${c.name} casts ${spell.name}: ${ally.name} recovers ${healed} HP.`,
        sfx: 'heal',
        fx: { kind: 'heal', hero: ally.id, amount: healed },
      });
      return;
    }
    if (e.kind === 'defense') {
      // Defense spells don't stack, and a weaker one must not replace a stronger one.
      if (e.amount < this.partyBuff.amount) {
        events.push({ text: `${c.name} casts ${spell.name}, but a stronger ward already protects the party.`, sfx: 'spell' });
        return;
      }
      const sameStrength = e.amount === this.partyBuff.amount;
      this.partyBuff = { amount: e.amount, turns: sameStrength ? Math.max(e.turns, this.partyBuff.turns) : e.turns };
      events.push({ text: `${c.name} casts ${spell.name}. The party feels sturdier!`, sfx: 'spell', fx: { kind: 'ward', spell: spell.id } });
      return;
    }

    const targets = this.spellTargets(spell.target, order.group);
    if (targets.length === 0) {
      events.push({ text: `${c.name} casts ${spell.name} at thin air.`, sfx: 'spell' });
      return;
    }
    const struck = [...new Set(targets.map((t) => this.groups.indexOf(t.group)))];
    events.push({ text: `${c.name} casts ${spell.name}!`, sfx: 'spell', fx: { kind: 'cast', spell: spell.id, groups: struck } });
    if (e.kind === 'sleep') {
      let slept = 0;
      for (const { member } of targets) {
        if (this.rng.chance(SLEEP_SUCCESS)) {
          member.asleep = e.turns;
          slept += 1;
        }
      }
      const dozed = slept === 1 ? '1 enemy dozes off.' : `${slept} enemies doze off.`;
      events.push({ text: slept > 0 ? dozed : 'Nobody is sleepy.' });
      return;
    }
    for (const { group, member } of targets) {
      const damage = Math.max(1, rollSpellDice(c, spell, this.rng));
      events.push({
        text: `${capitalize(withArticle(group.def))} takes ${damage}.`,
        sfx: 'hit',
        fx: { kind: 'hit', group: this.groups.indexOf(group), target: member, amount: damage },
      });
      this.damageMonster(group, member, damage, events);
    }
  }

  private spellTargets(
    kind: string,
    groupIndex: number | undefined,
  ): { group: MonsterGroup; member: MonsterInstance }[] {
    const live = this.liveGroupIndexes();
    const gi = groupIndex !== undefined && live.includes(groupIndex) ? groupIndex : live[0];
    if (gi === undefined) return [];
    if (kind === 'enemy') {
      const group = this.groups[gi];
      return [{ group, member: this.rng.pick(this.liveMembers(group)) }];
    }
    const groups = kind === 'allEnemies' ? live.map((i) => this.groups[i]) : [this.groups[gi]];
    return groups.flatMap((group) => this.liveMembers(group).map((member) => ({ group, member })));
  }

  private useItem(c: Character, itemId: string, allyId: string, events: BattleEvent[]): void {
    const at = c.inventory.indexOf(itemId);
    const item = content.item(itemId);
    if (at < 0 || !item.use) {
      events.push({ text: `${c.name} rummages and finds nothing useful.` });
      return;
    }
    const ally = this.party.find((p) => p.id === allyId && isAlive(p)) ?? c;
    c.inventory.splice(at, 1);
    const restored = applyItemUse(ally, item.use);
    const what = item.use.kind === 'heal' ? 'HP' : 'SP';
    events.push({
      text: `${c.name} uses ${item.name} on ${ally.name}: +${restored} ${what}.`,
      sfx: 'heal',
      fx: { kind: 'heal', hero: ally.id, amount: restored },
    });
  }

  private run(c: Character, events: BattleEvent[]): void {
    const odds = 0.5 + 0.05 * mod(c.stats.dex) + 0.05 * mod(c.stats.lck);
    if (this.rng.chance(odds)) {
      this.outcome = 'fled';
      events.push({ text: `${c.name} yells "RUN!" and the party bolts.` });
    } else {
      events.push({ text: `${c.name} tries to flee but trips over a bootlace.` });
    }
  }

  // ---- Monster actions -----------------------------------------------------

  private monsterAct(
    gi: number,
    m: MonsterInstance,
    defending: Set<string>,
    events: BattleEvent[],
  ): void {
    const group = this.groups[gi];
    if (m.hp <= 0 || m.asleep > 0) return;
    for (let i = 0; i < (group.def.actions ?? 1); i++) {
      const attack = this.rng.pick(group.def.attacks);
      if (group.distance > 0 && !attack.ranged) return;
      this.monsterAttack(gi, attack, defending, events);
      if (!this.party.some(isAlive)) return;
    }
  }

  private monsterAttack(gi: number, attack: MonsterAttack, defending: Set<string>, events: BattleEvent[]): void {
    const def = this.groups[gi].def;
    const alive = this.party.filter(isAlive);
    let targets: Character[];
    if (attack.all) {
      targets = alive;
    } else {
      const front = alive.filter((c) => this.party.indexOf(c) < FRONT_ROW_SIZE);
      const pool = !attack.ranged && front.length > 0 ? front : alive;
      targets = [this.rng.pick(pool)];
    }
    for (const t of targets) {
      const armor =
        defense(t) + this.partyBuff.amount + (defending.has(t.id) ? DEFEND_BONUS : 0);
      const roll = this.rng.int(1, 20);
      const hit = roll === 20 || (roll !== 1 && roll + def.toHit >= 10 + armor);
      if (!hit) {
        events.push({
          text: `${capitalize(withArticle(def))} ${attack.verb} ${t.name} but misses.`,
          sfx: 'miss',
          fx: { kind: 'monsterMiss', group: gi },
        });
        continue;
      }
      const damage = Math.max(1, this.rng.roll(attack.dice));
      t.hp = Math.max(0, t.hp - damage);
      events.push({
        text: `${capitalize(withArticle(def))} ${attack.verb} ${t.name} for ${damage}.`,
        sfx: 'monsterHit',
        fx: { kind: 'partyHit', group: gi, hero: t.id, amount: damage },
      });
      if (t.hp === 0) events.push({ text: `${t.name} collapses.`, sfx: 'death' });
    }
  }

  // ---- Aftermath -----------------------------------------------------------

  /** Splits XP among survivors after a victory. The caller awards the gold. */
  awardExperience(): BattleEvent[] {
    const survivors = this.party.filter(isAlive);
    if (survivors.length === 0) return [];
    const share = Math.max(1, Math.floor(this.xpEarned / survivors.length));
    const events: BattleEvent[] = [
      { text: `Victory! ${share} XP each and ${this.goldEarned} gold.` },
    ];
    for (const c of survivors) {
      for (const text of addXp(c, share, this.rng)) events.push({ text, sfx: 'levelup' });
    }
    return events;
  }
}
