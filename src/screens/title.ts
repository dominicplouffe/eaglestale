import type { Game, Screen } from '../engine/game';
import { drawText } from '../gfx/font';
import { drawTitleScene } from '../gfx/scenes';
import { story } from '../content/base/story';
import { ago } from '../engine/saves';
import { chooseLoadSlot } from './saveMenu';
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
    const latest = game.saves.latest();
    if (latest) {
      const info = game.saves.info(latest);
      shell.print(`Last played: ${info.summary} (${info.name.toLowerCase()}, ${ago(info.savedAt)}).`, 'dim');
    }
    const menu = (): void =>
      shell.setMenu(
        [
          { key: 'c', label: 'Continue', disabled: !latest, action: () => latest && enterSavedGame(game, latest) },
          { key: 'l', label: 'Load game', disabled: !latest, action: () => chooseLoadSlot(game, (slot) => enterSavedGame(game, slot), menu) },
          { key: 'n', label: 'New game', action: () => startNewGame(game) },
        ],
        'Main menu',
      );
    menu();
  },
};
