import { story } from '../content/base/story';
import type { Game, Screen } from '../engine/game';
import { drawPlace } from '../gfx/scenes';
import { content } from '../content/registry';
import { offerFeathers } from '../rules/quests';
import { openCharSheet } from '../ui/charSheet';
import { openJournal } from '../ui/journal';
import type { SlotId } from '../engine/saves';
import { chooseSaveSlot } from './saveMenu';
import { dungeonScreen } from './dungeon';
import { guildScreen } from './guild';
import { hasLivingParty } from './flow';
import { innScreen } from './inn';
import { shopScreen } from './shop';
import { templeScreen } from './temple';
import { titleScreen } from './title';

export const DUNGEON_ID = 'roost';

export function startNewGame(game: Game): void {
  // The save slots are safe, but the autosave will be replaced once the new game reaches the stairs.
  const latest = game.saves.latest();
  if (latest === 'auto' && !window.confirm('Your latest progress is only in the autosave, which the new game will replace. Start a new game anyway?')) {
    return;
  }
  game.newGame();
  game.go(townScreen);
  game.shell.clearLog();
  for (const line of story.intro) game.say(line, 'story');
  game.say(story.townHint, 'gold');
}

export function enterSavedGame(game: Game, slot: SlotId): void {
  const result = game.load(slot);
  if (!result.ok) {
    game.say(result.reason, 'bad');
    return;
  }
  game.go(game.state.location ? dungeonScreen : townScreen);
  game.say('Game loaded.', 'good');
  for (const note of result.notes) game.say(note, 'dim');
}

export const townScreen: Screen = {
  enter(game: Game) {
    const { shell, audio, state } = game;
    state.location = null;
    shell.setLocation('Talonreach - the city square');
    audio.music('town');
    shell.setDraw((ctx, t) => drawPlace(ctx, 'street', t));
    showMenu(game);
  },
};

function showMenu(game: Game): void {
  const { state } = game;
  const toReturn = state.feathers.length - state.offered;
  game.shell.setMenu(
    [
      { key: 'w', label: `Eagle Tower${toReturn > 0 ? ` (${toReturn} to return)` : ''}`, action: () => eagleTower(game) },
      { key: 'g', label: 'Guild of Questionable Heroes', action: () => game.go(guildScreen) },
      { key: 'e', label: "Dusty Gizzard's Emporium", action: () => game.go(shopScreen) },
      { key: 't', label: 'Temple of the Gentle Peck', action: () => game.go(templeScreen) },
      { key: 'i', label: 'The Drowsy Hen Inn', action: () => game.go(innScreen) },
      { key: 'p', label: 'Party sheet', disabled: game.party.length === 0, action: () => sheet(game) },
      { key: 'j', label: 'Journal', action: () => openJournal(game, () => showMenu(game)) },
      { key: 'd', label: 'Descend into the Roost Below', action: () => descend(game) },
      { key: 's', label: 'Save game', action: () => chooseSaveSlot(game, () => showMenu(game)) },
      { key: 'q', label: 'Quit to title', action: () => game.go(titleScreen) },
    ],
    `Gold: ${state.gold}`,
  );
}

/** Returning Aquila's feathers to the tower is how the city recovers. */
function eagleTower(game: Game): void {
  const lines = offerFeathers(game.state);
  if (lines.length === 0) {
    game.say(
      game.state.offered === 0
        ? "The Eagle Tower's perch stands empty. Bring back Aquila's feathers and the city will remember how to hope."
        : 'The keepers of the tower nod at you. Every feather counts; bring the rest home.',
      'story',
    );
    return;
  }
  game.audio.sfx('levelup');
  game.say('You climb the Eagle Tower and lay the feathers on the empty perch. They glow, faintly at first.', 'story');
  for (const line of lines) game.say(line, 'gold');
  game.autosave();
  showMenu(game);
}

function sheet(game: Game): void {
  openCharSheet(game, {
    onClose: () => {
      game.shell.setOverlay(null);
      game.shell.setKeyHandler(null);
      game.refreshParty();
      showMenu(game);
    },
  });
}

function descend(game: Game): void {
  if (game.party.length === 0) {
    game.say('You need a party first. Visit the Guild to recruit heroes.', 'bad');
    game.audio.sfx('error');
    return;
  }
  if (!hasLivingParty(game)) {
    game.say('Your whole party is dead. The Temple can help with that.', 'bad');
    game.audio.sfx('error');
    return;
  }
  const dungeon = content.dungeon(DUNGEON_ID);
  const start = dungeon.levels[0].start;
  game.state.location = { dungeon: dungeon.id, level: 0, ...start };
  game.audio.sfx('stairs');
  game.autosave();
  game.go(dungeonScreen);
}
