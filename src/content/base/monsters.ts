import type { MonsterDef } from '../../rules/types';

export const monsters: MonsterDef[] = [
  // The Cellars
  { id: 'rat', name: 'Cellar Rat', plural: 'Cellar Rats', hp: [1, 4], def: 0, toHit: 0, speed: 2, xp: 6, gold: [0, 1], attacks: [{ verb: 'gnaws', dice: [1, 3] }], sprite: 'rat' },
  { id: 'bat', name: 'Giant Bat', plural: 'Giant Bats', hp: [1, 4, 1], def: 3, toHit: 1, speed: 6, xp: 9, gold: [0, 1], attacks: [{ verb: 'bites', dice: [1, 3], ranged: true }], sprite: 'bat' },
  { id: 'kobold', name: 'Kobold', plural: 'Kobolds', hp: [1, 6, 1], def: 1, toHit: 1, speed: 3, xp: 12, gold: [1, 6], attacks: [{ verb: 'jabs', dice: [1, 4] }], sprite: 'humanoid', palette: { g: '#c0583a', b: '#7a5230', h: '#6b2d1e' } },
  { id: 'goblin', name: 'Goblin', plural: 'Goblins', hp: [1, 8, 1], def: 2, toHit: 2, speed: 4, xp: 16, gold: [1, 8], attacks: [{ verb: 'slashes', dice: [1, 6] }], sprite: 'humanoid', palette: { g: '#6fa34a', b: '#5a4a2a', h: '#3d5a28' } },
  { id: 'blob', name: 'Gelatinous Blob', plural: 'Gelatinous Blobs', hp: [2, 6], def: 0, toHit: 1, speed: 1, xp: 14, gold: [0, 0], attacks: [{ verb: 'engulfs', dice: [1, 4] }], sprite: 'slime' },

  // The Mouldering Crypts
  { id: 'skeleton', name: 'Skeleton', plural: 'Skeletons', hp: [2, 6, 2], def: 4, toHit: 3, speed: 3, xp: 28, gold: [1, 6], attacks: [{ verb: 'rattles a blade at', dice: [1, 6, 1] }], sprite: 'skeleton' },
  { id: 'spider', name: 'Cave Spider', plural: 'Cave Spiders', hp: [1, 8, 2], def: 5, toHit: 3, speed: 5, xp: 24, gold: [0, 0], attacks: [{ verb: 'bites', dice: [1, 6] }], sprite: 'spider' },
  { id: 'ghost', name: 'Grumpy Ghost', plural: 'Grumpy Ghosts', hp: [2, 8], def: 6, toHit: 3, speed: 4, xp: 42, gold: [2, 6], attacks: [{ verb: 'wails at', dice: [1, 6], ranged: true }], sprite: 'ghost' },
  { id: 'brigand', name: 'Brigand', plural: 'Brigands', hp: [2, 6, 3], def: 4, toHit: 3, speed: 4, xp: 32, gold: [3, 6], attacks: [{ verb: 'stabs', dice: [1, 8] }], sprite: 'humanoid', palette: { g: '#d9a273', b: '#44503a', h: '#2a2a2a' } },
  { id: 'cultist', name: 'Roost Cultist', plural: 'Roost Cultists', hp: [2, 6, 2], def: 3, toHit: 3, speed: 3, xp: 34, gold: [2, 8], attacks: [{ verb: 'hurls a hex at', dice: [1, 6], ranged: true }, { verb: 'clubs', dice: [1, 4] }], sprite: 'mage', palette: { b: '#7a3a3a', h: '#e0d0b0' } },

  // The Roost Sanctum
  { id: 'boneknight', name: 'Bone Knight', plural: 'Bone Knights', hp: [3, 8, 4], def: 7, toHit: 5, speed: 3, xp: 75, gold: [3, 8], attacks: [{ verb: 'cleaves', dice: [1, 8, 2] }], sprite: 'skeleton', palette: { w: '#a8b0c8', e: '#6b7390' } },
  { id: 'giantspider', name: 'Giant Spider', plural: 'Giant Spiders', hp: [3, 8], def: 6, toHit: 5, speed: 5, xp: 68, gold: [0, 0], attacks: [{ verb: 'envenoms', dice: [1, 10] }], sprite: 'spider', palette: { e: '#4a2a5a', b: '#8a3a9a' } },
  { id: 'harpy', name: 'Harpy', plural: 'Harpies', hp: [2, 8, 2], def: 6, toHit: 4, speed: 7, xp: 58, gold: [2, 10], attacks: [{ verb: 'rakes', dice: [1, 6, 1] }, { verb: 'screeches at', dice: [1, 4], ranged: true }], sprite: 'bat', palette: { E: '#b0587a', k: '#3a1a2a' } },
  { id: 'cultmage', name: 'Cult Mage', plural: 'Cult Mages', hp: [2, 6, 4], def: 5, toHit: 4, speed: 4, xp: 64, gold: [4, 8], attacks: [{ verb: 'zaps', dice: [2, 4], ranged: true }], sprite: 'mage', palette: { b: '#3a4aa8', h: '#e8e8f0' } },
  {
    id: 'malachar',
    name: 'Malachar the Plucker',
    plural: 'Malachars',
    hp: [8, 8, 24],
    def: 9,
    toHit: 7,
    speed: 5,
    xp: 700,
    gold: [20, 20],
    actions: 2,
    attacks: [
      { verb: 'plucks', dice: [2, 6] },
      { verb: 'hurls a hexbolt at', dice: [2, 6], ranged: true },
      { verb: 'unleashes a Moulting Storm on', dice: [1, 6], all: true },
    ],
    sprite: 'mage',
    palette: { b: '#2a2038', h: '#d8d8e0', g: '#c8b8d8' },
  },
];
