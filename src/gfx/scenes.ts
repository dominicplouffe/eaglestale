import { Rng } from '../rules/rng';
import type { DungeonTheme } from '../rules/types';
import { drawSprite } from './sprites';
import { VIEW_H, VIEW_W } from './dungeonView';

type Ctx = CanvasRenderingContext2D;

export type Place = 'street' | 'guild' | 'shop' | 'temple' | 'inn';

const rect = (ctx: Ctx, color: string, x: number, y: number, w: number, h: number): void => {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};

function sky(ctx: Ctx, bands: string[], height: number): void {
  const h = Math.ceil(height / bands.length);
  bands.forEach((c, i) => rect(ctx, c, 0, i * h, VIEW_W, h));
}

function stars(ctx: Ctx, t: number, count: number, maxY: number): void {
  const rng = new Rng(42);
  for (let i = 0; i < count; i++) {
    const x = rng.int(0, VIEW_W - 1);
    const y = rng.int(0, maxY);
    const twinkle = Math.sin(t * 2 + i) > 0.2;
    rect(ctx, twinkle ? '#f2efe6' : '#8a8aa8', x, y, 1, 1);
  }
}

function skyline(ctx: Ctx, seed: number, baseY: number, color: string, windows: string | null, t: number): void {
  const rng = new Rng(seed);
  let x = -4;
  while (x < VIEW_W) {
    const w = rng.int(18, 36);
    const h = rng.int(22, 62);
    rect(ctx, color, x, baseY - h, w, h);
    if (rng.chance(0.5)) {
      // Pitched roof.
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x - 2, baseY - h);
      ctx.lineTo(x + w / 2, baseY - h - 12);
      ctx.lineTo(x + w + 2, baseY - h);
      ctx.fill();
    }
    if (windows) {
      for (let wy = baseY - h + 6; wy < baseY - 6; wy += 10) {
        for (let wx = x + 4; wx < x + w - 5; wx += 8) {
          if (rng.chance(0.45)) {
            const flicker = Math.sin(t * 3 + wx * 0.7 + wy) > -0.9;
            rect(ctx, flicker ? windows : '#a0782a', wx, wy, 3, 4);
          }
        }
      }
    }
    x += w + rng.int(0, 3);
  }
}

function cobbles(ctx: Ctx, top: number): void {
  rect(ctx, '#3a3440', 0, top, VIEW_W, VIEW_H - top);
  const rng = new Rng(7);
  for (let y = top + 3; y < VIEW_H; y += 6) {
    for (let x = ((y / 6) % 2) * 6; x < VIEW_W; x += 12) {
      rect(ctx, rng.chance(0.5) ? '#4a4452' : '#2e2a36', x, y, 10, 4);
    }
  }
}

function drawStreet(ctx: Ctx, t: number): void {
  sky(ctx, ['#1c1838', '#2a2050', '#3d2a62', '#6a3a70', '#a8527a', '#d9803b'], 110);
  stars(ctx, t, 40, 60);
  rect(ctx, '#f2e6c0', 262, 18, 14, 14); // moon
  rect(ctx, '#d0c498', 266, 22, 4, 4);
  skyline(ctx, 3, 118, '#241a38', null, t);
  skyline(ctx, 11, 134, '#17112a', '#e8c34a', t);
  // Eagle Tower, missing its eagle.
  rect(ctx, '#2a2040', 140, 28, 40, 108);
  rect(ctx, '#3a2e58', 144, 32, 32, 100);
  ctx.fillStyle = '#17112a';
  ctx.beginPath();
  ctx.moveTo(136, 30);
  ctx.lineTo(160, 6);
  ctx.lineTo(184, 30);
  ctx.fill();
  rect(ctx, '#e8c34a', 157, 40, 6, 9);
  rect(ctx, '#e8c34a', 157, 62, 6, 9);
  rect(ctx, '#8a7a98', 159, 0, 2, 8); // empty perch
  rect(ctx, '#8a7a98', 154, 5, 12, 2);
  cobbles(ctx, 132);
  // Lantern posts.
  for (const x of [48, 270]) {
    rect(ctx, '#17112a', x, 100, 3, 50);
    rect(ctx, Math.sin(t * 6 + x) > -0.8 ? '#ffd870' : '#d9a840', x - 3, 94, 9, 8);
  }
  // A lonely feather drifts down.
  const fy = (t * 14) % 150;
  rect(ctx, '#f2efe6', 100 + Math.sin(t * 1.5) * 14, fy, 3, 1);
  rect(ctx, '#c8c4b4', 102 + Math.sin(t * 1.5) * 14, fy + 1, 2, 1);
}

function drawShop(ctx: Ctx, t: number): void {
  rect(ctx, '#5a3e28', 0, 0, VIEW_W, VIEW_H);
  for (let x = 0; x < VIEW_W; x += 16) rect(ctx, '#4a3220', x, 0, 1, 120);
  rect(ctx, '#3a2818', 0, 120, VIEW_W, 60);
  // Shelves of goods.
  const goods = ['#c43c3c', '#5ac8e0', '#e8c34a', '#8a8a96', '#7a4aa8', '#6fa34a'];
  for (const y of [30, 62, 94]) {
    rect(ctx, '#2a1c10', 12, y + 14, 296, 4);
    const rng = new Rng(y);
    for (let x = 18; x < 300; x += 14) {
      const h = rng.int(6, 13);
      rect(ctx, goods[rng.int(0, goods.length - 1)], x, y + 14 - h, rng.int(6, 10), h);
    }
  }
  drawSprite(ctx, 'humanoid', 130, 56, 5, { g: '#d99a8a', b: '#6a4a8a', h: '#d8d8d8' });
  rect(ctx, '#7a5230', 0, 122, VIEW_W, 14); // counter
  rect(ctx, '#9a6a3a', 0, 122, VIEW_W, 3);
  const glow = 0.5 + 0.5 * Math.sin(t * 4);
  rect(ctx, glow > 0.5 ? '#ffd870' : '#e8b848', 20, 108, 6, 10); // lantern
}

function drawTemple(ctx: Ctx, t: number): void {
  rect(ctx, '#2a2438', 0, 0, VIEW_W, VIEW_H);
  rect(ctx, '#3e3650', 0, 124, VIEW_W, 56);
  // Stained-glass windows.
  const colors = ['#c43c3c', '#e8c34a', '#5ac8e0', '#6fa34a'];
  for (const x of [34, 126, 218]) {
    rect(ctx, '#17112a', x - 2, 12, 56, 80);
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 4; c++) {
        rect(ctx, colors[(r + c) % colors.length], x + c * 13, 14 + r * 15, 12, 14);
      }
    }
  }
  // Altar with a glowing pinion-shaped light.
  rect(ctx, '#8a8a96', 128, 104, 64, 22);
  rect(ctx, '#b0b0bc', 128, 104, 64, 4);
  const pulse = 0.6 + 0.4 * Math.sin(t * 2);
  ctx.fillStyle = `rgba(255, 230, 140, ${0.25 * pulse})`;
  ctx.beginPath();
  ctx.arc(160, 98, 22, 0, Math.PI * 2);
  ctx.fill();
  rect(ctx, '#ffd870', 158, 86, 4, 16);
  for (const x of [108, 206]) {
    rect(ctx, '#d8d8d8', x, 96, 4, 28);
    rect(ctx, Math.sin(t * 8 + x) > -0.5 ? '#ffd870' : '#ffb040', x, 90, 4, 6);
  }
  drawSprite(ctx, 'humanoid', 144, 40, 2, { g: '#e8b98f', b: '#f0f0e0', h: '#f0f0e0' });
}

function drawInn(ctx: Ctx, t: number): void {
  rect(ctx, '#4a3428', 0, 0, VIEW_W, VIEW_H);
  rect(ctx, '#2e2018', 0, 126, VIEW_W, 54);
  for (let x = 0; x < VIEW_W; x += 20) rect(ctx, '#3a281c', x, 0, 2, 126);
  // Fireplace with animated flames.
  rect(ctx, '#6a6a76', 118, 40, 84, 86);
  rect(ctx, '#17112a', 130, 58, 60, 68);
  for (let i = 0; i < 7; i++) {
    const h = 18 + Math.sin(t * 7 + i * 1.7) * 8 + (i % 2) * 6;
    const x = 134 + i * 8;
    rect(ctx, '#c43c3c', x, 126 - h, 7, h);
    rect(ctx, '#d9803b', x + 1, 126 - h * 0.7, 5, h * 0.7);
    rect(ctx, '#ffd870', x + 2, 126 - h * 0.4, 3, h * 0.4);
  }
  // Tables and mugs.
  for (const x of [22, 236]) {
    rect(ctx, '#7a5230', x, 112, 56, 6);
    rect(ctx, '#5a3a20', x + 6, 118, 5, 24);
    rect(ctx, '#5a3a20', x + 44, 118, 5, 24);
    rect(ctx, '#e8c34a', x + 10, 104, 7, 8);
    rect(ctx, '#e8c34a', x + 32, 104, 7, 8);
  }
  drawSprite(ctx, 'humanoid', 40, 54, 3, { g: '#e0ac86', b: '#6a8a4a', h: '#a04a2a' });
  drawSprite(ctx, 'eagle', 266, 20, 2); // stuffed eagle trophy, ironically
}

function drawGuild(ctx: Ctx, t: number): void {
  rect(ctx, '#38304a', 0, 0, VIEW_W, VIEW_H);
  rect(ctx, '#2a2438', 0, 126, VIEW_W, 54);
  // Banners.
  for (const [x, c] of [[24, '#c43c3c'], [264, '#3a6ac4']] as const) {
    rect(ctx, c, x, 10, 32, 70);
    rect(ctx, '#e8c34a', x + 12, 24, 8, 8);
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(x, 80);
    ctx.lineTo(x + 16, 92);
    ctx.lineTo(x + 32, 80);
    ctx.fill();
  }
  // Notice board.
  rect(ctx, '#5a3e28', 108, 26, 104, 62);
  const rng = new Rng(9);
  for (let i = 0; i < 7; i++) {
    rect(ctx, rng.chance(0.5) ? '#e8dcc0' : '#d8c8a0', 114 + (i % 4) * 24, 32 + Math.floor(i / 4) * 26, 18, 20);
  }
  // Loitering heroes.
  const pals = [
    { g: '#e0ac86', b: '#8a9bb8', h: '#3a2a1a' },
    { g: '#8fae6a', b: '#6a5acd', h: '#2a2a2e' },
    { g: '#f0d2b0', b: '#5f9a4a', h: '#c8a050' },
  ];
  pals.forEach((p, i) => {
    const bob = Math.round(Math.sin(t * 2 + i * 2) * 1);
    drawSprite(ctx, 'humanoid', 70 + i * 66, 92 + bob, 4, p);
  });
}

export function drawPlace(ctx: Ctx, place: Place, t: number): void {
  ctx.imageSmoothingEnabled = false;
  switch (place) {
    case 'street': return drawStreet(ctx, t);
    case 'shop': return drawShop(ctx, t);
    case 'temple': return drawTemple(ctx, t);
    case 'inn': return drawInn(ctx, t);
    case 'guild': return drawGuild(ctx, t);
  }
}

export function drawTitleScene(ctx: Ctx, t: number): void {
  ctx.imageSmoothingEnabled = false;
  sky(ctx, ['#0c0a1c', '#16122e', '#221a44', '#32265c', '#46327a', '#6a3a8a', '#a8527a'], 130);
  stars(ctx, t, 60, 90);
  // Mountains.
  const ridge = (color: string, base: number, amp: number, seed: number): void => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, VIEW_H);
    for (let x = 0; x <= VIEW_W; x += 8) {
      ctx.lineTo(x, base - Math.abs(Math.sin(x * 0.03 + seed)) * amp - Math.sin(x * 0.11 + seed) * 4);
    }
    ctx.lineTo(VIEW_W, VIEW_H);
    ctx.fill();
  };
  ridge('#2a2048', 128, 40, 1);
  ridge('#1a1432', 150, 30, 4);
  ridge('#0e0a1c', 170, 16, 9);
  const bob = Math.round(Math.sin(t * 1.4) * 3);
  drawSprite(ctx, 'eagle', 96, 14 + bob, 8);
}

export function drawBattleBackdrop(ctx: Ctx, theme: DungeonTheme, t: number): void {
  ctx.imageSmoothingEnabled = false;
  rect(ctx, theme.ceiling, 0, 0, VIEW_W, VIEW_H);
  rect(ctx, theme.wall, 0, 20, VIEW_W, 100);
  const rng = new Rng(5);
  for (let y = 20; y < 120; y += 12) {
    for (let x = (y / 12) % 2 ? 0 : -16; x < VIEW_W; x += 32) {
      rect(ctx, rng.chance(0.5) ? '#00000030' : '#ffffff10', x, y, 30, 10);
    }
  }
  rect(ctx, theme.floor, 0, 120, VIEW_W, 60);
  for (let y = 124; y < VIEW_H; y += 8) rect(ctx, '#00000030', 0, y, VIEW_W, 1);
  for (const x of [24, 296]) {
    rect(ctx, '#5a3e28', x, 44, 3, 18);
    rect(ctx, Math.sin(t * 9 + x) > -0.4 ? '#ffd870' : '#ffb040', x - 2, 36, 7, 9);
  }
  rect(ctx, '#00000060', 0, 0, VIEW_W, 14);
}
