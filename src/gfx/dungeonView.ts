import { DIRS, isWalkable, tileAt } from '../rules/dungeon';
import type { DungeonLevel } from '../rules/types';
import { mixRGB, parseHex, type RGB } from './colors';
import { LIGHT_LEVELS, TEX, pack, texturesFor, type Texture } from './textures';

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
/** Sprites closer than this are on the party's own square (the camera stands just behind its middle). */
const SPRITE_NEAR = 0.55;
/** Sprite drawings are this many pixels square. */
const ART = 32;

/** 4x4 ordered-dither thresholds: brightness between two light levels becomes a fine checker pattern. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

/** Torchlight: full brightness close by, fading to black about seven squares away (or to `ambient`). */
let ambient = 0;
const lightAt = (dist: number, flicker: number): number => Math.max(ambient, Math.min(1, (1.12 - dist * 0.155) * flicker));

const levelFor = (light: number, x: number, y: number): number =>
  Math.min(LIGHT_LEVELS, Math.floor(light * LIGHT_LEVELS + BAYER[((y & 3) << 2) | (x & 3)]));

/** What is at a square: normally the level grid, but locks and secrets change as the party plays. */
export type TileAt = (x: number, y: number) => string;

export interface RayHit {
  /** The square that stopped the ray ('#' wall, '=' shut door). */
  tile: string;
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
function hasArch(at: TileAt, x: number, y: number, side: 0 | 1): boolean {
  const wall = (dx: number, dy: number): boolean => !isWalkable(at(x + dx, y + dy));
  return side === 0 ? wall(0, -1) && wall(0, 1) : wall(-1, 0) && wall(1, 0);
}

/** Steps a ray square by square (DDA) from (posX, posY) until it hits a wall. */
export function castRay(
  level: DungeonLevel,
  posX: number,
  posY: number,
  rayX: number,
  rayY: number,
  at: TileAt = (x, y) => tileAt(level, x, y),
): RayHit {
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
    const tile = at(mapX, mapY);
    if (!isWalkable(tile)) {
      return { tile, dist, side, cellX: mapX, cellY: mapY, u: faceU(posX, posY, rayX, rayY, dist, side), doors };
    }
    if (tile === '+' && hasArch(at, mapX, mapY, side)) {
      doors.push({ dist, side, u: faceU(posX, posY, rayX, rayY, dist, side) });
    }
  }
  return { tile: '#', dist: MAX_STEPS, side: 0, cellX: mapX, cellY: mapY, u: 0, doors };
}

/** Something standing on a square (a person, a boss, a chest), drawn facing the camera. */
export interface ViewSprite {
  x: number;
  y: number;
  /** A 32x32 drawing as packed pixels (see artPixels); alpha 0 is see-through. */
  pixels: Uint32Array;
  /** Height in wall heights. */
  scale: number;
}

export interface DungeonViewState {
  level: DungeonLevel;
  /** The square the party stands on; may be fractional while the camera glides between squares. */
  x: number;
  y: number;
  dir: number;
  /** Facing in radians (0 = north, clockwise), for smooth turns; defaults to `dir`. */
  angle?: number;
  /** The squares as they are now (locks, secrets); defaults to the level grid. */
  at?: TileAt;
  sprites?: ViewSprite[];
  /** Outdoors: the sky's colour at the horizon (overrides the theme's, e.g. as the city recovers). */
  sky?: string;
  /** In a tower the '>' stairs climb (a lit hatch overhead) and '<' goes down (a hole in the floor). */
  ascending?: boolean;
}

let image: ImageData | null = null;
let pixels: Uint32Array | null = null;

/**
 * Draws one textured wall column; `masked` skips see-through texels (doorway openings, battlements).
 * Walls more than one storey tall stack the `above` faces (top storey first) on top of `tex`.
 */
function column(
  buf: Uint32Array,
  x: number,
  dist: number,
  side: 0 | 1,
  u: number,
  tex: Texture,
  flicker: number,
  masked: boolean,
  above: Texture[] = [],
): void {
  const d = Math.max(dist, 0.05);
  const h = WALL_PX / d;
  const bottom = HORIZON + h / 2;
  const storeys = above.length + 1;
  const top = bottom - h * storeys;
  const y0 = Math.max(0, Math.ceil(top - 0.5));
  const y1 = Math.min(VIEW_H, Math.ceil(bottom - 0.5));
  const tu = Math.min(TEX - 1, Math.floor(u * TEX));
  // North/south faces are a little darker, so corners read clearly.
  const light = lightAt(d, flicker) * (side === 1 ? 0.84 : 1);
  for (let y = y0; y < y1; y++) {
    const v = (y + 0.5 - top) / h;
    const storey = Math.min(storeys - 1, Math.floor(v));
    const t = storey < above.length ? above[storey] : tex;
    const tv = Math.min(TEX - 1, Math.floor((v - storey) * TEX));
    const texel = t.levels[levelFor(light, x, y)][tv * TEX + tu];
    if (masked && texel >>> 24 === 0) continue;
    buf[y * VIEW_W + x] = texel;
  }
}

/** Soft clouds all round the horizon: an alpha map, `CLOUD_W` wide for a full turn. */
const CLOUD_W = 720;
let clouds: Float32Array | null = null;

function cloudMap(): Float32Array {
  if (clouds) return clouds;
  const h = VIEW_H / 2;
  clouds = new Float32Array(CLOUD_W * h);
  // A few octaves of smooth value noise that wrap round the full turn.
  const lattice = (size: number, seed: number): ((x: number, y: number) => number) => {
    const cols = Math.max(1, Math.round(CLOUD_W / size));
    const rows = Math.ceil(h / size) + 2;
    const v = Array.from({ length: cols * rows }, (_, i) => {
      const n = Math.sin((i + 1) * 12.9898 + seed * 78.233) * 43758.5453;
      return n - Math.floor(n);
    });
    const at = (cx: number, cy: number): number => v[(((cx % cols) + cols) % cols) + Math.min(rows - 1, cy) * cols];
    return (x, y) => {
      const fx = x / size;
      const fy = y / size;
      const ix = Math.floor(fx);
      const iy = Math.floor(fy);
      const sx = (fx - ix) * (fx - ix) * (3 - 2 * (fx - ix));
      const sy = (fy - iy) * (fy - iy) * (3 - 2 * (fy - iy));
      const top = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * sx;
      const bottom = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * sx;
      return top + (bottom - top) * sy;
    };
  };
  const octaves = [lattice(90, 1), lattice(40, 2), lattice(16, 3)];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < CLOUD_W; x++) {
      const n = octaves[0](x, y * 2.2) * 0.55 + octaves[1](x, y * 2.2) * 0.3 + octaves[2](x, y * 2) * 0.15;
      // Thicker towards the horizon, thin overhead.
      clouds[y * CLOUD_W + x] = Math.max(0, Math.min(1, (n - 0.48) * 3)) * (0.35 + 0.65 * (y / h));
    }
  }
  return clouds;
}

const darken = (c: RGB, f: number): RGB => [c[0] * f, c[1] * f, c[2] * f];

/** Fills the top half with sky: a gradient to `horizon`, with clouds that turn with the view. */
function drawSky(buf: Uint32Array, horizon: string, angle: number): void {
  const base = parseHex(horizon);
  const top = mixRGB(darken(base, 0.62), [40, 50, 96], 0.25);
  const cloud = mixRGB(base, [250, 248, 240], 0.45);
  const map = cloudMap();
  const offsets = new Int32Array(VIEW_W);
  for (let x = 0; x < VIEW_W; x++) {
    const camX = (2 * (x + 0.5)) / VIEW_W - 1;
    const a = angle + Math.atan(camX * FOV_TAN);
    offsets[x] = ((Math.floor((a / (Math.PI * 2)) * CLOUD_W) % CLOUD_W) + CLOUD_W) % CLOUD_W;
  }
  for (let y = 0; y < HORIZON; y++) {
    const sky = mixRGB(top, base, Math.pow(y / HORIZON, 1.4));
    for (let x = 0; x < VIEW_W; x++) {
      const c = mixRGB(sky, cloud, map[y * CLOUD_W + offsets[x]]);
      buf[y * VIEW_W + x] = pack(c[0], c[1], c[2]);
    }
  }
}

interface ProjectedSprite {
  sprite: ViewSprite;
  depth: number;
  left: number;
  size: number;
  /** Screen row of the floor under it (where its feet go). */
  floor: number;
}

/** Draws the part of a sprite in screen column `x`. */
function spriteColumn(buf: Uint32Array, x: number, p: ProjectedSprite, flicker: number): void {
  const tu = Math.floor(((x + 0.5 - p.left) / p.size) * ART);
  if (tu < 0 || tu >= ART) return;
  const top = p.floor - p.size;
  const y0 = Math.max(0, Math.ceil(top - 0.5));
  const y1 = Math.min(VIEW_H, Math.ceil(p.floor - 0.5));
  const light = lightAt(p.depth, flicker);
  for (let y = y0; y < y1; y++) {
    const tv = Math.min(ART - 1, Math.floor(((y + 0.5 - top) / p.size) * ART));
    const texel = p.sprite.pixels[tv * ART + tu];
    if (texel >>> 24 === 0) continue;
    const f = levelFor(light, x, y) / LIGHT_LEVELS;
    buf[y * VIEW_W + x] = pack((texel & 255) * f, ((texel >>> 8) & 255) * f, ((texel >>> 16) & 255) * f);
  }
}

/**
 * Draws the first-person corridor view. `t` is time in seconds, for torch flicker and flames.
 * `minLight` keeps far surfaces from going fully dark (used for the lit battle arena).
 */
export function renderDungeon(ctx: CanvasRenderingContext2D, v: DungeonViewState, t: number, minLight = 0): void {
  const { level } = v;
  const at: TileAt = v.at ?? ((x, y) => tileAt(level, x, y));
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
  const sky = v.sky ?? level.theme.sky;
  if (sky) drawSky(buf, sky, angle);

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
      const tile = at(cellX, cellY);
      const ti = Math.floor((wy - cellY) * TEX) * TEX + Math.floor((wx - cellX) * TEX);
      const plain = (cellX + cellY) & 1 ? tex.floorAlt : tex.floor;
      const up = v.ascending ? '>' : '<';
      const down = v.ascending ? '<' : '>';
      const floorTex = tile === down ? tex.stairsDown : tile === up ? tex.stairsUpFloor : tile === '^' ? tex.pad : plain;
      const ceilTex = tile === up ? tex.hatch : tex.ceiling;
      buf[y * VIEW_W + x] = floorTex.levels[levelFor(light * 0.92, x, y)][ti];
      if (!sky) buf[cy * VIEW_W + x] = ceilTex.levels[levelFor(light * 0.8, x, cy)][ti];
    }
  }

  // Sprites: where each one lands on screen. Depth is measured along the view direction, like walls.
  const det = dirX * planeY - planeX * dirY;
  const projected: ProjectedSprite[] = [];
  for (const sp of v.sprites ?? []) {
    const relX = sp.x + 0.5 - posX;
    const relY = sp.y + 0.5 - posY;
    const depth = (relX * planeY - planeX * relY) / det;
    if (depth < SPRITE_NEAR) continue;
    const across = (dirX * relY - relX * dirY) / det;
    const size = (WALL_PX / depth) * sp.scale;
    const centre = ((across / depth + 1) / 2) * VIEW_W;
    projected.push({ sprite: sp, depth, left: centre - size / 2, size, floor: HORIZON + WALL_PX / (2 * depth) });
  }

  // Walls, then the doorway arches and sprites in front of them, far to near, so nearer ones cover farther ones.
  const layers: { dist: number; draw: () => void }[] = [];
  for (let x = 0; x < VIEW_W; x++) {
    const camX = (2 * (x + 0.5)) / VIEW_W - 1;
    const rayX = dirX + planeX * camX;
    const rayY = dirY + planeY * camX;
    const hit = castRay(level, posX, posY, rayX, rayY, at);
    const featured = ((hit.cellX * 73856093) ^ (hit.cellY * 19349663) ^ (hit.side * 83492791)) >>> 0;
    const mark = level.landmarks?.find((m) => hit.cellX >= m.x && hit.cellX < m.x + m.w && hit.cellY >= m.y && hit.cellY < m.y + m.h);
    let wallTex = featured % tex.featureEvery === 0 ? tex.feature[frame] : tex.wall;
    if (hit.tile === '=') wallTex = tex.doorShut;
    else if (hit.tile === '&') {
      const door = level.specials[tileAt(level, hit.cellX, hit.cellY)];
      wallTex = (door?.kind === 'building' && door.place && tex.signs[door.place]) || tex.buildingDoor;
    }
    if (mark) {
      // A landmark: its own stone, taller than the houses (with see-through battlements, say).
      const lm = tex.landmarks[mark.look];
      // Grand buildings are regular: their faces simply alternate along the wall.
      const above = lm.above.map((faces, i) => faces[(hit.cellX + hit.cellY + i) % faces.length]);
      column(buf, x, hit.dist, hit.side, hit.u, hit.tile === '&' ? lm.door : lm.ground, flicker, true, above);
    } else {
      // Storeys above the ground floor: the top one (if it has its own faces, e.g. a ragged canopy) and the rest.
      const above: Texture[] = [];
      for (let k = tex.storeys - 1; k >= 1; k--) {
        const faces = k === tex.storeys - 1 && tex.top.length ? tex.top : tex.upper;
        if (faces.length) above.push(faces[((featured >>> 3) + k) % faces.length]);
      }
      column(buf, x, hit.dist, hit.side, hit.u, wallTex, flicker, tex.top.length > 0, above);
    }
    layers.length = 0;
    for (const d of hit.doors) layers.push({ dist: d.dist, draw: () => column(buf, x, d.dist, d.side, d.u, tex.door, flicker, true) });
    for (const p of projected) {
      if (p.depth < hit.dist && x >= p.left - 1 && x <= p.left + p.size) layers.push({ dist: p.depth, draw: () => spriteColumn(buf, x, p, flicker) });
    }
    layers.sort((a, b) => b.dist - a.dist);
    for (const l of layers) l.draw();
  }

  ctx.putImageData(image, 0, 0);
}
