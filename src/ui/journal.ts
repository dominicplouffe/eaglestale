import { content } from '../content/registry';
import type { Game } from '../engine/game';
import { el } from '../engine/shell';
import { activeQuests, cityStage, goalProgress } from '../rules/quests';
import type { QuestDef } from '../rules/types';

/**
 * The journal: what the party is doing, written so a player coming back after a few days knows
 * where they are. Main story first, then side tasks and bounties, the feathers, and the city.
 */
export function openJournal(game: Game, onClose: () => void): void {
  const s = game.state;
  const root = el(
    'div',
    { class: 'panel' },
    el(
      'div',
      { class: 'row' },
      el('h2', { class: 'grow', text: 'Journal' }),
      el('button', { class: 'btn small', text: 'Close (Esc)', onclick: () => close() }),
    ),
  );

  const questRow = (q: QuestDef): HTMLElement => {
    const p = s.quests[q.id];
    const step = q.steps[Math.min(p.step, q.steps.length - 1)];
    let detail = step?.text ?? '';
    if (p.status === 'ready') detail = 'Done! Report to the Guild for your reward.';
    else if (step) {
      const { have, need } = goalProgress(s, step.goal, p.count);
      if (need > 1) detail += ` (${have}/${need})`;
    }
    return el('div', { class: 'quest' }, el('div', { class: 'gold', text: q.name }), el('div', { text: detail }));
  };

  const active = activeQuests(s);
  const main = active.filter((q) => q.kind === 'main');
  const side = active.filter((q) => q.kind === 'side');
  root.append(el('h3', { text: 'The story' }));
  if (main.length === 0) root.append(el('div', { class: 'dim', text: 'Nothing pressing. Enjoy the quiet while it lasts.' }));
  for (const q of main) root.append(questRow(q));
  root.append(el('h3', { text: 'Side tasks and bounties' }));
  if (side.length === 0) root.append(el('div', { class: 'dim', text: 'None. The Guild bounty board always has work.' }));
  for (const q of side) root.append(questRow(q));
  const trophies = Object.entries(s.trophies).filter(([, n]) => n > 0);
  if (trophies.length) {
    root.append(
      el('div', { class: 'dim', text: `Trophy pouch: ${trophies.map(([id, n]) => `${n} x ${content.item(id).name}`).join(', ')}` }),
    );
  }

  const total = content.feathers.size;
  root.append(el('h3', { text: `Aquila's feathers: ${s.feathers.length} of ${total} found, ${s.offered} returned` }));
  const strip = el('div', { class: 'feathers' });
  for (const f of content.feathers.values()) {
    const at = s.feathers.indexOf(f.id);
    const cls = at < 0 ? 'feather' : at < s.offered ? 'feather returned' : 'feather found';
    strip.append(el('span', { class: cls, title: at < 0 ? 'Not found yet' : `${f.name}: ${f.desc}` }));
  }
  root.append(strip);
  for (const id of s.feathers) root.append(el('div', { class: 'dim', text: `${content.feather(id).name}: ${content.feather(id).desc}` }));

  root.append(el('h3', { text: 'Talonreach' }), el('div', { text: cityStage(s)?.text ?? 'The city waits under a grey sky for its eagle to come home.' }));

  const done = Object.entries(s.quests).filter(([id, p]) => p.status === 'done' && content.quests.has(id));
  if (done.length) {
    root.append(el('h3', { text: 'Done' }), el('div', { class: 'dim', text: done.map(([id]) => content.quest(id).name).join(', ') }));
  }

  const close = (): void => {
    game.shell.setOverlay(null);
    game.shell.setKeyHandler(null);
    onClose();
  };
  game.shell.setKeyHandler((e) => {
    if (e.key === 'Escape') {
      close();
      return true;
    }
    return false;
  });
  game.shell.setOverlay(root);
}
