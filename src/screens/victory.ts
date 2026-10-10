import { story } from '../content/base/story';
import type { Game, Screen } from '../engine/game';
import { drawText } from '../gfx/font';
import { drawTitleScene } from '../gfx/scenes';
import { dungeonScreen } from './dungeon';
import { titleScreen } from './title';

export const victoryScreen: Screen = {
  enter(game: Game) {
    const { shell, audio } = game;
    shell.setLocation('Victory!');
    shell.clearLog();
    for (const line of story.victory) game.say(line, 'story');
    audio.music('victory');
    audio.sfx('victory');
    game.save();
    shell.setDraw((ctx, t) => {
      drawTitleScene(ctx, t, true);
      drawText(ctx, 'THE EAGLE RETURNS', 160, 142, { color: '#e8c34a', outline: '#0e0a1c', scale: 2, align: 'center' });
    });
    shell.setMenu(
      [
        { key: 'c', label: 'Keep exploring the Roost', action: () => game.go(dungeonScreen) },
        { key: 't', label: 'Return to title', action: () => game.go(titleScreen) },
      ],
      'The End... or is it?',
    );
  },
};
