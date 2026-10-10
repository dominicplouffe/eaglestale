import type { Game, Screen } from '../engine/game';
import { drawText } from '../gfx/font';
import { drawTitleScene } from '../gfx/scenes';
import { story } from '../content/base/story';
import { enterSavedGame, startNewGame } from './town';

export const titleScreen: Screen = {
  enter(game: Game) {
    const { shell, audio } = game;
    shell.setLocation('');
    shell.clearLog();
    shell.print(story.tagline, 'story');
    shell.print('Click or press a key to choose. M toggles sound.', 'dim');
    audio.music('title');
    shell.setDraw((ctx, t) => {
      drawTitleScene(ctx, t);
      drawText(ctx, "EAGLE'S TALE", 160, 149, { color: '#e8c34a', outline: '#0e0a1c', scale: 3, align: 'center' });
    });
    shell.setMenu(
      [
        { key: 'n', label: 'New game', action: () => startNewGame(game) },
        { key: 'c', label: 'Continue saved game', disabled: !game.hasSave, action: () => enterSavedGame(game) },
      ],
      'Main menu',
    );
  },
};
