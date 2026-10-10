import type { Game } from '../engine/game';
import { isAlive } from '../rules/character';
import { townScreen } from './town';

/** The whole party died: they wake up in town, poorer and embarrassed. */
export function partyWiped(game: Game): void {
  const lost = Math.floor(game.state.gold / 2);
  game.state.gold -= lost;
  game.state.location = null;
  game.state.stepsSinceFight = 0;
  game.go(townScreen);
  game.say(`Kindly townsfolk drag your bodies back to Talonreach. They charge ${lost}g for the service.`, 'bad');
  game.say('Visit the Temple to bring your fallen heroes back.', 'dim');
}

export const hasLivingParty = (game: Game): boolean => game.party.some(isAlive);
