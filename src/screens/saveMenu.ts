import type { Game } from '../engine/game';
import { ALL_SLOTS, MANUAL_SLOTS, ago, type SlotId, type SlotInfo } from '../engine/saves';
import type { MenuItem } from '../engine/shell';

const describe = (i: SlotInfo): string => (i.empty ? `${i.name}: empty` : `${i.name}: ${i.summary} (${ago(i.savedAt)})`);

/** Shows the three save slots as the menu. `done` puts the screen's own menu back. */
export function chooseSaveSlot(game: Game, done: () => void): void {
  const items: MenuItem[] = MANUAL_SLOTS.map((slot) => {
    const info = game.saves.info(slot);
    return {
      key: slot,
      label: describe(info) + (slot === game.slot ? ' - this game' : ''),
      action: () => {
        // Saving over a different game's slot is the one thing here that can lose progress.
        if (!info.empty && slot !== game.slot && !window.confirm(`Replace the game in ${info.name}?\n${info.summary}`)) return;
        game.save(slot);
        done();
      },
    };
  });
  items.push({ key: 'b', label: 'Back', action: done });
  game.shell.setMenu(items, 'Save to which slot?');
}

/** Shows the autosave and the three slots; picking a filled one calls `load`. */
export function chooseLoadSlot(game: Game, load: (slot: SlotId) => void, back: () => void): void {
  const items: MenuItem[] = ALL_SLOTS.map((slot) => {
    const info = game.saves.info(slot);
    return { key: slot === 'auto' ? 'a' : slot, label: describe(info), disabled: info.empty, action: () => load(slot) };
  });
  items.push({ key: 'b', label: 'Back', action: back });
  game.shell.setMenu(items, 'Load which game?');
}
