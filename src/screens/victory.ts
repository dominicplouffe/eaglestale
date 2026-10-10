import { story } from '../content/base/story';
import type { Game, Screen } from '../engine/game';
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
      drawTitleScene(ctx, t);
      ctx.textAlign = 'center';
      ctx.font = 'bold 20px monospace';
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#0e0a1c';
      ctx.strokeText('THE EAGLE RETURNS', 160, 160);
      ctx.fillStyle = '#e8c34a';
      ctx.fillText('THE EAGLE RETURNS', 160, 160);
      ctx.textAlign = 'start';
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
