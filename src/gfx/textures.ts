import { Rng } from '../rules/rng';
import type { DungeonTheme } from '../rules/types';

/**
 * Wall, floor and ceiling textures for the first-person view, painted in code from a level's
 * theme colours (so the game still ships no image files). Each texture is pre-shaded into
 * LIGHT_LEVELS + 1 brightness steps, so the renderer only has to look colours up.
 */

export const TEX = 32;
export const LIGHT_LEVELS = 20;

export interface Texture {
  /** One TEX*TEX array of packed pixels per light level (0 = darkest). Alpha 0 means see-through. */
  levels: Uint32Array[];
}

export interface ThemeTextures {
  wall: Texture;
  /** Decorated walls (a torch sconce, a rune...) used on some wall faces; two frames, for flicker. */
  feature: [Texture, Texture];
  floor: Texture;
  /** Used on every other square (checkerboard), so floors can alternate. */
  floorAlt: Texture;
  ceiling: Texture;
  /** A doorway arch with a see-through opening. */
  door: Texture;
  /** A locked door, shut. */
  doorShut: Texture;
  stairsDown: Texture;
  stairsUpFloor: Texture;
  /** The lit hatch overhead where stairs lead up. */
  hatch: Texture;
}

type RGB = [number, number, number];

const parse = (hex: string): RGB => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mul = (c: RGB, f: number): RGB => [c[0] * f, c[1] * f, c[2] * f];

/** A TEX x TEX painting surface with per-pixel colour, opacity and "glows in the dark". */
class Paint {
  readonly rgb: RGB[] = Array.from({ length: TEX * TEX }, () => [0, 0, 0] as RGB);
  readonly solid = new Uint8Array(TEX * TEX).fill(1);
  readonly glow = new Uint8Array(TEX * TEX);

  set(x: number, y: number, c: RGB, glow = false): void {
    if (x < 0 || y < 0 || x >= TEX || y >= TEX) return;
    const i = y * TEX + x;
    this.rgb[i] = c;
    this.solid[i] = 1;
    this.glow[i] = glow ? 1 : 0;
  }

  get(x: number, y: number): RGB {
    return this.rgb[((y + TEX) % TEX) * TEX + ((x + TEX) % TEX)];
  }

  rect(x: number, y: number, w: number, h: number, c: RGB | ((x: number, y: number) => RGB), glow = false): void {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.set(xx, yy, typeof c === 'function' ? c(xx, yy) : c, glow);
  }

  clear(x: number, y: number, w: number, h: number): void {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.solid[yy * TEX + xx] = 0;
  }

  /** Multiplies the colour already there, e.g. for highlights and shadows. */
  tint(x: number, y: number, f: number): void {
    if (x < 0 || y < 0 || x >= TEX || y >= TEX) return;
    const i = y * TEX + x;
    this.rgb[i] = mul(this.rgb[i], f);
  }

  /** A clone, so variants can be painted on top of a base texture. */
  copy(): Paint {
    const p = new Paint();
    this.rgb.forEach((c, i) => (p.rgb[i] = [...c] as RGB));
    p.solid.set(this.solid);
    p.glow.set(this.glow);
    return p;
  }

  /** Bakes the light levels. Bright pixels get a slight warm torch tint; glowing ones stay lit. */
  bake(): Texture {
    const levels: Uint32Array[] = [];
    for (let k = 0; k <= LIGHT_LEVELS; k++) {
      const b = k / LIGHT_LEVELS;
      const out = new Uint32Array(TEX * TEX);
      for (let i = 0; i < out.length; i++) {
        if (!this.solid[i]) continue;
        const [r, g, bl] = this.rgb[i];
        const f = this.glow[i] ? Math.max(b, 0.85) : b;
        const warm = this.glow[i] ? 0 : f * f * 0.14;
        out[i] = pack(r * f * (1 + warm), g * f * (1 + warm * 0.4), bl * f * (1 - warm * 0.5));
      }
      levels.push(out);
    }
    return { levels };
  }
}

const byte = (v: number): number => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));
/** Packs a colour as the canvas ImageData expects it on little-endian machines (ABGR). */
export const pack = (r: number, g: number, b: number, a = 255): number =>
  ((a << 24) | (byte(b) << 16) | (byte(g) << 8) | byte(r)) >>> 0;

/** Rows of rectangular blocks with mortar, a highlight on top and a shadow underneath. */
function blocks(p: Paint, rng: Rng, base: RGB, bw: number, bh: number, mortar: RGB, variation: number): void {
  for (let row = 0; row * bh < TEX; row++) {
    const offset = row % 2 ? bw / 2 : 0;
    for (let col = -1; col * bw < TEX; col++) {
      const x0 = col * bw + offset;
      const shade = 1 + (rng.next() - 0.5) * variation;
      const tone = mix(mul(base, shade), [rng.int(0, 40), rng.int(0, 30), rng.int(0, 20)], 0.06);
      for (let y = row * bh; y < row * bh + bh; y++) {
        for (let x = x0; x < x0 + bw; x++) {
          const edgeX = x === x0 || x === x0 + bw - 1;
          const edgeY = y === row * bh + bh - 1;
          if (edgeX || edgeY) {
            p.set(((x % TEX) + TEX) % TEX, y, mortar);
            continue;
          }
          let c = mul(tone, 1 + (rng.next() - 0.5) * 0.12);
          if (y === row * bh) c = mul(c, 1.18);
          else if (y === row * bh + bh - 2) c = mul(c, 0.8);
          if (x === x0 + 1) c = mul(c, 1.08);
          p.set(((x % TEX) + TEX) % TEX, y, c);
        }
      }
    }
  }
}

/** A wandering dark crack. */
function crack(p: Paint, rng: Rng, x: number, y: number, length: number): void {
  for (let i = 0; i < length; i++) {
    p.tint(x, y, 0.55);
    x += rng.int(-1, 1);
    y += 1;
  }
}

/** A soft patch of colour, e.g. moss. */
function blotch(p: Paint, rng: Rng, cx: number, cy: number, r: number, color: RGB): void {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const d = Math.hypot(x - cx, y - cy) / r;
      if (d < 1 && rng.next() > d * 0.9) {
        const xx = ((x % TEX) + TEX) % TEX;
        const yy = ((y % TEX) + TEX) % TEX;
        p.set(xx, yy, mix(p.get(xx, yy), mul(color, 0.8 + rng.next() * 0.4), 0.75));
      }
    }
  }
}

function speckle(p: Paint, rng: Rng, count: number, f: () => number): void {
  for (let i = 0; i < count; i++) p.tint(rng.int(0, TEX - 1), rng.int(0, TEX - 1), f());
}

/** A wall torch: an iron bracket and a flame that glows (two frames for flicker). */
function sconce(base: Paint, frame: number): Paint {
  const p = base.copy();
  const iron: RGB = [40, 36, 40];
  p.rect(14, 16, 4, 2, iron);
  p.rect(15, 18, 2, 6, iron);
  p.rect(13, 14, 6, 2, [70, 50, 30]);
  const flame: [number, number, RGB][] = frame === 0
    ? [[15, 13, [255, 210, 90]], [16, 13, [255, 210, 90]], [15, 12, [255, 160, 50]], [16, 11, [255, 240, 160]], [15, 10, [255, 130, 40]], [14, 12, [230, 100, 30]], [17, 12, [255, 150, 40]]]
    : [[15, 13, [255, 210, 90]], [16, 13, [255, 200, 80]], [16, 12, [255, 160, 50]], [15, 11, [255, 240, 160]], [16, 10, [255, 130, 40]], [17, 12, [230, 100, 30]], [14, 12, [255, 150, 40]]];
  for (const [x, y, c] of flame) p.set(x, y, c, true);
  // Warm light washing the stones around the flame.
  for (let y = 4; y < 26; y++) {
    for (let x = 6; x < 26; x++) {
      const d = Math.hypot(x - 15.5, y - 12) / 11;
      if (d < 1 && !p.glow[y * TEX + x]) p.set(x, y, mix(p.get(x, y), mul(p.get(x, y), 1.6), (1 - d) * 0.6));
    }
  }
  return p;
}

const RUNES = [
  ['.###.', '#...#', '..#..', '.#.#.', '#...#'],
  ['#.#.#', '.###.', '..#..', '.###.', '#.#.#'],
];

function rune(base: Paint, frame: number, color: RGB): Paint {
  const p = base.copy();
  const glyph = RUNES[0];
  const c = frame === 0 ? color : mul(color, 0.8);
  glyph.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '#') {
        p.set(14 + x, 9 + y * 2, c, true);
        p.set(14 + x, 10 + y * 2, mul(c, 0.85), true);
      }
    }
  });
  return p;
}

function doorway(wall: Paint, door: RGB): Paint {
  const p = wall.copy();
  const wood = door;
  const dark = mul(door, 0.6);
  // Wooden frame inside the stone, then an opening you can see through.
  p.rect(5, 6, 22, 26, (x, y) => mul(wood, 0.9 + ((x + y * 3) % 5) * 0.04));
  p.rect(5, 6, 22, 1, mul(wood, 1.25));
  p.rect(5, 6, 1, 26, mul(wood, 1.15));
  p.rect(26, 6, 1, 26, dark);
  for (const x of [7, 24]) p.rect(x, 11, 1, 1, [30, 26, 30]); // nail heads
  p.clear(8, 10, 16, 22);
  return p;
}

function shutDoor(wall: Paint, door: RGB): Paint {
  const p = doorway(wall, door);
  // Fill the opening with planks, then iron bands and a keyhole.
  p.rect(8, 10, 16, 22, (x) => mul(door, 0.75 + (x % 4 === 0 ? -0.15 : 0.05)));
  for (const y of [13, 25]) {
    p.rect(8, y, 16, 2, [58, 52, 60]);
    p.rect(8, y, 16, 1, [96, 90, 100]);
  }
  p.rect(19, 18, 3, 3, [40, 36, 40]);
  p.rect(20, 19, 1, 3, [14, 12, 20]);
  return p;
}

function stairsDown(floor: Paint, rng: Rng): Paint {
  const p = floor.copy();
  // A square opening with steps going down into the dark.
  p.rect(5, 5, 22, 22, [10, 8, 14]);
  for (let s = 0; s < 4; s++) {
    const y = 7 + s * 5;
    const tone = mul(p.get(2, 2), 0.9 - s * 0.22);
    p.rect(6, y, 20, 3, (x) => mul(tone, 0.95 + rng.next() * 0.1 + (x === 6 ? 0.1 : 0)));
    p.rect(6, y, 20, 1, mul(tone, 1.25));
  }
  p.rect(4, 4, 24, 1, [20, 16, 22]);
  p.rect(4, 27, 24, 1, [20, 16, 22]);
  return p;
}

function hatch(ceiling: Paint): Paint {
  const p = ceiling.copy();
  p.rect(6, 6, 20, 20, [70, 50, 32]);
  p.rect(8, 8, 16, 16, [255, 226, 150], true);
  p.rect(8, 8, 16, 1, [255, 244, 200], true);
  for (const x of [11, 15, 19]) p.rect(x, 8, 1, 16, [120, 90, 50]); // ladder seen from below
  return p;
}

function lightPool(floor: Paint): Paint {
  const p = floor.copy();
  for (let y = 0; y < TEX; y++) {
    for (let x = 0; x < TEX; x++) {
      const d = Math.hypot(x - 15.5, y - 15.5) / 15;
      if (d < 1) p.set(x, y, mix(p.get(x, y), [230, 200, 140], (1 - d) * 0.45), d < 0.55);
    }
  }
  return p;
}

function build(theme: DungeonTheme): ThemeTextures {
  const style = theme.style ?? 'brick';
  const rng = new Rng(theme.wall.length * 7919 + parseInt(theme.wall.slice(1), 16));
  const wallC = parse(theme.wall);
  const floorC = parse(theme.floor);
  const ceilC = parse(theme.ceiling);

  const wall = new Paint();
  const floor = new Paint();
  let floorAlt: Paint | null = null;
  const ceiling = new Paint();

  if (style === 'stone') {
    blocks(wall, rng, wallC, 16, 11, mul(wallC, 0.45), 0.3);
    for (let i = 0; i < 3; i++) crack(wall, rng, rng.int(2, 29), rng.int(0, 12), rng.int(5, 12));
    for (let i = 0; i < 3; i++) blotch(wall, rng, rng.int(0, 31), rng.pick([2, 29, 30]), rng.int(3, 5), [70, 110, 60]);
    speckle(wall, rng, 60, () => 0.85 + rng.next() * 0.3);
    blocks(floor, rng, floorC, 16, 16, mul(floorC, 0.55), 0.25);
    for (let i = 0; i < 2; i++) crack(floor, rng, rng.int(2, 29), rng.int(0, 20), rng.int(4, 9));
    speckle(floor, rng, 80, () => 0.8 + rng.next() * 0.4);
    blocks(ceiling, rng, ceilC, 16, 16, mul(ceilC, 0.5), 0.3);
    blotch(ceiling, rng, 8, 8, 4, mul(wallC, 0.5));
  } else if (style === 'rune') {
    blocks(wall, rng, wallC, 32, 8, mul(wallC, 0.55), 0.18);
    speckle(wall, rng, 40, () => 0.9 + rng.next() * 0.2);
    // One polished tile per square, light and dark in turn, each with a gold inlay border.
    const tile = (tone: number): Paint => {
      const p = new Paint();
      p.rect(0, 0, TEX, TEX, () => mul(floorC, tone * (0.95 + rng.next() * 0.1)));
      p.rect(0, 0, TEX, 1, mul(floorC, 0.55));
      p.rect(0, 0, 1, TEX, mul(floorC, 0.55));
      for (const [x, y, w, h] of [[4, 4, 24, 1], [4, 27, 24, 1], [4, 4, 1, 24], [27, 4, 1, 24]]) p.rect(x, y, w, h, [176, 140, 70]);
      p.rect(15, 15, 2, 2, [200, 160, 80]);
      return p;
    };
    floor.rgb.splice(0, TEX * TEX, ...tile(1.3).rgb);
    floorAlt = tile(0.85);
    blocks(ceiling, rng, ceilC, 32, 16, mul(ceilC, 0.6), 0.2);
  } else {
    blocks(wall, rng, wallC, 10, 5, mul(wallC, 0.5), 0.32);
    speckle(wall, rng, 50, () => 0.85 + rng.next() * 0.3);
    // Packed earth with pebbles.
    floor.rect(0, 0, TEX, TEX, () => mul(floorC, 0.9 + rng.next() * 0.2));
    for (let i = 0; i < 14; i++) {
      const x = rng.int(0, 30);
      const y = rng.int(0, 30);
      const c = mul(floorC, 1.3 + rng.next() * 0.3);
      floor.rect(x, y, 2, 1, c);
      floor.set(x, y + 1, mul(floorC, 0.7));
    }
    // Planks between wooden beams that cross at every square, so it looks right from any side.
    ceiling.rect(0, 0, TEX, TEX, (x, y) => mul(ceilC, 1.1 + ((y >> 2) % 2) * 0.12 + (x % 7 === 0 ? -0.15 : 0)));
    const beam: RGB = [96, 66, 40];
    ceiling.rect(0, 0, TEX, 5, (x) => mul(beam, 0.8 + ((x * 5) % 7) * 0.04));
    ceiling.rect(0, 0, 5, TEX, (_x, y) => mul(beam, 0.8 + ((y * 5) % 7) * 0.04));
    ceiling.rect(0, 5, TEX, 1, [36, 26, 18]);
    ceiling.rect(5, 0, 1, TEX, [36, 26, 18]);
  }

  const feature: [Paint, Paint] =
    style === 'rune' ? [rune(wall, 0, [220, 120, 255]), rune(wall, 1, [220, 120, 255])] : [sconce(wall, 0), sconce(wall, 1)];

  return {
    wall: wall.bake(),
    feature: [feature[0].bake(), feature[1].bake()],
    floor: floor.bake(),
    floorAlt: (floorAlt ?? floor).bake(),
    ceiling: ceiling.bake(),
    door: doorway(wall, parse(theme.door)).bake(),
    doorShut: shutDoor(wall, parse(theme.door)).bake(),
    stairsDown: stairsDown(floor, rng).bake(),
    stairsUpFloor: lightPool(floor).bake(),
    hatch: hatch(ceiling).bake(),
  };
}

const cache = new Map<string, ThemeTextures>();

/** The textures for a level theme, painted on first use. */
export function texturesFor(theme: DungeonTheme): ThemeTextures {
  const key = `${theme.style ?? 'brick'}|${theme.wall}|${theme.floor}|${theme.ceiling}|${theme.door}`;
  let t = cache.get(key);
  if (!t) {
    t = build(theme);
    cache.set(key, t);
  }
  return t;
}
