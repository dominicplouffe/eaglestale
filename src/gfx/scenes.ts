import { Rng } from '../rules/rng';
import { ART_SIZE, drawArt, hasArt } from './art';
import { parseHex, toHex } from './colors';
import { VIEW_H, VIEW_W } from './dungeonView';
import { drawText } from './font';
import { drawBust } from './portrait';
import { drawSprite } from './sprites';

/**
 * Town and title scenes. Each scene's still parts are painted once into a cached canvas (dithered
 * skies, textured walls, furniture); every frame only the moving parts are drawn on top: flames
 * and their glow, twinkling stars, drifting feathers.
 */

type Ctx = CanvasRenderingContext2D;

export type Place = 'street' | 'guild' | 'shop' | 'temple' | 'inn';

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

const rect = (ctx: Ctx, color: string, x: number, y: number, w: number, h: number): void => {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};

const shade = (hex: string, f: number): string => {
  const c = parseHex(hex);
  return toHex([c[0] * f, c[1] * f, c[2] * f]);
};

/** A vertical gradient through `stops`, dithered between neighbouring colours like old VGA art. */
function ditherBands(ctx: Ctx, x: number, y: number, w: number, h: number, stops: string[]): void {
  const img = ctx.getImageData(x, y, w, h);
  const cols = stops.map(parseHex);
  for (let yy = 0; yy < h; yy++) {
    const pos = (yy / Math.max(1, h - 1)) * (cols.length - 1);
    const i = Math.min(cols.length - 2, Math.floor(pos));
    const f = pos - i;
    for (let xx = 0; xx < w; xx++) {
      const c = f > BAYER[((yy & 3) << 2) | (xx & 3)] ? cols[i + 1] : cols[i];
      const o = (yy * w + xx) * 4;
      img.data[o] = c[0];
      img.data[o + 1] = c[1];
      img.data[o + 2] = c[2];
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, x, y);
}

/** A soft round light, added on top of what's there (so it brightens rather than covers). */
const glowCache = new Map<string, HTMLCanvasElement>();
function glow(ctx: Ctx, x: number, y: number, radius: number, color: string, strength: number): void {
  const key = `${radius}|${color}`;
  let g = glowCache.get(key);
  if (!g) {
    g = document.createElement('canvas');
    g.width = g.height = radius * 2;
    const gc = g.getContext('2d') as Ctx;
    const grad = gc.createRadialGradient(radius, radius, 0, radius, radius, radius);
    const [r, gg, b] = parseHex(color);
    grad.addColorStop(0, `rgba(${r},${gg},${b},0.55)`);
    grad.addColorStop(0.4, `rgba(${r},${gg},${b},0.2)`);
    grad.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    gc.fillStyle = grad;
    gc.fillRect(0, 0, radius * 2, radius * 2);
    glowCache.set(key, g);
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.max(0, Math.min(1, strength));
  ctx.drawImage(g, Math.round(x - radius), Math.round(y - radius));
  ctx.restore();
}

/** A small flickering flame (candle, torch, lantern) with its glow. */
function flame(ctx: Ctx, x: number, y: number, t: number, size = 1, seed = 0): void {
  const f = Math.sin(t * 11 + seed) * 0.5 + Math.sin(t * 7.3 + seed * 2) * 0.5;
  const h = Math.round((3 + f) * size);
  rect(ctx, '#c43c3c', x - size, y - h + 1, size * 2 + 1, h);
  rect(ctx, '#ffb060', x - Math.max(0, size - 1), y - h + 2, Math.max(1, size * 2 - 1), h - 1);
  rect(ctx, '#fff0a0', x, y - Math.max(1, h - 2), 1, Math.max(1, h - 2));
  glow(ctx, x, y - h / 2, 14 * size, '#ffb060', 0.75 + f * 0.15);
}

/** Paints the still part of a scene once and reuses it. */
const layers = new Map<string, HTMLCanvasElement>();
function still(key: string, paint: (ctx: Ctx) => void): HTMLCanvasElement {
  let c = layers.get(key);
  if (!c) {
    c = document.createElement('canvas');
    c.width = VIEW_W;
    c.height = VIEW_H;
    const ctx = c.getContext('2d') as Ctx;
    ctx.imageSmoothingEnabled = false;
    paint(ctx);
    layers.set(key, c);
  }
  return c;
}

// ---- Building blocks ------------------------------------------------------

/** Wooden planks: vertical boards with grain and a dark gap between them. */
function planks(ctx: Ctx, x: number, y: number, w: number, h: number, base: string, seed: number, boardW = 12): void {
  const rng = new Rng(seed);
  for (let bx = x; bx < x + w; bx += boardW) {
    const tone = shade(base, 0.88 + rng.next() * 0.24);
    rect(ctx, tone, bx, y, boardW - 1, h);
    rect(ctx, shade(tone, 1.15), bx, y, 1, h);
    rect(ctx, shade(base, 0.5), bx + boardW - 1, y, 1, h);
    for (let i = 0; i < h / 6; i++) rect(ctx, shade(tone, 0.82), bx + rng.int(2, boardW - 4), y + rng.int(0, h - 4), 1, rng.int(2, 5));
    if (rng.chance(0.4)) rect(ctx, shade(tone, 0.65), bx + rng.int(3, boardW - 5), y + rng.int(4, Math.max(5, h - 6)), 2, 2); // a knot
  }
}

/** Stone blocks with mortar, a lit top edge and a shadowed bottom. */
function stones(ctx: Ctx, x: number, y: number, w: number, h: number, base: string, seed: number, bw = 20, bh = 10): void {
  const rng = new Rng(seed);
  rect(ctx, shade(base, 0.5), x, y, w, h);
  for (let row = 0; row * bh < h; row++) {
    const off = row % 2 ? bw / 2 : 0;
    for (let bx = x - off; bx < x + w; bx += bw) {
      const tone = shade(base, 0.85 + rng.next() * 0.3);
      const by = y + row * bh;
      const cx = Math.max(x, bx);
      const cw = Math.min(bx + bw - 1, x + w) - cx;
      if (cw <= 0) continue;
      rect(ctx, tone, cx, by, cw, bh - 1);
      rect(ctx, shade(tone, 1.18), cx, by, cw, 1);
      rect(ctx, shade(tone, 0.78), cx, by + bh - 2, cw, 1);
    }
  }
}

/** Floor boards running toward the viewer's feet, darker at the back. */
function floorBoards(ctx: Ctx, top: number, base: string, seed: number): void {
  const rng = new Rng(seed);
  for (let y = top; y < VIEW_H; y += 5) {
    const depth = (y - top) / (VIEW_H - top);
    const tone = shade(base, 0.7 + depth * 0.45);
    rect(ctx, tone, 0, y, VIEW_W, 5);
    rect(ctx, shade(tone, 0.6), 0, y + 4, VIEW_W, 1);
    for (let x = rng.int(0, 40); x < VIEW_W; x += rng.int(40, 80)) rect(ctx, shade(tone, 0.6), x, y, 1, 4);
  }
}

function bottle(ctx: Ctx, x: number, base: number, color: string, tall: boolean): void {
  const h = tall ? 10 : 7;
  rect(ctx, '#14121c', x - 1, base - h - 1, 7, h + 1);
  rect(ctx, color, x, base - h + 2, 5, h - 2);
  rect(ctx, shade(color, 1.4), x + 1, base - h + 3, 1, h - 5);
  rect(ctx, shade(color, 0.6), x + 4, base - h + 2, 1, h - 2);
  rect(ctx, '#c8c4b4', x + 1, base - h, 3, 2); // neck
  rect(ctx, '#7a5230', x + 1, base - h - 1, 3, 1); // cork
}

function eagleArt(ctx: Ctx, x: number, y: number, scale: number): void {
  if (hasArt('eagle')) drawArt(ctx, 'eagle', x, y, scale);
  else drawSprite(ctx, 'eagle', x, y, scale * 2);
}

// ---- Scenes ----------------------------------------------------------------

function streetStill(ctx: Ctx): void {
  ditherBands(ctx, 0, 0, VIEW_W, 132, ['#0e0a1c', '#1c1838', '#2a2050', '#3d2a62', '#6a3a70', '#a8527a', '#d9803b']);
  // Moon.
  ctx.fillStyle = '#f2e6c0';
  ctx.beginPath();
  ctx.arc(266, 24, 9, 0, Math.PI * 2);
  ctx.fill();
  rect(ctx, '#d8cc9e', 262, 21, 3, 3);
  rect(ctx, '#d8cc9e', 268, 27, 2, 2);
  glow(ctx, 266, 24, 30, '#f2e6c0', 0.35);
  const skyline = (seed: number, baseY: number, color: string, windows: boolean): void => {
    const rng = new Rng(seed);
    for (let x = -4; x < VIEW_W; ) {
      const w = rng.int(18, 36);
      const h = rng.int(22, 62);
      rect(ctx, color, x, baseY - h, w, h);
      rect(ctx, shade(color, 1.35), x, baseY - h, 1, h); // moonlit edge
      if (rng.chance(0.5)) {
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
              rect(ctx, '#e8c34a', wx, wy, 3, 4);
              rect(ctx, '#fff0a0', wx, wy, 1, 1);
            }
          }
        }
      }
      x += w + rng.int(0, 3);
    }
  };
  skyline(3, 118, '#241a38', false);
  skyline(11, 134, '#17112a', true);
  // Eagle Tower, missing its eagle.
  stones(ctx, 140, 28, 40, 108, '#3a2e58', 4, 10, 6);
  rect(ctx, '#4a3e6a', 140, 28, 1, 108);
  ctx.fillStyle = '#17112a';
  ctx.beginPath();
  ctx.moveTo(136, 30);
  ctx.lineTo(160, 6);
  ctx.lineTo(184, 30);
  ctx.fill();
  for (const y of [40, 62]) {
    rect(ctx, '#14121c', 156, y - 1, 8, 11);
    rect(ctx, '#e8c34a', 157, y, 6, 9);
    rect(ctx, '#fff0a0', 157, y, 2, 3);
  }
  rect(ctx, '#8a7a98', 159, 0, 2, 8); // the empty perch
  rect(ctx, '#8a7a98', 154, 5, 12, 2);
  // Cobbles: rounded stones with a lit top and a dark gap.
  rect(ctx, '#1e1a26', 0, 132, VIEW_W, VIEW_H - 132);
  const rng = new Rng(7);
  for (let y = 133, row = 0; y < VIEW_H; y += 6, row++) {
    for (let x = (row % 2) * 6 - 6; x < VIEW_W; x += 12) {
      const tone = rng.chance(0.5) ? '#4a4452' : '#3a3440';
      rect(ctx, tone, x + 1, y, 10, 5);
      rect(ctx, shade(tone, 1.3), x + 2, y, 8, 1);
      rect(ctx, shade(tone, 0.7), x + 1, y + 4, 10, 1);
    }
  }
  for (const x of [48, 270]) {
    rect(ctx, '#17112a', x, 100, 3, 50);
    rect(ctx, '#2a2240', x - 4, 92, 11, 2);
    rect(ctx, '#2a2240', x - 3, 102, 9, 1);
  }
}

function drawStreet(ctx: Ctx, t: number): void {
  ctx.drawImage(still('street', streetStill), 0, 0);
  const rng = new Rng(42);
  for (let i = 0; i < 46; i++) {
    const x = rng.int(0, VIEW_W - 1);
    const y = rng.int(0, 64);
    if (x > 246 && x < 286 && y < 44) continue; // not in front of the moon
    rect(ctx, Math.sin(t * 2 + i) > 0.2 ? '#f2efe6' : '#6a6a88', x, y, 1, 1);
  }
  for (const x of [48, 270]) {
    rect(ctx, '#ffd870', x - 2, 94, 7, 8);
    rect(ctx, '#fff0a0', x, 95, 3, 5);
    glow(ctx, x + 1, 98, 26, '#ffb060', 0.7 + Math.sin(t * 6 + x) * 0.1);
  }
  // A lonely feather drifts down.
  const fy = (t * 14) % 150;
  const fx = 100 + Math.sin(t * 1.5) * 14;
  rect(ctx, '#f2efe6', fx, fy, 3, 1);
  rect(ctx, '#c8c4b4', fx + 2, fy + 1, 2, 1);
}

function shopStill(ctx: Ctx): void {
  planks(ctx, 0, 0, VIEW_W, 124, '#5a3e28', 2);
  rect(ctx, '#3a2818', 0, 0, VIEW_W, 5);
  // Shelves of goods.
  const goods = ['#c43c3c', '#5ac8e0', '#e8c34a', '#7a4aa8', '#6fa34a', '#d9803b'];
  for (const y of [32, 64, 96]) {
    const rng = new Rng(y);
    rect(ctx, '#14121c', 10, y + 13, 300, 6);
    rect(ctx, '#7a5230', 10, y + 13, 300, 4);
    rect(ctx, '#9a6a3a', 10, y + 13, 300, 1);
    for (let x = 16; x < 300; x += rng.int(9, 14)) {
      if (x > 120 && x < 200 && y > 40) continue; // leave room for the shopkeeper
      if (rng.chance(0.25)) {
        rect(ctx, '#14121c', x - 1, y + 4, 10, 9); // a crate
        rect(ctx, '#8a5a2a', x, y + 5, 8, 8);
        rect(ctx, '#a87a48', x, y + 5, 8, 1);
        rect(ctx, '#5a3a20', x + 3, y + 5, 1, 8);
      } else bottle(ctx, x, y + 13, goods[rng.int(0, goods.length - 1)], rng.chance(0.5));
    }
  }
  floorBoards(ctx, 124, '#3a2818', 5);
}

function drawShop(ctx: Ctx, t: number): void {
  ctx.drawImage(still('shop', shopStill), 0, 0);
  // Dusty Gizzard, a gnome shopkeeper, behind the counter.
  drawBust(ctx, 124, 60, 3, { race: 'gnome', cls: 'minstrel', hairStyle: 'shaggy', hairColor: '#d8d8d8', outfit: '#6a4a8a' });
  rect(ctx, '#14121c', 0, 118, VIEW_W, 22);
  planks(ctx, 0, 120, VIEW_W, 20, '#7a5230', 9, 16);
  rect(ctx, '#b07a48', 0, 119, VIEW_W, 2);
  // A hanging lantern.
  rect(ctx, '#2a1c10', 40, 0, 1, 14);
  rect(ctx, '#14121c', 36, 14, 9, 11);
  flame(ctx, 40, 23, t, 1, 1);
  glow(ctx, 40, 19, 46, '#ffb060', 0.5);
}

function templeStill(ctx: Ctx): void {
  stones(ctx, 0, 0, VIEW_W, 126, '#3a3250', 3, 24, 12);
  // Stained-glass windows with lead lines.
  const glass = ['#c43c3c', '#e8c34a', '#5ac8e0', '#6fa34a', '#7a4aa8'];
  for (const x of [34, 126, 218]) {
    rect(ctx, '#14121c', x - 3, 10, 58, 86);
    ctx.fillStyle = '#14121c';
    ctx.beginPath();
    ctx.arc(x + 26, 14, 29, Math.PI, 0);
    ctx.fill();
    const rng = new Rng(x);
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 4; c++) {
        const col = glass[rng.int(0, glass.length - 1)];
        rect(ctx, col, x + c * 13, 14 + r * 13, 12, 12);
        rect(ctx, shade(col, 1.35), x + c * 13, 14 + r * 13, 12, 2);
      }
    }
    ctx.fillStyle = '#e8c34a';
    ctx.beginPath();
    ctx.arc(x + 26, 14, 24, Math.PI, 0);
    ctx.fill();
    rect(ctx, '#fff0a0', x + 22, 2, 8, 8);
  }
  // Checkered floor.
  for (let y = 126; y < VIEW_H; y += 9) {
    for (let x = 0; x < VIEW_W; x += 18) {
      const dark = ((x / 18) + Math.floor((y - 126) / 9)) % 2;
      rect(ctx, dark ? '#2e2840' : '#4a4260', x, y, 18, 9);
    }
  }
  // Altar.
  rect(ctx, '#14121c', 120, 101, 80, 27);
  rect(ctx, '#8a8a96', 122, 103, 76, 24);
  rect(ctx, '#b0b0bc', 122, 103, 76, 3);
  rect(ctx, '#f0f0e0', 130, 106, 60, 14); // altar cloth
  rect(ctx, '#e8c34a', 156, 106, 8, 14);
  for (const x of [108, 206]) {
    rect(ctx, '#d8d8d8', x, 96, 4, 28);
    rect(ctx, '#f2efe6', x, 96, 1, 28);
  }
}

function drawTemple(ctx: Ctx, t: number): void {
  ctx.drawImage(still('temple', templeStill), 0, 0);
  // Coloured light falling from the windows.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [i, x] of [34, 126, 218].entries()) {
    ctx.fillStyle = `rgba(255, 220, 160, ${0.07 + 0.03 * Math.sin(t * 0.8 + i)})`;
    ctx.beginPath();
    ctx.moveTo(x, 96);
    ctx.lineTo(x + 52, 96);
    ctx.lineTo(x + 76, VIEW_H);
    ctx.lineTo(x + 16, VIEW_H);
    ctx.fill();
  }
  ctx.restore();
  // The priest stands behind the altar.
  drawBust(ctx, 136, 40, 2, { race: 'human', cls: 'healer', hairStyle: 'short', hairColor: '#d8d8d8' });
  rect(ctx, '#14121c', 120, 86, 80, 2);
  const pulse = 0.6 + 0.4 * Math.sin(t * 2);
  glow(ctx, 160, 92, 30, '#ffe08c', 0.5 + pulse * 0.3);
  rect(ctx, '#ffd870', 158, 86, 4, 12); // a pinion-shaped light
  rect(ctx, '#fff6c0', 159, 86, 1, 10);
  for (const x of [110, 208]) flame(ctx, x, 95, t, 1, x);
}

function innStill(ctx: Ctx): void {
  planks(ctx, 0, 0, VIEW_W, 128, '#4a3428', 6, 14);
  for (const y of [0, 52]) {
    rect(ctx, '#2a1c10', 0, y, VIEW_W, 7);
    rect(ctx, '#5a3e28', 0, y, VIEW_W, 1);
  }
  // Fireplace.
  stones(ctx, 112, 34, 96, 94, '#6a6a76', 8, 16, 8);
  rect(ctx, '#14121c', 126, 56, 68, 72);
  ctx.fillStyle = '#14121c';
  ctx.beginPath();
  ctx.arc(160, 58, 34, Math.PI, 0);
  ctx.fill();
  rect(ctx, '#3a3440', 108, 30, 104, 6); // mantel
  rect(ctx, '#5a5464', 108, 30, 104, 1);
  floorBoards(ctx, 128, '#2e2018', 12);
  // The stuffed eagle trophy on its plaque, ironically.
  rect(ctx, '#14121c', 255, 16, 50, 46);
  rect(ctx, '#7a5230', 256, 17, 48, 44);
  rect(ctx, '#9a6a3a', 256, 17, 48, 2);
  eagleArt(ctx, 264, 22, 1);
  // Tables with mugs.
  for (const x of [16, 236]) {
    rect(ctx, '#14121c', x - 1, 117, 66, 8);
    rect(ctx, '#7a5230', x, 118, 64, 6);
    rect(ctx, '#a87a48', x, 118, 64, 1);
    rect(ctx, '#5a3a20', x + 6, 124, 5, 26);
    rect(ctx, '#5a3a20', x + 52, 124, 5, 26);
    for (const mx of [x + 12, x + 40]) {
      rect(ctx, '#14121c', mx - 1, 108, 10, 11);
      rect(ctx, '#a87a48', mx, 110, 8, 8);
      rect(ctx, '#f2efe6', mx, 108, 8, 3); // foam
      rect(ctx, '#7a5230', mx + 8, 112, 2, 4); // handle
    }
  }
}

function drawInn(ctx: Ctx, t: number): void {
  ctx.drawImage(still('inn', innStill), 0, 0);
  // The innkeeper, half-hidden behind the near table.
  drawBust(ctx, 18, 68, 2, { race: 'hobbit', cls: 'ranger', hairStyle: 'long', hairColor: '#a04a2a', outfit: '#6a8a4a' });
  rect(ctx, '#14121c', 15, 116, 68, 2);
  rect(ctx, '#7a5230', 16, 117, 64, 7);
  rect(ctx, '#a87a48', 16, 117, 64, 1);
  // Fire.
  for (let i = 0; i < 8; i++) {
    const h = 16 + Math.sin(t * 7 + i * 1.7) * 7 + (i % 2) * 6;
    const x = 132 + i * 7;
    rect(ctx, '#c43c3c', x, 126 - h, 7, h);
    rect(ctx, '#d9803b', x + 1, 126 - h * 0.7, 5, h * 0.7);
    rect(ctx, '#ffd870', x + 2, 126 - h * 0.4, 3, h * 0.4);
  }
  rect(ctx, '#2a1c10', 130, 122, 60, 4); // logs
  glow(ctx, 160, 108, 70, '#ff9a40', 0.55 + Math.sin(t * 5) * 0.08);
}

function guildStill(ctx: Ctx): void {
  stones(ctx, 0, 0, VIEW_W, 128, '#38304a', 13, 22, 11);
  // Banners with the eagle crest.
  for (const [x, c] of [[24, '#c43c3c'], [264, '#3a6ac4']] as const) {
    rect(ctx, '#14121c', x - 1, 9, 34, 72);
    rect(ctx, c, x, 10, 32, 70);
    rect(ctx, shade(c, 1.3), x, 10, 2, 70);
    rect(ctx, shade(c, 0.7), x + 30, 10, 2, 70);
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(x, 80);
    ctx.lineTo(x + 16, 92);
    ctx.lineTo(x + 32, 80);
    ctx.fill();
    // A little eagle crest.
    rect(ctx, '#e8c34a', x + 8, 30, 16, 3);
    rect(ctx, '#e8c34a', x + 13, 26, 6, 12);
    rect(ctx, '#fff0a0', x + 14, 27, 2, 2);
    rect(ctx, '#2a2a40', x + 6, 9, 20, 2);
  }
  // Notice board with a wanted poster.
  rect(ctx, '#14121c', 98, 22, 124, 66);
  planks(ctx, 99, 23, 122, 64, '#5a3e28', 21, 10);
  const rng = new Rng(9);
  for (let i = 0; i < 5; i++) {
    const x = 104 + (i % 3) * 22 + (i > 2 ? 10 : 0);
    const y = 28 + Math.floor(i / 3) * 28;
    rect(ctx, '#d8c8a0', x, y, 18, 22);
    for (let l = 0; l < 4; l++) rect(ctx, '#8a7a5a', x + 2, y + 4 + l * 4, rng.int(8, 14), 1);
    rect(ctx, '#c43c3c', x + 8, y, 2, 2); // pin
  }
  rect(ctx, '#f2e6c0', 170, 26, 46, 56);
  drawText(ctx, 'WANTED', 193, 29, { color: '#7a1e28', align: 'center' });
  rect(ctx, '#5a4a6a', 182, 40, 22, 24); // a scowling wizard
  rect(ctx, '#2a2038', 184, 34, 18, 8);
  rect(ctx, '#d8d8e0', 186, 52, 14, 10);
  rect(ctx, '#14121c', 187, 46, 3, 2);
  rect(ctx, '#14121c', 196, 46, 3, 2);
  drawText(ctx, '1000g', 193, 68, { color: '#7a1e28', align: 'center' });
  floorBoards(ctx, 128, '#2a2438', 15);
}

function drawGuild(ctx: Ctx, t: number): void {
  ctx.drawImage(still('guild', guildStill), 0, 0);
  // The Guildmaster behind the desk, with a half-eaten sandwich.
  drawBust(ctx, 136, 76, 2, { race: 'dwarf', cls: 'knight', hairStyle: 'short', hairColor: '#6b4a2a', outfit: '#6a5a4a' });
  rect(ctx, '#14121c', 92, 118, 136, 3);
  planks(ctx, 93, 120, 134, 26, '#6a4a2a', 18, 17);
  rect(ctx, '#a87a48', 93, 120, 134, 1);
  rect(ctx, '#e8c34a', 196, 113, 14, 3); // the sandwich
  rect(ctx, '#6fa34a', 195, 112, 16, 1);
  rect(ctx, '#d9a273', 196, 110, 14, 2);
  for (const x of [72, 248]) {
    rect(ctx, '#3a2818', x, 52, 3, 12);
    flame(ctx, x + 1, 51, t, 1, x);
  }
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

function titleStill(dawn: boolean): (ctx: Ctx) => void {
  return (ctx) => {
    const sky = dawn
      ? ['#2a2050', '#4a2a62', '#8a3a70', '#c8527a', '#e88a4a', '#f8c060', '#fff0a0']
      : ['#0c0a1c', '#16122e', '#221a44', '#32265c', '#46327a', '#6a3a8a', '#a8527a'];
    ditherBands(ctx, 0, 0, VIEW_W, 140, sky);
    if (dawn) glow(ctx, 160, 140, 90, '#fff0a0', 0.6);
    const ridge = (color: string, base: number, amp: number, seed: number, rim: string): void => {
      for (let x = 0; x < VIEW_W; x++) {
        const top = Math.round(base - Math.abs(Math.sin(x * 0.03 + seed)) * amp - Math.sin(x * 0.11 + seed) * 4);
        rect(ctx, color, x, top, 1, VIEW_H - top);
        rect(ctx, rim, x, top, 1, 1);
      }
    };
    ridge('#2a2048', 128, 40, 1, dawn ? '#e88a4a' : '#46327a');
    ridge('#1a1432', 150, 30, 4, dawn ? '#a8527a' : '#2a2048');
    // Talonreach on its hill, windows lit.
    rect(ctx, '#120e22', 214, 118, 70, 30);
    for (const [x, h] of [[218, 18], [232, 30], [248, 22], [262, 36], [276, 16]] as const) {
      rect(ctx, '#120e22', x, 118 - h, 10, h);
      rect(ctx, '#120e22', x - 1, 118 - h - 2, 12, 2);
      rect(ctx, '#e8c34a', x + 4, 118 - h + 6, 2, 3);
    }
    ridge('#0e0a1c', 170, 16, 9, '#1a1432');
  };
}

export function drawTitleScene(ctx: Ctx, t: number, dawn = false): void {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(still(dawn ? 'dawn' : 'title', titleStill(dawn)), 0, 0);
  if (!dawn) {
    const rng = new Rng(42);
    for (let i = 0; i < 60; i++) {
      const x = rng.int(0, VIEW_W - 1);
      const y = rng.int(0, 90);
      rect(ctx, Math.sin(t * 2 + i) > 0.2 ? '#f2efe6' : '#6a6a88', x, y, 1, 1);
    }
  }
  const bob = Math.round(Math.sin(t * 1.4) * 3);
  const scale = 3;
  eagleArt(ctx, VIEW_W / 2 - (ART_SIZE * scale) / 2, 18 + bob, scale);
  if (dawn) glow(ctx, VIEW_W / 2, 60 + bob, 60, '#fff0a0', 0.35);
}
