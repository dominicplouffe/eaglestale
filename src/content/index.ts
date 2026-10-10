import { basePack } from './base';
import { content } from './registry';

/** Registers every content pack. Add new packs here to extend the game. */
export function loadContent(): void {
  if (content.packs.length > 0) return;
  content.register(basePack);
}

export { content };
