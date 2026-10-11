import type { ArtDef } from '../art';

/** Creatures of Mount Talon and Aquila's old nest (32x32, like the other monsters). */
export const MOUNTAIN_ART: Record<string, ArtDef> = {
  // The Changeling: a cuckoo's chick that hatched under Malachar's lost hat, and grew. And grew.
  changeling: {
    materials: { fluff: 'YYy' },
    colors: {
      k: '#14121c', W: '#fffbe0', Y: '#ffe070', y: '#e8b83a', o: '#b8862a', O: '#f08a30', r: '#b85a20',
      e: '#14121c', E: '#ffffff', P: '#8a5ac0', p: '#5a3488', d: '#331c55', T: '#fff0a0', t: '#e8c34a', u: '#a87a2a',
    },
    rows: [
      '..................kk............',
      '.................kPPk...........',
      '................kPPpk...........',
      '...............kPPppk...........',
      '..............kPPPpdk...........',
      '.............kPPTPpdk...........',
      '............kPPTTTpdk...........',
      '...........kPPPPTPppdk..........',
      '..........kPPPPPPpppdk..........',
      '.........kttttttttttttk.........',
      '........ktTttttttttttuuk........',
      '.......kkkkkkkkkkkkkkkkkkk......',
      '......kWYYYYYYYYYYYYYYYYyk......',
      '.....kWYYYYYYYYYYYYYYYYYyyk.....',
      '....kWYYYkkYYYYYYYYYkkYYYyyk....',
      '....kWYYkEekYYYYYYYkEekYYyyk....',
      '...kWYYYkeekYYYYYYYkeekYYYyyk...',
      '...kWYYYYkkYYYOOOYYYkkYYYYyyk...',
      '..kWYYYYYYYYYYOOOOOYYYYYYYYyyk..',
      '..kWYYyyYYYYYYYrrrYYYYYYyyYyyk..',
      '.kYkWYyyyYYYYYYYrYYYYYYyyyYyykYk',
      'kYYkWYYyyyYYYYYYYYYYYYyyyYYyykYk',
      'kYYykWYYyyYYYYYYYYYYYYyyYYyyyky.',
      '.kyyykWYYYYYYYYYYYYYYYYYYyyyok..',
      '..kkkkWYYYYYYYYYYYYYYYYYYyyyok..',
      '.....kWYYYYYYYYYYYYYYYYYyyyook..',
      '.....kWWYYYYYYYYYYYYYYYyyyyok...',
      '......kWWYYYYYYYYYYYYYyyyyook...',
      '.......kkWWYYYYYYYYYYyyyookk....',
      '.........kkkOkkkkkkkOkkkkk......',
      '..........kOOOk....kOOOk........',
      '.........kOkOkOk..kOkOkOk.......',
    ],
  },
};
