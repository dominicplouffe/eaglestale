import type { DungeonDef, DungeonLevel } from '../../rules/types';
import { generateLevel, type Vault } from '../levelgen';

/**
 * Malachar's Featherless Spire, reached from behind the thorn-throne in the Moulted Wood: four floors
 * narrowing to an open summit in the storm. The Storm Roc keeps the Storm Feather; Malachar the
 * Plucker holds the Heart Feather himself, and when the party fights him, Aquila comes to help.
 */

const level = (
  name: string,
  maze: ReturnType<typeof generateLevel>,
  rest: Omit<DungeonLevel, 'name' | 'grid' | 'start'>,
): DungeonLevel => ({ name, grid: maze.grid, start: maze.start, ...rest });

// ---- The Plucking Hall ----------------------------------------------------------------

const pluckingHall = generateLevel({
  seed: 1666, width: 35, height: 35, rooms: 13, roomSize: [3, 6], loops: 7, doorChance: 0.45, downStairs: true,
  specials: ['a', 'w', 'T', 'b', 'c', 'f', 'd', 'e', 'U', 'g'],
});

// ---- The Moult Gallery ----------------------------------------------------------------

const hoard: Vault = { place: 'any', entrance: 'F', rows: ['###*###', '#.....#', '#..h..#', '#.....#', '#######'] };

const moultGallery = generateLevel({
  seed: 1789, width: 33, height: 33, rooms: 12, roomSize: [3, 6], loops: 7, doorChance: 0.45, downStairs: true,
  vaults: [hoard],
  specials: ['a', 'b', 'c', 'f', 'd', 'e', 'g'],
});

// ---- The Storm Gallery ----------------------------------------------------------------

const rocNest: Vault = {
  place: 'far',
  rows: ['######*######', '#...........#', '#.t.......t.#', '#.....R.....#', '#...........#', '#############'],
};

const stormGallery = generateLevel({
  seed: 1812, width: 31, height: 31, rooms: 11, roomSize: [3, 6], loops: 6, doorChance: 0.4, downStairs: true,
  vaults: [rocNest],
  specials: ['a', 'e', 'b', 'c', 'f', 'd', 'g'],
});

// ---- The Summit -----------------------------------------------------------------------

const eyrie: Vault = {
  place: 'far',
  // Malachar's last guards stand in the archway.
  entrance: 'Q',
  rows: [
    '#######*#######',
    '#.............#',
    '#.t.........t.#',
    '#......M......#',
    '#.............#',
    '#......h......#',
    '###############',
  ],
};

const summit = generateLevel({
  seed: 1999, width: 29, height: 29, rooms: 9, roomSize: [3, 5], loops: 5, doorChance: 0.3, downStairs: false,
  vaults: [eyrie],
  specials: ['a', 'b', 'd', 'f', 'g'],
});

const spireTheme = { wall: '#3a3048', floor: '#2a2434', ceiling: '#1a1622', door: '#5a3a6a', style: 'rune' as const };

export const spire: DungeonDef = {
  id: 'spire',
  name: "Malachar's Featherless Spire",
  ascending: true,
  levels: [
    level('The Plucking Hall', pluckingHall, {
      encounterRate: 0.085,
      encounters: [
        { monster: 'adept', min: 1, max: 3, weight: 4 },
        { monster: 'pluckedharpy', min: 2, max: 3, weight: 3 },
        { monster: 'gargoyle', min: 1, max: 2, weight: 2 },
        { monster: 'stormcrow', min: 1, max: 2, weight: 1 },
      ],
      theme: spireTheme,
      specials: {
        a: { kind: 'message', text: 'The walls are lined with plucked feathers pinned in rows, each labelled in tiny writing: PIGEON. SPARROW. DUCK (ANGRY). Hundreds of them.' },
        w: {
          kind: 'talk',
          name: 'Wren the falconer',
          text: "You're not one of his! Malachar took my eaglet, Peep, to pluck. She's caged somewhere up in the Storm Gallery. Free her, please. I can't get past the crows.",
          after: 'Peep is in the Storm Gallery, near the top. Please hurry. She hates crows.',
          quest: 'sq-eaglet',
          look: { art: 'townsfolk', palette: { cloth: '#6a5a3a', hair: '#2a2420' } },
        },
        T: { kind: 'teleport', text: 'You step through a black mirror and out of another one, somewhere else in the hall.', to: 'U' },
        U: { kind: 'teleport', text: 'You step through a black mirror and out of another one, back across the hall.', to: 'T' },
        b: { kind: 'treasure', text: "A tithe chest: the cult's collection of gold, stolen pillows and one surprised chicken (who leaves).", gold: 800 },
        c: { kind: 'trap', text: 'A tickling-feather trap! A hundred feathers flail at a hero until they collapse laughing, and bruised.', dice: [5, 8] },
        f: {
          kind: 'fight',
          text: 'Adepts drop their plucking tweezers and reach for their hexes.',
          groups: [{ monster: 'adept', count: 3 }, { monster: 'pluckedharpy', count: 2 }],
          reward: { gold: 500 },
          hidden: true,
        },
        d: { kind: 'fountain', text: 'A basin of clear water under a skylight. Someone has written HOLY? on the rim. It is.' },
        e: { kind: 'treasure', text: "In a wardrobe: one of Malachar's spare robes, purple and plucked-looking.", item: 'shadowrobe' },
        g: { kind: 'message', text: 'A portrait of Malachar as a young court wizard, glaring at a pigeon. The pigeon looks unbothered.' },
      },
    }),
    level('The Moult Gallery', moultGallery, {
      encounterRate: 0.085,
      encounters: [
        { monster: 'pluckedknight', min: 1, max: 2, weight: 3 },
        { monster: 'adept', min: 2, max: 3, weight: 3 },
        { monster: 'gargoyle', min: 1, max: 2, weight: 2 },
        { monster: 'pluckedharpy', min: 2, max: 3, weight: 2 },
      ],
      theme: { ...spireTheme, wall: '#44385a', floor: '#2e2838' },
      specials: {
        a: { kind: 'message', text: "A gallery of statues: famous birds, all carved without feathers. The phoenix looks particularly embarrassed." },
        b: { kind: 'treasure', text: 'A collection plate: "FOR THE GREAT PLUCKING". It is full.', gold: 900 },
        c: { kind: 'trap', text: 'The floor tilts and a hero slides down a polished chute into a pile of pinecones.', dice: [5, 8] },
        f: {
          kind: 'fight',
          text: 'Plucked Knights step down from their plinths. They were never statues.',
          groups: [{ monster: 'pluckedknight', count: 3 }, { monster: 'adept', count: 1 }],
          reward: { gold: 600 },
        },
        d: { kind: 'fountain', text: 'A fountain that used to have a stone swan on it. The water still heals, swan or not.' },
        e: { kind: 'treasure', text: 'On a stand under glass, a helm with lightning running along its crest.', item: 'stormhelm' },
        g: { kind: 'message', text: 'Graffiti, scratched deep: THE ROC NESTS ONE FLOOR UP. DO NOT LOOK IT IN THE EYE. OR THE BEAK. OR ANYWHERE.' },
        F: {
          kind: 'lock',
          text: "A door with eleven feather-shaped keyholes. Malachar's private hoard, it seems, for one who carries most of Aquila's feathers.",
          opened: "The feathers you carry glow, and one by one the feather-locks click open.",
          feathers: 11,
        },
        h: { kind: 'treasure', text: "Malachar's private hoard: gold, and a sun-bright elixir.", gold: 2000, item: 'sunelixir' },
      },
    }),
    level('The Storm Gallery', stormGallery, {
      encounterRate: 0.09,
      encounters: [
        { monster: 'stormcrow', min: 2, max: 4, weight: 4 },
        { monster: 'pluckedknight', min: 1, max: 2, weight: 2 },
        { monster: 'gargoyle', min: 2, max: 2, weight: 2 },
        { monster: 'adept', min: 2, max: 3, weight: 2 },
      ],
      theme: { ...spireTheme, wall: '#38405a', floor: '#262a38' },
      specials: {
        a: { kind: 'message', text: 'Rain blows in through tall, broken windows. Every few seconds, lightning turns the whole gallery white.' },
        e: {
          kind: 'talk',
          name: 'Peep the eaglet',
          text: 'In a cage hangs a fluffy eaglet with a furious expression. You pick the lock; she hops onto your arm, bites it (affectionately), and flies off down the stairs to find Wren.',
          after: 'An empty cage, and a single fluffy feather.',
          flag: 'eaglet-freed',
          narrated: true,
          look: { art: 'eagle', palette: { W: '#f0e8d8', w: '#c8bca8', G: '#c8a070', g: '#9a7a50', b: '#8a6a40', B: '#5a4428' } },
        },
        b: { kind: 'treasure', text: "A drowned adept's satchel: hex shards, soggy notes and a lot of gold.", gold: 1000 },
        c: { kind: 'trap', text: 'Lightning strikes the iron floor plate right under a hero!', dice: [6, 8] },
        f: {
          kind: 'fight',
          text: 'Crows pour in through the windows, trailing sparks.',
          groups: [{ monster: 'stormcrow', count: 5 }, { monster: 'gargoyle', count: 1 }],
          reward: { gold: 600 },
          hidden: true,
        },
        d: { kind: 'fountain', text: 'Rainwater pools in a cracked font. Drinking it, you feel the storm\'s strength in you.' },
        g: { kind: 'message', text: 'Huge talon marks gouge the floor, leading to a nest made of broken weathervanes.' },
        R: {
          kind: 'fight',
          text: 'The Storm Roc rises from its nest of weathervanes, lightning running along its wings. Caught in its crest, a golden feather crackles.',
          groups: [{ monster: 'stormroc', count: 1 }, { monster: 'stormcrow', count: 2 }],
          reward: { gold: 1500, feather: 'storm', item: 'rocmantle' },
          flag: 'roc-defeated',
        },
        t: { kind: 'treasure', text: 'Shiny things the Roc collected: weathervane cockerels, lightning rods and gold.', gold: 700 },
      },
    }),
    level('The Summit', summit, {
      encounterRate: 0.09,
      encounters: [
        { monster: 'pluckedknight', min: 2, max: 3, weight: 3 },
        { monster: 'gargoyle', min: 2, max: 3, weight: 2 },
        { monster: 'adept', min: 2, max: 4, weight: 2 },
        { monster: 'stormcrow', min: 2, max: 4, weight: 2 },
      ],
      theme: { ...spireTheme, wall: '#4a4058', floor: '#34303e', sky: '#4a3e66', light: 0.45 },
      specials: {
        a: { kind: 'message', text: 'The top of the Spire is open to the storm. Far below, past the wood, you can see Talonreach, and the Eagle Tower glowing with the feathers you have returned.' },
        b: { kind: 'treasure', text: "Malachar's travel chest, packed for a quick getaway: gold, and more gold.", gold: 1500 },
        d: { kind: 'fountain', text: 'A rain-filled basin under the open sky. The water tingles. You feel ready for anything.' },
        f: {
          kind: 'fight',
          text: 'Gargoyles drop from the battlements, and Plucked Knights march out of the rain.',
          groups: [{ monster: 'gargoyle', count: 2 }, { monster: 'pluckedknight', count: 2 }],
          reward: { gold: 800 },
          hidden: true,
        },
        g: { kind: 'message', text: 'A sign, nailed to the battlements: NO EAGLES. Underneath, smaller: OR PIGEONS. OR ANYTHING, REALLY.' },
        Q: {
          kind: 'fight',
          text: "Malachar's last guards bar the way to the eyrie, shields locked.",
          groups: [{ monster: 'pluckedknight', count: 2 }, { monster: 'gargoyle', count: 2 }],
          reward: { gold: 1000 },
        },
        M: {
          kind: 'fight',
          text: 'At the summit, in the eye of the storm, stands Malachar the Plucker, a golden feather glowing over his heart. "You brought them all back to that tower? How very... tidy. I shall simply pluck them again."',
          groups: [{ monster: 'malachar', count: 1 }, { monster: 'adept', count: 2, distance: 1 }],
          reward: { gold: 5000, feather: 'heart' },
          flag: 'malachar-defeated',
          assist: {
            name: 'Aquila',
            round: 3,
            text: 'A great shadow falls across the summit. Far away, the feathers on the Eagle Tower blaze gold, and down out of the storm dives AQUILA, the Great Eagle, talons first!',
            dice: [16, 10, 150],
            heal: [10, 10, 60],
            art: 'eagle',
          },
        },
        t: { kind: 'treasure', text: "Malachar's collection: the finest stolen feathers in a velvet case (none of them Aquila's) and a heap of gold.", gold: 1200 },
        h: {
          kind: 'portal',
          dungeon: 'talonreach',
          name: 'The road home',
          text: "Where Malachar stood, a shaft of golden light pours down out of the storm: Aquila's road home, for those who carry all twelve feathers.",
          feathers: 12,
        },
      },
    }),
  ],
};
