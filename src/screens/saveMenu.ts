import type { Game } from '../engine/game';
import { ALL_SLOTS, MANUAL_SLOTS, ago, type SlotId, type SlotInfo } from '../engine/saves';
import { el, type MenuItem } from '../engine/shell';

/**
 * Picking a save slot: the menu lists the slots by name (so the keys stay short), and a panel over the
 * view shows what is in each one. Both close again with Back or Esc.
 */
function slotPicker(
  game: Game,
  opts: { title: string; slots: SlotId[]; verb: string; usable: (i: SlotInfo) => boolean; pick: (i: SlotInfo) => void; back: () => void },
): void {
  const { shell } = game;
  const previousKeys = shell.currentKeyHandler;
  const close = (then: () => void): void => {
    shell.setOverlay(null);
    shell.setKeyHandler(previousKeys);
    then();
  };
  // Picking closes the panel first, so whatever the pick does next starts from a clean screen.
  const choose = (info: SlotInfo): void => close(() => opts.pick(info));
  const infos = opts.slots.map((slot) => game.saves.info(slot));
  const root = el('div', { class: 'panel' }, el('h2', { text: opts.title }));
  for (const info of infos) {
    const here = info.slot === game.slot ? ' (this game)' : '';
    root.append(
      el(
        'div',
        { class: 'row' },
        el('span', { class: 'slot-name', text: info.name }),
        el('span', { class: `grow${info.empty ? ' dim' : ''}`, text: info.summary + here }),
        el('span', { class: 'dim', text: info.empty ? '' : ago(info.savedAt) }),
        el('button', { class: 'btn small', text: opts.verb, disabled: !opts.usable(info), onclick: () => choose(info) }),
      ),
    );
  }
  root.append(el('div', { class: 'tabs' }, el('button', { class: 'btn', text: 'Back', onclick: () => close(opts.back) })));
  shell.setOverlay(root);
  shell.setKeyHandler((e) => {
    if (e.key !== 'Escape') return false;
    close(opts.back);
    return true;
  });
  const items: MenuItem[] = infos.map((info) => ({
    key: info.slot === 'auto' ? 'a' : info.slot,
    label: info.empty ? `${info.name} (empty)` : info.name,
    disabled: !opts.usable(info),
    action: () => choose(info),
  }));
  items.push({ key: 'b', label: 'Back', action: () => close(opts.back) });
  shell.setMenu(items, opts.title);
}

/** Lets the player save to one of the three slots. `done` puts the screen's own menu back. */
export function chooseSaveSlot(game: Game, done: () => void): void {
  slotPicker(game, {
    title: 'Save to which slot?',
    slots: MANUAL_SLOTS,
    verb: 'Save',
    usable: () => true,
    pick: (info) => {
      // Saving over a different game is the one thing here that can lose progress.
      if (info.empty || info.slot === game.slot || window.confirm(`Replace the game in ${info.name}?\n${info.summary}`)) game.save(info.slot);
      done();
    },
    back: done,
  });
}

/** Lists the autosave and the three slots; picking a filled one calls `load`. */
export function chooseLoadSlot(game: Game, load: (slot: SlotId) => void, back: () => void): void {
  slotPicker(game, {
    title: 'Load which game?',
    slots: ALL_SLOTS,
    verb: 'Load',
    usable: (info) => !info.empty,
    pick: (info) => load(info.slot),
    back,
  });
}
