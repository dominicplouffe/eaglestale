/**
 * Pixel-art sprites defined as text. Each character is a palette key; '.' is transparent.
 * Symmetric sprites list only their left half and are mirrored when drawn.
 */

export interface SpriteDef {
  rows: string[];
  symmetric?: boolean;
}

export const SPRITE_SIZE = 16;

export const BASE_PALETTE: Record<string, string> = {
  k: '#14121c', // outline
  w: '#f2efe6', // white / bone
  e: '#8a8a96', // grey
  E: '#55555f', // dark grey
  r: '#c43c3c', // red
  g: '#6fa34a', // skin / main body colour (overridable)
  G: '#3f6a2a',
  b: '#7a5230', // clothing (overridable)
  B: '#4a321c',
  h: '#3a2a1a', // hair (overridable)
  y: '#e8c34a',
  o: '#d9803b',
  p: '#7a4aa8',
  c: '#5ac8e0',
  s: '#a8d8a0', // slime
  S: '#6aa86a',
};

export const SPRITES: Record<string, SpriteDef> = {
  humanoid: {
    symmetric: true,
    rows: [
      '........',
      '....kkkk',
      '...khhhh',
      '..khhhhh',
      '..khgggg',
      '..kggkgg',
      '..kgggrr',
      '...kgggg',
      '..kkbbbb',
      '.kbbbbbb',
      '.kgkbbbb',
      '.kgkbbbb',
      '..kkbbbb',
      '...kBBBB',
      '...kBBkk',
      '...kkk..',
    ],
  },
  mage: {
    symmetric: true,
    rows: [
      '.......k',
      '......kb',
      '.....kbb',
      '....kbbb',
      '...kbbbb',
      '..kkkkkk',
      '..kggggg',
      '..kgkggg',
      '..kgwwww',
      '...kwwww',
      '..kbbbbb',
      '.kbbbbbb',
      '.kgkbbbb',
      '.kbbbbbb',
      '.kbbbbbb',
      '.kkkkkkk',
    ],
  },
  rat: {
    rows: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '.kk.............',
      'kEEk........kkk.',
      'kEwEkkkkkkkkEEk.',
      'kEEEEEEEEEEEEEEk',
      '.kkEEEEEEEEEEEk.',
      '..kEEeEEeEEkkkk.',
      '..kk.kk.kk.k..k.',
      '...........k...k',
      '................',
      '................',
    ],
  },
  bat: {
    symmetric: true,
    rows: [
      '........',
      '........',
      '.....k.k',
      'kk...kEk',
      'kEk..kEE',
      'kEEkkEEE',
      'kEEEEEwE',
      'kEEEEEEE',
      '.kEEEEEr',
      '..kEEkEE',
      '...kk.kE',
      '........',
      '........',
      '........',
      '........',
      '........',
    ],
  },
  slime: {
    symmetric: true,
    rows: [
      '........',
      '........',
      '........',
      '........',
      '......kk',
      '....kkss',
      '...kssss',
      '..ksssss',
      '..kswkss',
      '.ksssssS',
      '.ksssSSS',
      '.kssSSSS',
      '.kSSSSSS',
      '..kkSSSS',
      '...kkkkk',
      '........',
    ],
  },
  skeleton: {
    symmetric: true,
    rows: [
      '........',
      '....kkkk',
      '...kwwww',
      '..kwwwww',
      '..kwkkwk',
      '..kwkkwk',
      '...kwwww',
      '...kwkwk',
      '..kkewee',
      '.kwkewee',
      '.kwkkwee',
      '.kwkewee',
      '..kkewee',
      '...kwkwk',
      '...kwkwk',
      '...kkk.k',
    ],
  },
  spider: {
    symmetric: true,
    rows: [
      '........',
      '........',
      '........',
      '..k..kkk',
      '.k.kkEEE',
      'k.kEEEEE',
      'k.kEErEr',
      'kkEEEEEE',
      '.kkEEbEE',
      'k.kEEbEE',
      'k.kkEEEE',
      'k..kkkkk',
      '........',
      '........',
      '........',
      '........',
    ],
  },
  ghost: {
    symmetric: true,
    rows: [
      '........',
      '.....kkk',
      '...kkwww',
      '..kwwwww',
      '..kwwwww',
      '.kwkkwwk',
      '.kwkkwwk',
      '.kwwwwww',
      '.kwwkkkw',
      '.kwwkkkw',
      '.kwwwwww',
      '.kwwwwww',
      '.kwwwwww',
      '.kwkwwkw',
      '.kk.kwk.',
      '........',
    ],
  },
  eagle: {
    symmetric: true,
    rows: [
      '........',
      '......kk',
      '.....kww',
      '....kwwk',
      '...kbwwy',
      'kk.kbbyo',
      'kbkkbbbk',
      'kbbbbbbk',
      '.kbbbBBk',
      '..kbbBBk',
      '..kbbbbk',
      '...kbBBk',
      '....kbBk',
      '...kykyk',
      '..kyk.kk',
      '..kk....',
    ],
  },
};

export type DrawTarget = CanvasRenderingContext2D;

/** Expands a sprite definition to full 16-column rows. */
export function expandSprite(def: SpriteDef): string[] {
  return def.rows.map((row) => {
    if (!def.symmetric) return row;
    return row + [...row].reverse().join('');
  });
}

export function drawSprite(
  ctx: DrawTarget,
  name: string,
  x: number,
  y: number,
  scale: number,
  palette: Record<string, string> = {},
  flip = false,
): void {
  const def = SPRITES[name];
  if (!def) return;
  const colors = { ...BASE_PALETTE, ...palette };
  expandSprite(def).forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      const color = colors[row[rx]];
      if (!color) continue;
      ctx.fillStyle = color;
      const px = flip ? row.length - 1 - rx : rx;
      ctx.fillRect(x + px * scale, y + ry * scale, scale, scale);
    }
  });
}
