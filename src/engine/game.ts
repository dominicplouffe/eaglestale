import type { Character } from '../rules/types';
import { deserialize, newGameState, partyMembers, serialize, type GameState } from '../rules/state';
import type { Audio } from './audio';
import type { LogStyle, Shell } from './shell';
import { renderPartyPanel } from '../ui/partyPanel';

export interface Screen {
  enter(game: Game): void;
  exit?(game: Game): void;
}

const SAVE_KEY = 'eagles-tale:save';

/** Ties together state, shell (DOM/canvas), audio and the active screen. */
export class Game {
  state: GameState = newGameState();
  private current: Screen | null = null;

  constructor(
    readonly shell: Shell,
    readonly audio: Audio,
  ) {}

  /** Leaves the current screen (resetting shared UI) and enters another. */
  go(screen: Screen): void {
    this.current?.exit?.(this);
    this.shell.setKeyHandler(null);
    this.shell.setOverlay(null);
    this.shell.setDraw(null);
    this.shell.minimap.hidden = true;
    this.shell.setMenu([]);
    this.current = screen;
    screen.enter(this);
    this.refreshParty();
  }

  get party(): Character[] {
    return partyMembers(this.state);
  }

  say(text: string, style: LogStyle = ''): void {
    this.shell.print(text, style);
  }

  refreshParty(activeId?: string): void {
    renderPartyPanel(this.shell.partyEl, this.party, activeId);
  }

  get hasSave(): boolean {
    return localStorage.getItem(SAVE_KEY) !== null;
  }

  save(): void {
    localStorage.setItem(SAVE_KEY, serialize(this.state));
  }

  load(): boolean {
    const raw = localStorage.getItem(SAVE_KEY);
    const loaded = raw ? deserialize(raw) : null;
    if (!loaded) return false;
    this.state = loaded;
    return true;
  }

  newGame(): void {
    this.state = newGameState();
  }
}
