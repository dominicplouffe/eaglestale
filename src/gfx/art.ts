import { MONSTER_ART } from './art/monsters';
import { PEOPLE_ART } from './art/people';
import { SEWER_ART } from './art/sewer';
import { CLOCKWORK_ART } from './art/clockwork';
import { WILD_ART } from './art/wild';
import { mixRGB, parseHex, ramp, toHex } from './colors';

/**
 * 32x32 pixel-art drawings (monsters, the eagle), defined as text like the old 16x16 sprites:
 * each character is a palette key and '.' is transparent. Drawings are rendered once per
 * colour scheme into a small canvas and reused.
 */

export const ART_SIZE = 32;

export interface ArtDef {
  rows: string[];
  /** Rows hold only the left half, mirrored when drawn. */
  symmetric?: boolean;
  colors: Record<string, string>;
  /**
   * Recolourable materials: name -> the keys for its highlight, mid and shadow tones. A monster can
   * recolour one by giving a single base colour (e.g. `{ robe: '#3a4aa8' }`); the other tones follow.
   */
  materials?: Record<string, string>;
}

const registry = new Map<string, ArtDef>();

export function registerArt(defs: Record<string, ArtDef>): void {
  for (const [name, def] of Object.entries(defs)) registry.set(name, def);
}

registerArt(MONSTER_ART);
registerArt(PEOPLE_ART);
registerArt(SEWER_ART);
registerArt(CLOCKWORK_ART);
registerArt(WILD_ART);

export const hasArt = (name: string): boolean => registry.has(name);
export const artDef = (name: string): ArtDef | undefined => registry.get(name);

export interface ArtStyle {
  /** Material name -> new base colour, or palette key -> exact colour. */
  recolor?: Record<string, string>;
  /** Mirror left-right. */
  flip?: boolean;
  /** Draw as a solid white silhouette (the flash when something is hit). */
  flash?: boolean;
  /** Slightly darker, for figures standing behind others. */
  dim?: boolean;
}

function colorsFor(def: ArtDef, recolor: Record<string, string>): Record<string, string> {
  const colors = { ...def.colors };
  for (const [key, color] of Object.entries(recolor)) {
    const keys = def.materials?.[key];
    if (keys) {
      const [hi, mid, shadow] = ramp(color);
      colors[keys[0]] = hi;
      colors[keys[1]] = mid;
      colors[keys[2]] = shadow;
    } else if (key.length === 1) {
      colors[key] = color;
    }
  }
  return colors;
}

const cache = new Map<string, HTMLCanvasElement>();

/** The drawing as a 32x32 canvas, or null if there is no such drawing. */
export function artCanvas(name: string, style: ArtStyle = {}): HTMLCanvasElement | null {
  const def = registry.get(name);
  if (!def) return null;
  const key = `${name}|${style.flip ? 1 : 0}|${style.flash ? 1 : 0}|${style.dim ? 1 : 0}|${JSON.stringify(style.recolor ?? {})}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const colors = colorsFor(def, style.recolor ?? {});
  const canvas = document.createElement('canvas');
  canvas.width = ART_SIZE;
  canvas.height = ART_SIZE;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  def.rows.forEach((half, y) => {
    const row = def.symmetric ? half + [...half].reverse().join('') : half;
    for (let x = 0; x < row.length; x++) {
      const color = colors[row[x]];
      if (row[x] === '.' || !color) continue;
      ctx.fillStyle = style.flash ? '#ffffff' : style.dim ? toHex(mixRGB(parseHex(color), [20, 18, 28], 0.3)) : color;
      ctx.fillRect(style.flip ? ART_SIZE - 1 - x : x, y, 1, 1);
    }
  });
  cache.set(key, canvas);
  return canvas;
}

/** Draws a drawing with its top-left at (x, y), each art pixel `scale` frame pixels wide. */
export function drawArt(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, scale: number, style: ArtStyle = {}): void {
  const img = artCanvas(name, style);
  if (!img) return;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, Math.round(x), Math.round(y), ART_SIZE * scale, ART_SIZE * scale);
}

const pixelCache = new Map<string, Uint32Array>();

/**
 * The drawing as raw packed pixels (ABGR, as canvas ImageData stores them; alpha 0 = see-through),
 * for the first-person view's sprites. Null if there is no such drawing.
 */
export function artPixels(name: string, recolor: Record<string, string> = {}): Uint32Array | null {
  const def = registry.get(name);
  if (!def) return null;
  const key = `${name}|${JSON.stringify(recolor)}`;
  const hit = pixelCache.get(key);
  if (hit) return hit;
  const colors = colorsFor(def, recolor);
  const out = new Uint32Array(ART_SIZE * ART_SIZE);
  def.rows.forEach((half, y) => {
    const row = def.symmetric ? half + [...half].reverse().join('') : half;
    for (let x = 0; x < row.length && x < ART_SIZE; x++) {
      const color = colors[row[x]];
      if (row[x] === '.' || !color) continue;
      const [r, g, b] = parseHex(color);
      out[y * ART_SIZE + x] = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
    }
  });
  pixelCache.set(key, out);
  return out;
}
