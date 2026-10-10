import { DIRS, isSpecialTile } from '../rules/dungeon';
import type { DungeonLevel } from '../rules/types';

export const MAP_COLORS = {
  background: '#05030c',
  wall: '#4a3c7a',
  floor: '#1e1838',
  door: '#a8702a',
  stairsUp: '#c8bea0',
  stairsDown: '#e8c34a',
  special: '#5ac8e0',
  you: '#ff6a6a',
};

/** Draws the auto-map: only tiles in `explored` (and the walls next to them) are shown. */
export function drawMinimap(
  canvas: HTMLCanvasElement,
  level: DungeonLevel,
  explored: ReadonlySet<string>,
  pos: { x: number; y: number; dir: number },
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const rows = level.grid.length;
  const cols = level.grid[0].length;
  const cell = Math.floor(Math.min(canvas.width / cols, canvas.height / rows));
  const ox = Math.floor((canvas.width - cell * cols) / 2);
  const oy = Math.floor((canvas.height - cell * rows) / 2);
  ctx.fillStyle = MAP_COLORS.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (!explored.has(`${x},${y}`)) continue;
      const t = level.grid[y][x];
      ctx.fillStyle =
        t === '#' ? MAP_COLORS.wall
        : t === '+' ? MAP_COLORS.door
        : t === '<' ? MAP_COLORS.stairsUp
        : t === '>' ? MAP_COLORS.stairsDown
        : isSpecialTile(t) ? MAP_COLORS.special
        : MAP_COLORS.floor;
      ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell);
    }
  }
  // Player arrow.
  const px = ox + pos.x * cell + cell / 2;
  const py = oy + pos.y * cell + cell / 2;
  const d = DIRS[pos.dir];
  ctx.fillStyle = MAP_COLORS.you;
  ctx.beginPath();
  ctx.moveTo(px + d.dx * cell * 0.5, py + d.dy * cell * 0.5);
  ctx.lineTo(px - d.dy * cell * 0.4 - d.dx * cell * 0.3, py + d.dx * cell * 0.4 - d.dy * cell * 0.3);
  ctx.lineTo(px + d.dy * cell * 0.4 - d.dx * cell * 0.3, py - d.dx * cell * 0.4 - d.dy * cell * 0.3);
  ctx.fill();
}
