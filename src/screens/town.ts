import { story } from '../content/base/story';
import type { Game, Screen } from '../engine/game';
import { drawPlace } from '../gfx/scenes';
import { content } from '../content/registry';
import { openCharSheet } from '../ui/charSheet';
import { dungeonScreen } from './dungeon';
import { guildScreen } from './guild';
import { hasLivingParty } from './flow';
import { innScreen } from './inn';
import { shopScreen } from './shop';
import { templeScreen } from './temple';
import { titleScreen } from './title';

export const DUNGEON_ID = 'roost';

export function startNewGame(game: Game): void {
  if (game.hasSave && !window.confirm('Starting a new game will replace your saved game the next time you save. Continue?')) {
    return;
  }
  game.newGame();
  game.go(townScreen);
  game.shell.clearLog();
  for (const line of story.intro) game.say(line, 'story');
  game.say(story.townHint, 'gold');
}

export function enterSavedGame(game: Game): void {
  if (!game.load()) {
    game.say('The save file is missing or from an incompatible version.', 'bad');
    return;
  }
  game.go(game.state.location ? dungeonScreen : townScreen);
  game.say('Game loaded.', 'good');
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
  game.shell.setMenu(
    [
      { key: 'g', label: 'Guild of Questionable Heroes', action: () => game.go(guildScreen) },
      { key: 'e', label: "Dusty Gizzard's Emporium", action: () => game.go(shopScreen) },
      { key: 't', label: 'Temple of the Gentle Peck', action: () => game.go(templeScreen) },
      { key: 'i', label: 'The Drowsy Hen Inn', action: () => game.go(innScreen) },
      { key: 'p', label: 'Party sheet', disabled: game.party.length === 0, action: () => sheet(game) },
      { key: 'd', label: 'Descend into the Roost Below', action: () => descend(game) },
      { key: 's', label: 'Save game', action: () => { game.save(); game.say('Game saved.', 'good'); } },
      { key: 'q', label: 'Quit to title', action: () => game.go(titleScreen) },
    ],
    `Gold: ${state.gold}`,
  );
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
  game.go(dungeonScreen);
}
