import { content } from '../content/registry';
import { deserialize, serialize, type GameState, type LoadResult } from '../rules/state';
import { readStored, writeStored } from './storage';

/**
 * Three save slots the player picks, plus an autosave the game writes on its own (on the stairs and
 * when returning to town). Slot 1 uses the key the game saved to before slots existed, so old saves
 * show up there.
 */

export type SlotId = 'auto' | '1' | '2' | '3';

export const MANUAL_SLOTS: SlotId[] = ['1', '2', '3'];
export const ALL_SLOTS: SlotId[] = ['auto', ...MANUAL_SLOTS];

const KEYS: Record<SlotId, string> = {
  auto: 'eagles-tale:autosave',
  '1': 'eagles-tale:save',
  '2': 'eagles-tale:save:2',
  '3': 'eagles-tale:save:3',
};
/** When each slot was last written, so Continue can pick the most recent. */
const TIMES_KEY = 'eagles-tale:saved-at';

export interface Store {
  read(key: string): string | null;
  write(key: string, value: string): boolean;
}

const browserStore: Store = { read: readStored, write: writeStored };

export interface SlotInfo {
  slot: SlotId;
  /** "Autosave" or "Slot 2". */
  name: string;
  empty: boolean;
  /** Milliseconds since 1970; 0 if unknown (a save from before slots existed). */
  savedAt: number;
  /** A one-line description of the game in the slot, e.g. "4 heroes, level 3 · Roost Cellars · 1 feather". */
  summary: string;
}

export const slotName = (slot: SlotId): string => (slot === 'auto' ? 'Autosave' : `Slot ${slot}`);

export class SaveSlots {
  constructor(
    private readonly store: Store = browserStore,
    private readonly now: () => number = Date.now,
  ) {}

  private times(): Partial<Record<SlotId, number>> {
    try {
      const t = JSON.parse(this.store.read(TIMES_KEY) ?? '{}') as unknown;
      return t && typeof t === 'object' ? (t as Partial<Record<SlotId, number>>) : {};
    } catch {
      return {};
    }
  }

  /** Returns false if the browser refused to store it. */
  write(slot: SlotId, s: GameState): boolean {
    if (!this.store.write(KEYS[slot], serialize(s))) return false;
    this.store.write(TIMES_KEY, JSON.stringify({ ...this.times(), [slot]: this.now() }));
    return true;
  }

  load(slot: SlotId): LoadResult {
    const raw = this.store.read(KEYS[slot]);
    if (raw === null) return { ok: false, reason: `${slotName(slot)} is empty.` };
    return deserialize(raw);
  }

  info(slot: SlotId): SlotInfo {
    const raw = this.store.read(KEYS[slot]);
    const base = { slot, name: slotName(slot), savedAt: this.times()[slot] ?? 0 };
    if (raw === null) return { ...base, empty: true, summary: 'empty' };
    const loaded = deserialize(raw);
    return { ...base, empty: false, summary: loaded.ok ? describeSave(loaded.state) : loaded.reason };
  }

  /** The most recently written slot, or null if there are no saves at all. */
  latest(): SlotId | null {
    const filled = ALL_SLOTS.map((s) => this.info(s)).filter((i) => !i.empty);
    if (filled.length === 0) return null;
    return filled.reduce((a, b) => (b.savedAt > a.savedAt ? b : a)).slot;
  }
}

/** "4 heroes, level 2-3 · Roost Cellars · 1 feather" */
export function describeSave(s: GameState): string {
  const party = s.party.map((id) => s.roster.find((c) => c.id === id)).filter((c) => !!c);
  const levels = party.map((c) => c.level);
  const lo = Math.min(...levels);
  const hi = Math.max(...levels);
  const heroes =
    party.length === 0
      ? 'no party yet'
      : `${party.length} ${party.length === 1 ? 'hero' : 'heroes'}, level ${lo === hi ? lo : `${lo}-${hi}`}`;
  const loc = s.location;
  const where = loc && content.dungeons.has(loc.dungeon) ? (content.dungeon(loc.dungeon).levels[loc.level]?.name ?? 'the Roost') : 'Talonreach';
  const feathers = `${s.feathers.length} ${s.feathers.length === 1 ? 'feather' : 'feathers'}`;
  return [heroes, where, feathers].join(' · ');
}

/** "just now", "5 min ago", "3 h ago", "2 days ago" */
export function ago(savedAt: number, now: number = Date.now()): string {
  if (!savedAt) return 'a while ago';
  const min = Math.floor((now - savedAt) / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return `${d} ${d === 1 ? 'day' : 'days'} ago`;
}
