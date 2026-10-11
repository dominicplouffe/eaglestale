import { content } from '../content/registry';
import type { Game, Screen } from '../engine/game';
import { BATTLE_SPEEDS, battleSpeed } from '../engine/settings';
import type { LogStyle, MenuItem } from '../engine/shell';
import { ART_SIZE, artCanvas, hasArt } from '../gfx/art';
import { VIEW_H, VIEW_W, renderDungeon } from '../gfx/dungeonView';
import { drawText, textWidth } from '../gfx/font';
import { drawSprite } from '../gfx/sprites';
import { FRONT_ROW_SIZE, isAlive, knownSpells } from '../rules/character';
import {
  Battle,
  type BattleEvent,
  type BattleFx,
  type EncounterSpec,
  type MonsterGroup,
  type MonsterInstance,
  type Order,
} from '../rules/combat';
import { giveItem, questEvent } from '../rules/quests';
import { gameRng } from '../rules/rng';
import { canCast } from '../rules/spells';
import type { Character, DungeonLevel, DungeonTheme, SpellDef } from '../rules/types';

export interface BattleHooks {
  onWin: () => void;
  onFlee: () => void;
  onDefeat: () => void;
}

/** Up to this many members of a group are drawn; the label gives the full count. */
const MAX_STACK = 3;
/** Where groups stand and how big they're drawn, by distance (0 = melee range). */
const DEPTHS = [
  { base: 152, scale: 3 },
  { base: 130, scale: 2 },
  { base: 119, scale: 2 },
];
/** Members behind the front one stand this many art pixels to either side. */
const STACK_SPREAD = 9;
const FLASH_MS = 110;
const DEATH_MS = 520;
const LUNGE_MS = 200;
const FLOAT_MS = 900;
const CARD_FLASH_MS = 320;

/** The room battles are drawn in: a small hall in the level's own textures. */
const ARENA_GRID = ['#####', '#...#', '#...#', '#...#', '#####'];
const arenas = new WeakMap<DungeonTheme, DungeonLevel>();
function arenaFor(theme: DungeonTheme): DungeonLevel {
  let level = arenas.get(theme);
  if (!level) {
    level = { name: 'arena', grid: ARENA_GRID, start: { x: 2, y: 3, dir: 0 }, encounters: [], encounterRate: 0, specials: {}, theme };
    arenas.set(theme, level);
  }
  return level;
}

/** Starts a battle against the given groups; `hooks` decide where the game goes afterwards. */
export function startBattle(game: Game, specs: EncounterSpec[], theme: DungeonTheme, hooks: BattleHooks): void {
  game.go(new CombatScreen(specs, theme, hooks));
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** How a monster currently looks, which trails the rules while a round's events play out one by one. */
interface Shown {
  hp: number;
  flash?: number;
  dying?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
  gravity: number;
  glyph?: 'z' | 'note';
  /** Drawn three times taller than wide (falling ice). */
  streak?: boolean;
}

interface Floater {
  target: MonsterInstance;
  group: number;
  text: string;
  color: string;
  born: number;
}

/** A spell's look, waiting to be spawned where its target groups are drawn. */
interface PendingSpell {
  look: NonNullable<SpellDef['look']>;
  groups: number[];
}

/** A short-lived shape drawn over the scene, e.g. a lightning bolt or a beam of light. */
interface Flare {
  kind: 'bolt' | 'beam';
  x: number;
  y: number;
  born: number;
  ms: number;
}

const NOTE = ['.##', '.#.', '.#.', '##.', '##.'];

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
  private hurtFlash = 0;
  private lastT = 0;
  private shown = new Map<MonsterInstance, Shown>();
  private shownDistance: number[] = [];
  private lunges = new Map<number, number>();
  private particles: Particle[] = [];
  private floaters: Floater[] = [];
  private pendingSpells: PendingSpell[] = [];
  private flares: Flare[] = [];
  private heroFlash = new Map<string, { cls: 'hurt' | 'healed'; until: number }>();

  constructor(
    private readonly specs: EncounterSpec[],
    private readonly theme: DungeonTheme,
    private readonly hooks: BattleHooks,
  ) {}

  enter(game: Game): void {
    this.game = game;
    this.battle = new Battle(game.party, this.specs, gameRng);
    this.syncShown();
    game.audio.music('battle');
    game.shell.setLocation('Battle!');
    game.shell.setDraw((ctx, t) => this.draw(ctx, t));
    game.shell.setKeyHandler((e) => {
      if (e.key === ' ' || e.key === 'Enter') this.fast = true;
      return false;
    });
    const names = this.battle.groups.map((_, i) => this.groupLabel(i)).join(', ');
    const groups = this.battle.groups;
    const single = groups.length === 1 && groups[0].members.length === 1;
    game.say(`Battle! ${names} ${single ? 'blocks' : 'block'} your way.`, 'bad');
    this.beginRound();
  }

  exit(): void {
    this.active = false;
  }

  // ---- What is shown -------------------------------------------------------

  /** Catches the display up with the rules (start of battle, and before and after each round). */
  private syncShown(): void {
    for (const g of this.battle.groups) {
      for (const m of g.members) {
        const s = this.shown.get(m);
        this.shown.set(m, { ...s, hp: m.hp });
      }
    }
    this.shownDistance = this.battle.groups.map((g) => g.distance);
  }

  /**
   * Members still on screen: alive, or fading out. A monster whose last hit has played stays put until
   * its "defeated" message starts the fade (every kill is followed by one), so it never blinks out early.
   */
  private visibleMembers(g: MonsterGroup, now: number): MonsterInstance[] {
    return g.members.filter((m) => {
      const s = this.shown.get(m);
      return !!s && (s.dying === undefined || now - s.dying < DEATH_MS);
    });
  }

  private groupLabel(i: number): string {
    const g = this.battle.groups[i];
    const n = g.members.filter((m) => (this.shown.get(m)?.hp ?? m.hp) > 0).length;
    return n > 1 ? `${n} ${g.def.plural}` : g.def.name;
  }

  /** Re-renders the party panel, keeping any hurt/healed flash on the cards. */
  private refresh(activeId?: string): void {
    this.game.refreshParty(activeId);
    const now = performance.now();
    for (const [id, f] of this.heroFlash) {
      if (now > f.until) this.heroFlash.delete(id);
      else document.querySelector(`.party-card[data-id="${id}"]`)?.classList.add(f.cls);
    }
  }

  private flashCard(id: string, cls: 'hurt' | 'healed'): void {
    this.heroFlash.set(id, { cls, until: performance.now() + CARD_FLASH_MS });
    setTimeout(() => this.active && this.refresh(), CARD_FLASH_MS + 20);
  }

  private applyFx(fx: BattleFx): void {
    const now = performance.now();
    switch (fx.kind) {
      case 'hit': {
        const s = this.shown.get(fx.target);
        if (s) {
          s.hp -= fx.amount;
          s.flash = now;
        }
        this.floaters.push({
          target: fx.target,
          group: fx.group,
          text: fx.crit ? `${fx.amount}!` : String(fx.amount),
          color: fx.crit ? '#ffd870' : '#ffffff',
          born: now,
        });
        return;
      }
      case 'death': {
        const s = this.shown.get(fx.target);
        if (s) {
          s.hp = 0;
          s.dying = now;
        }
        return;
      }
      case 'cast': {
        const spell = content.spell(fx.spell);
        const look = spell.look ?? (spell.effect.kind === 'sleep' ? 'sleep' : 'bolt');
        this.pendingSpells.push({ look, groups: fx.groups });
        return;
      }
      case 'ward':
        this.pendingSpells.push({ look: content.spell(fx.spell).look ?? 'ward', groups: [] });
        return;
      case 'heal':
        this.pendingSpells.push({ look: 'heal', groups: [] });
        this.flashCard(fx.hero, 'healed');
        return;
      case 'partyHit':
        this.lunges.set(fx.group, now);
        this.hurtFlash = now;
        this.flashCard(fx.hero, 'hurt');
        return;
      case 'monsterMiss':
        this.lunges.set(fx.group, now);
        return;
    }
  }

  // ---- Drawing -------------------------------------------------------------

  private draw(ctx: CanvasRenderingContext2D, t: number): void {
    const now = performance.now();
    const dt = Math.min(0.05, Math.max(0, t - this.lastT));
    this.lastT = t;
    const shake = now < this.shakeUntil ? Math.round(Math.sin(t * 90) * 2) : 0;
    ctx.save();
    ctx.translate(shake, 0);
    const arena = arenaFor(this.theme);
    renderDungeon(ctx, { level: arena, x: arena.start.x, y: arena.start.y, dir: arena.start.dir }, t, 0.42);

    const groups = this.battle.groups;
    const visible = groups.map((_, gi) => gi).filter((gi) => this.visibleMembers(groups[gi], now).length > 0);
    const slot = VIEW_W / Math.max(1, visible.length);
    const centres = new Map<number, { x: number; y: number }>();
    const spots = new Map<MonsterInstance, { x: number; y: number }>();
    // Farther groups first, so nearer ones overlap them.
    const order = [...visible].sort((a, b) => (this.shownDistance[b] ?? 0) - (this.shownDistance[a] ?? 0));
    for (const gi of order) {
      const g = groups[gi];
      const far = (this.shownDistance[gi] ?? 0) > 0;
      const depth = DEPTHS[Math.min(DEPTHS.length - 1, this.shownDistance[gi] ?? 0)];
      // Three groups don't fit side by side at triple size.
      const scale = depth.scale === 3 && slot < 120 ? 2 : depth.scale;
      const members = this.visibleMembers(g, now).slice(0, MAX_STACK);
      const halfWidth = (ART_SIZE / 2 + (members.length > 1 ? STACK_SPREAD : 0)) * scale;
      const cx = Math.round(Math.min(VIEW_W - halfWidth, Math.max(halfWidth, slot * visible.indexOf(gi) + slot / 2)));
      const lunge = now - (this.lunges.get(gi) ?? -1e9);
      const lungeY = lunge < LUNGE_MS ? Math.round(Math.sin((lunge / LUNGE_MS) * Math.PI) * 3 * scale) : 0;
      // A soft shadow on the floor.
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(cx, depth.base, 11 * scale, 2.5 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let k = members.length - 1; k >= 0; k--) {
        const m = members[k];
        const s = this.shown.get(m) as Shown;
        const dx = [0, -STACK_SPREAD, STACK_SPREAD][k] * scale;
        const dy = k > 0 ? -3 * scale : 0;
        const bob = Math.round(Math.sin(t * 2.2 + gi * 1.7 + k) * 0.7 * scale);
        const x = cx - (ART_SIZE * scale) / 2 + dx;
        let y = depth.base - ART_SIZE * scale + dy + bob + lungeY + (m.asleep > 0 ? scale : 0);
        const dying = s.dying !== undefined ? (now - s.dying) / DEATH_MS : 0;
        const flash = (s.flash !== undefined && now - s.flash < FLASH_MS) || (dying > 0 && dying < 0.15);
        if (dying > 0) y += Math.round(dying * 5 * scale);
        ctx.globalAlpha = dying > 0 ? Math.max(0, 1 - dying) : 1;
        this.drawMonster(ctx, g, x, y, scale, { flip: k === 2, flash, dim: k > 0 || far });
        ctx.globalAlpha = 1;
        spots.set(m, { x: x + (ART_SIZE * scale) / 2, y: y + 6 * scale });
        if (m.asleep > 0 && dying === 0) {
          drawText(ctx, 'z', x + ART_SIZE * scale - 10, y + 2 - Math.floor((t * 8) % 4), { color: '#9ad8ff', outline: '#0e0a1c' });
        }
      }
      centres.set(gi, { x: cx, y: depth.base - 14 * scale });
      const label = `${this.groupLabel(gi)}${far ? ' (far)' : ''}`;
      const half = textWidth(label) / 2 + 3;
      drawText(ctx, label, Math.min(VIEW_W - half, Math.max(half, cx)), depth.base + 4, {
        color: far ? '#9a90b8' : '#e8e2f4',
        outline: '#0e0a1c',
        align: 'center',
      });
    }

    for (const p of this.pendingSpells.splice(0)) this.spawnSpell(p, centres, now);
    this.drawFlares(ctx, now);
    this.drawParticles(ctx, dt);
    this.drawFloaters(ctx, spots, centres, now);

    // A red flash along the bottom when the party is hurt.
    const hurt = now - this.hurtFlash;
    if (hurt < 220) {
      const a = 0.35 * (1 - hurt / 220);
      const grad = ctx.createLinearGradient(0, VIEW_H - 60, 0, VIEW_H);
      grad.addColorStop(0, 'rgba(200, 30, 40, 0)');
      grad.addColorStop(1, `rgba(200, 30, 40, ${a})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, VIEW_H - 60, VIEW_W, 60);
    }
    ctx.restore();
    drawText(ctx, `Round ${this.battle.round}`, 5, 4, { color: '#e8c34a', outline: '#0e0a1c' });
  }

  private drawMonster(
    ctx: CanvasRenderingContext2D,
    g: MonsterGroup,
    x: number,
    y: number,
    scale: number,
    style: { flip: boolean; flash: boolean; dim: boolean },
  ): void {
    if (hasArt(g.def.sprite)) {
      const img = artCanvas(g.def.sprite, { recolor: g.def.palette, flip: style.flip, flash: style.flash, dim: style.dim });
      if (img) ctx.drawImage(img, Math.round(x), Math.round(y), ART_SIZE * scale, ART_SIZE * scale);
      return;
    }
    // Content packs may still use the older 16x16 sprites.
    drawSprite(ctx, g.def.sprite, x, y, scale * 2, g.def.palette ?? {}, style.flip);
  }

  // ---- Effects -------------------------------------------------------------

  private spawn(p: Omit<Particle, 'max'>): void {
    this.particles.push({ ...p, max: p.life });
  }

  private spawnSpell(p: PendingSpell, centres: Map<number, { x: number; y: number }>, now: number): void {
    const rnd = (a: number, b: number): number => a + Math.random() * (b - a);
    const targets = p.groups.map((gi) => centres.get(gi)).filter((c): c is { x: number; y: number } => !!c);
    const partyWide = (colors: string[], count: number, rise: number): void => {
      for (let i = 0; i < count; i++) {
        this.spawn({ x: rnd(10, VIEW_W - 10), y: rnd(VIEW_H - 20, VIEW_H), vx: rnd(-6, 6), vy: -rnd(rise * 0.6, rise), life: rnd(0.6, 1.1), color: colors[i % colors.length], size: i % 3 === 0 ? 2 : 1, gravity: 0 });
      }
    };
    switch (p.look) {
      case 'heal':
        return partyWide(['#7cf09a', '#c8ffd0', '#3fbf6a'], 36, 70);
      case 'ward':
        return partyWide(['#ffd870', '#fff0a0', '#e8c34a'], 40, 55);
      default:
        break;
    }
    for (const c of targets) {
      switch (p.look) {
        case 'bolt':
          this.flares.push({ kind: 'bolt', x: c.x, y: c.y, born: now, ms: 180 });
          for (let i = 0; i < 18; i++) {
            const a = rnd(0, Math.PI * 2);
            this.spawn({ x: c.x, y: c.y, vx: Math.cos(a) * rnd(30, 90), vy: Math.sin(a) * rnd(30, 90), life: rnd(0.25, 0.5), color: i % 2 ? '#fff6c0' : '#ffd870', size: 1, gravity: 60 });
          }
          break;
        case 'fire':
          for (let i = 0; i < 46; i++) {
            this.spawn({ x: c.x + rnd(-26, 26), y: c.y + rnd(0, 34), vx: rnd(-8, 8), vy: -rnd(30, 80), life: rnd(0.45, 0.9), color: ['#ffd870', '#ffb060', '#d9803b', '#c43c3c'][i % 4], size: i % 3 ? 2 : 3, gravity: 0 });
          }
          break;
        case 'ice':
          for (let i = 0; i < 30; i++) {
            this.spawn({ x: c.x + rnd(-30, 30), y: rnd(-30, 10), vx: rnd(-10, 10), vy: rnd(150, 210), life: rnd(0.55, 0.85), color: ['#e8f8ff', '#9ad8ff', '#5ac8e0'][i % 3], size: i % 3 ? 2 : 3, gravity: 80, streak: true });
          }
          break;
        case 'holy':
          this.flares.push({ kind: 'beam', x: c.x, y: c.y, born: now, ms: 360 });
          for (let i = 0; i < 24; i++) {
            this.spawn({ x: c.x + rnd(-14, 14), y: c.y + rnd(-10, 30), vx: rnd(-10, 10), vy: -rnd(20, 50), life: rnd(0.5, 0.9), color: i % 2 ? '#fff0a0' : '#ffffff', size: 1, gravity: 0 });
          }
          break;
        case 'sleep':
        case 'song':
          for (let i = 0; i < 5; i++) {
            this.spawn({ x: c.x + rnd(-20, 20), y: c.y + rnd(-6, 10), vx: rnd(-6, 6), vy: -rnd(14, 24), life: rnd(1, 1.5), color: p.look === 'song' ? '#f0a0c0' : '#9ad8ff', size: 1, gravity: 0, glyph: p.look === 'song' ? 'note' : 'z' });
          }
          break;
      }
    }
  }

  private drawFlares(ctx: CanvasRenderingContext2D, now: number): void {
    this.flares = this.flares.filter((f) => now - f.born < f.ms);
    for (const f of this.flares) {
      const p = (now - f.born) / f.ms;
      if (f.kind === 'beam') {
        ctx.fillStyle = `rgba(255, 240, 170, ${0.45 * (1 - p)})`;
        ctx.fillRect(f.x - 12, 0, 24, f.y + 30);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.6 * (1 - p)})`;
        ctx.fillRect(f.x - 4, 0, 8, f.y + 30);
      } else {
        // A jagged bolt from the ceiling to the target, redrawn a little differently each frame.
        ctx.strokeStyle = p < 0.5 ? '#ffffff' : '#ffd870';
        ctx.lineWidth = 2;
        ctx.beginPath();
        let x = f.x + (Math.random() - 0.5) * 20;
        ctx.moveTo(x, 0);
        for (let y = 12; y < f.y; y += 12) {
          x += (Math.random() - 0.5) * 16;
          ctx.lineTo(Math.round(x), y);
        }
        ctx.lineTo(f.x, f.y);
        ctx.stroke();
      }
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D, dt: number): void {
    this.particles = this.particles.filter((p) => (p.life -= dt) > 0);
    for (const p of this.particles) {
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      ctx.globalAlpha = Math.min(1, (p.life / p.max) * 1.6);
      if (p.glyph === 'z') drawText(ctx, 'z', p.x, p.y, { color: p.color, outline: '#0e0a1c' });
      else if (p.glyph === 'note') {
        ctx.fillStyle = p.color;
        NOTE.forEach((row, ry) => [...row].forEach((ch, rx) => ch === '#' && ctx.fillRect(Math.round(p.x) + rx, Math.round(p.y) + ry, 1, 1)));
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.streak ? p.size * 3 : p.size);
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawFloaters(
    ctx: CanvasRenderingContext2D,
    spots: Map<MonsterInstance, { x: number; y: number }>,
    centres: Map<number, { x: number; y: number }>,
    now: number,
  ): void {
    this.floaters = this.floaters.filter((f) => now - f.born < FLOAT_MS);
    for (const f of this.floaters) {
      const at = spots.get(f.target) ?? centres.get(f.group);
      if (!at) continue;
      const p = (now - f.born) / FLOAT_MS;
      ctx.globalAlpha = p > 0.65 ? (1 - p) / 0.35 : 1;
      drawText(ctx, f.text, at.x, at.y - Math.round(p * 16), { color: f.color, outline: '#0e0a1c', align: 'center' });
    }
    ctx.globalAlpha = 1;
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
    this.refresh(this.queue[this.index].id);
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
    const row = b.party.indexOf(c) < FRONT_ROW_SIZE ? 'front' : 'back';
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

  /** For spells that bring heroes back: only the fallen are offered. */
  private pickFallen(c: Character, done: (allyId: string) => void): void {
    const fallen = this.battle.party.filter((a) => !isAlive(a));
    const items: MenuItem[] = fallen.map((a, n) => ({ key: String(n + 1), label: a.name, action: () => done(a.id) }));
    items.push(this.backItem(c));
    this.game.shell.setMenu(items, fallen.length ? 'Bring back whom?' : 'Nobody has fallen.');
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
    // Keys 1-9, then 0, then letters (B is Back).
    const keys = [...'1234567890acdefghijklmnopqrstuvwxyz'];
    const items: MenuItem[] = spells.map((s, n) => ({
      key: keys[n],
      label: `${s.name} (${s.cost})`,
      hint: s.desc,
      disabled: !canCast(c, s),
      action: () => this.aimSpell(c, s),
    }));
    items.push(this.backItem(c));
    this.game.shell.setMenu(items, 'Cast which spell? (SP cost)');
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
      case 'fallen':
        return this.pickFallen(c, (ally) => cast({ ally }));
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
      if (e.fx) this.applyFx(e.fx);
      this.refresh();
      // Read each time, so changing the speed mid-battle takes effect at once.
      const delay = BATTLE_SPEEDS[battleSpeed()];
      if (!this.fast && delay > 0) await sleep(delay);
    }
  }

  private async resolve(): Promise<void> {
    const { game, battle } = this;
    game.shell.setMenu([], 'The round unfolds...');
    this.fast = false;
    this.syncShown();
    await this.play(battle.resolveRound(this.orders));
    if (!this.active) return;
    this.syncShown();
    this.refresh();

    switch (battle.outcome) {
      case 'ongoing':
        this.beginRound();
        return;
      case 'victory': {
        game.state.gold += battle.goldEarned;
        await this.play(battle.awardExperience());
        // Spoils and quest progress: dropped items, then kills counted toward any quests.
        for (const item of battle.loot()) game.say(giveItem(game.state, item), 'gold');
        for (const [monster, count] of Object.entries(battle.kills)) {
          for (const line of questEvent(game.state, { kind: 'kill', monster, count })) game.say(line, 'gold');
        }
        for (const line of questEvent(game.state, { kind: 'check' })) game.say(line, 'gold');
        game.audio.sfx('victory');
        this.refresh();
        game.shell.setMenu([{ key: 'c', label: 'Continue', action: () => this.hooks.onWin() }], 'Victory!');
        return;
      }
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
