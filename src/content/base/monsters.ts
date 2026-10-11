import type { MonsterDef } from '../../rules/types';

export const monsters: MonsterDef[] = [
  // The Cellars
  { id: 'rat', name: 'Cellar Rat', plural: 'Cellar Rats', hp: [1, 4], def: 0, toHit: 0, speed: 2, xp: 10, gold: [0, 1], attacks: [{ verb: 'gnaws', dice: [1, 3] }], drops: [{ item: 'rattail', chance: 0.6 }], sprite: 'rat' },
  { id: 'bat', name: 'Giant Bat', plural: 'Giant Bats', hp: [1, 4, 1], def: 3, toHit: 1, speed: 6, xp: 14, gold: [0, 1], attacks: [{ verb: 'bites', dice: [1, 3], ranged: true }], sprite: 'bat' },
  { id: 'kobold', name: 'Kobold', plural: 'Kobolds', hp: [1, 6, 1], def: 1, toHit: 1, speed: 3, xp: 22, gold: [1, 6], attacks: [{ verb: 'jabs', dice: [1, 4] }], sprite: 'kobold' },
  { id: 'goblin', name: 'Goblin', plural: 'Goblins', hp: [1, 8, 1], def: 2, toHit: 2, speed: 4, xp: 30, gold: [1, 8], attacks: [{ verb: 'slashes', dice: [1, 6] }], sprite: 'goblin' },
  { id: 'blob', name: 'Gelatinous Blob', plural: 'Gelatinous Blobs', hp: [2, 6], def: 0, toHit: 1, speed: 1, xp: 22, gold: [0, 0], attacks: [{ verb: 'engulfs', dice: [1, 4] }], sprite: 'blob' },

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
    id: 'tinsoldier', name: 'Tin Soldier', plural: 'Tin Soldiers', construct: true, hp: [4, 8, 8], def: 10, toHit: 12, speed: 3, xp: 110, gold: [4, 10],
    attacks: [{ verb: 'bayonets', dice: [1, 10, 4] }, { verb: 'fires a cork at', dice: [1, 6, 2], ranged: true }],
    drops: [{ item: 'mainspring', chance: 0.5 }],
    sprite: 'tinsoldier',
  },
  {
    id: 'brassowl', name: 'Brass Owl', plural: 'Brass Owls', construct: true, hp: [3, 8, 6], def: 11, toHit: 12, speed: 8, xp: 100, gold: [2, 8],
    attacks: [{ verb: 'swoops at', dice: [1, 8, 3] }, { verb: 'shoots a brass bolt at', dice: [1, 6, 3], ranged: true }],
    sprite: 'brassowl',
  },
  {
    id: 'gearspider', name: 'Gear Spider', plural: 'Gear Spiders', construct: true, hp: [3, 8, 8], def: 10, toHit: 12, speed: 6, xp: 100, gold: [2, 8],
    attacks: [{ verb: 'snips at', dice: [2, 6, 3] }],
    drops: [{ item: 'brassgear', chance: 0.6 }],
    sprite: 'spider', palette: { body: '#c8a048' },
  },
  {
    id: 'apprentice', name: "Pinion's Apprentice", plural: "Pinion's Apprentices", hp: [3, 6, 10], def: 8, toHit: 12, speed: 4, xp: 95, gold: [5, 10],
    attacks: [{ verb: 'zaps with a spark-gun', dice: [2, 6, 3], ranged: true }, { verb: 'whacks with a wrench', dice: [1, 8, 2] }],
    sprite: 'professor', palette: { C: '#b08a5a', c: '#8a6a42', d: '#5e4628', H: '#6a4a2a', h: '#4a3020' },
  },

  // The Clocktower: the Gearworks
  {
    id: 'cuckoo', name: 'Angry Cuckoo', plural: 'Angry Cuckoos', construct: true, hp: [3, 6, 8], def: 10, toHit: 12, speed: 9, xp: 85, gold: [1, 6],
    attacks: [{ verb: 'pecks', dice: [1, 8, 4] }, { verb: 'screams CUCKOO! at', dice: [1, 6, 2], ranged: true }],
    sprite: 'cuckoo',
  },
  {
    id: 'golem', name: 'Clockwork Golem', plural: 'Clockwork Golems', construct: true, hp: [6, 10, 14], def: 12, toHit: 14, speed: 2, xp: 260, gold: [4, 12],
    attacks: [{ verb: 'pounds', dice: [2, 8, 5] }],
    drops: [{ item: 'brassgear', chance: 0.5 }],
    sprite: 'golem',
  },
  {
    id: 'grinder', name: 'The Grinder', plural: 'Grinders', unique: true, construct: true, hp: [28, 10, 90], def: 12, toHit: 17, speed: 3, xp: 2600, gold: [12, 12], actions: 2,
    attacks: [{ verb: 'grinds', dice: [3, 8, 6] }, { verb: 'sprays boiling oil over', dice: [1, 10, 2], all: true }],
    sprite: 'golem', palette: { I: '#d8b060', i: '#9a7838', j: '#5e4422' },
  },

  // The Clocktower: the Clock Face
  {
    id: 'tinknight', name: 'Brass Guard', plural: 'Brass Guards', construct: true, hp: [5, 8, 12], def: 12, toHit: 14, speed: 3, xp: 180, gold: [5, 10],
    attacks: [{ verb: 'bayonets', dice: [1, 12, 5] }, { verb: 'fires a volley at', dice: [1, 8, 3], ranged: true }],
    drops: [{ item: 'mainspring', chance: 0.8 }],
    sprite: 'tinsoldier', palette: { B: '#b89030', b: '#7a5a20' },
  },
  {
    id: 'mecheagle', name: 'The Mechanical Eagle', plural: 'Mechanical Eagles', unique: true, construct: true, hp: [32, 10, 120], def: 14, toHit: 20, speed: 7, xp: 3600, gold: [10, 10], actions: 2,
    attacks: [
      { verb: 'rakes with steel talons', dice: [3, 8, 6] },
      { verb: 'beats its tin wings at', dice: [2, 6, 2], all: true },
      { verb: 'screeches a steam whistle at', dice: [2, 6, 4], ranged: true },
    ],
    sprite: 'eagle',
    palette: { W: '#e8eaf0', w: '#b8bcc8', m: '#8a8e9a', L: '#c8ccd8', G: '#9aa0ac', g: '#70767f', b: '#5a6068', B: '#3e424a', Y: '#f0c850', y: '#b08a30' },
  },
  {
    id: 'pinion', name: 'Professor Pinion', plural: 'Professors', unique: true, hp: [10, 8, 30], def: 9, toHit: 12, speed: 5, xp: 800, gold: [20, 10],
    attacks: [{ verb: 'throws a spanner at', dice: [2, 6, 3], ranged: true }],
    sprite: 'professor',
  },
  // The Moulted Wood: the Fringe
  {
    id: 'thornwolf', name: 'Thorn Wolf', plural: 'Thorn Wolves', hp: [5, 8, 10], def: 12, toHit: 16, speed: 7, xp: 260, gold: [2, 8],
    attacks: [{ verb: 'bites', dice: [2, 8, 4] }],
    sprite: 'thornwolf',
  },
  {
    id: 'bear', name: 'Bark Bear', plural: 'Bark Bears', hp: [7, 10, 14], def: 12, toHit: 16, speed: 3, xp: 360, gold: [3, 10],
    attacks: [{ verb: 'mauls', dice: [2, 10, 5] }],
    sprite: 'bear',
  },
  {
    id: 'wisp', name: "Will-o'-the-Wisp", plural: "Will-o'-the-Wisps", hp: [3, 6, 8], def: 15, toHit: 16, speed: 8, xp: 240, gold: [0, 4],
    attacks: [{ verb: 'flickers at', dice: [2, 6, 4], ranged: true }],
    drops: [{ item: 'wisplight', chance: 0.5 }],
    sprite: 'wisp',
  },
  {
    id: 'thornling', name: 'Thornling', plural: 'Thornlings', hp: [3, 6, 6], def: 10, toHit: 15, speed: 5, xp: 140, gold: [0, 3],
    attacks: [{ verb: 'scratches', dice: [1, 10, 4] }],
    sprite: 'thornling',
  },
  {
    id: 'druid', name: 'Druid of the Thorn', plural: 'Druids of the Thorn', hp: [4, 8, 12], def: 11, toHit: 16, speed: 4, xp: 300, gold: [5, 10],
    attacks: [{ verb: 'calls thorns on', dice: [2, 8, 4], ranged: true }, { verb: 'whacks with a staff', dice: [1, 8, 3] }],
    sprite: 'druid',
  },

  // The Moulted Wood: the Old Aviary
  {
    id: 'ghostbird', name: 'Ghost Songbird', plural: 'Ghost Songbirds', hp: [3, 8, 6], def: 13, toHit: 16, speed: 8, xp: 230, gold: [0, 2],
    attacks: [{ verb: 'sings a mournful note at', dice: [2, 6, 4], ranged: true }],
    sprite: 'crow', palette: { feather: '#b8d8ec', e: '#ffffff' },
  },
  {
    id: 'keeperghost', name: 'Restless Keeper', plural: 'Restless Keepers', hp: [4, 8, 10], def: 13, toHit: 16, speed: 4, xp: 280, gold: [3, 8],
    attacks: [{ verb: 'rattles a birdcage at', dice: [2, 8, 3] }, { verb: 'wails at', dice: [2, 6, 2], ranged: true }],
    sprite: 'ghost', palette: { W: '#f4fff8', L: '#c8f0d8', M: '#90d0b0', N: '#5a9a7a', O: '#3a6a54', F: '#1e3a2e' },
  },
  {
    id: 'warden', name: 'The Aviary Warden', plural: 'Aviary Wardens', unique: true, hp: [34, 10, 140], def: 13, toHit: 23, speed: 4, xp: 4000, gold: [15, 10], actions: 2,
    attacks: [
      { verb: 'rattles a ring of cage keys at', dice: [3, 8, 6] },
      { verb: 'wails a lament over', dice: [2, 6, 4], all: true },
    ],
    sprite: 'ghost', palette: { W: '#fff8e0', L: '#f0e0b0', M: '#d8c088', N: '#a89060', O: '#806840', F: '#4a3a20' },
  },

  // The Moulted Wood: the Thorn Grove
  {
    id: 'archdruid', name: 'Archdruid Bramblebeard', plural: 'Archdruids', unique: true, hp: [42, 10, 200], def: 13, toHit: 25, speed: 5, xp: 5000, gold: [20, 10], actions: 2,
    attacks: [
      { verb: 'lashes with a thorn staff', dice: [3, 8, 8] },
      { verb: 'calls a storm of thorns down on', dice: [2, 8, 4], all: true },
      { verb: 'roots and strangles', dice: [2, 8, 6], ranged: true },
    ],
    sprite: 'druid', palette: { robe: '#8a6a2a' },
  },

  // Malachar's Featherless Spire
  {
    id: 'pluckedharpy', name: 'Plucked Harpy', plural: 'Plucked Harpies', hp: [5, 8, 14], def: 13, toHit: 18, speed: 7, xp: 380, gold: [4, 10],
    attacks: [{ verb: 'rakes', dice: [2, 8, 6] }, { verb: 'shrieks at', dice: [2, 6, 4], ranged: true }],
    sprite: 'harpy', palette: { H: '#9a9a9a', h: '#6a6a6a', q: '#3a3a3a', P: '#e8c8b0', p: '#b8907a', d: '#6a4a40' },
  },
  {
    id: 'adept', name: "Malachar's Adept", plural: "Malachar's Adepts", hp: [5, 6, 16], def: 12, toHit: 18, speed: 4, xp: 420, gold: [6, 10],
    attacks: [{ verb: 'hurls a hexbolt at', dice: [3, 6, 6], ranged: true }],
    drops: [{ item: 'hexshard', chance: 0.6 }],
    sprite: 'cultist', palette: { robe: '#2a1e3a', trim: '#b080ff' },
  },
  {
    id: 'gargoyle', name: 'Bald Gargoyle', plural: 'Bald Gargoyles', hp: [6, 10, 20], def: 15, toHit: 19, speed: 4, xp: 520, gold: [4, 12],
    attacks: [{ verb: 'claws', dice: [2, 10, 6] }],
    sprite: 'gargoyle',
  },
  {
    id: 'stormcrow', name: 'Storm Crow', plural: 'Storm Crows', hp: [4, 8, 12], def: 14, toHit: 19, speed: 9, xp: 400, gold: [2, 8],
    attacks: [{ verb: 'strikes with lightning', dice: [2, 8, 5], ranged: true }],
    sprite: 'crow',
  },
  {
    id: 'pluckedknight', name: 'Plucked Knight', plural: 'Plucked Knights', hp: [6, 8, 20], def: 15, toHit: 20, speed: 3, xp: 560, gold: [6, 12],
    attacks: [{ verb: 'cleaves', dice: [2, 10, 8] }],
    sprite: 'boneknight', palette: { armour: '#3a2e4a' },
  },
  {
    id: 'stormroc', name: 'The Storm Roc', plural: 'Storm Rocs', unique: true, hp: [40, 10, 170], def: 14, toHit: 26, speed: 8, xp: 6000, gold: [20, 10], actions: 2,
    attacks: [
      { verb: 'rakes with lightning talons', dice: [3, 10, 8] },
      { verb: 'beats up a thunderstorm over', dice: [2, 8, 4], all: true },
    ],
    sprite: 'eagle',
    palette: { W: '#c8c8e8', w: '#9898c0', m: '#6a6a98', L: '#7a7ab0', G: '#4a4a80', g: '#363670', b: '#28285a', B: '#1a1a40', Y: '#f0e060', y: '#c0a030' },
  },
  {
    id: 'malachar',
    name: 'Malachar the Plucker',
    plural: 'Malachars',
    unique: true,
    hp: [60, 10, 440],
    def: 16,
    toHit: 27,
    speed: 6,
    xp: 8000,
    gold: [40, 20],
    actions: 2,
    attacks: [
      { verb: 'plucks', dice: [3, 10, 8] },
      { verb: 'hurls a hexbolt at', dice: [3, 8, 6], ranged: true },
      { verb: 'unleashes a Moulting Storm on', dice: [3, 8, 4], all: true },
    ],
    sprite: 'malachar',
  },
  // Mount Talon and Aquila's old nest (after the story: tougher than anything before)
  {
    id: 'snowwolf', name: 'Snow Wolf', plural: 'Snow Wolves', hp: [6, 8, 24], def: 16, toHit: 22, speed: 8, xp: 700, gold: [2, 8],
    attacks: [{ verb: 'bites', dice: [2, 10, 8] }],
    sprite: 'thornwolf', palette: { fur: '#e8eef4', T: '#a8d0f0', t: '#6890c0', N: '#3a4a68' },
  },
  {
    id: 'frostbear', name: 'Frost Bear', plural: 'Frost Bears', hp: [9, 10, 30], def: 16, toHit: 23, speed: 3, xp: 1000, gold: [3, 10],
    attacks: [{ verb: 'mauls', dice: [3, 8, 8] }, { verb: 'hurls a block of ice at', dice: [2, 8, 6], ranged: true }],
    sprite: 'bear', palette: { B: '#eef2f6', b: '#a8b4c8', m: '#b8e0f8', n: '#3a4a68', e: '#2a5aa8' },
  },
  {
    id: 'crageagle', name: 'Crag Eagle', plural: 'Crag Eagles', hp: [7, 10, 24], def: 17, toHit: 23, speed: 9, xp: 900, gold: [2, 10],
    attacks: [{ verb: 'rakes', dice: [2, 10, 8] }, { verb: 'dives at', dice: [2, 8, 8], ranged: true }],
    drops: [{ item: 'cragplume', chance: 0.5 }],
    sprite: 'eagle', palette: { W: '#f8e8b0', w: '#d8b870', m: '#a08040', b: '#9a6a30', B: '#6a4418', G: '#d89a48', g: '#a86a30', L: '#f0c070' },
  },
  {
    id: 'stormwisp', name: 'Storm Wisp', plural: 'Storm Wisps', hp: [4, 6, 22], def: 20, toHit: 23, speed: 8, xp: 650, gold: [0, 0],
    attacks: [{ verb: 'crackles at', dice: [3, 6, 6], ranged: true }],
    sprite: 'wisp', palette: { glow: '#a8c8ff', a: '#24345e', k: '#2a3a7a' },
  },
  {
    id: 'chick', name: 'Changeling Chick', plural: 'Changeling Chicks', hp: [5, 8, 20], def: 15, toHit: 22, speed: 6, xp: 550, gold: [0, 4],
    attacks: [{ verb: 'pecks', dice: [2, 8, 6] }, { verb: 'cheeps a hex at', dice: [2, 6, 6], ranged: true }],
    sprite: 'crow', palette: { feather: '#ffd860', e: '#14121c', Y: '#f08a30', y: '#c86a20' },
  },
  {
    id: 'skreel', name: 'Queen Skreel', plural: 'Queen Skreels', unique: true, hp: [44, 10, 290], def: 18, toHit: 28, speed: 9, xp: 9000, gold: [20, 10], actions: 2,
    attacks: [
      { verb: 'rakes with golden talons', dice: [3, 10, 10] },
      { verb: 'stirs up a blizzard over', dice: [2, 8, 6], all: true },
      { verb: 'dives at', dice: [3, 8, 8], ranged: true },
    ],
    sprite: 'eagle', palette: { W: '#ffffff', w: '#e0e4f0', m: '#a0a8c0', b: '#e8c060', B: '#a87a2a', G: '#f4f0e0', g: '#c8c0a8', L: '#ffffff', Y: '#ffd84a', y: '#e8a020' },
  },
  {
    id: 'changeling',
    name: 'The Changeling',
    plural: 'Changelings',
    unique: true,
    hp: [44, 10, 360],
    def: 19,
    toHit: 26,
    speed: 7,
    xp: 20000,
    gold: [40, 20],
    actions: 2,
    attacks: [
      { verb: 'pecks', dice: [4, 10, 8] },
      { verb: "cheeps one of Malachar's hexes at", dice: [3, 10, 6], ranged: true },
      { verb: 'flaps up a Moulting Storm over', dice: [3, 8, 6], all: true },
    ],
    sprite: 'changeling',
  },
];
