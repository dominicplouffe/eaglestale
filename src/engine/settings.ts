import { readStored, writeStored } from './storage';

/** Pause between battle messages, in milliseconds. */
export const BATTLE_SPEEDS = { normal: 420, fast: 160, instant: 0 } as const;
export type BattleSpeed = keyof typeof BATTLE_SPEEDS;

const SPEED_KEY = 'eagles-tale:battle-speed';
const isSpeed = (v: string | null): v is BattleSpeed => v !== null && v in BATTLE_SPEEDS;

// Kept in memory too, so the setting still works for the session if storage is blocked.
let speed: BattleSpeed = ((): BattleSpeed => {
  const stored = readStored(SPEED_KEY);
  return isSpeed(stored) ? stored : 'normal';
})();

export const battleSpeed = (): BattleSpeed => speed;

/** Moves to the next speed (normal, fast, instant, normal...) and remembers it. */
export function cycleBattleSpeed(): BattleSpeed {
  const order = Object.keys(BATTLE_SPEEDS) as BattleSpeed[];
  speed = order[(order.indexOf(speed) + 1) % order.length];
  writeStored(SPEED_KEY, speed);
  return speed;
}
