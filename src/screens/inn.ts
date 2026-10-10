import type { Game, Screen } from '../engine/game';
import { drawPlace } from '../gfx/scenes';
import { isAlive, restoreFully } from '../rules/character';
import { townScreen } from './town';

const COST_PER_HERO = 5;

export const innScreen: Screen = {
  enter(game: Game) {
    game.shell.setLocation('The Drowsy Hen Inn');
    game.shell.setDraw((ctx, t) => drawPlace(ctx, 'inn', t));
    game.say('The innkeeper polishes a mug. "Beds are five gold a head. The soup is free, and you should not ask what is in it."', 'story');

    const menu = (): void => {
      const living = game.party.filter(isAlive);
      const cost = living.length * COST_PER_HERO;
      game.shell.setMenu(
        [
          {
            key: 'r',
            label: `Rest and save (${cost}g)`,
            disabled: living.length === 0 || game.state.gold < cost,
            action: () => {
              game.state.gold -= cost;
              for (const c of living) restoreFully(c);
              game.save();
              game.audio.sfx('heal');
              game.say('You sleep soundly. Everyone is healed and the game is saved.', 'good');
              game.refreshParty();
              menu();
            },
          },
          { key: 'l', label: 'Leave the inn', action: () => game.go(townScreen) },
        ],
        `Gold: ${game.state.gold}`,
      );
    };
    menu();
    game.shell.setKeyHandler((e) => {
      if (e.key === 'Escape') {
        game.go(townScreen);
        return true;
      }
      return false;
    });
  },
};
