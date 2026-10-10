import type { ContentPack } from '../../rules/types';
import { classes } from './classes';
import { dungeons } from './dungeons';
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
  dungeons,
  shops,
};
