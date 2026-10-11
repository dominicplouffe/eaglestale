import { Rng } from '../rules/rng';
import type { DungeonTheme, Landmark, PlaceId } from '../rules/types';

/**
 * Wall, floor and ceiling textures for the first-person view, painted in code from a level's
 * theme colours (so the game still ships no image files). Each texture is pre-shaded into
 * LIGHT_LEVELS + 1 brightness steps, so the renderer only has to look colours up.
 */

export const TEX = 32;
export const LIGHT_LEVELS = 20;
/**
 * Wall faces are drawn about this many times wider than they are tall, so anything meant to look round
 * on a wall (a gear, a dial) is painted this much narrower.
 */
const WALL_ASPECT = 1.7;

export interface Texture {
  /** One TEX*TEX array of packed pixels per light level (0 = darkest). Alpha 0 means see-through. */
  levels: Uint32Array[];
}

export interface ThemeTextures {
  wall: Texture;
  /** Decorated walls (a torch sconce, a rune...) used on some wall faces; two frames, for flicker. */
  feature: [Texture, Texture];
  /** One wall face in this many gets the feature (a window in town is much commoner than a torch). */
  featureEvery: number;
  /** How many storeys tall walls are; the ones above the ground floor use `upper`. */
  storeys: number;
  /** Upper-storey faces (chosen per face), with the eaves on top. */
  upper: Texture[];
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
  /** The brass mouth of a tube (a teleport square). */
  pad: Texture;
  /** A building's front door, with a hanging sign for the places in town. */
  buildingDoor: Texture;
  signs: Partial<Record<PlaceId, Texture>>;
  /** Grand buildings: their faces from the top storey down (the ground storey has two variants). */
  landmarks: Record<Landmark['look'], LandmarkTextures>;
}

export interface LandmarkTextures {
  /** Storeys above the ground floor, top first; each storey has one or more faces to vary between. */
  above: Texture[][];
  ground: Texture;
  /** Its front door, set in its own stone. */
  door: Texture;
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

/** A round brass hatch with a glowing ring: the mouth of a pneumatic tube. */
function tubeMouth(floor: Paint): Paint {
  const p = floor.copy();
  for (let y = 0; y < TEX; y++) {
    for (let x = 0; x < TEX; x++) {
      const d = Math.hypot(x - 15.5, y - 15.5);
      if (d < 13) p.set(x, y, d > 11 ? [196, 150, 70] : d > 9.5 ? [120, 220, 255] : d < 2 ? [60, 50, 40] : [70, 60, 50], d > 9.5 && d <= 11);
      if (d >= 2 && d < 9.5 && (Math.round(Math.atan2(y - 15.5, x - 15.5) * 3) % 2 === 0)) p.set(x, y, [90, 76, 60]);
    }
  }
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


const TIMBER: RGB = [74, 50, 34];

/** Half-timbered plaster over a stone plinth: the houses of Talonreach. */
function timbered(p: Paint, rng: Rng, plaster: RGB): void {
  p.rect(0, 0, TEX, 26, () => mul(plaster, 0.94 + rng.next() * 0.1));
  for (let i = 0; i < 4; i++) blotch(p, rng, rng.int(2, 29), rng.int(3, 22), rng.int(2, 4), mul(plaster, 0.82));
  const beam = (x: number, y: number, w: number, h: number): void =>
    p.rect(x, y, w, h, (xx, yy) => mul(TIMBER, 0.85 + ((xx * 7 + yy * 3) % 5) * 0.06));
  beam(0, 0, TEX, 2);
  beam(0, 23, TEX, 3);
  beam(0, 0, 2, 26);
  beam(30, 0, 2, 26);
  beam(15, 2, 2, 21);
  // Diagonal braces, one each side of the middle post.
  for (let i = 0; i < 12; i++) {
    p.rect(3 + i, 21 - Math.round(i * 1.6), 2, 2, mul(TIMBER, 0.9));
    p.rect(27 - i, 21 - Math.round(i * 1.6), 2, 2, mul(TIMBER, 0.9));
  }
  p.rect(0, 2, TEX, 1, mul(plaster, 0.7)); // shadow under the top beam
  // Stone plinth.
  for (let x = 0; x < TEX; x++) for (let y = 26; y < TEX; y++) {
    const block = ((x + (y > 28 ? 5 : 0)) >> 3) % 2;
    const edge = x % 8 === (y > 28 ? 3 : 0) || y === 28 || y === 31;
    p.set(x, y, edge ? [48, 46, 52] : mul([128, 124, 120], 0.85 + block * 0.1 + rng.next() * 0.08));
  }
  p.rect(0, 26, TEX, 1, [150, 146, 140]);
}

/** A lit window with shutters (the second frame is a touch dimmer, like a candle guttering). */
function cityWindow(base: Paint, frame: number, shutter: RGB): Paint {
  const p = base.copy();
  const glass: RGB = frame === 0 ? [255, 214, 120] : [240, 196, 104];
  p.rect(8, 5, 16, 14, TIMBER);
  p.rect(9, 6, 14, 12, glass, true);
  p.rect(9, 6, 14, 2, [255, 236, 170], true);
  p.rect(15, 6, 2, 12, mul(TIMBER, 1.1));
  p.rect(9, 11, 14, 1, mul(TIMBER, 1.1));
  // A shadowy figure in one pane, for life.
  p.rect(19, 13, 2, 5, [150, 110, 60], true);
  p.rect(19, 12, 2, 1, [130, 96, 52], true);
  for (const x of [4, 24]) p.rect(x, 5, 4, 14, (xx, yy) => mul(shutter, 0.85 + ((xx + yy) % 3) * 0.08));
  p.rect(7, 19, 18, 2, mul(TIMBER, 1.2)); // sill
  p.rect(8, 21, 16, 2, [120, 70, 40]); // flower box
  for (const [x, c] of [[9, [220, 70, 90]], [12, [240, 200, 70]], [16, [220, 70, 90]], [20, [180, 110, 220]]] as [number, RGB][]) {
    p.set(x, 20, c);
    p.set(x + 1, 20, [70, 140, 60]);
  }
  return p;
}

/** An upper storey: plaster and timber, a window (lit or shuttered) and the tiled eaves of the roof. */
function upperStorey(base: Paint, rng: Rng, lit: boolean, shutter: RGB): Paint {
  const p = base.copy();
  // Clear the plinth: the upper floor is plaster all the way down.
  p.rect(0, 26, TEX, 6, (x, y) => mul(p.get(x, 10 + (y % 6)), 1));
  p.rect(0, 30, TEX, 2, TIMBER);
  const roof: RGB = [112, 58, 48];
  p.rect(0, 0, TEX, 6, (x, y) => mul(roof, (y % 3 === 2 ? 0.7 : 1) * (0.88 + (((x + (y >> 1) * 3) >> 2) % 2) * 0.14) * (0.95 + rng.next() * 0.1)));
  for (let x = 0; x < TEX; x += 4) p.set(x, 5, mul(roof, 0.55));
  p.rect(0, 6, TEX, 2, [40, 30, 28]); // shadow under the eaves
  if (lit) {
    const w = cityWindow(new Paint(), 0, shutter);
    for (let y = 5; y < 21; y++) for (let x = 4; x < 28; x++) if (w.solid[y * TEX + x] && (x >= 8 && x < 24 ? y < 19 : true)) {
      const c = w.get(x, y);
      if (c[0] + c[1] + c[2] > 0) p.set(x, y + 5, c, !!w.glow[y * TEX + x]);
    }
  } else {
    p.rect(11, 12, 10, 12, TIMBER);
    p.rect(12, 13, 8, 10, (x) => mul(shutter, 0.8 + (x % 2) * 0.1));
    p.rect(15, 13, 2, 10, mul(shutter, 0.55));
  }
  return p;
}

/** Rounded cobbles in uneven rows. */
function cobbles(p: Paint, rng: Rng, stone: RGB): void {
  p.rect(0, 0, TEX, TEX, mul(stone, 0.35));
  for (let row = 0; row < 4; row++) {
    const off = rng.int(0, 7);
    for (let col = -1; col < 5; col++) {
      const x0 = col * 8 + off;
      const y0 = row * 8;
      const tone = mul(stone, 0.8 + rng.next() * 0.35);
      for (let y = y0 + 1; y < y0 + 7; y++) {
        for (let x = x0 + 1; x < x0 + 7; x++) {
          const dx = (x - (x0 + 3.5)) / 3.2;
          const dy = (y - (y0 + 3.5)) / 3.2;
          if (dx * dx + dy * dy > 1.05) continue;
          const lit = dy < -0.3 ? 1.2 : dy > 0.4 ? 0.8 : 1;
          p.set(((x % TEX) + TEX) % TEX, y, mul(tone, lit));
        }
      }
    }
  }
}

/** Old brick sweating green slime, with a damp tide-line near the floor. */
function sewerWall(p: Paint, rng: Rng, brick: RGB): void {
  blocks(p, rng, brick, 12, 6, mul(brick, 0.45), 0.3);
  for (let i = 0; i < 6; i++) {
    let x = rng.int(0, 31);
    const len = rng.int(6, 20);
    for (let y = 0; y < len; y++) {
      p.set(x, y, mix(p.get(x, y), [90, 140, 60], 0.55 - y / (len * 2.5)));
      if (rng.chance(0.15)) x = (x + rng.int(-1, 1) + TEX) % TEX;
    }
  }
  for (let x = 0; x < TEX; x++) for (let y = 26; y < TEX; y++) p.set(x, y, mix(p.get(x, y), [40, 52, 40], 0.35 + (y - 26) * 0.08));
  speckle(p, rng, 50, () => 0.85 + rng.next() * 0.3);
}

/** A rusty outflow pipe trickling into the channel (two frames of trickle). */
function pipe(base: Paint, frame: number): Paint {
  const p = base.copy();
  const iron: RGB = [96, 70, 54];
  for (let y = 9; y < 19; y++) for (let x = 10; x < 22; x++) {
    const dx = (x - 15.5) / 6;
    const dy = (y - 13.5) / 5;
    const d = dx * dx + dy * dy;
    if (d <= 1) p.set(x, y, d > 0.55 ? mul(iron, 1.1 - dy * 0.3) : [16, 18, 16]);
  }
  for (let y = 19; y < 30; y++) {
    const wobble = (y + frame * 2) % 4 < 2 ? 0 : 1;
    p.set(15 + wobble, y, [120, 170, 150]);
    p.set(16 + wobble, y, [90, 140, 130]);
  }
  p.rect(12, 29, 8, 2, [100, 150, 140]);
  return p;
}

/** An iron sluice gate, riveted, shut. */
function sluiceGate(wall: Paint): Paint {
  const p = wall.copy();
  p.rect(4, 3, 24, 29, (x, y) => mul([92, 88, 84], 0.85 + ((x * 3 + y) % 4) * 0.05));
  for (let x = 6; x < 26; x += 4) p.rect(x, 3, 1, 29, [60, 56, 54]);
  for (const y of [6, 16, 27]) {
    p.rect(4, y, 24, 2, [70, 64, 60]);
    for (let x = 6; x < 27; x += 5) p.set(x, y, [150, 146, 140]);
  }
  p.rect(4, 3, 24, 1, [130, 124, 118]);
  for (let i = 0; i < 6; i++) p.set(8 + i * 3, 30, [140, 80, 40]); // rust at the waterline
  return p;
}

/** Tiny signboard pictures, 8x6, for the places in town. 'x' dark, 'o' gold, 'w' light. */
const SIGNS: Record<PlaceId, string[]> = {
  guild: ['x......x', '.x....x.', '..x..x..', '...xx...', '..x..x..', '.o....o.'],
  shop: ['...oo...', '..o..o..', '.oooooo.', '.oowwoo.', '.oooooo.', '..oooo..'],
  temple: ['...ww...', '.w.ww.w.', 'wwwwwwww', '..wwww..', '...ww...', '..w..w..'],
  inn: ['.wwwww..', '.xxxxxww', '.xxxxx.w', '.xxxxxww', '.xxxxx..', '..xxx...'],
  tower: ['......o.', '.....oo.', '....ooo.', '...ooo..', '..oo....', '.o......'],
};

function buildingDoor(wall: Paint, door: RGB, sign?: string[]): Paint {
  const p = wall.copy();
  // Stone step and frame, then an arched plank door with an iron ring.
  p.rect(8, 28, 16, 4, [150, 146, 140]);
  p.rect(8, 28, 16, 1, [180, 176, 168]);
  p.rect(9, 11, 14, 17, TIMBER);
  p.rect(10, 12, 12, 16, (x) => mul(door, 0.8 + (x % 3 === 0 ? -0.18 : 0.06)));
  for (const [x, y] of [[10, 12], [11, 12], [10, 13], [21, 12], [20, 12], [21, 13]]) p.set(x, y, TIMBER);
  p.rect(10, 17, 12, 1, [56, 50, 56]);
  p.rect(10, 23, 12, 1, [56, 50, 56]);
  p.rect(18, 19, 2, 2, [200, 170, 80]);
  if (!sign) {
    // A small lantern beside the door.
    p.rect(24, 12, 3, 4, [255, 220, 130], true);
    p.rect(24, 11, 3, 1, [40, 36, 40]);
    return p;
  }
  // A signboard hanging from an iron bracket above the door.
  p.rect(6, 1, 20, 1, [40, 36, 40]);
  p.rect(8, 2, 1, 1, [40, 36, 40]);
  p.rect(23, 2, 1, 1, [40, 36, 40]);
  p.rect(7, 3, 18, 8, [120, 84, 48]);
  p.rect(7, 3, 18, 1, [150, 110, 64]);
  const ink: Record<string, RGB> = { x: [30, 24, 30], o: [240, 200, 80], w: [244, 240, 228] };
  sign.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (ink[row[x]]) p.set(12 + x, 4 + y, ink[row[x]]);
  });
  return p;
}


/** Big dressed stone blocks, for the tower. */
function ashlar(p: Paint, rng: Rng, base: RGB): void {
  blocks(p, rng, base, 16, 8, mul(base, 0.55), 0.18);
  speckle(p, rng, 40, () => 0.88 + rng.next() * 0.24);
}

function arrowSlit(base: Paint): Paint {
  const p = base.copy();
  p.rect(15, 8, 2, 16, [18, 16, 24]);
  p.rect(13, 14, 6, 2, [18, 16, 24]);
  return p;
}

/** The tower's top: battlements against the sky, and Aquila's golden perch glinting between them. */
function battlements(base: Paint): Paint {
  const p = base.copy();
  p.clear(8, 0, 8, 9);
  p.clear(24, 0, 8, 9);
  p.rect(0, 9, TEX, 2, mul(p.get(4, 12), 0.7));
  p.rect(10, 4, 4, 5, [0, 0, 0]);
  p.clear(10, 4, 4, 5);
  p.rect(11, 6, 2, 3, [232, 190, 80], true);
  return p;
}

function clockFace(base: Paint, frame: number): Paint {
  const p = base.copy();
  for (let y = 0; y < TEX; y++) {
    for (let x = 0; x < TEX; x++) {
      const d = Math.hypot((x - 15.5) * WALL_ASPECT, y - 15.5);
      if (d < 13.5) p.set(x, y, d > 12.2 ? [176, 140, 64] : [236, 228, 204]);
    }
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    p.set(Math.round(15.5 + (Math.sin(a) * 10.5) / WALL_ASPECT), Math.round(15.5 - Math.cos(a) * 10.5), [40, 34, 40]);
  }
  // The hands, which (being Professor Pinion's) disagree about the time.
  const hand = (a: number, len: number): void => {
    for (let r = 0; r < len; r += 0.5) p.set(Math.round(15.5 + (Math.sin(a) * r) / WALL_ASPECT), Math.round(15.5 - Math.cos(a) * r), [30, 26, 34]);
  };
  hand(frame ? 1.9 : 2.0, 6);
  hand(frame ? 5.3 : 5.25, 9);
  return p;
}

function columns(p: Paint, rng: Rng, stone: RGB): void {
  p.rect(0, 0, TEX, TEX, () => mul(stone, 0.95 + rng.next() * 0.08));
  for (const cx of [3, 19]) {
    p.rect(cx, 3, 10, 26, (x) => mul(stone, 1.05 + ((x - cx) % 3 === 0 ? -0.12 : 0.04)));
    p.rect(cx - 1, 2, 12, 2, mul(stone, 1.15));
    p.rect(cx - 1, 28, 12, 3, mul(stone, 0.9));
  }
  p.rect(0, 0, TEX, 2, mul(stone, 0.8));
  for (const cx of [14, 30]) p.rect(cx, 4, 3, 24, mul(stone, 0.6)); // shadow behind the pillars
}

/** A tall arched window of coloured glass in lead, for the temple. */
function lancet(base: Paint): Paint {
  const p = base.copy();
  const glass: RGB[] = [[70, 100, 200], [200, 64, 76], [236, 190, 80], [80, 150, 110]];
  for (let y = 5; y < 29; y++) {
    for (let x = 10; x < 22; x++) {
      const arch = y < 11 ? Math.hypot(x - 15.5, y - 11) : Math.abs(x - 15.5);
      if (arch > 6) continue;
      if (arch > 5) {
        p.set(x, y, mul(p.get(x, y), 0.55));
        continue;
      }
      const lead = x === 15 || x === 16 || y % 5 === 0;
      p.set(x, y, lead ? [50, 46, 56] : glass[((x < 16 ? 0 : 1) + Math.floor(y / 5)) % glass.length], !lead);
    }
  }
  p.rect(0, 0, TEX, 3, mul(p.get(1, 28), 1.1)); // cornice
  return p;
}

function landmarkTextures(rng: Rng, doorWood: RGB): Record<Landmark['look'], { above: Paint[][]; ground: Paint; door: Paint }> {
  const towerWall = new Paint();
  ashlar(towerWall, rng, [150, 146, 150]);
  const brick = new Paint();
  blocks(brick, rng, [140, 64, 52], 10, 5, [70, 40, 40], 0.3);
  const brickWin = brick.copy();
  brickWin.rect(12, 8, 8, 14, [40, 30, 36]);
  brickWin.rect(12, 8, 8, 2, [90, 70, 50]);
  const marble = new Paint();
  columns(marble, rng, [222, 216, 200]);
  const upperMarble = marble.copy();
  upperMarble.rect(0, 0, TEX, 3, mul(marble.get(1, 28), 1.1));
  return {
    tower: {
      above: [[battlements(towerWall)], [arrowSlit(towerWall), towerWall], [towerWall, arrowSlit(towerWall)]],
      ground: towerWall,
      door: buildingDoor(towerWall, doorWood, SIGNS.tower),
    },
    clock: { above: [[clockFace(brick, 0)], [brickWin, brick], [brick]], ground: brick, door: buildingDoor(brick, [70, 60, 56]) },
    temple: { above: [[lancet(upperMarble), upperMarble]], ground: marble, door: buildingDoor(marble, [150, 110, 60], SIGNS.temple) },
  };
}


/** Riveted brass plates over a dark wooden wainscot, with a polished rail between. */
function clockworkWall(p: Paint, rng: Rng, brass: RGB, wood: RGB): void {
  for (let y = 0; y < 20; y++) {
    for (let x = 0; x < TEX; x++) {
      const seam = x % 16 === 0 || y === 0 || y === 10;
      const sheen = 1 + 0.18 * Math.sin((x + y * 0.6) / 5);
      p.set(x, y, seam ? mul(brass, 0.55) : mul(brass, (0.82 + rng.next() * 0.08) * sheen));
    }
  }
  for (let x = 3; x < TEX; x += 16) for (const y of [2, 8, 12, 18]) {
    p.set(x, y, mul(brass, 1.35));
    p.set(x + 10, y, mul(brass, 1.35));
  }
  p.rect(0, 20, TEX, 2, (x) => mul(brass, 1.25 - (x % 8) * 0.02));
  p.rect(0, 22, TEX, 1, mul(brass, 0.5));
  for (let x = 0; x < TEX; x++) {
    for (let y = 23; y < TEX; y++) {
      const edge = x % 8 === 0 || x % 8 === 7;
      p.set(x, y, mul(wood, edge ? 0.6 : 0.85 + ((x * 7 + y) % 5) * 0.04));
    }
  }
  speckle(p, rng, 30, () => 0.9 + rng.next() * 0.15);
}

/** A great gear turning on the wall (the second frame is a few degrees on). */
function wallGear(base: Paint, frame: number, brass: RGB): Paint {
  const p = base.copy();
  const turn = frame * (Math.PI / 16);
  for (let y = 0; y < 22; y++) {
    for (let x = 4; x < 28; x++) {
      const dx = (x - 15.5) * WALL_ASPECT;
      const dy = y - 10.5;
      const r = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx) + turn;
      const tooth = Math.cos(a * 8) > 0.2 ? 10.5 : 8.5;
      if (r > tooth) continue;
      if (r < 2) p.set(x, y, [40, 32, 28]);
      else if (r < 4) p.set(x, y, mul(brass, 1.3));
      else if (r < 7 && Math.cos(a * 4) > 0.55) p.set(x, y, [30, 24, 22]); // spokes' gaps
      else p.set(x, y, mul(brass, 0.95 + (dy < 0 ? 0.2 : -0.1) + (r > tooth - 1 ? -0.25 : 0)));
    }
  }
  return p;
}

/** Herringbone parquet. */
function parquet(p: Paint, rng: Rng, wood: RGB): void {
  for (let y = 0; y < TEX; y++) {
    for (let x = 0; x < TEX; x++) {
      const band = Math.floor((x + y) / 4) % 2;
      const block = Math.floor((band ? x - y + 64 : x + y) / 8);
      const edge = (band ? (x - y + 64) : (x + y)) % 8 === 0;
      p.set(x, y, edge ? mul(wood, 0.55) : mul(wood, 0.85 + (block % 3) * 0.08 + rng.next() * 0.04));
    }
  }
}

/** Beams and a copper pipe overhead. */
function pipeCeiling(p: Paint, wood: RGB): void {
  p.rect(0, 0, TEX, TEX, mul(wood, 0.55));
  p.rect(0, 0, TEX, 5, (x) => mul(wood, 0.9 + (x % 6 === 0 ? -0.2 : 0)));
  p.rect(0, 0, 5, TEX, (_x, y) => mul(wood, 0.85 + (y % 6 === 0 ? -0.2 : 0)));
  p.rect(5, 17, TEX - 5, 3, (_x, y) => mul([150, 90, 60], y === 17 ? 1.2 : y === 19 ? 0.6 : 0.9));
  p.rect(18, 16, 2, 5, [90, 70, 50]);
}

/** A round brass vault door with a dial: the Professor's idea of a lock. */
function vaultDoor(wall: Paint, brass: RGB): Paint {
  const p = wall.copy();
  for (let y = 0; y < TEX; y++) {
    for (let x = 0; x < TEX; x++) {
      const r = Math.hypot((x - 15.5) * WALL_ASPECT, y - 17);
      if (r < 14) p.set(x, y, r > 12.5 ? mul(brass, 0.5) : r < 4 ? mul(brass, 1.3) : mul(brass, 0.85 + (y < 17 ? 0.15 : 0)));
      if (r >= 4 && r < 4.8) p.set(x, y, [40, 32, 28]);
    }
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    p.set(Math.round(15.5 + (Math.cos(a) * 10) / WALL_ASPECT), Math.round(17 + Math.sin(a) * 10), mul(brass, 1.4));
  }
  p.rect(15, 13, 1, 4, [40, 32, 28]);
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

  if (style === 'clockwork') {
    clockworkWall(wall, rng, wallC, parse(theme.door));
    parquet(floor, rng, floorC);
    pipeCeiling(ceiling, ceilC);
  } else if (style === 'city') {
    timbered(wall, rng, wallC);
    cobbles(floor, rng, floorC);
    ceiling.rect(0, 0, TEX, TEX, ceilC);
  } else if (style === 'sewer') {
    sewerWall(wall, rng, wallC);
    blocks(floor, rng, floorC, 16, 16, mul(floorC, 0.5), 0.25);
    for (let i = 0; i < 3; i++) blotch(floor, rng, rng.int(0, 31), rng.int(0, 31), rng.int(3, 6), [70, 96, 104]);
    speckle(floor, rng, 60, () => 0.8 + rng.next() * 0.4);
    blocks(ceiling, rng, ceilC, 12, 6, mul(ceilC, 0.5), 0.3);
    for (let i = 0; i < 4; i++) blotch(ceiling, rng, rng.int(0, 31), rng.int(0, 31), 3, [60, 90, 50]);
  } else if (style === 'stone') {
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

  const shutter = parse(theme.door);
  const feature: [Paint, Paint] =
    style === 'rune' ? [rune(wall, 0, [220, 120, 255]), rune(wall, 1, [220, 120, 255])]
    : style === 'city' ? [cityWindow(wall, 0, shutter), cityWindow(wall, 1, shutter)]
    : style === 'sewer' ? [pipe(wall, 0), pipe(wall, 1)]
    : style === 'clockwork' ? [wallGear(wall, 0, wallC), wallGear(wall, 1, wallC)]
    : [sconce(wall, 0), sconce(wall, 1)];
  const upper = style === 'city' ? [upperStorey(wall, rng, true, shutter), upperStorey(wall, rng, false, shutter)] : [];
  const signPaint: Partial<Record<PlaceId, Paint>> = {};
  if (style === 'city') for (const [place, art] of Object.entries(SIGNS)) signPaint[place as PlaceId] = buildingDoor(wall, parse(theme.door), art);
  const marks = landmarkTextures(rng, parse(theme.door));
  const signs: Partial<Record<PlaceId, Texture>> = {};
  for (const [place, paint] of Object.entries(signPaint)) signs[place as PlaceId] = paint.bake();
  const landmarks = Object.fromEntries(
    Object.entries(marks).map(([look, m]) => [look, { above: m.above.map((faces) => faces.map((f) => f.bake())), ground: m.ground.bake(), door: m.door.bake() }]),
  ) as Record<Landmark['look'], LandmarkTextures>;

  return {
    wall: wall.bake(),
    feature: [feature[0].bake(), feature[1].bake()],
    featureEvery: style === 'city' ? 2 : style === 'clockwork' ? 4 : 7,
    storeys: style === 'city' ? 2 : 1,
    upper: upper.map((u) => u.bake()),
    floor: floor.bake(),
    floorAlt: (floorAlt ?? floor).bake(),
    ceiling: ceiling.bake(),
    door: doorway(wall, parse(theme.door)).bake(),
    doorShut: (style === 'sewer' ? sluiceGate(wall) : style === 'clockwork' ? vaultDoor(wall, wallC) : shutDoor(wall, parse(theme.door))).bake(),
    stairsDown: stairsDown(floor, rng).bake(),
    stairsUpFloor: lightPool(floor).bake(),
    hatch: hatch(ceiling).bake(),
    pad: tubeMouth(floor).bake(),
    buildingDoor: buildingDoor(wall, parse(theme.door)).bake(),
    signs,
    landmarks,
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
