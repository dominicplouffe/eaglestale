import { content } from '../content/registry';
import type { Game, Screen } from '../engine/game';
import { el, type MenuItem } from '../engine/shell';
import { VIEW_H, VIEW_W, renderDungeon } from '../gfx/dungeonView';
import { drawText } from '../gfx/font';
import { MAP_COLORS, drawMinimap } from '../gfx/minimap';
import { FRONT_ROW_SIZE, MAX_INVENTORY, isAlive, restoreFully } from '../rules/character';
import type { EncounterSpec } from '../rules/combat';
import { DIRS, isWalkable, levelKey, rollEncounter, specialKey, tileAt, turn } from '../rules/dungeon';
import { gameRng } from '../rules/rng';
import { movePartyMember, type DungeonPosition } from '../rules/state';
import type { DungeonLevel, Special } from '../rules/types';
import { openCharSheet } from '../ui/charSheet';
import { startBattle } from './combat';
import { partyWiped } from './flow';
import { townScreen } from './town';
import { victoryScreen } from './victory';

/** Fights that happen right after a step can't start until the party has walked a little. */
const MIN_STEPS_BETWEEN_FIGHTS = 4;
/** Pixel size of the full map's canvas (it is scaled down by CSS to fit). */
const BIG_MAP_PX = 480;
/** How long the camera takes to glide one square, to turn, and to nudge a wall. */
const STEP_MS = 150;
const TURN_MS = 130;
const BUMP_MS = 170;

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

  constructor(private readonly game: Game) {}

  private get pos(): DungeonPosition {
    return this.game.state.location as DungeonPosition;
  }

  private get level(): DungeonLevel {
    return content.dungeon(this.pos.dungeon).levels[this.pos.level];
  }

  start(): void {
    const { shell, audio } = this.game;
    audio.music('dungeon');
    this.explore();
    this.anim = null;
    this.queued = [];
    shell.setDraw((ctx, t) => {
      const cam = this.camera(performance.now());
      renderDungeon(ctx, { level: this.level, x: cam.x, y: cam.y, dir: this.pos.dir, angle: cam.angle }, t);
      drawText(ctx, DIRS[this.pos.dir].name, 5, VIEW_H - 13, { color: '#e8e2f4', outline: '#0e0a1c' });
      drawText(ctx, this.level.name, VIEW_W - 5, VIEW_H - 13, { color: '#e8e2f4', outline: '#0e0a1c', align: 'right' });
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
    shell.setLocation(`${content.dungeon(this.pos.dungeon).name} - ${this.level.name} (level ${this.pos.level + 1})`);
    shell.minimap.hidden = false;
    const set = new Set(this.game.state.explored[levelKey(this.pos.dungeon, this.pos.level)] ?? []);
    drawMinimap(shell.minimap, this.level, set, this.pos);
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
    this.game.shell.setMenu(
      [
        { key: 'w', label: 'Forward', action: () => this.step() },
        { key: 'a', label: 'Turn left', action: () => this.turn(-1) },
        { key: 'd', label: 'Turn right', action: () => this.turn(1) },
        { key: 's', label: 'Turn around', action: () => this.turn(2) },
        { key: 'e', label: 'Use stairs here', action: () => this.useStairs() },
        { key: 'c', label: 'Camp (party, save)', action: () => this.camp() },
      ],
      'Exploring',
    );
  }

  private turn(delta: number): void {
    const from = this.camera(performance.now());
    this.pos.dir = turn(this.pos.dir, delta);
    this.game.audio.sfx('ui');
    this.glide(from, delta === 2 ? TURN_MS * 1.5 : TURN_MS);
    this.refreshHud();
  }

  private step(): void {
    const { game } = this;
    const d = DIRS[this.pos.dir];
    const nx = this.pos.x + d.dx;
    const ny = this.pos.y + d.dy;
    const tile = tileAt(this.level, nx, ny);
    const from = this.camera(performance.now());
    if (!isWalkable(tile)) {
      game.audio.sfx('bump');
      this.glide(from, BUMP_MS, true);
      return;
    }
    this.pos.x = nx;
    this.pos.y = ny;
    this.glide(from, STEP_MS);
    game.audio.sfx(tile === '+' ? 'door' : 'step');
    this.explore();
    this.refreshHud();
    game.state.stepsSinceFight += 1;

    if (tile === '<' || tile === '>') return this.askStairs(tile);
    if (this.level.specials[tile]) return this.trigger(this.level.specials[tile], nx, ny);
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
    if (tile === '<' || tile === '>') this.askStairs(tile);
    else this.game.say('There are no stairs here.', 'dim');
  }

  private askStairs(tile: '<' | '>'): void {
    const goingUp = tile === '<';
    const toTown = goingUp && this.pos.level === 0;
    const question = toTown ? 'Climb back up to Talonreach?' : goingUp ? 'Climb the stairs up?' : 'Descend the stairs?';
    this.confirm(question, () => {
      this.game.audio.sfx('stairs');
      if (toTown) return this.game.go(townScreen);
      const dungeon = content.dungeon(this.pos.dungeon);
      const level = this.pos.level + (goingUp ? -1 : 1);
      const target = dungeon.levels[level];
      // Arrive on the matching staircase, facing away from it.
      const arriveOn = goingUp ? '>' : '<';
      let spot = target.start;
      target.grid.forEach((row, y) => {
        const x = row.indexOf(arriveOn);
        if (x >= 0) spot = { x, y, dir: this.openDirection(target, x, y) };
      });
      this.game.state.location = { dungeon: dungeon.id, level, ...spot };
      this.anim = null; // a new level: no gliding from the old spot
      this.game.say(`You arrive on ${target.name}.`, 'dim');
      this.explore();
      this.refreshHud();
    });
  }

  private openDirection(level: DungeonLevel, x: number, y: number): number {
    const found = DIRS.findIndex((d) => isWalkable(tileAt(level, x + d.dx, y + d.dy)));
    return found < 0 ? 0 : found;
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
        game.say(special.text, 'story');
        return;
      case 'fight':
        if (done) return;
        game.say(special.text, 'story');
        game.audio.sfx('encounter');
        this.fight(
          special.groups.map((g, i) => ({ monster: g.monster, count: g.count, distance: i === 0 ? 0 : 1 })),
          () => this.fightWon(special, flag),
        );
        return;
      case 'treasure':
        if (done) return;
        game.state.flags[flag] = true;
        game.say(special.text, 'story');
        this.award(special.gold, special.item);
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

  private award(gold?: number, itemId?: string): void {
    const { game } = this;
    if (gold) {
      game.state.gold += gold;
      game.say(`Found ${gold} gold.`, 'gold');
    }
    if (itemId) {
      const item = content.item(itemId);
      const carrier = game.party.find((c) => isAlive(c) && c.inventory.length < MAX_INVENTORY);
      if (carrier) {
        carrier.inventory.push(itemId);
        game.say(`${carrier.name} takes the ${item.name}.`, 'gold');
      } else game.say(`Everyone's pack is full, so the ${item.name} is left behind. Sad.`, 'bad');
    }
    game.audio.sfx('buy');
  }

  private fightWon(special: Extract<Special, { kind: 'fight' }>, flag: string): boolean {
    this.game.state.flags[flag] = true;
    this.award(special.reward?.gold, special.reward?.item);
    if (!special.finale) return false;
    this.game.state.won = true;
    this.game.go(victoryScreen);
    return true;
  }

  // ---- Combat & camp -------------------------------------------------------

  /** `onWin` returns true if it has already moved the game to another screen. */
  private fight(specs: EncounterSpec[], onWin: () => boolean): void {
    const { game } = this;
    game.state.stepsSinceFight = 0;
    game.audio.sfx('encounter');
    this.modal = true;
    startBattle(game, specs, this.level.theme, {
      onWin: () => {
        if (!onWin()) game.go(dungeonScreen);
      },
      onFlee: () => game.go(dungeonScreen),
      onDefeat: () => partyWiped(game),
    });
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
        action: () => openCharSheet(game, { onClose: () => { game.refreshParty(); back(); } }),
      },
      { key: 'f', label: 'Formation', action: () => this.formation() },
      { key: 'v', label: 'View map', action: () => this.bigMap() },
      { key: 's', label: 'Save game', action: () => { if (game.save()) game.say('Game saved.', 'good'); } },
      { key: 'b', label: 'Back to exploring', action: back },
    ];
    game.shell.setMenu(items, 'Camp');
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
    drawMinimap(canvas, this.level, explored, this.pos);
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
      key(MAP_COLORS.stairsUp, 'Stairs up'),
      key(MAP_COLORS.stairsDown, 'Stairs down'),
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
