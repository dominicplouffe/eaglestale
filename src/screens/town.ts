import { story } from '../content/base/story';
import { content } from '../content/registry';
import type { Game, Screen } from '../engine/game';
import type { SlotId } from '../engine/saves';
import { cityStart, dungeonScreen } from './dungeon';

export function startNewGame(game: Game): void {
  // The save slots are safe, but the autosave will be replaced once the new game autosaves.
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
  // Straight to where the game was saved (no autosave just for loading it).
  game.go(game.state.location ? dungeonScreen : townScreen);
  game.say('Game loaded.', 'good');
  for (const note of result.notes) game.say(note, 'dim');
}

/**
 * Talonreach's streets. The party stays where it was in town (say, outside the shop it just left);
 * arriving from anywhere else, it starts in the square.
 */
export const townScreen: Screen = {
  enter(game: Game) {
    const loc = game.state.location;
    const backOut = !!loc && !!content.dungeons.get(loc.dungeon)?.city;
    if (!loc) game.state.location = cityStart();
    dungeonScreen.enter(game);
    // Leaving a building is a good moment to keep what was bought or changed inside.
    if (backOut) game.autosave();
  },
};
