import { Rng } from '../rules/rng';
import type { Maze } from './maze';

/**
 * Builds a dungeon level of rooms joined by winding corridors, with hand-drawn set pieces ("vaults")
 * placed among them. Same seed, same level.
 *
 * A vault is drawn as text: '#' wall, '.' floor, letters for special squares, and '*' on its edge for
 * the places a corridor may join it. Exactly one '*' is used (it becomes the vault's `entrance`), so a
 * lock or secret wall there really does guard everything inside.
 */

export interface Vault {
  rows: string[];
  /** What the joining square becomes: a door '+' (default), open floor '.', or a special letter. */
  entrance?: string;
  /** Prefer a spot near the start, far from it, or anywhere. */
  place?: 'near' | 'far' | 'any';
}

export interface LevelOptions {
  seed: number;
  /** Size in squares (odd numbers look best, e.g. 33). */
  width: number;
  height: number;
  /** Ordinary rooms to try to place, and their interior size range. */
  rooms: number;
  roomSize: [number, number];
  /** Extra corridors beyond the minimum, so the level has loops. */
  loops: number;
  /** Chance that a corridor meets a room through a door. */
  doorChance: number;
  /** Stairs down in the farthest room; otherwise `endKey` (e.g. a boss) goes there. */
  downStairs: boolean;
  endKey?: string;
  vaults?: Vault[];
  /** Special letters for ordinary rooms, spread from near the start to far away in list order. */
  specials: string[];
}

interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
  vault?: Vault;
  /** The square corridors join: a vault's entrance, or a room's centre. */
  ax: number;
  ay: number;
}

const STEPS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const;

const centre = (r: Room): [number, number] => [r.x + Math.floor(r.w / 2), r.y + Math.floor(r.h / 2)];
const gap = (a: Room, b: Room, margin: number): boolean =>
  a.x - margin >= b.x + b.w || b.x - margin >= a.x + a.w || a.y - margin >= b.y + b.h || b.y - margin >= a.y + a.h;

export function generateLevel(o: LevelOptions): Maze {
  const rng = new Rng(o.seed);
  const W = o.width;
  const H = o.height;
  const g: string[][] = Array.from({ length: H }, () => Array<string>(W).fill('#'));
  /** Squares corridors must not cut through (vaults and their walls). */
  const sealed: boolean[][] = Array.from({ length: H }, () => Array<boolean>(W).fill(false));
  const rooms: Room[] = [];

  const fits = (r: Room, margin: number): boolean =>
    r.x >= 1 && r.y >= 1 && r.x + r.w <= W - 1 && r.y + r.h <= H - 1 && rooms.every((o2) => gap(r, o2, margin));

  const plainRoom = (): Room => {
    const [lo, hi] = o.roomSize;
    const w = rng.int(lo, hi);
    const h = rng.int(lo, hi);
    return { x: rng.int(1, Math.max(1, W - w - 1)), y: rng.int(1, Math.max(1, H - h - 1)), w, h, ax: 0, ay: 0 };
  };

  // The starting room, near a corner.
  let start: Room | undefined;
  for (let i = 0; i < 200 && !start; i++) {
    const r = plainRoom();
    r.x = rng.int(1, Math.max(1, Math.floor(W / 4)));
    r.y = rng.int(1, Math.max(1, Math.floor(H / 4)));
    if (fits(r, 2)) start = r;
  }
  if (!start) throw new Error('level generator: no room for the start');
  rooms.push(start);
  const [sx, sy] = centre(start);

  // Vaults, each tried at many spots, keeping the one nearest/farthest from the start as asked.
  for (const v of o.vaults ?? []) {
    const h = v.rows.length;
    const w = Math.max(...v.rows.map((r) => r.length));
    let best: Room | undefined;
    let bestScore = -Infinity;
    for (let i = 0; i < 300; i++) {
      const r: Room = { x: rng.int(1, Math.max(1, W - w - 1)), y: rng.int(1, Math.max(1, H - h - 1)), w, h, vault: v, ax: 0, ay: 0 };
      if (!fits(r, 2)) continue;
      const [cx, cy] = centre(r);
      const d = Math.abs(cx - sx) + Math.abs(cy - sy);
      const score = v.place === 'far' ? d : v.place === 'near' ? -d : rng.next();
      if (score > bestScore) {
        best = r;
        bestScore = score;
      }
    }
    if (!best) throw new Error('level generator: no room for a vault; try a bigger level or fewer rooms');
    rooms.push(best);
  }

  for (let i = 0; i < o.rooms * 30 && rooms.length < 1 + (o.vaults?.length ?? 0) + o.rooms; i++) {
    const r = plainRoom();
    if (fits(r, 2)) rooms.push(r);
  }

  // Carve rooms and stamp vaults.
  for (const r of rooms) {
    if (!r.vault) {
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) g[y][x] = '.';
      [r.ax, r.ay] = centre(r);
      continue;
    }
    const entrances: [number, number][] = [];
    r.vault.rows.forEach((row, dy) => {
      for (let dx = 0; dx < r.w; dx++) {
        const ch = row[dx] ?? '#';
        const x = r.x + dx;
        const y = r.y + dy;
        sealed[y][x] = true;
        if (ch === '*') entrances.push([x, y]);
        g[y][x] = ch === '*' ? '#' : ch;
      }
    });
    if (entrances.length === 0) throw new Error('level generator: a vault needs at least one * entrance');
    // Use the entrance facing the middle of the map, where the other rooms are.
    entrances.sort((a, b) => Math.abs(a[0] - W / 2) + Math.abs(a[1] - H / 2) - (Math.abs(b[0] - W / 2) + Math.abs(b[1] - H / 2)));
    [r.ax, r.ay] = entrances[0];
    g[r.ay][r.ax] = r.vault.entrance ?? '+';
    sealed[r.ay][r.ax] = false;
  }

  // Which rooms to join: a minimum spanning tree over the ordinary rooms, some extra loops, and each
  // vault joined once to its nearest ordinary room (so its entrance is its only way in).
  const plain = rooms.filter((r) => !r.vault);
  const dist = (a: Room, b: Room): number => Math.abs(a.ax - b.ax) + Math.abs(a.ay - b.ay);
  const edges: [Room, Room][] = [];
  const joined = new Set<Room>([plain[0]]);
  while (joined.size < plain.length) {
    let pick: [Room, Room] | undefined;
    for (const a of joined) for (const b of plain) if (!joined.has(b) && (!pick || dist(a, b) < dist(pick[0], pick[1]))) pick = [a, b];
    if (!pick) break;
    edges.push(pick);
    joined.add(pick[1]);
  }
  for (let i = 0; i < o.loops && plain.length > 2; i++) {
    const a = rng.pick(plain);
    const near = plain.filter((b) => b !== a).sort((p, q) => dist(a, p) - dist(a, q));
    edges.push([a, near[rng.int(0, Math.min(2, near.length - 1))]]);
  }
  for (const v of rooms.filter((r) => r.vault)) {
    edges.push([v, plain.reduce((best, r) => (dist(v, r) < dist(v, best) ? r : best))]);
  }

  const inRoom = (x: number, y: number): Room | undefined =>
    plain.find((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);

  // Corridors: cheapest path through rock, preferring existing passages, never through a vault.
  for (const [a, b] of edges) {
    const path = route(a.ax, a.ay, b.ax, b.ay);
    for (let i = 0; i < path.length; i++) {
      const [x, y] = path[i];
      if (g[y][x] !== '#') continue;
      g[y][x] = '.';
      // A corridor square right next to a room's floor is where a door can go.
      const prev = path[i - 1];
      const next = path[i + 1];
      const meetsRoom = (p: [number, number] | undefined): boolean => !!p && !!inRoom(p[0], p[1]);
      if ((meetsRoom(prev) || meetsRoom(next)) && !inRoom(x, y) && rng.chance(o.doorChance)) {
        const horizontal = (prev && prev[1] === y) || (next && next[1] === y);
        const sides = horizontal ? [g[y - 1]?.[x], g[y + 1]?.[x]] : [g[y]?.[x - 1], g[y]?.[x + 1]];
        if (sides.every((s) => s === '#')) g[y][x] = '+';
      }
    }
  }

  function route(fx: number, fy: number, tx: number, ty: number): [number, number][] {
    const cost = new Float64Array(W * H).fill(Infinity);
    const from = new Int32Array(W * H).fill(-1);
    const open: number[] = [fy * W + fx];
    cost[fy * W + fx] = 0;
    // Each corridor gets its own slight random bias, so they wind instead of running dead straight.
    const wobble = Array.from({ length: W * H }, () => rng.next() * 1.5);
    while (open.length) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (cost[open[i]] < cost[open[bi]]) bi = i;
      const cur = open.splice(bi, 1)[0];
      const cx = cur % W;
      const cy = (cur - cx) / W;
      if (cx === tx && cy === ty) break;
      for (const [dx, dy] of STEPS) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 1 || ny < 1 || nx >= W - 1 || ny >= H - 1) continue;
        const target = nx === tx && ny === ty;
        if (sealed[ny][nx] && !target) continue;
        const step = (g[ny][nx] === '#' ? 4 : 1) + wobble[ny * W + nx];
        const ni = ny * W + nx;
        if (cost[cur] + step < cost[ni]) {
          cost[ni] = cost[cur] + step;
          from[ni] = cur;
          open.push(ni);
        }
      }
    }
    const path: [number, number][] = [];
    for (let i = ty * W + tx; i >= 0; i = from[i]) {
      path.unshift([i % W, Math.floor(i / W)]);
      if (i === fy * W + fx) break;
    }
    return path;
  }

  // Stairs: up in the start room, down (or the end key) in the ordinary room farthest away on foot.
  const steps = new Map<string, number>([[`${sx},${sy}`, 0]]);
  const queue: [number, number][] = [[sx, sy]];
  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i];
    for (const [dx, dy] of STEPS) {
      const k = `${x + dx},${y + dy}`;
      if (g[y + dy]?.[x + dx] !== undefined && g[y + dy][x + dx] !== '#' && !steps.has(k)) {
        steps.set(k, (steps.get(`${x},${y}`) as number) + 1);
        queue.push([x + dx, y + dy]);
      }
    }
  }
  const away = (r: Room): number => steps.get(`${r.ax},${r.ay}`) ?? 0;
  const byDistance = plain.filter((r) => r !== start).sort((a, b) => away(a) - away(b));
  const end = byDistance.pop();
  g[sy][sx] = '<';
  if (end) g[end.ay][end.ax] = o.downStairs ? '>' : (o.endKey ?? '.');

  // Specials: spread across the remaining rooms from near to far, on a free floor square in each.
  const slots = byDistance.length ? byDistance : plain;
  o.specials.forEach((letter, i) => {
    const r = slots[Math.min(slots.length - 1, Math.floor(((i + 0.5) / o.specials.length) * slots.length))];
    for (let tries = 0; tries < 50; tries++) {
      const x = rng.int(r.x, r.x + r.w - 1);
      const y = rng.int(r.y, r.y + r.h - 1);
      if (g[y][x] === '.' && !(x === r.ax && y === r.ay)) {
        g[y][x] = letter;
        return;
      }
    }
    throw new Error(`level generator: no free square for special ${letter}`);
  });

  const dir = STEPS.findIndex(([dx, dy]) => g[sy + dy][sx + dx] !== '#');
  return { grid: g.map((row) => row.join('')), start: { x: sx, y: sy, dir } };
}
