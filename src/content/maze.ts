import { Rng } from '../rules/rng';

export interface MazeOptions {
  seed: number;
  /** Maze size in cells; the grid is (2w+1) x (2h+1) tiles. */
  w: number;
  h: number;
  /** Extra walls knocked down so the maze has loops. */
  loops: number;
  doorChance: number;
  /** Stairs down are placed at the farthest cell; otherwise `endKey` is placed there. */
  downStairs: boolean;
  endKey?: string;
  /** Special tile letters to scatter, preferring dead ends. */
  specials: string[];
}

export interface Maze {
  grid: string[];
  start: { x: number; y: number; dir: number };
}

const STEPS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const;

/** Builds a connected maze with stairs, doors and special tiles. Same seed, same maze. */
export function generateMaze(o: MazeOptions): Maze {
  const rng = new Rng(o.seed);
  const W = o.w * 2 + 1;
  const H = o.h * 2 + 1;
  const g: string[][] = Array.from({ length: H }, () => Array<string>(W).fill('#'));

  // Depth-first carve between cell centres (odd coordinates).
  const seen = new Set<string>(['0,0']);
  const stack: [number, number][] = [[0, 0]];
  g[1][1] = '.';
  while (stack.length > 0) {
    const [cx, cy] = stack[stack.length - 1];
    const options = STEPS.map(([dx, dy]) => [cx + dx, cy + dy] as const).filter(
      ([nx, ny]) => nx >= 0 && ny >= 0 && nx < o.w && ny < o.h && !seen.has(`${nx},${ny}`),
    );
    if (options.length === 0) {
      stack.pop();
      continue;
    }
    const [nx, ny] = rng.pick(options);
    g[cy + ny + 1][cx + nx + 1] = '.';
    g[ny * 2 + 1][nx * 2 + 1] = '.';
    seen.add(`${nx},${ny}`);
    stack.push([nx, ny]);
  }

  // Knock out some interior walls that sit between two floor tiles.
  const candidates: [number, number][] = [];
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if ((x + y) % 2 === 1 && g[y][x] === '#') {
        const horizontal = y % 2 === 1;
        const [a, b] = horizontal ? [g[y][x - 1], g[y][x + 1]] : [g[y - 1][x], g[y + 1][x]];
        if (a !== '#' && b !== '#') candidates.push([x, y]);
      }
    }
  }
  for (const [x, y] of rng.shuffle(candidates).slice(0, o.loops)) g[y][x] = '.';

  // Doors on some passages between cells.
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if ((x + y) % 2 === 1 && g[y][x] === '.' && rng.chance(o.doorChance)) g[y][x] = '+';
    }
  }

  // Distance from the start, to find the far end and the dead ends.
  const dist = new Map<string, number>([['1,1', 0]]);
  const queue: [number, number][] = [[1, 1]];
  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i];
    for (const [dx, dy] of STEPS) {
      const key = `${x + dx},${y + dy}`;
      if (g[y + dy][x + dx] !== '#' && !dist.has(key)) {
        dist.set(key, (dist.get(`${x},${y}`) as number) + 1);
        queue.push([x + dx, y + dy]);
      }
    }
  }
  const cells: [number, number][] = [];
  for (let y = 1; y < H; y += 2) for (let x = 1; x < W; x += 2) cells.push([x, y]);
  const far = cells.reduce((best, c) =>
    (dist.get(`${c[0]},${c[1]}`) ?? 0) > (dist.get(`${best[0]},${best[1]}`) ?? 0) ? c : best,
  );
  const openNeighbours = (x: number, y: number): number =>
    STEPS.filter(([dx, dy]) => g[y + dy][x + dx] !== '#').length;
  const isFree = ([x, y]: [number, number]): boolean =>
    g[y][x] === '.' && !(x === 1 && y === 1) && !(x === far[0] && y === far[1]);
  const deadEnds = rng.shuffle(cells.filter((c) => isFree(c) && openNeighbours(c[0], c[1]) === 1));
  const others = rng.shuffle(cells.filter((c) => isFree(c) && openNeighbours(c[0], c[1]) > 1));

  g[1][1] = '<';
  if (o.downStairs) g[far[1]][far[0]] = '>';
  else if (o.endKey) g[far[1]][far[0]] = o.endKey;
  [...deadEnds, ...others].slice(0, o.specials.length).forEach(([x, y], i) => {
    g[y][x] = o.specials[i];
  });

  const dir = STEPS.findIndex(([dx, dy]) => g[1 + dy][1 + dx] !== '#');
  return { grid: g.map((row) => row.join('')), start: { x: 1, y: 1, dir } };
}
