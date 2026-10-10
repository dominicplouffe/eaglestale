import { content } from '../content/registry';
import type { Game, Screen } from '../engine/game';
import type { LogStyle, MenuItem } from '../engine/shell';
import { VIEW_H, VIEW_W } from '../gfx/dungeonView';
import { drawBattleBackdrop } from '../gfx/scenes';
import { drawSprite } from '../gfx/sprites';
import { isAlive, knownSpells } from '../rules/character';
import { Battle, type BattleEvent, type EncounterSpec, type Order } from '../rules/combat';
import { gameRng } from '../rules/rng';
import { canCast } from '../rules/spells';
import type { Character, DungeonTheme, SpellDef } from '../rules/types';

export interface BattleHooks {
  onWin: () => void;
  onFlee: () => void;
  onDefeat: () => void;
}

const EVENT_DELAY_MS = 420;
const SPRITE_PX = 16;
const MAX_STACK = 3;

/** Starts a battle against the given groups; `hooks` decide where the game goes afterwards. */
export function startBattle(game: Game, specs: EncounterSpec[], theme: DungeonTheme, hooks: BattleHooks): void {
  game.go(new CombatScreen(specs, theme, hooks));
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

class CombatScreen implements Screen {
  private battle!: Battle;
  private game!: Game;
  private orders = new Map<string, Order>();
  private queue: Character[] = [];
  private index = 0;
  /** Cleared when this screen is left, so pending animations stop. */
  private active = true;
  private fast = false;
  private shakeUntil = 0;

  constructor(
    private readonly specs: EncounterSpec[],
    private readonly theme: DungeonTheme,
    private readonly hooks: BattleHooks,
  ) {}

  enter(game: Game): void {
    this.game = game;
    this.battle = new Battle(game.party, this.specs, gameRng);
    game.audio.music('battle');
    game.shell.setLocation('Battle!');
    game.shell.setDraw((ctx, t) => this.draw(ctx, t));
    game.shell.setKeyHandler((e) => {
      if (e.key === ' ' || e.key === 'Enter') this.fast = true;
      return false;
    });
    const names = this.battle.groups.map((_, i) => this.groupLabel(i)).join(', ');
    game.say(`Battle! ${names} block your way.`, 'bad');
    this.beginRound();
  }

  exit(): void {
    this.active = false;
  }

  // ---- Drawing -------------------------------------------------------------

  private groupLabel(i: number): string {
    const g = this.battle.groups[i];
    const n = this.battle.liveMembers(g).length;
    return n > 1 ? `${n} ${g.def.plural}` : g.def.name;
  }

  private draw(ctx: CanvasRenderingContext2D, t: number): void {
    const shake = performance.now() < this.shakeUntil ? Math.round(Math.sin(t * 90) * 2) : 0;
    ctx.save();
    ctx.translate(shake, 0);
    drawBattleBackdrop(ctx, this.theme, t);
    const groups = this.battle.groups;
    const live = this.battle.liveGroupIndexes();
    const slot = VIEW_W / Math.max(1, live.length);
    live.forEach((gi, n) => {
      const g = groups[gi];
      const members = this.battle.liveMembers(g);
      const scale = Math.max(2, (live.length >= 3 ? 4 : 5) - g.distance);
      const cx = slot * n + slot / 2;
      const base = 112 - g.distance * 10;
      const shown = Math.min(members.length, MAX_STACK);
      for (let k = shown - 1; k >= 0; k--) {
        const bob = Math.round(Math.sin(t * 2.2 + gi + k) * 2);
        const x = cx - (SPRITE_PX * scale) / 2 + (k - (shown - 1) / 2) * 14 * (scale / 5);
        const y = base - SPRITE_PX * scale + k * -4 + bob;
        const m = members[k];
        drawSprite(ctx, g.def.sprite, x, m.asleep > 0 ? y + 4 : y, scale, g.def.palette ?? {}, k % 2 === 1);
        if (m.asleep > 0) {
          ctx.fillStyle = '#9ad8ff';
          ctx.font = 'bold 10px monospace';
          ctx.fillText('z', x + SPRITE_PX * scale - 8, y + 6 - ((t * 8) % 4));
        }
      }
      ctx.font = 'bold 9px monospace';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#000';
      const label = `${this.groupLabel(gi)}${g.distance > 0 ? ' (far)' : ''}`;
      const half = ctx.measureText(label).width / 2;
      const lx = Math.min(VIEW_W - half - 4, Math.max(half + 4, cx)) - half;
      ctx.strokeText(label, lx, base + 12);
      ctx.fillStyle = g.distance > 0 ? '#9a90b8' : '#e8e2f4';
      ctx.fillText(label, lx, base + 12);
    });
    ctx.restore();
    ctx.fillStyle = '#e8c34a';
    ctx.font = '9px monospace';
    ctx.fillText(`Round ${this.battle.round}`, 6, VIEW_H - 6);
  }

  // ---- Choosing orders -----------------------------------------------------

  private beginRound(): void {
    this.orders = new Map();
    this.queue = this.battle.party.filter(isAlive);
    this.index = 0;
    this.promptNext();
  }

  private promptNext(): void {
    if (!this.active) return;
    if (this.index >= this.queue.length) {
      void this.resolve();
      return;
    }
    this.game.refreshParty(this.queue[this.index].id);
    this.mainMenu(this.queue[this.index]);
  }

  private choose(c: Character, order: Order): void {
    this.orders.set(c.id, order);
    this.index += 1;
    this.promptNext();
  }

  private mainMenu(c: Character): void {
    const b = this.battle;
    const spells = knownSpells(c);
    const consumables = [...new Set(c.inventory)].filter((id) => content.item(id).use);
    const items: MenuItem[] = [
      {
        key: 'a',
        label: 'Attack',
        disabled: b.reachableGroups(c).length === 0,
        action: () => this.pickGroup(c, b.reachableGroups(c), (group) => this.choose(c, { kind: 'attack', group })),
      },
      {
        key: 'c',
        label: 'Cast a spell',
        disabled: spells.length === 0 || !spells.some((s) => canCast(c, s)),
        action: () => this.spellMenu(c, spells),
      },
      { key: 'd', label: 'Defend', action: () => this.choose(c, { kind: 'defend' }) },
      {
        key: 'i',
        label: 'Use an item',
        disabled: consumables.length === 0,
        action: () => this.itemMenu(c, consumables),
      },
      { key: 'r', label: 'Run', action: () => this.choose(c, { kind: 'run' }) },
    ];
    if (this.index > 0) {
      items.push({
        key: 'b',
        label: 'Back (change previous)',
        action: () => {
          this.index -= 1;
          this.promptNext();
        },
      });
    }
    const row = b.party.indexOf(c) < 3 ? 'front' : 'back';
    this.game.shell.setMenu(items, `${c.name} (${row} row) - HP ${c.hp}/${c.maxHp}${c.maxSp ? ` SP ${c.sp}` : ''}`);
  }

  private backItem(c: Character): MenuItem {
    return { key: 'b', label: 'Back', action: () => this.mainMenu(c) };
  }

  private pickGroup(c: Character, candidates: number[], done: (group: number) => void): void {
    if (candidates.length === 1) return done(candidates[0]);
    const items: MenuItem[] = candidates.map((gi, n) => ({
      key: String(n + 1),
      label: `${this.groupLabel(gi)}${this.battle.groups[gi].distance > 0 ? ' (far)' : ''}`,
      action: () => done(gi),
    }));
    items.push(this.backItem(c));
    this.game.shell.setMenu(items, 'Target which group?');
  }

  private pickAlly(c: Character, done: (allyId: string) => void): void {
    const items: MenuItem[] = this.battle.party.filter(isAlive).map((a, n) => ({
      key: String(n + 1),
      label: `${a.name}  HP ${a.hp}/${a.maxHp}`,
      action: () => done(a.id),
    }));
    items.push(this.backItem(c));
    this.game.shell.setMenu(items, 'Who?');
  }

  private spellMenu(c: Character, spells: SpellDef[]): void {
    const items: MenuItem[] = spells.map((s, n) => ({
      key: String(n + 1),
      label: `${s.name} (${s.cost} SP) - ${s.desc}`,
      disabled: !canCast(c, s),
      action: () => this.aimSpell(c, s),
    }));
    items.push(this.backItem(c));
    this.game.shell.setMenu(items, 'Cast which spell?');
  }

  private aimSpell(c: Character, spell: SpellDef): void {
    const cast = (extra: { group?: number; ally?: string }): void =>
      this.choose(c, { kind: 'cast', spell: spell.id, ...extra });
    switch (spell.target) {
      case 'enemy':
      case 'group':
        return this.pickGroup(c, this.battle.liveGroupIndexes(), (group) => cast({ group }));
      case 'ally':
        return this.pickAlly(c, (ally) => cast({ ally }));
      default:
        return cast({});
    }
  }

  private itemMenu(c: Character, itemIds: string[]): void {
    const items: MenuItem[] = itemIds.map((id, n) => ({
      key: String(n + 1),
      label: content.item(id).name,
      action: () => this.pickAlly(c, (ally) => this.choose(c, { kind: 'item', itemId: id, ally })),
    }));
    items.push(this.backItem(c));
    this.game.shell.setMenu(items, 'Use which item?');
  }

  // ---- Resolving a round ---------------------------------------------------

  private async play(events: BattleEvent[]): Promise<void> {
    const { game } = this;
    for (const e of events) {
      if (!this.active) return;
      const style: LogStyle = e.sfx === 'monsterHit' || e.sfx === 'death' ? 'bad' : e.sfx === 'levelup' ? 'gold' : '';
      game.say(e.text, style);
      if (e.sfx) game.audio.sfx(e.sfx);
      if (e.sfx === 'monsterHit' || e.sfx === 'crit') this.shakeUntil = performance.now() + 160;
      game.refreshParty();
      if (!this.fast) await sleep(EVENT_DELAY_MS);
    }
  }

  private async resolve(): Promise<void> {
    const { game, battle } = this;
    game.shell.setMenu([], 'The round unfolds...');
    this.fast = false;
    await this.play(battle.resolveRound(this.orders));
    if (!this.active) return;
    game.refreshParty();

    switch (battle.outcome) {
      case 'ongoing':
        this.beginRound();
        return;
      case 'victory':
        game.state.gold += battle.goldEarned;
        await this.play(battle.awardExperience());
        game.audio.sfx('victory');
        game.refreshParty();
        game.shell.setMenu([{ key: 'c', label: 'Continue', action: () => this.hooks.onWin() }], 'Victory!');
        return;
      case 'defeat':
        game.audio.sfx('defeat');
        game.shell.setMenu([{ key: 'c', label: 'Continue', action: () => this.hooks.onDefeat() }], 'Defeat...');
        return;
      case 'fled':
        game.shell.setMenu([{ key: 'c', label: 'Continue', action: () => this.hooks.onFlee() }], 'Escaped!');
        return;
    }
  }
}
