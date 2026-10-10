/**
 * A small bitmap font drawn pixel by pixel, so canvas text is as crisp as the art around it.
 * Glyphs are rows of '#' (ink) and '.' (blank), separated by '|'. Capitals are 7 rows tall;
 * lowercase descenders use two extra rows below the baseline.
 */

const GLYPHS: Record<string, string> = {
  A: '.###.|#...#|#...#|#####|#...#|#...#|#...#',
  B: '####.|#...#|#...#|####.|#...#|#...#|####.',
  C: '.###.|#...#|#....|#....|#....|#...#|.###.',
  D: '####.|#...#|#...#|#...#|#...#|#...#|####.',
  E: '#####|#....|#....|####.|#....|#....|#####',
  F: '#####|#....|#....|####.|#....|#....|#....',
  G: '.###.|#...#|#....|#.###|#...#|#...#|.####',
  H: '#...#|#...#|#...#|#####|#...#|#...#|#...#',
  I: '###|.#.|.#.|.#.|.#.|.#.|###',
  J: '..###|...#.|...#.|...#.|...#.|#..#.|.##..',
  K: '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#',
  L: '#....|#....|#....|#....|#....|#....|#####',
  M: '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#',
  N: '#...#|#...#|##..#|#.#.#|#..##|#...#|#...#',
  O: '.###.|#...#|#...#|#...#|#...#|#...#|.###.',
  P: '####.|#...#|#...#|####.|#....|#....|#....',
  Q: '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#',
  R: '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
  S: '.####|#....|#....|.###.|....#|....#|####.',
  T: '#####|..#..|..#..|..#..|..#..|..#..|..#..',
  U: '#...#|#...#|#...#|#...#|#...#|#...#|.###.',
  V: '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..',
  W: '#...#|#...#|#...#|#.#.#|#.#.#|#.#.#|.#.#.',
  X: '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
  Y: '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..',
  Z: '#####|....#|...#.|..#..|.#...|#....|#####',
  a: '.....|.....|.###.|....#|.####|#...#|.####',
  b: '#....|#....|####.|#...#|#...#|#...#|####.',
  c: '....|....|.###|#...|#...|#...|.###',
  d: '....#|....#|.####|#...#|#...#|#...#|.####',
  e: '.....|.....|.###.|#...#|#####|#....|.###.',
  f: '..##|.#..|####|.#..|.#..|.#..|.#..',
  g: '.....|.....|.####|#...#|#...#|#...#|.####|....#|.###.',
  h: '#....|#....|####.|#...#|#...#|#...#|#...#',
  i: '.#.|...|##.|.#.|.#.|.#.|###',
  j: '...#|....|..##|...#|...#|...#|...#|#..#|.##.',
  k: '#...|#...|#..#|#.#.|##..|#.#.|#..#',
  l: '##.|.#.|.#.|.#.|.#.|.#.|###',
  m: '.....|.....|##.#.|#.#.#|#.#.#|#.#.#|#...#',
  n: '.....|.....|####.|#...#|#...#|#...#|#...#',
  o: '.....|.....|.###.|#...#|#...#|#...#|.###.',
  p: '.....|.....|####.|#...#|#...#|#...#|####.|#....|#....',
  q: '.....|.....|.####|#...#|#...#|#...#|.####|....#|....#',
  r: '....|....|#.##|##..|#...|#...|#...',
  s: '.....|.....|.####|#....|.###.|....#|####.',
  t: '.#..|.#..|####|.#..|.#..|.#..|..##',
  u: '.....|.....|#...#|#...#|#...#|#...#|.####',
  v: '.....|.....|#...#|#...#|#...#|.#.#.|..#..',
  w: '.....|.....|#...#|#...#|#.#.#|#.#.#|.#.#.',
  x: '.....|.....|#...#|.#.#.|..#..|.#.#.|#...#',
  y: '.....|.....|#...#|#...#|#...#|#...#|.####|....#|.###.',
  z: '.....|.....|#####|...#.|..#..|.#...|#####',
  '0': '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.',
  '1': '..#..|.##..|..#..|..#..|..#..|..#..|.###.',
  '2': '.###.|#...#|....#|...#.|..#..|.#...|#####',
  '3': '####.|....#|....#|.###.|....#|....#|####.',
  '4': '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.',
  '5': '#####|#....|####.|....#|....#|#...#|.###.',
  '6': '.###.|#....|#....|####.|#...#|#...#|.###.',
  '7': '#####|....#|...#.|..#..|..#..|..#..|..#..',
  '8': '.###.|#...#|#...#|.###.|#...#|#...#|.###.',
  '9': '.###.|#...#|#...#|.####|....#|....#|.###.',
  ' ': '...|...|...|...|...|...|...',
  '.': '.|.|.|.|.|.|#',
  ',': '..|..|..|..|..|..|.#|#.',
  '!': '#|#|#|#|#|.|#',
  '?': '.###.|#...#|....#|...#.|..#..|.....|..#..',
  "'": '#|#|.|.|.|.|.',
  '"': '#.#|#.#|...|...|...|...|...',
  '(': '.#|#.|#.|#.|#.|#.|.#',
  ')': '#.|.#|.#|.#|.#|.#|#.',
  '-': '....|....|....|####|....|....|....',
  '+': '.....|..#..|..#..|#####|..#..|..#..|.....',
  ':': '.|.|#|.|.|#|.',
  '/': '....#|...#.|...#.|..#..|.#...|.#...|#....',
  '%': '##..#|##.#.|...#.|..#..|.#...|.#.##|#..##',
};

/** Height of a capital letter; descenders go up to 2px lower. */
export const FONT_HEIGHT = 7;
const LINE_DROP = 2;

interface Glyph {
  width: number;
  rows: string[];
}

const glyphs = new Map<string, Glyph>(
  Object.entries(GLYPHS).map(([ch, def]) => {
    const rows = def.split('|');
    return [ch, { width: Math.max(...rows.map((r) => r.length)), rows }];
  }),
);
const fallback = glyphs.get('?') as Glyph;
const glyphFor = (ch: string): Glyph => glyphs.get(ch) ?? fallback;

/** Width in pixels of `text` at `scale`, including the 1px gaps between letters. */
export function textWidth(text: string, scale = 1): number {
  let w = 0;
  for (const ch of text) w += glyphFor(ch).width + 1;
  return Math.max(0, w - 1) * scale;
}

export interface TextStyle {
  color: string;
  scale?: number;
  /** A 1px (times scale) outline around every letter, for text over busy art. */
  outline?: string;
  align?: 'left' | 'center' | 'right';
}

// Rendering text pixel by pixel every frame is wasteful, so each string/style is drawn once and reused.
const cache = new Map<string, HTMLCanvasElement>();
const CACHE_LIMIT = 300;

function render(text: string, style: TextStyle): HTMLCanvasElement {
  const key = `${style.color}|${style.outline ?? ''}|${style.scale ?? 1}|${text}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const s = style.scale ?? 1;
  const pad = style.outline ? s : 0;
  const canvas = document.createElement('canvas');
  canvas.width = textWidth(text, s) + pad * 2;
  canvas.height = (FONT_HEIGHT + LINE_DROP) * s + pad * 2;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const ink = (color: string, dx: number, dy: number): void => {
    ctx.fillStyle = color;
    let x = pad;
    for (const ch of text) {
      const g = glyphFor(ch);
      g.rows.forEach((row, ry) => {
        for (let rx = 0; rx < row.length; rx++) {
          if (row[rx] === '#') ctx.fillRect(x + rx * s + dx, pad + ry * s + dy, s, s);
        }
      });
      x += (g.width + 1) * s;
    }
  };
  if (style.outline) {
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      ink(style.outline, dx * s, dy * s);
    }
  }
  ink(style.color, 0, 0);
  if (cache.size >= CACHE_LIMIT) cache.clear();
  cache.set(key, canvas);
  return canvas;
}

/** Draws `text` with its top-left (or top-centre / top-right, per `align`) at x, y. */
export function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, style: TextStyle): void {
  const img = render(text, style);
  const pad = style.outline ? (style.scale ?? 1) : 0;
  const w = img.width - pad * 2;
  const left = style.align === 'center' ? x - w / 2 : style.align === 'right' ? x - w : x;
  ctx.drawImage(img, Math.round(left - pad), Math.round(y - pad));
}
