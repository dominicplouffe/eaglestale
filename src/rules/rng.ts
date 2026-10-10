import type { Dice } from './types';

/** Small seedable PRNG (mulberry32) so tests and level generation are reproducible. */
export class Rng {
  private s: number;

  constructor(seed: number = (Math.random() * 0x100000000) >>> 0) {
    this.s = seed >>> 0;
  }

  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max], inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    return items[this.int(0, items.length - 1)];
  }

  roll(dice: Dice): number {
    let total = dice[2] ?? 0;
    for (let i = 0; i < dice[0]; i++) total += this.int(1, dice[1]);
    return total;
  }

  weighted<T>(items: readonly T[], weight: (item: T) => number): T {
    const total = items.reduce((sum, it) => sum + weight(it), 0);
    let r = this.next() * total;
    for (const it of items) {
      r -= weight(it);
      if (r < 0) return it;
    }
    return items[items.length - 1];
  }

  shuffle<T>(items: readonly T[]): T[] {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
}

export const gameRng = new Rng();

export function diceText(d: Dice): string {
  const bonus = d[2] ?? 0;
  return `${d[0]}d${d[1]}${bonus > 0 ? `+${bonus}` : bonus < 0 ? bonus : ''}`;
}
