import type { Character } from '../rules/types';
import { deserialize, newGameState, partyMembers, serialize, type GameState } from '../rules/state';
import type { Audio } from './audio';
import type { LogStyle, Shell } from './shell';
import { inspectPanel } from '../ui/inspect';
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
  /** Id of the hero whose details are open (clicked in the party panel). */
  private inspecting: string | null = null;

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
    this.inspect(null);
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
    renderPartyPanel(this.shell.partyEl, this.party, activeId, (id) =>
      this.inspect(this.inspecting === id ? null : id),
    );
    // Keep an open detail panel in step with HP, gear and level changes.
    if (this.inspecting) this.inspect(this.inspecting);
  }

  /** Opens the read-only detail panel for a party member, or closes it with null. */
  inspect(id: string | null): void {
    const party = this.party;
    const index = party.findIndex((c) => c.id === id);
    this.inspecting = index >= 0 ? id : null;
    const close = (): void => this.inspect(null);
    this.shell.setInspect(index >= 0 ? inspectPanel(party[index], index, close) : null, close);
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
