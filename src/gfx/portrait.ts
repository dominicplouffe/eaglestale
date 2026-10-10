import { content } from '../content/registry';
import type { Character } from '../rules/types';
import { PORTRAIT_DATA } from './art/portraits';
import { deathly, ramp } from './colors';
import { drawSprite } from './sprites';

/**
 * Head-and-shoulders portraits ("busts"), 24x24, built from layers so every race and class combination
 * works: the class's outfit, the race's head, a hairstyle, the class's headgear, then race features that
 * sit on top (a dwarf's beard, a half-orc's tusks). Dynamic colour keys follow the hero: skin t/s/S
 * (race), hair j/h/H, class colour v/c/C. Also used for townsfolk behind counters.
 */

export const BUST = 24;
const HAIR_COLORS = ['#3a2a1a', '#6b4a2a', '#c8a050', '#2a2a2e', '#a04a2a', '#d8d8d8'];

export interface BustLook {
  race: string;
  cls: string;
  hairStyle?: string;
  hairColor?: string;
  /** Override the race's skin or the class's outfit colour (for townsfolk). */
  skin?: string;
  outfit?: string;
}

const hairStyles = (): string[] =>
  Object.keys(PORTRAIT_DATA.layers)
    .filter((k) => k.startsWith('hair:'))
    .map((k) => k.slice(5));

/** A hero keeps the same hair for life: picked from a hash of their name and id. */
export function lookFor(c: Character): BustLook {
  let h = 0;
  for (const ch of c.name + c.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const styles = hairStyles();
  return {
    race: c.raceId,
    cls: c.classId,
    hairColor: HAIR_COLORS[h % HAIR_COLORS.length],
    hairStyle: styles.length ? styles[(h >>> 3) % styles.length] : undefined,
  };
}

export const hasPortraitArt = (): boolean => Object.keys(PORTRAIT_DATA.layers).length > 0;

function layersFor(look: BustLook): string[][] {
  const L = PORTRAIT_DATA.layers;
  const body = L[`body:${look.cls}`] ?? L['body:knight'];
  const head = L[`head:${look.race}`] ?? L['head:human'];
  const hideHair = PORTRAIT_DATA.hatHidesHair.includes(look.cls);
  const hair = hideHair || !look.hairStyle ? undefined : L[`hair:${look.hairStyle}`];
  return [body, head, hair, L[`hat:${look.cls}`], L[`over:${look.race}`]].filter((l): l is string[] => !!l);
}

function colorsFor(look: BustLook): Record<string, string> {
  const skin = look.skin ?? (content.races.get(look.race)?.skin ?? '#e0ac86');
  const outfit = look.outfit ?? (content.classes.get(look.cls)?.color ?? '#8a9bb8');
  const [t, s, S] = ramp(skin);
  const [j, h, H] = ramp(look.hairColor ?? HAIR_COLORS[0]);
  const [v, c, C] = ramp(outfit);
  return { ...PORTRAIT_DATA.colors, t, s, S, j, h, H, v, c, C };
}

const cache = new Map<string, HTMLCanvasElement>();

/** The bust alone (transparent background) as a 24x24 canvas. */
export function bustCanvas(look: BustLook, dead = false): HTMLCanvasElement {
  const key = `${JSON.stringify(look)}|${dead ? 1 : 0}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = BUST;
  canvas.height = BUST;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const colors = colorsFor(look);
  for (const rows of layersFor(look)) {
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const color = row[x] === '.' ? undefined : colors[row[x]];
        if (!color) continue;
        ctx.fillStyle = dead ? deathly(color) : color;
        ctx.fillRect(x, y, 1, 1);
      }
    });
  }
  cache.set(key, canvas);
  return canvas;
}

/** Draws a bust for a scene (e.g. a shopkeeper behind the counter). */
export function drawBust(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, look: BustLook): void {
  ctx.imageSmoothingEnabled = false;
  if (hasPortraitArt()) {
    ctx.drawImage(bustCanvas(look), Math.round(x), Math.round(y), BUST * scale, BUST * scale);
    return;
  }
  const skin = look.skin ?? content.races.get(look.race)?.skin ?? '#e0ac86';
  drawSprite(ctx, 'humanoid', x, y, (scale * BUST) / 16, { g: skin, b: look.outfit ?? '#7a5230', h: look.hairColor ?? '#3a2a1a' });
}

/** Draws a hero's portrait, with its background, filling a square canvas. */
export function drawPortrait(canvas: HTMLCanvasElement, c: Character, dead = false): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const scale = canvas.width / BUST;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = dead ? '#24242a' : '#1a1528';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // A softer patch behind the head so the face stands out.
  ctx.fillStyle = dead ? '#2c2c34' : '#2a2340';
  ctx.fillRect(4 * scale, 2 * scale, 16 * scale, 16 * scale);
  ctx.fillRect(2 * scale, 4 * scale, 20 * scale, 12 * scale);
  if (hasPortraitArt()) {
    ctx.drawImage(bustCanvas(lookFor(c), dead), 0, 0, canvas.width, canvas.height);
    return;
  }
  const look = lookFor(c);
  drawSprite(ctx, 'humanoid', 0, 0, canvas.width / 16, {
    g: dead ? '#8a8a96' : content.race(c.raceId).skin,
    b: dead ? '#55555f' : content.cls(c.classId).color,
    h: dead ? '#55555f' : (look.hairColor ?? '#3a2a1a'),
  });
}
