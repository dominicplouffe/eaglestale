import { DIRS, isWalkable, tileAt } from '../rules/dungeon';
import type { DungeonLevel } from '../rules/types';
import { LIGHT_LEVELS, TEX, texturesFor, type Texture } from './textures';

/**
 * The first-person view: a column raycaster in the style of Wolfenstein 3D, drawn pixel by pixel
 * into a 320x180 buffer. Walls, floors and ceilings are textured (see textures.ts), and light from
 * the party's torch fades into the dark in dithered steps.
 */

export const VIEW_W = 320;
export const VIEW_H = 180;
const HORIZON = VIEW_H / 2;

/** How far the camera stands behind the middle of its square, so the walls beside the party are in view. */
const CAMERA_BACK = 0.42;
/** tan(half the horizontal field of view). */
const FOV_TAN = 0.78;
/** On-screen height in pixels of a wall one unit away. Lower than square, like the classic crawlers. */
const WALL_PX = 118;
/** How many squares a ray travels before giving up (it's pitch dark by then anyway). */
const MAX_STEPS = 24;
/** One wall face in this many gets a feature texture (torch, rune). */
const FEATURE_EVERY = 7;

/** 4x4 ordered-dither thresholds: brightness between two light levels becomes a fine checker pattern. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

/** Torchlight: full brightness close by, fading to black about seven squares away (or to `ambient`). */
let ambient = 0;
const lightAt = (dist: number, flicker: number): number => Math.max(ambient, Math.min(1, (1.12 - dist * 0.155) * flicker));

const levelFor = (light: number, x: number, y: number): number =>
  Math.min(LIGHT_LEVELS, Math.floor(light * LIGHT_LEVELS + BAYER[((y & 3) << 2) | (x & 3)]));

export interface RayHit {
  /** Distance to the wall along the view direction (perpendicular, so there's no fish-eye bulge). */
  dist: number;
  /** 0 if the ray crossed an east/west face, 1 for a north/south face. */
  side: 0 | 1;
  cellX: number;
  cellY: number;
  /** Where along the face the ray hit, 0..1 from the viewer's left to right. */
  u: number;
  /** Doorway arches the ray passed through before reaching the wall, nearest first. */
  doors: { dist: number; side: 0 | 1; u: number }[];
}

function faceU(posX: number, posY: number, rayX: number, rayY: number, dist: number, side: 0 | 1): number {
  let u = side === 0 ? posY + dist * rayY : posX + dist * rayX;
  u -= Math.floor(u);
  return (side === 0 && rayX > 0) || (side === 1 && rayY < 0) ? 1 - u : u;
}

/** A door square has an arch on the faces where its passage begins and ends (walls on both sides of it). */
function hasArch(level: DungeonLevel, x: number, y: number, side: 0 | 1): boolean {
  const wall = (dx: number, dy: number): boolean => !isWalkable(tileAt(level, x + dx, y + dy));
  return side === 0 ? wall(0, -1) && wall(0, 1) : wall(-1, 0) && wall(1, 0);
}

/** Steps a ray square by square (DDA) from (posX, posY) until it hits a wall. */
export function castRay(level: DungeonLevel, posX: number, posY: number, rayX: number, rayY: number): RayHit {
  let mapX = Math.floor(posX);
  let mapY = Math.floor(posY);
  const deltaX = rayX === 0 ? 1e30 : Math.abs(1 / rayX);
  const deltaY = rayY === 0 ? 1e30 : Math.abs(1 / rayY);
  const stepX = rayX < 0 ? -1 : 1;
  const stepY = rayY < 0 ? -1 : 1;
  let sideX = (rayX < 0 ? posX - mapX : mapX + 1 - posX) * deltaX;
  let sideY = (rayY < 0 ? posY - mapY : mapY + 1 - posY) * deltaY;
  const doors: RayHit['doors'] = [];
  for (let i = 0; i < MAX_STEPS; i++) {
    let side: 0 | 1;
    if (sideX < sideY) {
      sideX += deltaX;
      mapX += stepX;
      side = 0;
    } else {
      sideY += deltaY;
      mapY += stepY;
      side = 1;
    }
    const dist = side === 0 ? sideX - deltaX : sideY - deltaY;
    const tile = tileAt(level, mapX, mapY);
    if (!isWalkable(tile)) {
      return { dist, side, cellX: mapX, cellY: mapY, u: faceU(posX, posY, rayX, rayY, dist, side), doors };
    }
    if (tile === '+' && hasArch(level, mapX, mapY, side)) {
      doors.push({ dist, side, u: faceU(posX, posY, rayX, rayY, dist, side) });
    }
  }
  return { dist: MAX_STEPS, side: 0, cellX: mapX, cellY: mapY, u: 0, doors };
}

export interface DungeonViewState {
  level: DungeonLevel;
  /** The square the party stands on; may be fractional while the camera glides between squares. */
  x: number;
  y: number;
  dir: number;
  /** Facing in radians (0 = north, clockwise), for smooth turns; defaults to `dir`. */
  angle?: number;
}

let image: ImageData | null = null;
let pixels: Uint32Array | null = null;

/** Draws one textured wall column; `masked` skips see-through texels (doorway openings). */
function column(
  buf: Uint32Array,
  x: number,
  dist: number,
  side: 0 | 1,
  u: number,
  tex: Texture,
  flicker: number,
  masked: boolean,
): void {
  const d = Math.max(dist, 0.05);
  const h = WALL_PX / d;
  const top = HORIZON - h / 2;
  const y0 = Math.max(0, Math.ceil(top - 0.5));
  const y1 = Math.min(VIEW_H, Math.ceil(top + h - 0.5));
  const tu = Math.min(TEX - 1, Math.floor(u * TEX));
  // North/south faces are a little darker, so corners read clearly.
  const light = lightAt(d, flicker) * (side === 1 ? 0.84 : 1);
  for (let y = y0; y < y1; y++) {
    const tv = Math.min(TEX - 1, Math.floor(((y + 0.5 - top) / h) * TEX));
    const texel = tex.levels[levelFor(light, x, y)][tv * TEX + tu];
    if (masked && texel >>> 24 === 0) continue;
    buf[y * VIEW_W + x] = texel;
  }
}

/**
 * Draws the first-person corridor view. `t` is time in seconds, for torch flicker and flames.
 * `minLight` keeps far surfaces from going fully dark (used for the lit battle arena).
 */
export function renderDungeon(ctx: CanvasRenderingContext2D, v: DungeonViewState, t: number, minLight = 0): void {
  const { level } = v;
  ambient = minLight;
  const tex = texturesFor(level.theme);
  if (!image || !pixels) {
    image = ctx.createImageData(VIEW_W, VIEW_H);
    pixels = new Uint32Array(image.data.buffer);
  }
  const buf = pixels;
  const angle = v.angle ?? v.dir * (Math.PI / 2);
  const dirX = v.angle === undefined ? DIRS[v.dir].dx : Math.sin(angle);
  const dirY = v.angle === undefined ? DIRS[v.dir].dy : -Math.cos(angle);
  const planeX = -dirY * FOV_TAN;
  const planeY = dirX * FOV_TAN;
  const posX = v.x + 0.5 - dirX * CAMERA_BACK;
  const posY = v.y + 0.5 - dirY * CAMERA_BACK;
  const flicker = 0.97 + 0.03 * Math.sin(t * 9) * Math.sin(t * 5.3);
  const frame = Math.floor(t * 5) % 2;

  // Floor and ceiling: each screen row below the horizon is one distance; the ceiling mirrors it.
  for (let y = HORIZON; y < VIEW_H; y++) {
    const rowDist = (WALL_PX * 0.5) / (y + 0.5 - HORIZON);
    const stepX = (rowDist * 2 * planeX) / VIEW_W;
    const stepY = (rowDist * 2 * planeY) / VIEW_W;
    let wx = posX + rowDist * (dirX - planeX) + stepX * 0.5;
    let wy = posY + rowDist * (dirY - planeY) + stepY * 0.5;
    const light = lightAt(rowDist, flicker);
    const cy = VIEW_H - 1 - y;
    for (let x = 0; x < VIEW_W; x++, wx += stepX, wy += stepY) {
      const cellX = Math.floor(wx);
      const cellY = Math.floor(wy);
      const tile = tileAt(level, cellX, cellY);
      const ti = Math.floor((wy - cellY) * TEX) * TEX + Math.floor((wx - cellX) * TEX);
      const plain = (cellX + cellY) & 1 ? tex.floorAlt : tex.floor;
      const floorTex = tile === '>' ? tex.stairsDown : tile === '<' ? tex.stairsUpFloor : plain;
      const ceilTex = tile === '<' ? tex.hatch : tex.ceiling;
      buf[y * VIEW_W + x] = floorTex.levels[levelFor(light * 0.92, x, y)][ti];
      buf[cy * VIEW_W + x] = ceilTex.levels[levelFor(light * 0.8, x, cy)][ti];
    }
  }

  // Walls, then any doorway arches in front of them (far to near, so nearer arches cover farther ones).
  for (let x = 0; x < VIEW_W; x++) {
    const camX = (2 * (x + 0.5)) / VIEW_W - 1;
    const rayX = dirX + planeX * camX;
    const rayY = dirY + planeY * camX;
    const hit = castRay(level, posX, posY, rayX, rayY);
    const featured = ((hit.cellX * 73856093) ^ (hit.cellY * 19349663) ^ (hit.side * 83492791)) >>> 0;
    const wallTex = featured % FEATURE_EVERY === 0 ? tex.feature[frame] : tex.wall;
    column(buf, x, hit.dist, hit.side, hit.u, wallTex, flicker, false);
    for (let i = hit.doors.length - 1; i >= 0; i--) {
      const d = hit.doors[i];
      column(buf, x, d.dist, d.side, d.u, tex.door, flicker, true);
    }
  }

  ctx.putImageData(image, 0, 0);
}
