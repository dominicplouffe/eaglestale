import { content } from '../content/registry';
import type { Game, Screen } from '../engine/game';
import { el, type MenuItem } from '../engine/shell';
import { artPixels } from '../gfx/art';
import { mixRGB, parseHex, toHex } from '../gfx/colors';
import { VIEW_H, VIEW_W, renderDungeon, type ViewSprite } from '../gfx/dungeonView';
import { drawText } from '../gfx/font';
import { MAP_COLORS, drawMinimap } from '../gfx/minimap';
import { FRONT_ROW_SIZE, isAlive, restoreFully } from '../rules/character';
import type { EncounterSpec } from '../rules/combat';
import { DIRS, areaAt, effectiveTile, isSpecialTile, isWalkable, levelKey, rollEncounter, specialKey, tileAt, turn } from '../rules/dungeon';
import { giveReward, lockedBecause, offerFeathers, questEvent, startQuest, useUpKey } from '../rules/quests';
import { gameRng } from '../rules/rng';
import { movePartyMember, type DungeonPosition } from '../rules/state';
import type { Assist, DungeonDef, DungeonLevel, PlaceId, Special } from '../rules/types';
import { openCharSheet } from '../ui/charSheet';
import { openJournal } from '../ui/journal';
import { startBattle } from './combat';
import { hasLivingParty, partyWiped } from './flow';
import { guildScreen } from './guild';
import { innScreen } from './inn';
import { chooseSaveSlot } from './saveMenu';
import { shopScreen } from './shop';
import { templeScreen } from './temple';
import { titleScreen } from './title';
import { victoryScreen } from './victory';

/** Fights that happen right after a step can't start until the party has walked a little. */
const MIN_STEPS_BETWEEN_FIGHTS = 4;
/** Pixel size of the full map's canvas (it is scaled down by CSS to fit). */
const BIG_MAP_PX = 480;
/** How long the camera takes to glide one square, to turn, and to nudge a wall. */
const STEP_MS = 150;
const TURN_MS = 130;
const BUMP_MS = 170;
/** How bright the streets are by day, however far away (the dungeons only have torchlight). */
const DAYLIGHT = 0.62;
/** The sky over Talonreach once every feather is home. */
const CLEAR_SKY = '#8cc8f0';

type Building = Extract<Special, { kind: 'building' }>;
type Portal = Extract<Special, { kind: 'portal' }>;
type Teleport = Extract<Special, { kind: 'teleport' }>;

/** Where every special square on a level is (worked out once per level). */
const squaresCache = new WeakMap<DungeonLevel, { x: number; y: number; special: Special }[]>();
function specialSquares(level: DungeonLevel): { x: number; y: number; special: Special }[] {
  let list = squaresCache.get(level);
  if (!list) {
    list = [];
    level.grid.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const special = isSpecialTile(row[x]) ? level.specials[row[x]] : undefined;
        if (special) list?.push({ x, y, special });
      }
    });
    squaresCache.set(level, list);
  }
  return list;
}

/** Where the party stands in town when they arrive there with nowhere in particular to be. */
export function cityStart(): DungeonPosition {
  const city = [...content.dungeons.values()].find((d) => d.city);
  if (!city) throw new Error('There is no city (a dungeon with city: true) in the content.');
  return { dungeon: city.id, level: 0, ...city.levels[0].start };
}

/**
 * Where the party comes out when they climb out of a dungeon: on the steps, grate or path they took
 * into it (in town or in another dungeon), or in the street outside the door they went in by.
 */
function exitFrom(dungeonId: string): DungeonPosition {
  for (const d of content.dungeons.values()) {
    for (const [li, level] of d.levels.entries()) {
      for (const { x, y, special } of specialSquares(level)) {
        if (special.kind === 'portal' && special.dungeon === dungeonId) return { dungeon: d.id, level: li, x, y, dir: openDirection(level, x, y) };
        if (special.kind === 'building' && special.dungeon === dungeonId) {
          const out = DIRS.findIndex((dir) => isWalkable(tileAt(level, x + dir.dx, y + dir.dy)));
          if (out >= 0) return { dungeon: d.id, level: li, x: x + DIRS[out].dx, y: y + DIRS[out].dy, dir: out };
        }
      }
    }
  }
  return cityStart();
}

function openDirection(level: DungeonLevel, x: number, y: number): number {
  const found = DIRS.findIndex((d) => isWalkable(tileAt(level, x + d.dx, y + d.dy)));
  return found < 0 ? 0 : found;
}

/** Quests whose finishing ends the game. */
const endingQuests = (): string[] => [...content.quests.values()].filter((q) => q.ending).map((q) => q.id);

const PLACES: Record<Exclude<PlaceId, 'tower'>, Screen> = { guild: guildScreen, shop: shopScreen, temple: templeScreen, inn: innScreen };

interface Camera {
  x: number;
  y: number;
  angle: number;
}

export const dungeonScreen: Screen = {
  enter(game: Game) {
    const view = new DungeonView(game);
    view.start();
  },
};

class DungeonView {
  private modal = false;
  /** The camera glides to the party's new square or facing; the rules have already moved on. */
  private anim: { from: Camera; to: Camera; start: number; ms: number; bump: boolean } | null = null;
  /** Moves pressed while the camera is still gliding run as soon as it arrives (up to two wait). */
  private queued: (() => void)[] = [];
  /** Secret walls a rogue has already pointed out this visit. */
  private hinted = new Set<string>();

  constructor(private readonly game: Game) {}

  private get pos(): DungeonPosition {
    return this.game.state.location as DungeonPosition;
  }

  private get dungeon(): DungeonDef {
    return content.dungeon(this.pos.dungeon);
  }

  private get level(): DungeonLevel {
    return this.dungeon.levels[this.pos.level];
  }

  /** In the streets of the town rather than a dungeon. */
  private get inCity(): boolean {
    return !!this.dungeon.city;
  }

  /** The street (or the level) the party is in, for the location bar and the view. */
  private get placeName(): string {
    return this.inCity ? (areaAt(this.level, this.pos.x, this.pos.y) ?? 'the streets') : this.level.name;
  }

  /** Whether the special at a square has been used (a lock opened, a secret found, a chest emptied). */
  private used = (x: number, y: number): boolean => !!this.game.state.flags[specialKey(this.pos.dungeon, this.pos.level, x, y)];

  /** The square as it is now: locks and secrets change as the party plays. */
  private at = (x: number, y: number): string => effectiveTile(this.level, x, y, this.used);

  private say(lines: string[], style: 'gold' | 'good' | 'story' | 'bad' | 'dim' = 'gold'): void {
    for (const line of lines) this.game.say(line, style);
  }

  /** Sets a story flag (if any) and lets the quests react. */
  private story(flag: string | undefined): void {
    if (flag) this.say(questEvent(this.game.state, { kind: 'flag', flag }));
  }

  start(): void {
    const { shell, audio } = this.game;
    audio.music(this.inCity ? 'town' : 'dungeon');
    this.explore();
    this.anim = null;
    this.queued = [];
    shell.setDraw((ctx, t) => {
      const cam = this.camera(performance.now());
      renderDungeon(
        ctx,
        {
          level: this.level,
          x: cam.x,
          y: cam.y,
          dir: this.pos.dir,
          angle: cam.angle,
          at: this.at,
          sprites: this.sprites(),
          sky: this.sky(),
          ascending: this.dungeon.ascending,
        },
        t,
        this.level.theme.sky ? (this.level.theme.light ?? DAYLIGHT) : 0,
      );
      drawText(ctx, DIRS[this.pos.dir].name, 5, VIEW_H - 13, { color: '#e8e2f4', outline: '#0e0a1c' });
      drawText(ctx, this.placeName, VIEW_W - 5, VIEW_H - 13, { color: '#e8e2f4', outline: '#0e0a1c', align: 'right' });
    });
    shell.setKeyHandler((e) => {
      const moves: Record<string, () => void> = {
        arrowup: () => this.step(),
        arrowleft: () => this.turn(-1),
        arrowright: () => this.turn(1),
        arrowdown: () => this.turn(2),
      };
      const action = moves[e.key.toLowerCase()];
      if (!action) return false;
      if (this.modal) return true;
      if (!this.anim) action();
      else if (this.queued.length < 2) this.queued.push(action);
      return true;
    });
    this.mainMenu();
    this.refreshHud();
  }

  /** People, undefeated foes and unopened chests, standing where they are. */
  private sprites(): ViewSprite[] {
    const out: ViewSprite[] = [];
    for (const { x, y, special } of specialSquares(this.level)) {
      let pixels: Uint32Array | null = null;
      let scale = 0.8;
      if (special.kind === 'talk' && special.look) {
        pixels = artPixels(special.look.art, special.look.palette);
        scale = 0.62;
      }
      else if (special.kind === 'fight' && !special.hidden && !this.used(x, y)) {
        const m = content.monster(special.groups[0].monster);
        pixels = artPixels(m.sprite, m.palette);
        scale = 0.9;
      } else if (special.kind === 'treasure' && !this.used(x, y)) {
        pixels = artPixels('chest');
        scale = 0.5;
      }
      if (pixels) out.push({ x, y, pixels, scale });
    }
    return out;
  }

  /** The city's sky clears as Aquila's feathers come home. */
  private sky(): string | undefined {
    const base = this.level.theme.sky;
    if (!base || !this.inCity) return base;
    const recovered = Math.min(1, this.game.state.offered / Math.max(1, content.feathers.size));
    return toHex(mixRGB(parseHex(base), parseHex(CLEAR_SKY), recovered));
  }

  /** Where to draw the camera now: easing toward the party's square and facing. */
  private camera(now: number): Camera {
    const target: Camera = { x: this.pos.x, y: this.pos.y, angle: this.pos.dir * (Math.PI / 2) };
    const a = this.anim;
    if (!a) return target;
    const p = Math.min(1, (now - a.start) / a.ms);
    if (p >= 1) {
      this.anim = null;
      const next = this.queued.shift();
      if (next && !this.modal) next();
      return target;
    }
    if (a.bump) {
      const push = Math.sin(p * Math.PI) * 0.12;
      return { x: a.to.x + Math.sin(a.to.angle) * push, y: a.to.y - Math.cos(a.to.angle) * push, angle: a.to.angle };
    }
    const e = 1 - (1 - p) * (1 - p);
    return { x: a.from.x + (a.to.x - a.from.x) * e, y: a.from.y + (a.to.y - a.from.y) * e, angle: a.from.angle + (a.to.angle - a.from.angle) * e };
  }

  /** Starts the camera gliding from `from` (where it was before the move) to the party's square and facing. */
  private glide(from: Camera, ms: number, bump = false): void {
    const now = performance.now();
    const to: Camera = { x: this.pos.x, y: this.pos.y, angle: this.pos.dir * (Math.PI / 2) };
    // Turn the short way round.
    let da = to.angle - from.angle;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    to.angle = from.angle + da;
    this.anim = { from, to, start: now, ms, bump };
  }

  private refreshHud(): void {
    const { shell } = this.game;
    shell.setLocation(
      this.inCity ? `${this.dungeon.name} - ${this.placeName}` : `${this.dungeon.name} - ${this.level.name} (level ${this.pos.level + 1})`,
    );
    shell.minimap.hidden = false;
    const set = new Set(this.game.state.explored[levelKey(this.pos.dungeon, this.pos.level)] ?? []);
    drawMinimap(shell.minimap, this.level, set, this.pos, this.at);
  }

  /** Records the tile underfoot and its neighbours (so walls show up) on the auto-map. */
  private explore(): void {
    const key = levelKey(this.pos.dungeon, this.pos.level);
    const set = new Set(this.game.state.explored[key] ?? []);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) set.add(`${this.pos.x + dx},${this.pos.y + dy}`);
    this.game.state.explored[key] = [...set];
  }

  private mainMenu(): void {
    this.modal = false;
    const walk: MenuItem[] = [
      { key: 'w', label: 'Forward', action: () => this.step() },
      { key: 'a', label: 'Turn left', action: () => this.turn(-1) },
      { key: 'd', label: 'Turn right', action: () => this.turn(1) },
      { key: 's', label: 'Turn around', action: () => this.turn(2) },
    ];
    if (this.inCity) {
      this.game.shell.setMenu(
        [
          ...walk,
          { key: 'e', label: 'Go down here', action: () => this.useStairs() },
          { key: 'g', label: 'Go to...', action: () => this.goTo() },
          { key: 'j', label: 'Journal', action: () => this.journal() },
          { key: 'c', label: 'Party, save', action: () => this.camp() },
          { key: 'q', label: 'Quit to title', action: () => this.quit() },
        ],
        `Gold: ${this.game.state.gold}`,
      );
      return;
    }
    this.game.shell.setMenu(
      [
        ...walk,
        { key: 'e', label: 'Use stairs here', action: () => this.useStairs() },
        { key: 'j', label: 'Journal', action: () => this.journal() },
        { key: 'c', label: 'Camp (party, save)', action: () => this.camp() },
      ],
      'Exploring',
    );
  }

  private quit(): void {
    this.game.autosave();
    this.game.go(titleScreen);
  }

  private turn(delta: number): void {
    const from = this.camera(performance.now());
    this.pos.dir = turn(this.pos.dir, delta);
    this.game.audio.sfx('ui');
    this.glide(from, delta === 2 ? TURN_MS * 1.5 : TURN_MS);
    this.refreshHud();
    this.senseSecret();
  }

  /** A rogue notices a draught from a secret wall straight ahead. */
  private senseSecret(): void {
    const d = DIRS[this.pos.dir];
    const x = this.pos.x + d.dx;
    const y = this.pos.y + d.dy;
    const special = this.level.specials[tileAt(this.level, x, y)];
    const key = `${this.pos.level}:${x},${y}`;
    if (special?.kind !== 'secret' || this.used(x, y) || this.hinted.has(key)) return;
    const rogue = this.game.party.find((c) => isAlive(c) && c.classId === 'rogue');
    if (!rogue) return;
    this.hinted.add(key);
    this.game.say(`${rogue.name} feels a draught from the wall ahead.`, 'gold');
  }

  private journal(): void {
    this.modal = true;
    openJournal(this.game, () => this.start());
  }

  private step(): void {
    const { game } = this;
    const d = DIRS[this.pos.dir];
    const nx = this.pos.x + d.dx;
    const ny = this.pos.y + d.dy;
    const raw = tileAt(this.level, nx, ny);
    const special = this.level.specials[raw];
    const flag = specialKey(this.pos.dungeon, this.pos.level, nx, ny);
    const tile = this.at(nx, ny);
    const from = this.camera(performance.now());
    const opening = !isWalkable(tile);
    if (special?.kind === 'building') return this.enterBuilding(special, from);
    if (opening) {
      if (special?.kind === 'secret') {
        // Walking into a secret wall finds it.
        game.state.flags[flag] = true;
        game.say(special.text, 'gold');
      } else if (special?.kind === 'lock') {
        const why = lockedBecause(game.state, special);
        if (why) {
          game.say(`${special.text} ${why}`, 'dim');
          game.audio.sfx('bump');
          this.glide(from, BUMP_MS, true);
          return;
        }
        game.state.flags[flag] = true;
        game.say(special.opened, 'gold');
        const left = useUpKey(game.state, special.key);
        if (left) game.say(left, 'dim');
      } else {
        game.audio.sfx('bump');
        this.glide(from, BUMP_MS, true);
        return;
      }
    }
    this.pos.x = nx;
    this.pos.y = ny;
    this.glide(from, STEP_MS);
    game.audio.sfx(opening || tile === '+' ? 'door' : 'step');
    this.explore();
    this.refreshHud();
    this.senseSecret();
    game.state.stepsSinceFight += 1;

    if (raw === '<' || raw === '>') return this.askStairs(raw);
    if (special && special.kind !== 'lock' && special.kind !== 'secret') return this.trigger(special, nx, ny);
    if (this.inCity) return;
    if (
      game.state.stepsSinceFight >= MIN_STEPS_BETWEEN_FIGHTS &&
      gameRng.chance(this.level.encounterRate)
    ) {
      this.fight(rollEncounter(this.level, gameRng), () => false);
    }
  }

  // ---- Stairs --------------------------------------------------------------

  private useStairs(): void {
    const tile = tileAt(this.level, this.pos.x, this.pos.y);
    const special = this.level.specials[tile];
    if (tile === '<' || tile === '>') this.askStairs(tile);
    else if (special?.kind === 'portal') this.usePortal(special);
    else if (special?.kind === 'teleport') this.teleport(special);
    else this.game.say(this.inCity ? 'There is no way down here.' : 'There are no stairs here.', 'dim');
  }

  private askStairs(tile: '<' | '>'): void {
    // '<' always leads back toward the way out: up out of a dungeon, but down out of a tower.
    const goingUp = tile === '<';
    const tower = !!this.dungeon.ascending;
    const toTown = goingUp && this.pos.level === 0;
    const exit = toTown ? exitFrom(this.pos.dungeon) : null;
    const outside = exit ? content.dungeon(exit.dungeon) : null;
    // Out of doors (the Wood) there are paths, not stairs.
    const outdoors = !!this.level.theme.sky;
    const backTo = `Go back to ${outside?.levels[exit?.level ?? 0].name ?? 'the way out'}?`;
    const question = toTown
      ? outside?.city && !outdoors ? (tower ? 'Go back down to the street?' : 'Climb back up to Talonreach?') : backTo
      : outdoors ? (goingUp ? 'Go back the way you came?' : `Go on, deeper into ${this.dungeon.name}?`)
      : goingUp === !tower ? 'Climb the stairs up?' : 'Go down the stairs?';
    this.confirm(question, () => {
      this.game.audio.sfx('stairs');
      if (exit) {
        this.game.state.location = exit;
        this.game.go(dungeonScreen);
        return this.game.autosave();
      }
      const dungeon = this.dungeon;
      const level = this.pos.level + (goingUp ? -1 : 1);
      const target = dungeon.levels[level];
      // Arrive on the matching staircase, facing away from it.
      const arriveOn = goingUp ? '>' : '<';
      let spot = target.start;
      target.grid.forEach((row, y) => {
        const x = row.indexOf(arriveOn);
        if (x >= 0) spot = { x, y, dir: openDirection(target, x, y) };
      });
      this.game.state.location = { dungeon: dungeon.id, level, ...spot };
      this.anim = null; // a new level: no gliding from the old spot
      this.game.say(`You arrive on ${target.name}.`, 'dim');
      this.explore();
      this.refreshHud();
      this.game.autosave();
    });
  }

  // ---- The town ------------------------------------------------------------

  /** Walking into a front door: in you go (or someone shouts that they're closed). */
  private enterBuilding(b: Building, from: { x: number; y: number; angle: number }): void {
    const { game } = this;
    if (b.place === 'tower') return this.eagleTower();
    if (b.dungeon) return this.enterDungeon(b, from);
    if (!b.place) {
      game.say(b.text ?? `${b.name}: the door is locked.`, 'dim');
      game.audio.sfx('bump');
      this.glide(from, BUMP_MS, true);
      return;
    }
    // When the party comes back out, they face the street.
    this.pos.dir = turn(this.pos.dir, 2);
    game.audio.sfx('door');
    game.go(PLACES[b.place]);
  }

  /** Returning Aquila's feathers to the tower is how the city recovers. */
  private eagleTower(): void {
    const { game } = this;
    const endingDone = endingQuests().filter((id) => game.state.quests[id]?.status === 'done');
    const lines = offerFeathers(game.state);
    if (lines.length === 0) {
      game.say(
        game.state.offered === 0
          ? "The Eagle Tower's perch stands empty. Bring back Aquila's feathers and the city will remember how to hope."
          : 'The keepers of the tower nod at you. Every feather counts; bring the rest home.',
        'story',
      );
      return;
    }
    game.audio.sfx('levelup');
    game.say('You climb the Eagle Tower and lay the feathers on the empty perch. They glow, faintly at first.', 'story');
    for (const line of lines) game.say(line, 'gold');
    game.refreshParty();
    game.autosave();
    // The last feathers home: the story ends.
    if (endingDone.length < endingQuests().filter((id) => game.state.quests[id]?.status === 'done').length) return game.go(victoryScreen);
    this.mainMenu();
  }

  private usePortal(p: Portal): void {
    this.enterDungeon(p);
  }

  /**
   * Goes into a dungeon by a way in (steps, a grate, a tower's front door), if it is open and there is
   * a party able to go. Once a way with a flag has been used it stays open, and its story key is left behind.
   */
  private enterDungeon(way: Portal | Building, bumpFrom?: Camera): void {
    const { game } = this;
    const dungeonId = way.dungeon as string;
    const intro = way.kind === 'portal' ? way.text : (way.text ?? way.name);
    const open = !!way.flag && !!game.state.story[way.flag];
    const why = open ? null : lockedBecause(game.state, { key: way.key, feathers: way.feathers });
    if (why) {
      game.say(`${intro} ${why}`, 'dim');
      if (bumpFrom) {
        game.audio.sfx('bump');
        this.glide(bumpFrom, BUMP_MS, true);
      }
      return;
    }
    if (game.party.length === 0 || !hasLivingParty(game)) {
      game.say(game.party.length === 0 ? 'You need a party first. Visit the Guild to recruit heroes.' : 'Your whole party is dead. The Temple can help with that.', 'bad');
      game.audio.sfx('error');
      return;
    }
    game.say(way.kind === 'building' ? (way.opened ?? intro) : intro, 'story');
    const target = content.dungeon(dungeonId);
    const verb = target.city ? 'Go home to' : way.kind === 'building' ? 'Go into' : target.ascending ? 'Go up into' : 'Go down into';
    this.confirm(`${verb} ${target.name}?`, () => {
      game.audio.sfx('stairs');
      game.state.location = { dungeon: target.id, level: 0, ...target.levels[0].start };
      this.story(way.flag);
      const left = way.flag ? useUpKey(game.state, way.key) : null;
      game.go(dungeonScreen);
      game.say(`You arrive on ${target.levels[0].name}.`, 'dim');
      if (left) game.say(left, 'dim');
      game.autosave();
    });
  }

  /** A tube or lift: off to its other end, if it is working. */
  private teleport(t: Teleport): void {
    const { game } = this;
    if (t.flag && !game.state.story[t.flag]) {
      game.say(t.off ?? 'Nothing happens.', 'dim');
      return;
    }
    const levelIndex = t.level ?? this.pos.level;
    const target = this.dungeon.levels[levelIndex];
    const y = target.grid.findIndex((row) => row.includes(t.to));
    if (y < 0) return;
    const x = target.grid[y].indexOf(t.to);
    game.say(t.text, 'story');
    game.audio.sfx('stairs');
    const moved = levelIndex !== this.pos.level;
    game.state.location = { dungeon: this.pos.dungeon, level: levelIndex, x, y, dir: openDirection(target, x, y) };
    this.anim = null;
    this.queued = [];
    this.explore();
    this.refreshHud();
    if (moved) {
      game.say(`You arrive on ${target.name}.`, 'dim');
      game.autosave();
    }
  }

  /** The places the party can walk straight to: the ones everybody knows, and doors they have seen. */
  private knownPlaces(): { x: number; y: number; special: Building | Portal }[] {
    const explored = new Set(this.game.state.explored[levelKey(this.pos.dungeon, this.pos.level)] ?? []);
    const out: { x: number; y: number; special: Building | Portal }[] = [];
    for (const { x, y, special } of specialSquares(this.level)) {
      if (special.kind === 'portal' || (special.kind === 'building' && (special.place || special.dungeon))) {
        if (special.known || explored.has(`${x},${y}`)) out.push({ x, y, special });
      }
    }
    return out;
  }

  /** "Go to": walk straight to a known door (the streets are safe) and go in. */
  private goTo(): void {
    this.modal = true;
    const places = this.knownPlaces();
    const used = new Set(['b', ...places.map((p) => p.special.hotkey ?? '')]);
    const keyFor = (p: { special: Building | Portal }): string => {
      if (p.special.hotkey) return p.special.hotkey;
      const letters = p.special.name.toLowerCase().replace(/^the /, '').replace(/[^a-z]/g, '');
      const k = [...letters].find((c) => !used.has(c)) ?? [...'123456789'].find((c) => !used.has(c)) ?? '0';
      used.add(k);
      return k;
    };
    const toReturn = this.game.state.feathers.length - this.game.state.offered;
    const items: MenuItem[] = places.map((p) => ({
      key: keyFor(p),
      label: p.special.kind === 'building' && p.special.place === 'tower' && toReturn > 0 ? `${p.special.name} (${toReturn} to return)` : p.special.name,
      action: () => this.travel(p),
    }));
    items.push({ key: 'b', label: 'Back', action: () => this.mainMenu() });
    this.game.shell.setMenu(items, 'Go to...');
  }

  private travel(p: { x: number; y: number; special: Building | Portal }): void {
    const level = this.level;
    this.mainMenu();
    this.anim = null;
    this.queued = [];
    if (p.special.kind === 'portal') {
      Object.assign(this.pos, { x: p.x, y: p.y, dir: openDirection(level, p.x, p.y) });
      this.explore();
      this.refreshHud();
      return this.usePortal(p.special);
    }
    // Stand in the street outside the door, facing it.
    const d = DIRS.findIndex((dir) => isWalkable(this.at(p.x - dir.dx, p.y - dir.dy)));
    const dir = d < 0 ? 0 : d;
    Object.assign(this.pos, { x: p.x - DIRS[dir].dx, y: p.y - DIRS[dir].dy, dir });
    this.explore();
    this.refreshHud();
    this.enterBuilding(p.special, this.camera(performance.now()));
  }

  private confirm(question: string, yes: () => void): void {
    this.modal = true;
    this.game.say(question, 'gold');
    this.game.shell.setMenu(
      [
        { key: 'y', label: 'Yes', action: () => { this.mainMenu(); yes(); } },
        { key: 'n', label: 'No', action: () => this.mainMenu() },
      ],
      question,
    );
  }

  // ---- Special tiles -------------------------------------------------------

  private trigger(special: Special, x: number, y: number): void {
    const { game } = this;
    const flag = specialKey(this.pos.dungeon, this.pos.level, x, y);
    const done = !!game.state.flags[flag];
    switch (special.kind) {
      case 'message':
        game.say(done && special.after ? special.after : special.text, 'story');
        if (!done) {
          game.state.flags[flag] = true;
          this.story(special.flag);
        }
        return;
      case 'portal':
        return this.usePortal(special);
      case 'teleport':
        return this.teleport(special);
      case 'building':
        return;
      case 'talk': {
        const line = (text: string): string => (special.narrated ? text : `${special.name}: "${text}"`);
        if (done) {
          game.say(line(special.after), 'story');
          return;
        }
        game.state.flags[flag] = true;
        game.say(line(special.text), 'story');
        if (special.quest) this.say(startQuest(game.state, special.quest));
        this.story(special.flag);
        return;
      }
      case 'lock':
      case 'secret':
        return;
      case 'fight':
        if (done) return;
        game.say(special.text, 'story');
        game.audio.sfx('encounter');
        this.fight(
          special.groups.map((g) => ({ ...g })),
          () => this.fightWon(special, flag),
          special.assist,
        );
        return;
      case 'treasure':
        if (done) return;
        game.state.flags[flag] = true;
        game.say(special.text, 'story');
        this.say(giveReward(game.state, { gold: special.gold, item: special.item, feather: special.feather }));
        game.audio.sfx('buy');
        this.story(special.flag);
        // An item found might be one a quest is waiting for.
        this.say(questEvent(game.state, { kind: 'check' }));
        game.refreshParty();
        return;
      case 'trap': {
        if (done) return;
        game.state.flags[flag] = true;
        game.say(special.text, 'bad');
        const victim = gameRng.pick(game.party.filter(isAlive));
        const damage = Math.max(1, gameRng.roll(special.dice));
        victim.hp = Math.max(0, victim.hp - damage);
        game.audio.sfx(victim.hp === 0 ? 'death' : 'monsterHit');
        game.say(`${victim.name} takes ${damage} damage${victim.hp === 0 ? ' and falls over' : ''}.`, 'bad');
        game.refreshParty();
        if (!game.party.some(isAlive)) partyWiped(game);
        return;
      }
      case 'fountain':
        if (done) return;
        game.state.flags[flag] = true;
        game.say(special.text, 'good');
        for (const c of game.party.filter(isAlive)) restoreFully(c);
        game.audio.sfx('heal');
        game.refreshParty();
        return;
    }
  }

  private fightWon(special: Extract<Special, { kind: 'fight' }>, flag: string): boolean {
    this.game.state.flags[flag] = true;
    this.say(giveReward(this.game.state, special.reward));
    this.game.audio.sfx('buy');
    this.story(special.flag);
    if (!special.finale) return false;
    this.game.state.won = true;
    this.game.go(victoryScreen);
    return true;
  }

  // ---- Combat & camp -------------------------------------------------------

  /** `onWin` returns true if it has already moved the game to another screen. */
  private fight(specs: EncounterSpec[], onWin: () => boolean, assist?: Assist): void {
    const { game } = this;
    game.state.stepsSinceFight = 0;
    game.audio.sfx('encounter');
    this.modal = true;
    startBattle(
      game,
      specs,
      this.level.theme,
      {
        onWin: () => {
          if (!onWin()) game.go(dungeonScreen);
        },
        onFlee: () => game.go(dungeonScreen),
        onDefeat: () => partyWiped(game),
      },
      assist,
    );
  }

  private camp(): void {
    const { game } = this;
    this.modal = true;
    const back = (): void => {
      game.shell.setOverlay(null);
      game.shell.setKeyHandler(null);
      this.start();
    };
    const items: MenuItem[] = [
      {
        key: 'p',
        label: 'Party sheet',
        disabled: game.party.length === 0,
        action: () => openCharSheet(game, { onClose: () => { game.refreshParty(); back(); } }),
      },
      { key: 'f', label: 'Formation', disabled: game.party.length === 0, action: () => this.formation() },
      { key: 'v', label: 'View map', action: () => this.bigMap() },
      { key: 'j', label: 'Journal', action: () => openJournal(game, () => this.camp()) },
      { key: 's', label: 'Save game', action: () => chooseSaveSlot(game, () => this.camp()) },
      { key: 'b', label: 'Back to exploring', action: back },
    ];
    game.shell.setMenu(items, this.inCity ? 'Party, map, save' : 'Camp');
    game.shell.setKeyHandler((e) => {
      if (e.key === 'Escape') {
        // Esc closes the formation or map panel first, then leaves camp.
        if (game.shell.overlayOpen) game.shell.setOverlay(null);
        else back();
        return true;
      }
      return e.key.startsWith('Arrow');
    });
  }

  /** Lets the party swap places mid-dungeon, e.g. when the front row has fallen. */
  private formation(): void {
    const { game } = this;
    const render = (): void => {
      const root = el(
        'div',
        { class: 'panel' },
        el('h2', { text: 'Formation' }),
        el('div', { class: 'dim', text: 'The first three stand in the front row: only they can fight in melee, and they take most melee blows.' }),
      );
      const party = game.party;
      party.forEach((c, i) => {
        const move = (delta: -1 | 1): void => {
          movePartyMember(game.state, c.id, delta);
          render();
        };
        root.append(
          el(
            'div',
            { class: 'row' },
            el('span', { class: 'grow', text: `${i + 1}. ${c.name} - ${content.cls(c.classId).name}${isAlive(c) ? '' : ' (dead)'}` }),
            el('span', { class: 'dim', text: i < FRONT_ROW_SIZE ? 'front row' : 'back row' }),
            el('button', { class: 'btn small', text: 'Up', disabled: i === 0, onclick: () => move(-1) }),
            el('button', { class: 'btn small', text: 'Down', disabled: i === party.length - 1, onclick: () => move(1) }),
          ),
        );
      });
      root.append(el('div', { class: 'tabs' }, el('button', { class: 'btn', text: 'Done (Esc)', onclick: () => game.shell.setOverlay(null) })));
      game.shell.setOverlay(root);
      game.refreshParty();
    };
    render();
  }

  /** The auto-map at full size, with a legend. */
  private bigMap(): void {
    const { game } = this;
    const canvas = el('canvas', { class: 'bigmap' });
    canvas.width = BIG_MAP_PX;
    canvas.height = BIG_MAP_PX;
    const explored = new Set(game.state.explored[levelKey(this.pos.dungeon, this.pos.level)] ?? []);
    drawMinimap(canvas, this.level, explored, this.pos, this.at);
    const key = (color: string, label: string): HTMLElement => {
      const swatch = el('i', { class: 'swatch' });
      swatch.style.background = color;
      return el('span', {}, swatch, label);
    };
    const legend = el(
      'div',
      { class: 'legend' },
      key(MAP_COLORS.you, 'You'),
      key(MAP_COLORS.door, 'Door'),
      key(MAP_COLORS.stairsUp, this.dungeon.ascending ? 'Stairs down' : 'Stairs up'),
      key(MAP_COLORS.stairsDown, this.dungeon.ascending ? 'Stairs up' : 'Stairs down'),
      key(MAP_COLORS.special, 'Something of note'),
    );
    game.shell.setOverlay(
      el(
        'div',
        { class: 'panel' },
        el(
          'div',
          { class: 'row' },
          el('h2', { class: 'grow', text: `${this.level.name} - facing ${DIRS[this.pos.dir].name}` }),
          el('button', { class: 'btn small', text: 'Close (Esc)', onclick: () => game.shell.setOverlay(null) }),
        ),
        legend,
        canvas,
      ),
    );
  }
}
