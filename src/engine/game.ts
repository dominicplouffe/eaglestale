import type { Character } from '../rules/types';
import { newGameState, partyMembers, startingState, type GameState, type LoadResult } from '../rules/state';
import type { Audio } from './audio';
import { SaveSlots, slotName, type SlotId } from './saves';
import type { LogStyle, Shell } from './shell';
import { inspectPanel } from '../ui/inspect';
import { renderPartyPanel } from '../ui/partyPanel';

export interface Screen {
  enter(game: Game): void;
  exit?(game: Game): void;
}

/** Ties together state, shell (DOM/canvas), audio and the active screen. */
export class Game {
  state: GameState = newGameState();
  private current: Screen | null = null;
  /** Id of the hero whose details are open (clicked in the party panel). */
  private inspecting: string | null = null;
  readonly saves = new SaveSlots();
  /** The save slot this game was loaded from or last saved to (null for a new game or the autosave). */
  slot: SlotId | null = null;
  private autosaveWarned = false;

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
    return this.saves.latest() !== null;
  }

  /** Saves to a slot, telling the player how it went. Returns true on success. */
  save(slot: SlotId): boolean {
    const ok = this.saves.write(slot, this.state);
    if (!ok) this.say("Couldn't save: this browser is blocking or out of site storage.", 'bad');
    else {
      if (slot !== 'auto') this.slot = slot;
      this.say(`Game saved to ${slotName(slot)}.`, 'good');
    }
    return ok;
  }

  /** Quietly saves to the autosave slot (a failure is mentioned, once). */
  autosave(): void {
    if (this.saves.write('auto', this.state) || this.autosaveWarned) return;
    this.autosaveWarned = true;
    this.say("Couldn't autosave: this browser is blocking or out of site storage.", 'bad');
  }

  /** Loads a slot into `state` if it can be read; the result says why not, or what was repaired. */
  load(slot: SlotId): LoadResult {
    const result = this.saves.load(slot);
    if (result.ok) {
      this.state = result.state;
      this.slot = slot === 'auto' ? null : slot;
    }
    return result;
  }

  newGame(): void {
    this.state = startingState();
    this.slot = null;
  }
}
