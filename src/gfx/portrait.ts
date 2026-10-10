import { content } from '../content/registry';
import type { Character } from '../rules/types';
import { SPRITE_SIZE, drawSprite } from './sprites';

const HAIR = ['#3a2a1a', '#6b4a2a', '#c8a050', '#2a2a2e', '#a04a2a', '#d8d8d8'];

/** Small hash so a character keeps the same hair colour for life. */
function hairFor(c: Character): string {
  let h = 0;
  for (const ch of c.name + c.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return HAIR[h % HAIR.length];
}

/** Draws a character portrait (race skin tone, class colours) into a square canvas. */
export function drawPortrait(canvas: HTMLCanvasElement, c: Character, dead = false): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const scale = Math.floor(canvas.width / SPRITE_SIZE);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = dead ? '#2a2a30' : '#201c2c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawSprite(ctx, 'humanoid', 0, 0, scale, {
    g: dead ? '#8a8a96' : content.race(c.raceId).skin,
    b: dead ? '#55555f' : content.cls(c.classId).color,
    h: dead ? '#55555f' : hairFor(c),
  });
}
