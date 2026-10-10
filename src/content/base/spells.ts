import type { SpellDef } from '../../rules/types';

export const spells: SpellDef[] = [
  { id: 'spark', name: 'Spark', desc: 'A zap of lightning at one foe.', cost: 1, target: 'enemy', effect: { kind: 'damage', dice: [1, 6] } },
  { id: 'snooze', name: 'Snooze', desc: 'Puts a group to sleep for a few rounds.', cost: 2, target: 'group', effect: { kind: 'sleep', turns: 3 } },
  { id: 'featherward', name: 'Feather Ward', desc: 'Party defense +2 for 4 rounds.', cost: 2, target: 'party', effect: { kind: 'defense', amount: 2, turns: 4 } },
  { id: 'scorch', name: 'Scorch', desc: 'Flames wash over a group.', cost: 4, target: 'group', effect: { kind: 'damage', dice: [2, 6] } },
  { id: 'hailstorm', name: 'Hailstorm', desc: 'Ice rains on every enemy.', cost: 8, target: 'allEnemies', effect: { kind: 'damage', dice: [3, 6] } },
  { id: 'mend', name: 'Mend', desc: 'Heals one ally.', cost: 1, target: 'ally', effect: { kind: 'heal', dice: [2, 4] } },
  { id: 'smite', name: 'Smite', desc: 'Holy light strikes one foe.', cost: 2, target: 'enemy', effect: { kind: 'damage', dice: [2, 6] } },
  { id: 'sanctuary', name: 'Sanctuary', desc: 'Party defense +3 for 3 rounds.', cost: 3, target: 'party', effect: { kind: 'defense', amount: 3, turns: 3 } },
  { id: 'greatermend', name: 'Greater Mend', desc: 'Heals one ally substantially.', cost: 4, target: 'ally', effect: { kind: 'heal', dice: [4, 6] } },
  { id: 'radiance', name: 'Radiance', desc: 'A burst of light scorches a group.', cost: 6, target: 'group', effect: { kind: 'damage', dice: [3, 8] } },
  { id: 'rousing', name: 'Rousing Tune', desc: 'Party defense +1 for 4 rounds.', cost: 1, target: 'party', effect: { kind: 'defense', amount: 1, turns: 4 } },
  { id: 'lullaby', name: 'Lullaby', desc: 'A gentle song lulls a group to sleep.', cost: 3, target: 'group', effect: { kind: 'sleep', turns: 4 } },
];
