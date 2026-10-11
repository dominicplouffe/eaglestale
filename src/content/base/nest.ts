import type { DungeonDef, DungeonLevel, Look } from '../../rules/types';
import { generateLevel, type Vault } from '../levelgen';

/**
 * Mount Talon, after the story: the old pilgrims' road from Talonreach's North Gate up to Aquila's
 * old nest, where a cuckoo's egg hatched under Malachar's lost hat. The gate opens once Aquila is
 * home (the last main quest sets `aquila-home`). Three levels, climbing, and the hardest fights in
 * the game: the Crag Eagles' Queen Skreel and the Changeling itself.
 */

const SIZE = 41;
const monk: Look = { art: 'townsfolk', palette: { cloth: '#c86a2a', hair: '#e8e0d0' } };
const climber: Look = { art: 'townsfolk', palette: { cloth: '#3a6aa8', hair: '#a84a2a' } };

const level = (
  name: string,
  maze: ReturnType<typeof generateLevel>,
  rest: Omit<DungeonLevel, 'name' | 'grid' | 'start'>,
): DungeonLevel => ({ name, grid: maze.grid, start: maze.start, ...rest });

const prayerFlag = (n: number, text: string) => ({
  kind: 'message' as const,
  text,
  after: "Brother Tumble's prayer flags flap in the wind, back where they belong.",
  flag: `prayer-flag-${n}`,
  look: { art: 'flagpole' },
  lookDone: { art: 'flagpolehung' },
});

// ---- The Pilgrims' Road ---------------------------------------------------------------

const frozenShrine: Vault = {
  place: 'far',
  // Frost bears have made their den in the pilgrims' shrine.
  entrance: 'Q',
  rows: ['#####*#####', '#.........#', '#..v...t..#', '#.........#', '###########'],
};

const road = generateLevel({
  seed: 1789, width: SIZE, height: SIZE, rooms: 17, roomSize: [3, 7], loops: 10, doorChance: 0, downStairs: true,
  vaults: [frozenShrine],
  specials: ['a', 'h', 'b', '1', 'c', 'g', 'd', 'w', 'e'],
});

// ---- The Crags ------------------------------------------------------------------------

const skreelsEyrie: Vault = {
  place: 'far',
  // Her crag eagles perch across the way in.
  entrance: 'Q',
  rows: ['#######*#######', '#.............#', '#.t.........t.#', '#......K......#', '#.............#', '###############'],
};
const iceCave: Vault = { place: 'any', entrance: 'S', rows: ['##*##', '#.x.#', '#...#', '#####'] };
const ledge: Vault = { place: 'any', entrance: '.', rows: ['###*###', '#.....#', '#..o..#', '#######'] };

const crags = generateLevel({
  seed: 2001, width: SIZE, height: SIZE, rooms: 17, roomSize: [3, 7], loops: 10, doorChance: 0, downStairs: true,
  vaults: [skreelsEyrie, iceCave, ledge],
  specials: ['a', '2', 'b', 'r', 'c', 'd', '3', 'f', 'g', 'e'],
});

// ---- Aquila's Old Nest ----------------------------------------------------------------

const theNest: Vault = {
  place: 'far',
  // A ring of chicks, all cheeping at once.
  entrance: 'Q',
  rows: [
    '#########*#########',
    '#.................#',
    '#.t.............t.#',
    '#........C........#',
    '#.................#',
    '#.t......x......t.#',
    '###################',
  ],
};
const hoard: Vault = { place: 'any', entrance: 'S', rows: ['##*##', '#.p.#', '#...#', '#####'] };

const summit = generateLevel({
  seed: 1969, width: SIZE, height: SIZE, rooms: 16, roomSize: [3, 7], loops: 9, doorChance: 0, downStairs: false,
  vaults: [theNest, hoard],
  specials: ['a', 'b', 'g', 'c', 'd', 'e', 'f', 's'],
});

export const nest: DungeonDef = {
  id: 'nest',
  name: 'Mount Talon',
  ascending: true,
  levels: [
    level("The Pilgrims' Road", road, {
      encounterRate: 0.085,
      encounters: [
        { monster: 'snowwolf', min: 2, max: 4, weight: 4 },
        { monster: 'frostbear', min: 1, max: 1, weight: 2 },
        { monster: 'stormwisp', min: 1, max: 3, weight: 2 },
        { monster: 'crageagle', min: 1, max: 2, weight: 2 },
      ],
      theme: { wall: '#7a7480', floor: '#dfe6ee', ceiling: '#000000', door: '#f4f8fc', style: 'mountain', sky: '#8ec0f0', light: 0.7 },
      specials: {
        a: {
          kind: 'message',
          text: "A stone waymarker, half buried in snow: AQUILA'S NEST, THREE DAYS. PILGRIMS, KEEP TO THE ROAD. Scratched underneath: OR TWO IF YOU RUN.",
        },
        h: {
          kind: 'talk',
          name: 'Brother Tumble',
          text: '"Pilgrims! The first in years!" A round little monk beams at you from his hut. "The storm that brought Aquila home blew all my prayer flags off the mountain. Would you hang them back up for me? Three of them. One on this road, two on the Crags above."',
          after: '"Three flags, friends: one on the road, two on the Crags. And mind the bears. They are not interested in prayer."',
          narrated: true,
          quest: 'sq-flags',
          look: monk,
        },
        b: { kind: 'treasure', text: "A pilgrim's pack, frozen stiff. Inside: a flask of tea (frozen) and a purse (not).", gold: 600 },
        1: prayerFlag(1, 'A bare flagpole by the road. You string up one of Brother Tumble\'s prayer flags, and it snaps out bright in the wind.'),
        c: { kind: 'trap', text: 'A shout echoes off the cliffs, and the snow above you starts to move. AVALANCHE!', dice: [4, 8] },
        g: { kind: 'fountain', text: 'A hot spring steams among the rocks. You soak your aching feet and feel like new.' },
        d: { kind: 'message', text: "A snowman in a pilgrim's hat, its carrot nose pointing up the mountain. Very helpful, for a snowman." },
        w: {
          kind: 'fight',
          text: 'A snowdrift explodes: snow wolves, white as the mountain, and a frost bear behind them!',
          groups: [{ monster: 'snowwolf', count: 5 }, { monster: 'frostbear', count: 1 }],
          reward: { gold: 400 },
          hidden: true,
        },
        e: { kind: 'treasure', text: 'In a cleft in the rock, an old pilgrim\'s offering: a flask of golden Sun Elixir.', item: 'sunelixir' },
        Q: {
          kind: 'fight',
          text: "Frost bears have taken over the pilgrims' shrine, and their wolves are not sharing either.",
          groups: [{ monster: 'frostbear', count: 3 }, { monster: 'snowwolf', count: 3 }],
          reward: { gold: 500 },
        },
        v: { kind: 'treasure', text: 'On the shrine\'s altar lies a bow strung with something that is not quite string. When you touch it, the wind rises.', item: 'windbow' },
        t: { kind: 'treasure', text: "The shrine's offering bowl, full of pilgrims' coins.", gold: 800 },
      },
    }),
    level('The Crags', crags, {
      encounterRate: 0.09,
      encounters: [
        { monster: 'crageagle', min: 1, max: 3, weight: 4 },
        { monster: 'stormwisp', min: 2, max: 3, weight: 2 },
        { monster: 'frostbear', min: 1, max: 2, weight: 2 },
        { monster: 'snowwolf', min: 2, max: 4, weight: 2 },
      ],
      theme: { wall: '#6a6070', floor: '#d0d8e4', ceiling: '#000000', door: '#eef4fa', style: 'mountain', sky: '#7ab4ec', light: 0.72 },
      specials: {
        a: { kind: 'message', text: 'The road gives out among the Crags: cliffs, ledges and a long way down. Golden eagles the size of ponies circle overhead, watching you.' },
        2: prayerFlag(2, "A cairn on a windy ledge, with a pole on top. Up goes another of Brother Tumble's prayer flags."),
        b: { kind: 'treasure', text: "Wedged in a crack: a climber's lost purse.", gold: 900 },
        r: { kind: 'message', text: 'A frayed rope bridge sways over nothing at all. You cross one at a time, and nobody looks down. Well, Pip looks down. Once.' },
        c: { kind: 'trap', text: 'A crag eagle knocks a boulder loose from far above. Look out below!', dice: [4, 10] },
        d: { kind: 'fountain', text: 'A pool of snowmelt, clear as glass. One sip and your tiredness simply washes away.' },
        3: prayerFlag(3, "The highest pole on the Crags. Up goes one of Brother Tumble's prayer flags, and far below, you hear a faint, happy cheer."),
        f: {
          kind: 'fight',
          text: 'The air fizzes. Storm wisps pour out of a thundercloud stuck on the cliff!',
          groups: [{ monster: 'stormwisp', count: 5 }],
          reward: { gold: 600 },
          hidden: true,
        },
        g: { kind: 'treasure', text: 'Snagged on a rock where the clouds drift past: a robe woven out of cloud.', item: 'cloudrobe' },
        e: { kind: 'treasure', text: 'An old climbers\' cache: rope, pitons and a Phoenix Draught.', item: 'phoenixdraught' },
        S: { kind: 'secret', text: 'Behind a curtain of icicles, a cave glints blue.' },
        x: { kind: 'treasure', text: "On the cave floor, frozen into the ice: an ice axe. The handle says HORTENSIA. HANDS OFF.", item: 'iceaxe' },
        o: {
          kind: 'talk',
          name: 'Dame Hortensia Crag',
          text: '"Hullo! Hortensia Crag, mountaineer. First up Mount Talon in forty years, and I\'d have made the top if a crag eagle hadn\'t pinched my ice axe! It dropped it into an ice cave somewhere. Fetch it, would you? I\'ve a spare cloak in it for you."',
          after: '"My ice axe, chaps! Somewhere in the ice caves. I\'d look myself but I\'m rather stuck on this ledge."',
          narrated: true,
          quest: 'sq-hortensia',
          look: climber,
        },
        Q: {
          kind: 'fight',
          text: "Crag eagles drop onto the rocks in front of you, wings spread wide: the Queen's guard.",
          groups: [{ monster: 'crageagle', count: 4 }, { monster: 'stormwisp', count: 2 }],
          reward: { gold: 800 },
        },
        K: {
          kind: 'fight',
          text: 'On an eyrie of white rock sits QUEEN SKREEL of the Crag Eagles, golden and enormous. "Pilgrims," she shrieks, "do not come to the Crags. Tell that to the next ones. If there is anyone left to tell."',
          groups: [{ monster: 'skreel', count: 1 }, { monster: 'crageagle', count: 2 }],
          reward: { gold: 2000, item: 'eyrieplate' },
          flag: 'skreel-defeated',
        },
        t: { kind: 'treasure', text: "Queen Skreel's hoard: shiny things that caught a crag eagle's eye, including a lot of coins.", gold: 1200 },
      },
    }),
    level("Aquila's Old Nest", summit, {
      encounterRate: 0.09,
      encounters: [
        { monster: 'chick', min: 2, max: 4, weight: 4 },
        { monster: 'stormwisp', min: 2, max: 3, weight: 2 },
        { monster: 'crageagle', min: 2, max: 3, weight: 2 },
        { monster: 'frostbear', min: 1, max: 2, weight: 1 },
      ],
      theme: { wall: '#8a7a68', floor: '#c8b080', ceiling: '#000000', door: '#fff8e8', style: 'mountain', sky: '#6aaef0', light: 0.75 },
      specials: {
        a: {
          kind: 'message',
          text: "The top of Mount Talon, and Aquila's old nest: a bowl of woven pine trunks as wide as Feather Square. Somewhere in the middle of it, something very large is cheeping.",
        },
        b: { kind: 'treasure', text: 'Tucked into the weave of the nest: a pilgrim\'s offering from long ago, heavy with gold.', gold: 1500 },
        g: {
          kind: 'message',
          text: "Pieces of an eggshell the size of a cart, speckled like a cuckoo's. Something hatched here, not long ago. In the snow beside it, a tall, pointed, hat-shaped dent.",
        },
        c: { kind: 'trap', text: 'A branch of the nest gives way, and you tumble down through the woven pine!', dice: [4, 10] },
        d: { kind: 'fountain', text: 'Snowmelt pools in the curl of one of Aquila\'s old moulted feathers. It tastes of sunlight, and every wound closes.' },
        e: { kind: 'treasure', text: 'Leaning against the side of the nest, as if someone set it down and forgot it: a staff of lightning-struck white ash.', item: 'skystaff' },
        f: {
          kind: 'fight',
          text: 'The woven pine bursts open: Changeling chicks, cheeping hexes, and storm wisps crackling round them!',
          groups: [{ monster: 'chick', count: 6 }, { monster: 'stormwisp', count: 2 }],
          reward: { gold: 800 },
          hidden: true,
        },
        s: { kind: 'treasure', text: 'Wrapped in moulted golden down: a Phoenix Draught, and a second one under it.', item: 'phoenixdraught' },
        S: { kind: 'secret', text: 'The pine weave here is loose. Behind it, someone has hidden something heavy.' },
        p: { kind: 'treasure', text: 'A hammer of mountain iron, hidden in the weave of the nest. Lifting it feels like lifting a hill.', item: 'peakbreaker' },
        Q: {
          kind: 'fight',
          text: 'A ring of Changeling chicks waddles out to meet you, all cheeping hexes at once.',
          groups: [{ monster: 'chick', count: 6 }, { monster: 'crageagle', count: 2 }],
          reward: { gold: 1000 },
        },
        C: {
          kind: 'fight',
          text: "In the heart of Aquila's old nest sits a chick the size of a haystack, wearing Malachar's tall purple hat. It opens one enormous eye. \"CHEEP,\" it says, and every hex Malachar ever knew crackles in the brim.",
          groups: [{ monster: 'changeling', count: 1 }, { monster: 'chick', count: 3, distance: 1 }],
          reward: { gold: 8000, item: 'malacharshat' },
          flag: 'changeling-defeated',
        },
        x: { kind: 'treasure', text: 'Where the Changeling sat: a great golden talon that Aquila shed here long ago, worked into a blade.', item: 'aquilastalon' },
        t: { kind: 'treasure', text: 'Shiny things the Changeling hoarded, as cuckoos do: coins, buckles and somebody\'s spectacles.', gold: 1500 },
      },
    }),
  ],
};
