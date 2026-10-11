import type { Character } from '../rules/types';
import { newGameState, partyMembers, startingState, type GameState, type LoadResult } from '../rules/state';
import type { Audio } from './audio';
import { SaveSlots, slotName, type SlotId } from './saves';
import type { LogStyle, Shell } from './shell';
import { forgetPicking, heroSheet } from '../ui/charSheet';
import { renderPartyPanel } from '../ui/partyPanel';

export interface Screen {
  enter(game: Game): void;
  exit?(game: Game): void;
  /** While this screen is up, the hero sheet is look-only (in battle, say). */
  readonly lookOnly?: boolean;
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
    this.renderParty(activeId);
    // Keep an open detail panel in step with HP, gear and level changes.
    if (this.inspecting) this.inspect(this.inspecting);
  }

  /**
   * Opens the hero sheet for a party member (from their card, or from camp), or closes it with null.
   * Gear, potions and camp spells can be used from it, except while the screen is look-only.
   */
  inspect(id: string | null): void {
    const hero = this.party.find((c) => c.id === id);
    const was = this.inspecting;
    this.inspecting = hero ? hero.id : null;
    if (!hero) forgetPicking();
    const close = (): void => this.inspect(null);
    this.shell.setInspect(hero ? heroSheet(this, hero, !this.current?.lookOnly, close) : null, close);
    // Highlight the hero being looked at.
    if (was !== this.inspecting) this.renderParty();
  }

  /** Clicking a hero's card opens their sheet (or closes it if it is already open). */
  private renderParty(activeId?: string): void {
    renderPartyPanel(this.shell.partyEl, this.party, activeId ?? this.inspecting ?? undefined, (id) =>
      this.inspect(this.inspecting === id ? null : id),
    );
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
