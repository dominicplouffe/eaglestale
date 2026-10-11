import type { DungeonDef, DungeonLevel, Look } from '../../rules/types';
import { generateLevel, type Vault } from '../levelgen';

/**
 * The Moulted Wood, beyond the East Gate: a wood whose birds have all lost their feathers. Two of
 * Aquila's are here: with the ghosts of the old royal aviary, and woven into the druids' thorn-throne.
 * Behind the throne, a path leads on to Malachar's Featherless Spire.
 */

const SIZE = 41;
const grouse: Look = { art: 'crow', palette: { feather: '#8a6a44', e: '#1a1410', Y: '#c84030', y: '#e06040' } };

const level = (
  name: string,
  maze: ReturnType<typeof generateLevel>,
  rest: Omit<DungeonLevel, 'name' | 'grid' | 'start'>,
): DungeonLevel => ({ name, grid: maze.grid, start: maze.start, ...rest });

// ---- The Fringe -----------------------------------------------------------------------

const den: Vault = {
  place: 'far',
  entrance: '.',
  rows: ['####*####', '#.......#', '#..o.o..#', '#...W...#', '#.......#', '#########'],
};

const fringe = generateLevel({
  seed: 1066, width: SIZE, height: SIZE, rooms: 17, roomSize: [3, 7], loops: 10, doorChance: 0, downStairs: true,
  vaults: [den],
  specials: ['R', 'a', 'g', 'b', 'x', 'c', 'd', 'f', 'y', 'h', 'e'],
});

// ---- The Old Aviary -------------------------------------------------------------------

const wardensCage: Vault = {
  place: 'far',
  entrance: '.',
  rows: ['######*######', '#...........#', '#.t.......t.#', '#.....A.....#', '#...........#', '#############'],
};

const aviary = generateLevel({
  seed: 1314, width: SIZE, height: SIZE, rooms: 17, roomSize: [3, 7], loops: 10, doorChance: 0.2, downStairs: true,
  vaults: [wardensCage],
  specials: ['a', 'o', '1', 'b', 'z', '2', 'c', 'd', 'e', '3', 'f'],
});

// ---- The Thorn Grove ------------------------------------------------------------------

const thornThrone: Vault = {
  place: 'far',
  // The Archdruid's guard waits in the gap in the thorns.
  entrance: 'Q',
  rows: [
    '#######*#######',
    '#.............#',
    '#.t.........t.#',
    '#......B......#',
    '#.............#',
    '#......p......#',
    '###############',
  ],
};
const hollowOak: Vault = { place: 'any', entrance: 'S', rows: ['##*##', '#.s.#', '#...#', '#####'] };

const grove = generateLevel({
  seed: 1215, width: SIZE, height: SIZE, rooms: 16, roomSize: [3, 7], loops: 9, doorChance: 0, downStairs: false,
  vaults: [thornThrone, hollowOak],
  specials: ['R', 'a', 'h', 'b', 'c', 'd', 'e', 'f', 'g'],
});

export const wood: DungeonDef = {
  id: 'wood',
  name: 'The Moulted Wood',
  levels: [
    level('The Fringe', fringe, {
      encounterRate: 0.08,
      encounters: [
        { monster: 'thornwolf', min: 2, max: 4, weight: 4 },
        { monster: 'thornling', min: 3, max: 6, weight: 3 },
        { monster: 'wisp', min: 1, max: 3, weight: 2 },
        { monster: 'bear', min: 1, max: 1, weight: 2 },
        { monster: 'druid', min: 1, max: 2, weight: 1 },
      ],
      theme: { wall: '#6a4e34', floor: '#4a5a2e', ceiling: '#000000', door: '#4e7a34', style: 'forest', sky: '#9aa8a0', light: 0.5 },
      specials: {
        R: {
          kind: 'teleport',
          text: 'The standing stones hum and the world blurs. You stand among the stones at the heart of the Thorn Grove.',
          to: 'R',
          level: 2,
          flag: 'archdruid-defeated',
          off: 'A ring of standing stones, cold and quiet. They feel like a door that someone has locked from the other side.',
        },
        a: { kind: 'message', text: 'The trees here are not losing leaves. They are losing feathers: grey, drifting, everywhere. The whole wood is moulting.' },
        g: {
          kind: 'talk',
          name: 'Ma Grouse',
          text: "Cluck! Heroes! The wolves came through and scattered my clutch all over the wood. Three eggs, dearie. Find them and bring them back to me, would you? I'll make it worth your while.",
          after: 'Three eggs, speckled, and still warm I hope. Mind the wolves, dearie.',
          quest: 'sq-grouse',
          look: grouse,
        },
        b: { kind: 'treasure', text: "A woodcutter's purse, dropped in a hurry. Wolf prints all around it.", gold: 400 },
        x: { kind: 'treasure', text: 'In a nest of moss: a speckled grouse egg, still warm.', item: 'grouseegg' },
        y: { kind: 'treasure', text: 'Under a bramble, unbroken: one of Ma Grouse\'s eggs.', item: 'grouseegg' },
        c: { kind: 'trap', text: 'A snare whips tight round an ankle and hauls a hero up into the branches, then lets go!', dice: [4, 8] },
        d: { kind: 'fountain', text: 'A spring bubbles up between mossy stones. The water is cold and sweet and makes everything better.' },
        f: {
          kind: 'fight',
          text: 'Thornlings unfold from the undergrowth, and druids step out from behind the trees.',
          groups: [{ monster: 'druid', count: 2 }, { monster: 'thornling', count: 5 }],
          reward: { gold: 300 },
          hidden: true,
        },
        h: { kind: 'message', text: 'A broken signpost, half eaten by ivy: TO THE ROYAL AVIARY. Below it, a newer sign: KEEP OUT. HAUNTED. (WE MEAN IT.)' },
        e: { kind: 'treasure', text: 'Hanging from a branch, a hunter\'s pack: rope, a flask, and a golden elixir.', item: 'phoenixdraught' },
        W: {
          kind: 'fight',
          text: 'In the den, an enormous wolf with a mane of thorns lifts its head. Its pack rises around it.',
          groups: [{ monster: 'thornwolf', count: 5 }, { monster: 'bear', count: 1 }],
          reward: { gold: 500, item: 'wolfcloak' },
        },
        o: { kind: 'treasure', text: 'Bones, buckles and the purses of unlucky travellers.', gold: 250 },
      },
    }),
    level('The Old Aviary', aviary, {
      encounterRate: 0.08,
      encounters: [
        { monster: 'ghostbird', min: 2, max: 4, weight: 4 },
        { monster: 'keeperghost', min: 1, max: 3, weight: 3 },
        { monster: 'wisp', min: 2, max: 3, weight: 2 },
        { monster: 'thornwolf', min: 2, max: 3, weight: 1 },
      ],
      theme: { wall: '#8a8a7a', floor: '#5a6a4a', ceiling: '#000000', door: '#5a6a4a', style: 'stone', sky: '#a8b0b8', light: 0.55 },
      specials: {
        a: { kind: 'message', text: 'The royal aviary was a palace for birds, once: stone walls and great iron cages, open to the sky. Now only ghosts sing here.' },
        o: {
          kind: 'talk',
          name: 'The ghost of the Old Keeper',
          text: 'Visitors! Living ones! My birds cannot rest, you see. Not since the feather came. Ring the three aviary bells for me, the way I used to at dusk, and they might sleep at last.',
          after: 'Three bells, at dusk. Or now. Now is fine. Ghosts are not fussy about the time.',
          quest: 'sq-bells',
          look: { art: 'ghost', palette: { W: '#f4fff8', L: '#c8f0d8', M: '#90d0b0', N: '#5a9a7a', O: '#3a6a54', F: '#1e3a2e' } },
        },
        1: {
          kind: 'message',
          text: 'A great bronze bell hangs from a cage arch. You ring it, and somewhere a ghostly songbird stops singing and settles down to sleep.',
          after: 'The bronze bell, still faintly humming.',
          flag: 'bell-1',
          look: { art: 'bell' },
          lookDone: { art: 'bell', palette: { B: '#f8e0a0', b: '#d8a858', d: '#a87038' } },
        },
        2: {
          kind: 'message',
          text: 'A bell green with age hangs here. You ring it: its note rolls out over the ruins, and the air grows a little quieter.',
          after: 'The green bell, still faintly humming.',
          flag: 'bell-2',
          look: { art: 'bell', palette: { B: '#8ab890', b: '#5a8a68', d: '#3a5a48' } },
          lookDone: { art: 'bell', palette: { B: '#b8e8c0', b: '#7ab888', d: '#4a7a58' } },
        },
        3: {
          kind: 'message',
          text: 'An old cracked bell. As it rings, the ghosts of the aviary sigh, all together, like a flock settling for the night.',
          after: 'The cracked bell, still faintly humming.',
          flag: 'bell-3',
          look: { art: 'bell' },
          lookDone: { art: 'bell', palette: { B: '#f8e0a0', b: '#d8a858', d: '#a87038' } },
        },
        b: { kind: 'treasure', text: "The keeper's old strongbox: seed money, still in its little sack.", gold: 450 },
        z: { kind: 'treasure', text: 'A speckled egg in an empty feeding trough. Ma Grouse will be pleased.', item: 'grouseegg' },
        c: { kind: 'trap', text: 'A rusted cage door swings shut on a hero, hard.', dice: [4, 8] },
        d: { kind: 'fountain', text: 'A stone birdbath, still full of clear rainwater. It tastes of mint.' },
        e: { kind: 'treasure', text: 'On a peg in the keeper\'s lodge: a bow with a nightingale carved along it.', item: 'songbow' },
        f: {
          kind: 'fight',
          text: 'A flock of ghostly songbirds swirls out of a cage, singing a terrible chord.',
          groups: [{ monster: 'ghostbird', count: 5 }, { monster: 'keeperghost', count: 2 }],
          reward: { gold: 350 },
          hidden: true,
        },
        A: {
          kind: 'fight',
          text: 'In the great cage stands the Aviary Warden, a tall ghost jangling a ring of keys. Hanging from the ring, a golden feather. "No one leaves my aviary!"',
          groups: [{ monster: 'warden', count: 1 }, { monster: 'ghostbird', count: 3 }],
          reward: { gold: 800, feather: 'songbird' },
          flag: 'warden-defeated',
        },
        t: { kind: 'treasure', text: 'Treasure the birds hoarded: buttons, rings and coins, all shiny.', gold: 300 },
      },
    }),
    level('The Thorn Grove', grove, {
      encounterRate: 0.085,
      encounters: [
        { monster: 'druid', min: 1, max: 3, weight: 4 },
        { monster: 'thornwolf', min: 2, max: 4, weight: 2 },
        { monster: 'bear', min: 1, max: 2, weight: 2 },
        { monster: 'thornling', min: 4, max: 6, weight: 2 },
        { monster: 'wisp', min: 2, max: 3, weight: 1 },
      ],
      theme: { wall: '#4e3424', floor: '#3e3a26', ceiling: '#000000', door: '#6a3a28', style: 'forest', sky: '#8a7a88', light: 0.42 },
      specials: {
        R: {
          kind: 'teleport',
          text: 'The standing stones hum and the world blurs. You stand among the stones at the edge of the wood, in the Fringe.',
          to: 'R',
          level: 0,
          flag: 'archdruid-defeated',
          off: "A ring of standing stones, thrumming with the Archdruid's magic. They won't answer to you while he holds the Grove.",
        },
        a: { kind: 'message', text: 'Brambles as thick as an arm wind between the trees, and every one of them seems to lean towards you.' },
        h: {
          kind: 'talk',
          name: 'Hazel the young druid',
          text: 'The Archdruid sold the Grove to Malachar for a promise of "more trees". I want to plant a new one, a good one: the Seed of the First Oak is hidden in a hollow oak somewhere in the Grove. Will you find it?',
          after: 'The hollow oak is here somewhere. The old druids hid it well. They hid everything well.',
          quest: 'sq-hazel',
          look: { art: 'druid', palette: { robe: '#5a8a4a' } },
        },
        b: { kind: 'treasure', text: "The druids' offering stone, heaped with coins from frightened travellers.", gold: 500 },
        c: { kind: 'trap', text: 'The brambles lunge and wrap round a hero, thorns first!', dice: [5, 8] },
        d: { kind: 'fountain', text: 'A sacred spring, older than the Archdruid. It heals anyone who drinks, whatever the druids think.' },
        e: { kind: 'treasure', text: 'Grown into the roots of a great thorn bush: a sword of living bramble.', item: 'thornblade' },
        f: {
          kind: 'fight',
          text: 'The bushes stand up. They are bears. Druids ride on two of them.',
          groups: [{ monster: 'bear', count: 2 }, { monster: 'druid', count: 3 }],
          reward: { gold: 400 },
          hidden: true,
        },
        g: { kind: 'message', text: 'Through a gap in the canopy you glimpse it: a tower of black stone, bald and featherless, crackling with a storm. Malachar\'s Spire.' },
        S: { kind: 'secret', text: 'A curtain of ivy parts: inside a hollow oak, something glows warm.' },
        s: { kind: 'treasure', text: 'In the heart of the hollow oak, an acorn the size of a fist, warm as a heartbeat: the Seed of the First Oak.', item: 'oakseed' },
        Q: {
          kind: 'fight',
          text: 'Druids and a great bark bear guard the gap in the thorns. "The Archdruid is not to be disturbed!"',
          groups: [{ monster: 'druid', count: 3 }, { monster: 'bear', count: 1 }],
          reward: { gold: 400 },
        },
        B: {
          kind: 'fight',
          text: "On a throne of living thorns sits Archdruid Bramblebeard. Woven into the throne's back, glowing gold: one of Aquila's feathers. \"The wood is MINE. Malachar promised! More trees, he said!\"",
          groups: [{ monster: 'archdruid', count: 1 }, { monster: 'druid', count: 2 }, { monster: 'bear', count: 1 }],
          reward: { gold: 1200, feather: 'thorn' },
          flag: 'archdruid-defeated',
        },
        t: { kind: 'treasure', text: "Offerings piled around the thorn-throne: Malachar's payment for the Grove, in gold.", gold: 600 },
        p: {
          kind: 'portal',
          dungeon: 'spire',
          name: 'The path to the Spire',
          text: 'Behind the thorn-throne, a path of black stones leads out of the Grove towards Malachar\'s Featherless Spire. Thunder grumbles at the top.',
          flag: 'spire-entered',
        },
      },
    }),
  ],
};
