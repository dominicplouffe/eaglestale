import type { CityStage, FeatherDef, QuestDef } from '../../rules/types';

/**
 * The campaign: Aquila's twelve feathers, how Talonreach recovers as they come home, the main story
 * and the side missions. Later chapters add their quests here (or in their own content pack).
 */

export const feathers: FeatherDef[] = [
  // The Roost Below
  { id: 'crown', name: 'the Crown Feather', desc: "Worn in the Kobold Chieftain's colander crown, in the Cellars." },
  { id: 'grave', name: 'the Grave Feather', desc: 'Kept by the Bone Warden in the Ossuary of the Mouldering Crypts.' },
  { id: 'altar', name: 'the Altar Feather', desc: "Laid on High Priest Grackle's altar in the Roost Sanctum." },
  // Later chapters
  { id: 'sceptre', name: 'the Sceptre Feather', desc: "Tied to the Rat King's sceptre in the Gurgle." },
  { id: 'drain', name: 'the Drain Feather', desc: 'Lost in the deepest drain of the Gurgle.' },
  { id: 'cog', name: 'the Cog Feather', desc: "Wound into Professor Pinion's clockwork." },
  { id: 'pendulum', name: 'the Pendulum Feather', desc: "Swinging from the Clocktower's great pendulum." },
  { id: 'tin', name: 'the Tin Feather', desc: "Fitted to Professor Pinion's mechanical eagle." },
  { id: 'thorn', name: 'the Thorn Feather', desc: 'Woven into the druids\' thorn-throne in the Moulted Wood.' },
  { id: 'songbird', name: 'the Songbird Feather', desc: 'Guarded by the ghosts of the old royal aviary.' },
  { id: 'storm', name: 'the Storm Feather', desc: "Crackling at the top of Malachar's Featherless Spire." },
  { id: 'heart', name: 'the Heart Feather', desc: 'Held by Malachar the Plucker himself.' },
];

export const cityStages: CityStage[] = [
  {
    feathers: 1,
    text: 'Word spreads that a feather of Aquila is home. The bakery on Crumb Lane lights its ovens again: the Emporium now sells Honey Buns.',
    stock: ['honeybun'],
  },
  {
    feathers: 2,
    text: 'A second feather glows on the perch. The night watch walks the streets again and the armourer reopens: the Emporium now carries Talonreach steel.',
    stock: ['steelsword', 'warhammer', 'greataxe', 'warbow', 'scalemail', 'towershield', 'steelhelm'],
  },
  {
    feathers: 3,
    text: 'Three feathers. Pigeons return to the square, and the tower keepers bless golden Pinion Charms for brave heroes (on sale at the Emporium).',
    stock: ['pinioncharm'],
  },
];

export const quests: QuestDef[] = [
  // ---- The main story ----
  {
    id: 'mq-roost',
    name: 'The Plucked Eagle',
    kind: 'main',
    source: 'start',
    summary: "Recover Aquila's feathers from the Roost Below.",
    steps: [
      { text: 'Search the Roost Below for the stolen feathers. Rumour says the Kobold Chieftain in the Cellars wears one in his crown.', goal: { kind: 'feathers', count: 1 } },
      { text: 'Bring the feather home to the Eagle Tower in Talonreach.', goal: { kind: 'offered', count: 1 } },
      { text: 'Find the Grave Feather in the Mouldering Crypts. The Bone Warden keeps it behind the Ossuary\'s locked door.', goal: { kind: 'feathers', count: 2 } },
      { text: 'The way down to the Sanctum is sealed by a door that answers only to Aquila\'s feathers. Carry two to it, and confront High Priest Grackle.', goal: { kind: 'flag', flag: 'grackle-defeated' } },
      { text: 'Return the feathers to the Eagle Tower.', goal: { kind: 'offered', count: 3 } },
    ],
    reward: { gold: 500, xp: 600 },
    done: 'The Roost Below is free of the cult. With his last breath Grackle squawked: "The Rat King will keep the rest safe!" The sewer key he carried opens the Gurgle.',
    next: ['mq-gurgle'],
  },
  {
    id: 'mq-gurgle',
    name: 'Into the Gurgle',
    kind: 'main',
    source: 'given',
    summary: 'Follow the cult into the sewers beneath Talonreach.',
    steps: [
      { text: 'The Sewer Grate Key opens the Gurgle, where the Rat King holds two more feathers. (This chapter is still being built.)', goal: { kind: 'flag', flag: 'gurgle-entered' } },
    ],
    done: '',
  },

  // ---- Side tasks, given by people met in the dungeon ----
  {
    id: 'sq-wobbleby',
    name: "Great-Grandpa's Helmet",
    kind: 'side',
    source: 'given',
    summary: "Find Sir Wobbleby's helmet for his great-grandson.",
    steps: [{ text: "Find Sir Wobbleby's helmet in the Mouldering Crypts. His tomb is said to be hidden.", goal: { kind: 'collect', item: 'wobblebyhelm', count: 1 } }],
    reward: { xp: 150 },
    done: 'Sir Wobbleby\'s helm! His great-grandson said to keep it: "He\'d want it worn by someone who stays upright."',
  },
  {
    id: 'sq-sexton',
    name: 'Restless Bones',
    kind: 'side',
    source: 'given',
    summary: 'Put the Crypts\' wandering skeletons back to rest.',
    steps: [{ text: 'Defeat five wandering skeletons for the Weeping Sexton.', goal: { kind: 'kill', monster: 'skeleton', count: 5 } }],
    reward: { gold: 200, item: 'greaterdraught' },
    done: 'The Weeping Sexton sends his thanks, some gold he found in the skeletons\' pockets, and a potion.',
  },
  {
    id: 'sq-songbirds',
    name: 'Cage Rattling',
    kind: 'side',
    source: 'given',
    summary: "Free Finch's songbirds from the Sanctum.",
    steps: [
      { text: 'Free the caged songbirds hidden around the Sanctum (one of three).', goal: { kind: 'flag', flag: 'cage-1' } },
      { text: 'Free the caged songbirds hidden around the Sanctum (two of three).', goal: { kind: 'flag', flag: 'cage-2' } },
      { text: 'Free the caged songbirds hidden around the Sanctum (three of three).', goal: { kind: 'flag', flag: 'cage-3' } },
    ],
    reward: { gold: 150, item: 'charm', xp: 300 },
    done: 'Every songbird is free. Somewhere above, Finch is crying happy tears and a little choir is singing your names, slightly wrong.',
  },

  // ---- Bounties, from the Guild's board ----
  {
    id: 'b-rats',
    name: 'Rat Problem',
    kind: 'side',
    source: 'board',
    summary: 'The bakery wants proof the cellar rats are thinning out. Bring 10 rat tails.',
    steps: [{ text: 'Collect 10 rat tails in the Cellars.', goal: { kind: 'collect', item: 'rattail', count: 10 } }],
    reward: { gold: 120, item: 'draught' },
    done: 'The Guild clerk counts the tails with tongs and pays up.',
  },
  {
    id: 'b-kobolds',
    name: 'Kobold Census',
    kind: 'side',
    source: 'board',
    summary: 'Too many kobolds in the Cellars. Reduce the count by twelve.',
    steps: [{ text: 'Defeat 12 kobolds.', goal: { kind: 'kill', monster: 'kobold', count: 12 } }],
    reward: { gold: 150, xp: 120 },
    done: 'The Guild updates its census. The kobold column now reads "fewer".',
  },
  {
    id: 'b-sigils',
    name: 'Badges of the Cult',
    kind: 'side',
    source: 'board',
    summary: 'The city watch wants to know how big the cult is. Bring 6 cult sigils.',
    requires: { feathers: 1 },
    steps: [{ text: 'Collect 6 cult sigils from Roost Cultists and Cult Mages.', goal: { kind: 'collect', item: 'cultsigil', count: 6 } }],
    reward: { gold: 300, item: 'tonic' },
    done: 'The watch captain pins the sigils to a map. It is a worryingly large map.',
  },
  {
    id: 'b-bones',
    name: 'Bones to Pick',
    kind: 'side',
    source: 'board',
    summary: 'The undead are getting bold. Defeat ten skeletons.',
    requires: { quests: ['b-kobolds'] },
    steps: [{ text: 'Defeat 10 skeletons in the Crypts.', goal: { kind: 'kill', monster: 'skeleton', count: 10 } }],
    reward: { gold: 350, xp: 250 },
    done: 'The Guildmaster stops eating his sandwich long enough to nod. High praise.',
  },
  {
    id: 'b-silk',
    name: 'Silk for the Tailor',
    kind: 'side',
    source: 'board',
    summary: 'A tailor on Quill Street needs spider silk for the Eagle Festival banners. Bring 5 skeins.',
    requires: { feathers: 2 },
    steps: [{ text: 'Collect 5 skeins of spider silk.', goal: { kind: 'collect', item: 'spidersilk', count: 5 } }],
    reward: { gold: 400, item: 'greaterdraught' },
    done: 'The tailor squeals, hugs the silk, then hugs you. Mostly the silk.',
  },
  {
    id: 'b-guards',
    name: 'The Elite Guard',
    kind: 'side',
    source: 'board',
    summary: "Grackle's bone knights guard the Sanctum. Thin their ranks: defeat six.",
    requires: { feathers: 2 },
    steps: [{ text: 'Defeat 6 Bone Knights in the Roost Sanctum.', goal: { kind: 'kill', monster: 'boneknight', count: 6 } }],
    reward: { gold: 600, xp: 400 },
    done: 'The Guild hangs a bone knight helmet over the fireplace. It glares.',
  },
];
