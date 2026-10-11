import type { DungeonDef, DungeonLevel, Look } from '../../rules/types';
import { generateLevel, type Vault } from '../levelgen';

/**
 * Professor Pinion's Clocktower, on Clock Lane: three floors going up, where three of Aquila's
 * feathers are wound into the works. Its door opens to Pinion's letter, found in the Gurgle.
 * Most of what lives here is clockwork: it never sleeps, and rust spells hit it twice as hard.
 */

const SIZE = 39;
const apprentice: Look = { art: 'professor', palette: { C: '#b08a5a', c: '#8a6a42', d: '#5e4628', H: '#d88a40', h: '#a8602a' } };

const level = (
  name: string,
  maze: ReturnType<typeof generateLevel>,
  rest: Omit<DungeonLevel, 'name' | 'grid' | 'start'>,
): DungeonLevel => ({ name, grid: maze.grid, start: maze.start, ...rest });

/** The Professor's private lift runs from the Workshop to the Clock Face, once powered at the top. */
const LIFT = 'lift-powered';

// ---- The Workshop ---------------------------------------------------------------------

const storeroom: Vault = { place: 'any', entrance: 'D', rows: ['###*###', '#.....#', '#.w.t.#', '#.....#', '#######'] };
const study: Vault = {
  place: 'far',
  entrance: 'S',
  rows: ['#####*#####', '#.........#', '#..n...m..#', '#.........#', '###########'],
};

const workshop = generateLevel({
  seed: 1955, width: SIZE, height: SIZE, rooms: 15, roomSize: [3, 7], loops: 8, doorChance: 0.4, downStairs: true,
  vaults: [storeroom, study],
  specials: ['L', 'a', 'T', 'o', 'b', 'f', 'c', 'd', 'e', 'U'],
});

// ---- The Gearworks --------------------------------------------------------------------

const grinderHall: Vault = {
  place: 'far',
  rows: ['######*######', '#...........#', '#.g.......g.#', '#.....G.....#', '#...........#', '#############'],
};
const gearCloset: Vault = { place: 'any', entrance: 'S', rows: ['##*##', '#.y.#', '#...#', '#####'] };

const gearworks = generateLevel({
  seed: 1885, width: SIZE, height: SIZE, rooms: 15, roomSize: [3, 7], loops: 9, doorChance: 0.35, downStairs: true,
  vaults: [grinderHall, gearCloset],
  specials: ['a', 'h', 'b', 'q', 'c', 'e', 'd', 'r', 'f'],
});

// ---- The Clock Face -------------------------------------------------------------------

const eyrie: Vault = {
  place: 'far',
  // The Professor's Brass Guards stand in the doorway.
  entrance: 'Q',
  rows: [
    '#######*#######',
    '#.............#',
    '#.t.........t.#',
    '#......E......#',
    '#.............#',
    '#.t.........t.#',
    '###############',
  ],
};
const pendulumRoom: Vault = { place: 'any', entrance: 'M', rows: ['###*###', '#.....#', '#..p..#', '#.....#', '#######'] };

const clockFace = generateLevel({
  seed: 1212, width: SIZE, height: SIZE, rooms: 15, roomSize: [3, 7], loops: 9, doorChance: 0.35, downStairs: false,
  vaults: [eyrie, pendulumRoom],
  specials: ['L', 'P', 'a', 'n', 'b', 'w', 'c', 'd', 'e', 'f'],
});

export const clocktower: DungeonDef = {
  id: 'clocktower',
  name: "Pinion's Clocktower",
  ascending: true,
  levels: [
    level('The Workshop', workshop, {
      encounterRate: 0.08,
      encounters: [
        { monster: 'tinsoldier', min: 2, max: 4, weight: 4 },
        { monster: 'brassowl', min: 1, max: 3, weight: 3 },
        { monster: 'gearspider', min: 2, max: 3, weight: 3 },
        { monster: 'apprentice', min: 1, max: 3, weight: 3 },
      ],
      theme: { wall: '#b08a48', floor: '#7a5434', ceiling: '#4a3424', door: '#5a3a24', style: 'clockwork' },
      specials: {
        L: {
          kind: 'teleport',
          text: 'You step into the brass cage and pull the lever. With a hiss of steam, the lift shoots up through the tower.',
          to: 'L',
          level: 2,
          flag: LIFT,
          off: 'A brass lift cage. A sign on it says: OUT OF ORDER. PLEASE SWITCH ON AT THE TOP.',
        },
        T: { kind: 'teleport', text: 'You climb into a brass tube. WHOOSH! A blast of air shoots you across the Workshop.', to: 'U' },
        U: { kind: 'teleport', text: 'You climb into a brass tube. WHOOSH! Back across the Workshop you go.', to: 'T' },
        a: { kind: 'message', text: 'A notice nailed to a workbench: APPRENTICES WILL NOT BE PAID IN FEATHERS. APPRENTICES WILL NOT BE PAID AT ALL. - PROF. P.' },
        o: {
          kind: 'talk',
          name: 'Tock the clockwork butler',
          text: 'Good day. I am Tock. I would bow, but I am running down. The apprentices have taken my winding key and locked it in their storeroom. Would you be so kind as to fetch it?',
          after: 'Tick... tock... The storeroom key... the apprentices carry it...',
          quest: 'sq-tock',
          look: { art: 'tinsoldier', palette: { R: '#2a2a32', r: '#18181e', B: '#2a2a32', b: '#18181e', W: '#f0f0f0' } },
        },
        b: { kind: 'treasure', text: 'A drawer of spare parts, and the coins the apprentices hid from the Professor.', gold: 220 },
        f: {
          kind: 'fight',
          text: 'Three apprentices look up from a bench covered in springs. "Intruders! Fetch the soldiers!" One of them has a big brass key on a lanyard.',
          groups: [{ monster: 'apprentice', count: 3 }, { monster: 'tinsoldier', count: 2 }],
          reward: { gold: 120, item: 'brasskey' },
        },
        c: { kind: 'trap', text: 'You step on a loose board. A spring-loaded boxing glove punches out of the wall!', dice: [3, 6] },
        d: { kind: 'fountain', text: 'A tea urn, still hot, with a sign: FOR STAFF ONLY. A cup of tea fixes everything.' },
        e: { kind: 'treasure', text: 'A cabinet marked EMERGENCIES. Inside: a golden flask.', item: 'elixir' },
        D: {
          kind: 'lock',
          text: 'A brass door stencilled STOREROOM - APPRENTICES ONLY.',
          opened: 'The storeroom key turns with a satisfying clunk.',
          key: 'brasskey',
        },
        w: { kind: 'treasure', text: 'On a hook, a big silver winding key labelled TOCK.', item: 'windingkey' },
        t: { kind: 'treasure', text: "Wrapped in an oily rag: the Professor's favourite spanner.", item: 'pinionspanner' },
        S: { kind: 'secret', text: 'A bookcase swings round on a turntable: a secret study!' },
        n: { kind: 'treasure', text: "On the desk lies the Professor's notebook, full of eagles.", item: 'notebook' },
        m: {
          kind: 'message',
          text: 'Pinned to the wall: plans for a MECHANICAL EAGLE. Wingspan: magnificent. Power source: "three real feathers (ask M.)".',
        },
      },
    }),
    level('The Gearworks', gearworks, {
      encounterRate: 0.08,
      encounters: [
        { monster: 'tinsoldier', min: 2, max: 4, weight: 3 },
        { monster: 'gearspider', min: 2, max: 4, weight: 3 },
        { monster: 'cuckoo', min: 3, max: 5, weight: 3 },
        { monster: 'golem', min: 1, max: 1, weight: 2 },
        { monster: 'apprentice', min: 1, max: 2, weight: 1 },
      ],
      theme: { wall: '#b86a40', floor: '#5e4a3a', ceiling: '#3a2c22', door: '#4a3020', style: 'clockwork' },
      specials: {
        a: { kind: 'message', text: 'Gears the size of houses turn overhead. The whole floor shudders with every tick.' },
        h: {
          kind: 'talk',
          name: 'Hortensia the clockmaker',
          text: 'Oh, thank goodness, people! The Professor borrowed my cuckoo clocks for his "great work", and now the cuckoos have got out. They are very, very cross. Could you calm a dozen of them down? Permanently?',
          after: 'Mind the cuckoos, dears. They go for the eyes. And the ankles. And everywhere else.',
          quest: 'sq-cuckoos',
          look: { art: 'townsfolk', palette: { cloth: '#7a4a8a', hair: '#d8d8d8' } },
        },
        b: { kind: 'treasure', text: 'A pay chest for the apprentices. It is, of course, nearly empty.', gold: 260 },
        q: {
          kind: 'fight',
          text: 'A wall of cuckoo clocks bursts open at once: CUCKOO! CUCKOO! CUCKOO!',
          groups: [{ monster: 'cuckoo', count: 6 }],
          reward: { gold: 80 },
          hidden: true,
        },
        c: { kind: 'trap', text: 'A gear catches your cloak and drags you round the works before spitting you out!', dice: [3, 8] },
        e: { kind: 'treasure', text: "Hortensia's own crossbow, left on a bench when the cuckoos came.", item: 'springcrossbow' },
        d: { kind: 'fountain', text: 'A cooling-water tank, clean and cold. You drink and splash and feel restored.' },
        r: { kind: 'message', text: 'Scratched into a girder: THE GRINDER EATS GEARS. AND APPRENTICES. MOSTLY GEARS.' },
        f: {
          kind: 'fight',
          text: 'A Clockwork Golem steps out of the machinery, flanked by soldiers.',
          groups: [{ monster: 'golem', count: 1 }, { monster: 'tinsoldier', count: 3 }],
          reward: { gold: 150 },
        },
        G: {
          kind: 'fight',
          text: 'At the heart of the Gearworks turns the Grinder, an engine with arms, chewing gears. Wound into its works, glinting: a golden feather.',
          groups: [{ monster: 'grinder', count: 1 }, { monster: 'gearspider', count: 2 }],
          reward: { gold: 400, feather: 'cog' },
          flag: 'grinder-defeated',
        },
        g: { kind: 'treasure', text: 'A pile of spare gears, and a purse someone dropped while running away.', gold: 150 },
        S: { kind: 'secret', text: 'One gear on the wall is a handle. It turns, and a hidden closet opens.' },
        y: { kind: 'treasure', text: "A shield made from one of the Grinder's spare gears.", item: 'cogwheelshield' },
      },
    }),
    level('The Clock Face', clockFace, {
      encounterRate: 0.085,
      encounters: [
        { monster: 'tinknight', min: 1, max: 3, weight: 3 },
        { monster: 'golem', min: 1, max: 2, weight: 2 },
        { monster: 'brassowl', min: 2, max: 3, weight: 2 },
        { monster: 'cuckoo', min: 3, max: 5, weight: 2 },
        { monster: 'apprentice', min: 2, max: 3, weight: 2 },
      ],
      theme: { wall: '#c8b070', floor: '#3e3a44', ceiling: '#2a2630', door: '#6a4a2a', style: 'clockwork' },
      specials: {
        L: {
          kind: 'teleport',
          text: 'You step into the brass cage and pull the lever. The lift drops through the tower to the Workshop.',
          to: 'L',
          level: 0,
          flag: LIFT,
          off: 'A brass lift cage, dark and silent. A big lever on the wall nearby is marked POWER.',
        },
        P: {
          kind: 'message',
          text: 'You throw the big lever marked POWER. Somewhere far below, the Professor\'s lift hums into life. Now you can ride it between the Workshop and the top.',
          after: 'The lift lever is on. The lift hums quietly.',
          flag: LIFT,
        },
        a: { kind: 'message', text: 'Through the back of the great clock face you can see the whole city, the numbers painted backwards on the glass.' },
        n: {
          kind: 'talk',
          name: 'Penny the apprentice',
          text: "I'm the youngest apprentice, and I want to go home. But the Professor took my notebook... I mean, I copied it into HIS notebook, and he hid it in his secret study in the Workshop. Bring it to me and I'll give you my spare goggles?",
          after: 'The notebook is in the Professor\'s secret study, down in the Workshop. Behind the bookcase, I think. It always squeaks.',
          quest: 'sq-penny',
          look: apprentice,
        },
        b: { kind: 'treasure', text: 'A chest of brass coins stamped with the Professor\'s face.', gold: 320 },
        w: {
          kind: 'message',
          text: 'A brake lever marked PENDULUM - DO NOT TOUCH. You touch it. With a shriek of metal, the great pendulum grinds to a halt.',
          after: 'The pendulum brake is on. The great pendulum hangs still.',
          flag: 'pendulum-stopped',
        },
        c: { kind: 'trap', text: 'The floor tilts like a see-saw and drops you onto a bed of springs, then into the wall!', dice: [3, 8] },
        d: { kind: 'fountain', text: 'A drinking fountain shaped like a little brass eagle. The water tastes of sunshine.' },
        e: { kind: 'treasure', text: 'In a glass case marked DO NOT OPEN: a staff with a clock in its crystal.', item: 'chronostaff' },
        f: {
          kind: 'fight',
          text: 'Owls drop from the rafters while Brass Guards march in step.',
          groups: [{ monster: 'tinknight', count: 2 }, { monster: 'brassowl', count: 3 }],
          reward: { gold: 180 },
          hidden: true,
        },
        M: {
          kind: 'lock',
          text: 'Behind a grille, the great pendulum swings back and forth, fast enough to flatten anyone who steps in. Somewhere there must be a way to stop it.',
          opened: 'The pendulum hangs still. You slip through the grille.',
          flag: 'pendulum-stopped',
        },
        p: { kind: 'treasure', text: "Fixed to the great pendulum's bob, a golden feather: Aquila's Pendulum Feather!", feather: 'pendulum' },
        Q: {
          kind: 'fight',
          text: 'Brass Guards in gold livery block the doors of the eyrie. "The Professor is NOT receiving visitors!"',
          groups: [{ monster: 'tinknight', count: 3 }, { monster: 'brassowl', count: 2 }],
          reward: { gold: 250 },
        },
        E: {
          kind: 'fight',
          text: 'In the eyrie behind the clock face, Professor Pinion turns a huge key. His Mechanical Eagle unfolds tin wings, a golden feather glowing in its chest. "Isn\'t she BEAUTIFUL? She only needs a few more feathers... yours will do nicely!"',
          groups: [{ monster: 'mecheagle', count: 1 }, { monster: 'pinion', count: 1, distance: 1 }],
          reward: { gold: 1000, feather: 'tin' },
          flag: 'pinion-defeated',
        },
        t: { kind: 'treasure', text: "Feathers... no, just the Professor's spare brass ones. And a heap of coins.", gold: 200 },
      },
    }),
  ],
};
