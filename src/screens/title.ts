import type { Game, Screen } from '../engine/game';
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
      ctx.textAlign = 'center';
      ctx.font = 'bold 26px monospace';
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#0e0a1c';
      ctx.strokeText("EAGLE'S TALE", 160, 160);
      ctx.fillStyle = '#e8c34a';
      ctx.fillText("EAGLE'S TALE", 160, 160);
      ctx.textAlign = 'start';
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
