import type { ContentPack } from '../../rules/types';
import { cityStages, feathers, quests } from './campaign';
import { talonreach } from './city';
import { classes } from './classes';
import { dungeons } from './dungeons';
import { gurgle } from './gurgle';
import { clocktower } from './clocktower';
import { items } from './items';
import { monsters } from './monsters';
import { races } from './races';
import { shops } from './shops';
import { spells } from './spells';

/** The built-in "Eagle's Tale" campaign. */
export const basePack: ContentPack = {
  id: 'base',
  races,
  classes,
  items,
  spells,
  monsters,
  dungeons: [talonreach, ...dungeons, gurgle, clocktower],
  shops,
  quests,
  feathers,
  cityStages,
};
