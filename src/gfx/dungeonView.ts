import { DIRS, isWalkable, tileAt, turn } from '../rules/dungeon';
import type { DungeonLevel } from '../rules/types';

export const VIEW_W = 320;
export const VIEW_H = 180;

const CX = VIEW_W / 2;
const CY = VIEW_H / 2;
const WALL_HALF_H = VIEW_H * 0.47;
const MAX_DEPTH = 5;

const scaleAt = (z: number): number => 1 / (1 + 0.62 * z);
const xAt = (z: number, side: number): number => CX + side * CX * scaleAt(z);
const topAt = (z: number): number => CY - WALL_HALF_H * scaleAt(z);
const botAt = (z: number): number => CY + WALL_HALF_H * scaleAt(z);

function parse(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Darkens a colour with distance, with a little torch flicker. */
function shade(hex: string, z: number, light: number): string {
  const f = Math.max(0.12, (1 - z * 0.17) * light);
  const [r, g, b] = parse(hex);
  return `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`;
}

function poly(ctx: CanvasRenderingContext2D, color: string, pts: [number, number][]): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.fill();
}

function line(
  ctx: CanvasRenderingContext2D,
  color: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function sideWall(
  ctx: CanvasRenderingContext2D,
  level: DungeonLevel,
  side: number,
  z: number,
  open: boolean,
  light: number,
): void {
  const pts: [number, number][] = [
    [xAt(z, side), topAt(z)],
    [xAt(z + 1, side), topAt(z + 1)],
    [xAt(z + 1, side), botAt(z + 1)],
    [xAt(z, side), botAt(z)],
  ];
  if (open) {
    poly(ctx, shade(level.theme.wall, z + 1.5, light * 0.35), pts);
    return;
  }
  poly(ctx, shade(level.theme.wall, z + 0.5, light * 0.95), pts);
  // Brick courses follow the perspective.
  const mortar = shade(level.theme.wall, z + 0.5, light * 0.5);
  for (const f of [0.25, 0.5, 0.75]) {
    const yN = topAt(z) + (botAt(z) - topAt(z)) * f;
    const yF = topAt(z + 1) + (botAt(z + 1) - topAt(z + 1)) * f;
    line(ctx, mortar, xAt(z, side), yN, xAt(z + 1, side), yF);
  }
  line(ctx, mortar, xAt(z + 1, side), topAt(z + 1), xAt(z + 1, side), botAt(z + 1));
}

function frontWall(ctx: CanvasRenderingContext2D, level: DungeonLevel, z: number, light: number): void {
  const x1 = xAt(z, -1);
  const x2 = xAt(z, 1);
  ctx.fillStyle = shade(level.theme.wall, z, light);
  ctx.fillRect(x1, topAt(z), x2 - x1, botAt(z) - topAt(z));
  const mortar = shade(level.theme.wall, z, light * 0.55);
  const rows = 4;
  for (let i = 1; i < rows; i++) {
    const y = topAt(z) + ((botAt(z) - topAt(z)) * i) / rows;
    line(ctx, mortar, x1, y, x2, y);
    const step = (x2 - x1) / 4;
    for (let k = 0; k < 4; k++) {
      const off = i % 2 === 0 ? step / 2 : 0;
      const x = x1 + k * step + off;
      if (x < x2) line(ctx, mortar, x, y, x, y + (botAt(z) - topAt(z)) / rows);
    }
  }
}

function doorFrame(ctx: CanvasRenderingContext2D, level: DungeonLevel, z: number, light: number): void {
  const x1 = xAt(z, -1);
  const x2 = xAt(z, 1);
  const w = x2 - x1;
  const top = topAt(z);
  const bot = botAt(z);
  const h = bot - top;
  const frame = shade(level.theme.door, z, light);
  const dark = shade(level.theme.door, z + 1.2, light * 0.6);
  ctx.fillStyle = frame;
  ctx.fillRect(x1, top, w * 0.2, h); // left jamb
  ctx.fillRect(x2 - w * 0.2, top, w * 0.2, h); // right jamb
  ctx.fillRect(x1, top, w, h * 0.18); // lintel
  ctx.fillStyle = dark;
  ctx.fillRect(x1 + w * 0.2, top + h * 0.18, w * 0.03, h * 0.82);
  ctx.fillRect(x2 - w * 0.23, top + h * 0.18, w * 0.03, h * 0.82);
}

function floorMarker(ctx: CanvasRenderingContext2D, tile: string, z: number, light: number): void {
  const half = 0.42;
  const pts: [number, number][] = [
    [CX - CX * scaleAt(z) * half, botAt(z)],
    [CX + CX * scaleAt(z) * half, botAt(z)],
    [CX + CX * scaleAt(z + 1) * half, botAt(z + 1)],
    [CX - CX * scaleAt(z + 1) * half, botAt(z + 1)],
  ];
  if (tile === '>') {
    poly(ctx, shade('#0c0a12', z, 1), pts);
    for (const f of [0.25, 0.5, 0.75]) {
      const y = botAt(z) + (botAt(z + 1) - botAt(z)) * f;
      const w = CX * scaleAt(z + f) * half;
      line(ctx, shade('#3a3446', z, light), CX - w, y, CX + w, y);
    }
  } else if (tile === '<') {
    poly(ctx, shade('#c8bea0', z, light), pts);
    for (const f of [0.25, 0.5, 0.75]) {
      const y = botAt(z) + (botAt(z + 1) - botAt(z)) * f;
      const w = CX * scaleAt(z + f) * half;
      line(ctx, shade('#8a8068', z, light), CX - w, y, CX + w, y);
    }
  }
}

export interface DungeonViewState {
  level: DungeonLevel;
  x: number;
  y: number;
  dir: number;
}

/** Draws the first-person corridor view. `t` is time in seconds, used for torch flicker. */
export function renderDungeon(ctx: CanvasRenderingContext2D, v: DungeonViewState, t: number): void {
  const { level } = v;
  const light = 0.94 + 0.06 * Math.sin(t * 9) * Math.sin(t * 5.3);
  const fwd = DIRS[v.dir];
  const left = DIRS[turn(v.dir, -1)];
  const right = DIRS[turn(v.dir, 1)];

  // Ceiling and floor bands, lighter toward the viewer.
  const bands = 14;
  for (let i = 0; i < bands; i++) {
    const z = (1 - i / bands) * 5;
    const h = Math.ceil(CY / bands);
    ctx.fillStyle = shade(level.theme.ceiling, z, light);
    ctx.fillRect(0, i * h, VIEW_W, h);
    ctx.fillStyle = shade(level.theme.floor, z, light);
    ctx.fillRect(0, VIEW_H - (i + 1) * h, VIEW_W, h);
  }

  let end = MAX_DEPTH + 1;
  for (let d = 1; d <= MAX_DEPTH; d++) {
    if (!isWalkable(tileAt(level, v.x + fwd.dx * d, v.y + fwd.dy * d))) {
      end = d;
      break;
    }
  }
  const endTile = tileAt(level, v.x + fwd.dx * end, v.y + fwd.dy * end);
  if (end <= MAX_DEPTH && !isWalkable(endTile)) frontWall(ctx, level, end, light);
  else {
    ctx.fillStyle = '#000';
    ctx.fillRect(xAt(end, -1), topAt(end), xAt(end, 1) - xAt(end, -1), botAt(end) - topAt(end));
  }

  for (let d = Math.min(end, MAX_DEPTH + 1) - 1; d >= 0; d--) {
    const cx = v.x + fwd.dx * d;
    const cy = v.y + fwd.dy * d;
    const tile = tileAt(level, cx, cy);
    floorMarker(ctx, tile, d, light);
    sideWall(ctx, level, -1, d, isWalkable(tileAt(level, cx + left.dx, cy + left.dy)), light);
    sideWall(ctx, level, 1, d, isWalkable(tileAt(level, cx + right.dx, cy + right.dy)), light);
    if (tile === '+' && d >= 1) doorFrame(ctx, level, d, light);
  }
}
