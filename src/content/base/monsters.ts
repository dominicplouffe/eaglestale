import type { MonsterDef } from '../../rules/types';

export const monsters: MonsterDef[] = [
  // The Cellars
  { id: 'rat', name: 'Cellar Rat', plural: 'Cellar Rats', hp: [1, 4], def: 0, toHit: 0, speed: 2, xp: 6, gold: [0, 1], attacks: [{ verb: 'gnaws', dice: [1, 3] }], drops: [{ item: 'rattail', chance: 0.6 }], sprite: 'rat' },
  { id: 'bat', name: 'Giant Bat', plural: 'Giant Bats', hp: [1, 4, 1], def: 3, toHit: 1, speed: 6, xp: 9, gold: [0, 1], attacks: [{ verb: 'bites', dice: [1, 3], ranged: true }], sprite: 'bat' },
  { id: 'kobold', name: 'Kobold', plural: 'Kobolds', hp: [1, 6, 1], def: 1, toHit: 1, speed: 3, xp: 12, gold: [1, 6], attacks: [{ verb: 'jabs', dice: [1, 4] }], sprite: 'kobold' },
  { id: 'goblin', name: 'Goblin', plural: 'Goblins', hp: [1, 8, 1], def: 2, toHit: 2, speed: 4, xp: 16, gold: [1, 8], attacks: [{ verb: 'slashes', dice: [1, 6] }], sprite: 'goblin' },
  { id: 'blob', name: 'Gelatinous Blob', plural: 'Gelatinous Blobs', hp: [2, 6], def: 0, toHit: 1, speed: 1, xp: 14, gold: [0, 0], attacks: [{ verb: 'engulfs', dice: [1, 4] }], sprite: 'blob' },

  // The Mouldering Crypts
  { id: 'skeleton', name: 'Skeleton', plural: 'Skeletons', hp: [2, 6, 2], def: 4, toHit: 3, speed: 3, xp: 28, gold: [1, 6], attacks: [{ verb: 'rattles a blade at', dice: [1, 6, 1] }], sprite: 'skeleton' },
  { id: 'spider', name: 'Cave Spider', plural: 'Cave Spiders', hp: [1, 8, 2], def: 5, toHit: 3, speed: 5, xp: 24, gold: [0, 0], attacks: [{ verb: 'bites', dice: [1, 6] }], drops: [{ item: 'spidersilk', chance: 0.5 }], sprite: 'spider' },
  { id: 'ghost', name: 'Grumpy Ghost', plural: 'Grumpy Ghosts', hp: [2, 8], def: 6, toHit: 3, speed: 4, xp: 42, gold: [2, 6], attacks: [{ verb: 'wails at', dice: [1, 6], ranged: true }], sprite: 'ghost' },
  { id: 'brigand', name: 'Brigand', plural: 'Brigands', hp: [2, 6, 3], def: 4, toHit: 3, speed: 4, xp: 32, gold: [3, 6], attacks: [{ verb: 'stabs', dice: [1, 8] }], sprite: 'brigand' },
  { id: 'cultist', name: 'Roost Cultist', plural: 'Roost Cultists', hp: [2, 6, 2], def: 3, toHit: 3, speed: 3, xp: 34, gold: [2, 8], attacks: [{ verb: 'hurls a hex at', dice: [1, 6], ranged: true }, { verb: 'clubs', dice: [1, 4] }], drops: [{ item: 'cultsigil', chance: 0.5 }], sprite: 'cultist' },

  // The Roost Sanctum
  { id: 'boneknight', name: 'Bone Knight', plural: 'Bone Knights', hp: [3, 8, 4], def: 7, toHit: 5, speed: 3, xp: 75, gold: [3, 8], attacks: [{ verb: 'cleaves', dice: [1, 8, 2] }], sprite: 'boneknight' },
  { id: 'giantspider', name: 'Giant Spider', plural: 'Giant Spiders', hp: [3, 8], def: 6, toHit: 5, speed: 5, xp: 68, gold: [0, 0], attacks: [{ verb: 'envenoms', dice: [1, 10] }], drops: [{ item: 'spidersilk', chance: 0.8 }], sprite: 'spider', palette: { body: '#8a3a9a' } },
  { id: 'harpy', name: 'Harpy', plural: 'Harpies', hp: [2, 8, 2], def: 6, toHit: 4, speed: 7, xp: 58, gold: [2, 10], attacks: [{ verb: 'rakes', dice: [1, 6, 1] }, { verb: 'screeches at', dice: [1, 4], ranged: true }], sprite: 'harpy' },
  { id: 'cultmage', name: 'Cult Mage', plural: 'Cult Mages', hp: [2, 6, 4], def: 5, toHit: 4, speed: 4, xp: 64, gold: [4, 8], attacks: [{ verb: 'zaps', dice: [2, 4], ranged: true }], drops: [{ item: 'cultsigil', chance: 0.7 }], sprite: 'cultist', palette: { robe: '#3a4aa8', trim: '#e8e8f0' } },
  // The Roost's lieutenants, each holding one of Aquila's feathers
  {
    id: 'koboldchief', name: 'Kobold Chieftain', plural: 'Kobold Chieftains', hp: [10, 8, 20], def: 5, toHit: 5, speed: 4, xp: 180, gold: [5, 10], actions: 2,
    attacks: [{ verb: 'bonks', dice: [1, 10, 2] }, { verb: 'hurls a spear at', dice: [1, 8], ranged: true }],
    sprite: 'kobold', palette: { scales: '#d8a838' },
  },
  {
    id: 'bonewarden', name: 'Bone Warden', plural: 'Bone Wardens', hp: [12, 10, 24], def: 8, toHit: 7, speed: 3, xp: 360, gold: [4, 10], actions: 2,
    attacks: [{ verb: 'swings a grave-bell at', dice: [2, 6, 2] }, { verb: 'tolls the grave-bell for', dice: [1, 6], all: true }],
    sprite: 'boneknight', palette: { armour: '#b8b0a0' },
  },
  {
    id: 'grackle', name: 'High Priest Grackle', plural: 'High Priests', unique: true, hp: [16, 8, 40], def: 9, toHit: 8, speed: 5, xp: 700, gold: [10, 10], actions: 2,
    attacks: [
      { verb: 'squawks a curse at', dice: [2, 6], ranged: true },
      { verb: 'pecks', dice: [1, 10, 3] },
      { verb: 'calls a storm of plucked feathers down on', dice: [1, 8], all: true },
    ],
    sprite: 'cultist', palette: { robe: '#2a2236', trim: '#e8c34a' },
  },
  // The Gurgle: the Overflow
  {
    id: 'plaguerat', name: 'Plague Rat', plural: 'Plague Rats', hp: [2, 6, 3], def: 4, toHit: 5, speed: 4, xp: 32, gold: [0, 2],
    attacks: [{ verb: 'bites', dice: [1, 6, 1] }], drops: [{ item: 'ratfang', chance: 0.5 }],
    sprite: 'rat', palette: { a: '#9aa88a', b: '#76846a', c: '#4e5a4a', d: '#2e3630', e: '#e8f040' },
  },
  {
    id: 'sludge', name: 'Sewer Sludge', plural: 'Sewer Sludges', hp: [4, 6, 2], def: 2, toHit: 5, speed: 1, xp: 46, gold: [0, 4],
    attacks: [{ verb: 'engulfs', dice: [1, 8, 2] }], drops: [{ item: 'slimejar', chance: 0.5 }],
    sprite: 'blob', palette: { a: '#b0a060', b: '#857838', c: '#5a5028', d: '#34301a' },
  },
  {
    id: 'drainbat', name: 'Drain Bat', plural: 'Drain Bats', hp: [2, 4, 2], def: 7, toHit: 5, speed: 8, xp: 34, gold: [0, 1],
    attacks: [{ verb: 'bites', dice: [1, 4, 2], ranged: true }],
    sprite: 'bat', palette: { A: '#8aa098', B: '#6a8078', m: '#4e6460', n: '#38483e', o: '#26302a' },
  },
  {
    id: 'ratfolk', name: 'Ratfolk Scrapper', plural: 'Ratfolk Scrappers', hp: [3, 6, 4], def: 6, toHit: 6, speed: 4, xp: 62, gold: [2, 8],
    attacks: [{ verb: 'slashes', dice: [1, 8, 2] }, { verb: 'flings muck at', dice: [1, 4, 1], ranged: true }],
    sprite: 'ratman',
  },
  {
    id: 'snapjaw', name: 'Old Snapjaw', plural: 'Old Snapjaws', unique: true, hp: [18, 10, 40], def: 10, toHit: 9, speed: 3, xp: 1100, gold: [8, 10], actions: 2,
    attacks: [{ verb: 'chomps', dice: [2, 8, 4] }, { verb: 'thrashes its tail at', dice: [1, 8, 1], all: true }],
    sprite: 'gator',
  },

  // The Gurgle: the Rat King's Court
  {
    id: 'ratshaman', name: 'Ratfolk Shaman', plural: 'Ratfolk Shamans', hp: [3, 6, 6], def: 6, toHit: 7, speed: 4, xp: 88, gold: [3, 8],
    attacks: [{ verb: 'squeaks a hex at', dice: [2, 6, 1], ranged: true }],
    sprite: 'ratman', palette: { gear: '#6a3a9a' },
  },
  {
    id: 'ratknight', name: 'Rat Knight', plural: 'Rat Knights', hp: [4, 8, 8], def: 9, toHit: 8, speed: 3, xp: 125, gold: [4, 8],
    attacks: [{ verb: 'skewers', dice: [1, 10, 4] }],
    sprite: 'ratman', palette: { gear: '#9aa0b0' },
  },
  {
    id: 'ratking', name: 'The Rat King', plural: 'Rat Kings', unique: true, hp: [22, 10, 60], def: 11, toHit: 10, speed: 5, xp: 2000, gold: [20, 20], actions: 2,
    attacks: [
      { verb: 'bonks with the royal sceptre', dice: [2, 8, 5] },
      { verb: 'squeaks a royal decree at', dice: [2, 6, 3], ranged: true },
      { verb: 'calls a tide of rats down on', dice: [1, 10, 1], all: true },
    ],
    sprite: 'ratking',
  },
  // Professor Pinion's Clocktower: the Workshop
  {
    id: 'tinsoldier', name: 'Tin Soldier', plural: 'Tin Soldiers', construct: true, hp: [4, 8, 8], def: 10, toHit: 9, speed: 3, xp: 150, gold: [4, 10],
    attacks: [{ verb: 'bayonets', dice: [1, 10, 4] }, { verb: 'fires a cork at', dice: [1, 6, 2], ranged: true }],
    drops: [{ item: 'mainspring', chance: 0.5 }],
    sprite: 'tinsoldier',
  },
  {
    id: 'brassowl', name: 'Brass Owl', plural: 'Brass Owls', construct: true, hp: [3, 8, 6], def: 11, toHit: 9, speed: 8, xp: 140, gold: [2, 8],
    attacks: [{ verb: 'swoops at', dice: [1, 8, 3] }, { verb: 'shoots a brass bolt at', dice: [1, 6, 3], ranged: true }],
    sprite: 'brassowl',
  },
  {
    id: 'gearspider', name: 'Gear Spider', plural: 'Gear Spiders', construct: true, hp: [3, 8, 8], def: 10, toHit: 9, speed: 6, xp: 140, gold: [2, 8],
    attacks: [{ verb: 'snips at', dice: [2, 6, 3] }],
    drops: [{ item: 'brassgear', chance: 0.6 }],
    sprite: 'spider', palette: { body: '#c8a048' },
  },
  {
    id: 'apprentice', name: "Pinion's Apprentice", plural: "Pinion's Apprentices", hp: [3, 6, 10], def: 8, toHit: 9, speed: 4, xp: 130, gold: [5, 10],
    attacks: [{ verb: 'zaps with a spark-gun', dice: [2, 6, 3], ranged: true }, { verb: 'whacks with a wrench', dice: [1, 8, 2] }],
    sprite: 'professor', palette: { C: '#b08a5a', c: '#8a6a42', d: '#5e4628', H: '#6a4a2a', h: '#4a3020' },
  },

  // The Clocktower: the Gearworks
  {
    id: 'cuckoo', name: 'Angry Cuckoo', plural: 'Angry Cuckoos', construct: true, hp: [3, 6, 8], def: 10, toHit: 10, speed: 9, xp: 120, gold: [1, 6],
    attacks: [{ verb: 'pecks', dice: [1, 8, 4] }, { verb: 'screams CUCKOO! at', dice: [1, 6, 2], ranged: true }],
    sprite: 'cuckoo',
  },
  {
    id: 'golem', name: 'Clockwork Golem', plural: 'Clockwork Golems', construct: true, hp: [6, 10, 14], def: 12, toHit: 11, speed: 2, xp: 320, gold: [4, 12],
    attacks: [{ verb: 'pounds', dice: [2, 8, 5] }],
    drops: [{ item: 'brassgear', chance: 0.5 }],
    sprite: 'golem',
  },
  {
    id: 'grinder', name: 'The Grinder', plural: 'Grinders', unique: true, construct: true, hp: [22, 10, 60], def: 12, toHit: 11, speed: 3, xp: 2600, gold: [12, 12], actions: 2,
    attacks: [{ verb: 'grinds', dice: [3, 8, 6] }, { verb: 'sprays boiling oil over', dice: [1, 10, 2], all: true }],
    sprite: 'golem', palette: { I: '#d8b060', i: '#9a7838', j: '#5e4422' },
  },

  // The Clocktower: the Clock Face
  {
    id: 'tinknight', name: 'Brass Guard', plural: 'Brass Guards', construct: true, hp: [5, 8, 12], def: 12, toHit: 11, speed: 3, xp: 220, gold: [5, 10],
    attacks: [{ verb: 'bayonets', dice: [1, 12, 5] }, { verb: 'fires a volley at', dice: [1, 8, 3], ranged: true }],
    drops: [{ item: 'mainspring', chance: 0.8 }],
    sprite: 'tinsoldier', palette: { B: '#b89030', b: '#7a5a20' },
  },
  {
    id: 'mecheagle', name: 'The Mechanical Eagle', plural: 'Mechanical Eagles', unique: true, construct: true, hp: [28, 10, 90], def: 14, toHit: 13, speed: 7, xp: 3600, gold: [10, 10], actions: 2,
    attacks: [
      { verb: 'rakes with steel talons', dice: [3, 8, 6] },
      { verb: 'beats its tin wings at', dice: [2, 6, 2], all: true },
      { verb: 'screeches a steam whistle at', dice: [2, 6, 4], ranged: true },
    ],
    sprite: 'eagle',
    palette: { W: '#e8eaf0', w: '#b8bcc8', m: '#8a8e9a', L: '#c8ccd8', G: '#9aa0ac', g: '#70767f', b: '#5a6068', B: '#3e424a', Y: '#f0c850', y: '#b08a30' },
  },
  {
    id: 'pinion', name: 'Professor Pinion', plural: 'Professors', unique: true, hp: [10, 8, 30], def: 9, toHit: 9, speed: 5, xp: 800, gold: [20, 10],
    attacks: [{ verb: 'throws a spanner at', dice: [2, 6, 3], ranged: true }],
    sprite: 'professor',
  },
  {
    id: 'malachar',
    name: 'Malachar the Plucker',
    plural: 'Malachars',
    unique: true,
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
    sprite: 'malachar',
  },
];
