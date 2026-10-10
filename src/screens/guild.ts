import { starterParty } from '../content/base/story';
import { content } from '../content/registry';
import type { Game, Screen } from '../engine/game';
import { el } from '../engine/shell';
import { drawPlace } from '../gfx/scenes';
import {
  MAX_PARTY,
  MAX_STAT,
  autoAllocate,
  createCharacter,
  isAlive,
  meetsRequirements,
  rollBonusPool,
} from '../rules/character';
import {
  addToParty,
  allocateCharacterId,
  deleteCharacter,
  movePartyMember,
  removeFromParty,
} from '../rules/state';
import { ATTRS, ATTR_NAMES, type Stats } from '../rules/types';
import { townScreen } from './town';

const MAX_ROSTER = 20;
const NAME_LIMIT = 14;

export const guildScreen: Screen = {
  enter(game: Game) {
    game.shell.setLocation('Guild of Questionable Heroes');
    game.shell.setDraw((ctx, t) => drawPlace(ctx, 'guild', t));
    game.say('The Guildmaster glances up from a half-eaten sandwich. "Heroes? Again? Sit down."', 'story');
    game.shell.setMenu([{ key: 'l', label: 'Leave the Guild', action: () => game.go(townScreen) }]);
    game.shell.setKeyHandler((e) => {
      if (e.key === 'Escape' && !game.shell.overlayOpen) {
        game.go(townScreen);
        return true;
      }
      return false;
    });
    showRoster(game);
  },
};

function showRoster(game: Game): void {
  const { state } = game;
  const root = el('div', { class: 'panel' }, el('h2', { text: 'Guild Roster' }));
  root.append(
    el(
      'div',
      { class: 'tabs' },
      el('button', {
        class: 'btn',
        text: 'Create character',
        disabled: state.roster.length >= MAX_ROSTER,
        onclick: () => showCreate(game),
      }),
      el('button', {
        class: 'btn',
        text: 'Quick-start party',
        title: 'Recruit six ready-made heroes',
        disabled: state.roster.length + starterParty.length > MAX_ROSTER,
        onclick: () => quickStart(game),
      }),
      el('button', { class: 'btn', text: 'Close roster', onclick: () => game.shell.setOverlay(null) }),
    ),
    el('div', { class: 'dim', text: `Party ${state.party.length}/${MAX_PARTY} (first three stand in the front row)` }),
  );

  const redraw = (): void => {
    game.refreshParty();
    showRoster(game);
  };

  const list = (title: string, ids: string[], inParty: boolean): void => {
    root.append(el('h3', { text: title }));
    if (ids.length === 0) root.append(el('div', { class: 'dim', text: inParty ? 'Nobody yet.' : 'Nobody waiting.' }));
    ids.forEach((id, i) => {
      const c = state.roster.find((r) => r.id === id);
      if (!c) return;
      const row = el(
        'div',
        { class: 'row' },
        el('span', {
          class: 'grow',
          text: `${c.name} - ${content.race(c.raceId).name} ${content.cls(c.classId).name} L${c.level}${isAlive(c) ? '' : ' (dead)'}`,
        }),
      );
      if (inParty) {
        row.append(
          el('button', { class: 'btn small', text: 'Up', disabled: i === 0, onclick: () => { movePartyMember(state, id, -1); redraw(); } }),
          el('button', { class: 'btn small', text: 'Down', disabled: i === ids.length - 1, onclick: () => { movePartyMember(state, id, 1); redraw(); } }),
          el('button', { class: 'btn small', text: 'Remove', onclick: () => { removeFromParty(state, id); redraw(); } }),
        );
      } else {
        row.append(
          el('button', {
            class: 'btn small',
            text: 'Add to party',
            onclick: () => {
              const err = addToParty(state, id);
              if (err) game.say(err, 'bad');
              redraw();
            },
          }),
          el('button', {
            class: 'btn small',
            text: 'Retire',
            title: 'Permanently delete this character',
            onclick: () => {
              if (!window.confirm(`Retire ${c.name} for good? Their gear goes with them.`)) return;
              deleteCharacter(state, id);
              redraw();
            },
          }),
        );
      }
      root.append(row);
    });
  };
  list('In the party', state.party, true);
  list('Waiting at the guild', state.roster.map((c) => c.id).filter((id) => !state.party.includes(id)), false);
  game.shell.setOverlay(root);
}

function quickStart(game: Game): void {
  const { state } = game;
  for (const s of starterParty) {
    const c = createCharacter({
      id: allocateCharacterId(state),
      name: s.name,
      raceId: s.race,
      classId: s.cls,
      stats: autoAllocate(s.race, s.cls),
    });
    state.roster.push(c);
    addToParty(state, c.id);
  }
  game.audio.sfx('buy');
  game.say('Six heroes sign the guild ledger with varying levels of enthusiasm.', 'good');
  game.refreshParty();
  showRoster(game);
}

// ---- Character creation ----------------------------------------------------

interface Draft {
  name: string;
  raceId: string;
  classId: string;
  pool: number;
  spent: Stats;
}

const zeroStats = (): Stats => ({ str: 0, iq: 0, dex: 0, con: 0, lck: 0 });

function showCreate(game: Game): void {
  const races = [...content.races.values()];
  const classes = [...content.classes.values()];
  const draft: Draft = {
    name: '',
    raceId: races[0].id,
    classId: classes[0].id,
    pool: rollBonusPool(),
    spent: zeroStats(),
  };

  const finalStats = (): Stats => {
    const base = content.race(draft.raceId).stats;
    const out = { ...base };
    for (const a of ATTRS) out[a] += draft.spent[a];
    return out;
  };

  const render = (): void => {
    const stats = finalStats();
    // Lowering a stat can make the chosen class unavailable; fall back to one the hero qualifies for.
    if (!meetsRequirements(draft.classId, stats)) {
      draft.classId = classes.find((c) => meetsRequirements(c.id, stats))?.id ?? draft.classId;
    }
    const root = el('div', { class: 'panel' }, el('h2', { text: 'Create a Hero' }));

    const nameInput = el('input');
    nameInput.type = 'text';
    nameInput.maxLength = NAME_LIMIT;
    nameInput.placeholder = 'Name';
    nameInput.value = draft.name;
    nameInput.addEventListener('input', () => {
      draft.name = nameInput.value;
    });
    root.append(el('div', { class: 'row' }, el('span', { text: 'Name' }), nameInput));

    root.append(el('h3', { text: 'Race' }));
    const raceCards = el('div', { class: 'cards' });
    for (const r of races) {
      raceCards.append(
        el(
          'button',
          {
            class: `card${r.id === draft.raceId ? ' active' : ''}`,
            onclick: () => {
              draft.raceId = r.id;
              draft.spent = zeroStats();
              draft.pool = rollBonusPool();
              render();
            },
          },
          el('div', { text: r.name }),
          el('div', { class: 'desc', text: r.desc }),
        ),
      );
    }
    root.append(raceCards);

    root.append(el('h3', { text: 'Class' }));
    const classCards = el('div', { class: 'cards' });
    for (const c of classes) {
      const ok = meetsRequirements(c.id, stats);
      const req = Object.entries(c.requires ?? {}).map(([a, v]) => `${a.toUpperCase()} ${v}`).join(', ');
      classCards.append(
        el(
          'button',
          {
            class: `card${c.id === draft.classId ? ' active' : ''}`,
            disabled: !ok,
            onclick: () => {
              draft.classId = c.id;
              render();
            },
          },
          el('div', { text: c.name }),
          el('div', { class: 'desc', text: ok ? c.desc : `Needs ${req}` }),
        ),
      );
    }
    root.append(classCards);

    root.append(
      el('h3', { text: 'Attributes' }),
      el('div', { class: draft.pool > 0 ? 'gold' : 'dim', text: `Bonus points left: ${draft.pool}` }),
    );
    for (const a of ATTRS) {
      root.append(
        el(
          'div',
          { class: 'stat' },
          el('span', { text: ATTR_NAMES[a] }),
          el('b', { text: String(stats[a]) }),
          el('button', {
            class: 'btn small',
            text: '-',
            disabled: draft.spent[a] <= 0,
            onclick: () => { draft.spent[a] -= 1; draft.pool += 1; render(); },
          }),
          el('button', {
            class: 'btn small',
            text: '+',
            disabled: draft.pool <= 0 || stats[a] >= MAX_STAT,
            onclick: () => { draft.spent[a] += 1; draft.pool -= 1; render(); },
          }),
        ),
      );
    }

    const cls = content.cls(draft.classId);
    const valid = meetsRequirements(draft.classId, stats);
    root.append(
      el('div', { class: 'dim', text: `${cls.name}: ${cls.desc}` }),
      el(
        'div',
        { class: 'tabs' },
        el('button', {
          class: 'btn',
          text: 'Re-roll bonus points',
          onclick: () => { draft.spent = zeroStats(); draft.pool = rollBonusPool(); render(); },
        }),
        el('button', {
          class: 'btn',
          text: 'Create',
          disabled: !draft.name.trim() || !valid,
          onclick: () => create(game, draft, finalStats()),
        }),
        el('button', { class: 'btn', text: 'Cancel', onclick: () => showRoster(game) }),
      ),
    );
    game.shell.setOverlay(root);
  };
  render();
}

function create(game: Game, draft: Draft, stats: Stats): void {
  if (draft.pool > 0 && !window.confirm(`You still have ${draft.pool} unspent bonus points. Create anyway?`)) return;
  const c = createCharacter({
    id: allocateCharacterId(game.state),
    name: draft.name,
    raceId: draft.raceId,
    classId: draft.classId,
    stats,
  });
  game.state.roster.push(c);
  const err = addToParty(game.state, c.id);
  game.audio.sfx('buy');
  game.say(`${c.name} the ${content.cls(c.classId).name} joins the guild${err ? ` (${err} Waiting at the guild.)` : ' and the party'}.`, 'good');
  game.refreshParty();
  showRoster(game);
}
