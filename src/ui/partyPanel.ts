import { content } from '../content/registry';
import { el } from '../engine/shell';
import { drawPortrait } from '../gfx/portrait';
import { FRONT_ROW_SIZE, isAlive } from '../rules/character';
import type { Character } from '../rules/types';

/** Renders the six party cards in the side panel. Clicking a card calls `onSelect` with that hero's id. */
export function renderPartyPanel(
  root: HTMLElement,
  party: Character[],
  activeId: string | undefined,
  onSelect: (id: string) => void,
): void {
  root.replaceChildren();
  if (party.length === 0) {
    root.append(el('div', { class: 'dim', text: 'No party yet. Visit the Guild.' }));
    return;
  }
  party.forEach((c, i) => {
    const alive = isAlive(c);
    const portrait = el('canvas');
    portrait.width = 32;
    portrait.height = 32;
    drawPortrait(portrait, c, !alive);
    const cls = content.cls(c.classId);
    const bar = (value: number, max: number, extra = ''): HTMLElement => {
      const fill = el('i');
      fill.style.width = `${max > 0 ? Math.round((100 * value) / max) : 0}%`;
      return el('div', { class: `bar ${extra}` }, fill);
    };
    const info = el(
      'div',
      {},
      el('div', { class: 'name', text: c.name }),
      el('div', {
        class: 'sub',
        text: `${cls.name} L${c.level}  HP ${c.hp}/${c.maxHp}${c.maxSp ? `  SP ${c.sp}/${c.maxSp}` : ''}${alive ? '' : '  DEAD'}`,
      }),
      bar(c.hp, c.maxHp),
    );
    if (c.maxSp > 0) info.append(bar(c.sp, c.maxSp, 'sp'));
    const classes = ['party-card'];
    if (!alive) classes.push('dead');
    if (i >= FRONT_ROW_SIZE) classes.push('row-back');
    if (c.id === activeId) classes.push('active');
    root.append(
      el(
        'div',
        { class: classes.join(' '), title: 'Click to see attributes and pack', onclick: () => onSelect(c.id) },
        portrait,
        info,
      ),
    );
  });
}
