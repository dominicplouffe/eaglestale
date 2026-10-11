import type { DungeonDef, DungeonLevel, Look, Special } from '../../rules/types';
import { generateLevel, type Vault } from '../levelgen';

/**
 * The Gurgle: the sewers under Talonreach, where the Rat King keeps two of Aquila's feathers.
 * The way in is the grate on Drain Street (Grackle's Sewer Grate Key opens it).
 */

const SIZE = 41;
const worker: Look = { art: 'townsfolk', palette: { cloth: '#c88a3a', hair: '#4a3020' } };

const level = (
  name: string,
  maze: ReturnType<typeof generateLevel>,
  rest: Omit<DungeonLevel, 'name' | 'grid' | 'start'>,
): DungeonLevel => ({ name, grid: maze.grid, start: maze.start, ...rest });

// ---- The Overflow ---------------------------------------------------------------------

/** Every sluice gate on the Overflow answers to one great wheel. */
const WHEEL = 'overflow-wheel';

const snapjawLair: Vault = {
  place: 'far',
  entrance: 'L',
  rows: [
    '#####*#####',
    '#.........#',
    '#.o.....o.#',
    '#....J....#',
    '#.........#',
    '#....h....#',
    '###########',
  ],
};

/** A sewerman shut in behind a sluice gate. */
const cell = (who: string): Vault => ({ place: 'any', entrance: 'M', rows: ['##*##', '#...#', `#.${who}.#`, '#####'] });

const sewerman = (name: string, n: number, text: string): Special => ({
  kind: 'talk',
  name,
  text,
  after: 'Go on, I\'ll find my own way out now the gate\'s up. Mind the gator!',
  flag: `sewerman-${n}`,
  look: worker,
});

const overflow = generateLevel({
  seed: 2112, width: SIZE, height: SIZE, rooms: 16, roomSize: [3, 7], loops: 9, doorChance: 0.25, downStairs: true,
  vaults: [snapjawLair, cell('x'), cell('y'), cell('z')],
  specials: ['a', 'b', 'c', 'm', 'w', 'd', 'e', 'f', 'g', 'i'],
});

// ---- The Rat King's Court -------------------------------------------------------------

const throneRoom: Vault = {
  place: 'far',
  // The Royal Guard stands in the doorway: no one sees the King without going through them.
  entrance: 'Q',
  rows: [
    '######*######',
    '#...........#',
    '#.t.......t.#',
    '#.....K.....#',
    '#...........#',
    '#.r.......t.#',
    '#############',
  ],
};

const organLoft: Vault = { place: 'any', rows: ['###*###', '#.....#', '#..o..#', '#.....#', '#######'] };
const catLedge: Vault = { place: 'any', entrance: 'S', rows: ['##*##', '#.p.#', '#...#', '#####'] };

const court = generateLevel({
  seed: 6502, width: SIZE, height: SIZE, rooms: 16, roomSize: [3, 7], loops: 9, doorChance: 0.3, downStairs: false,
  vaults: [throneRoom, organLoft, catLedge],
  specials: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
});

export const gurgle: DungeonDef = {
  id: 'gurgle',
  name: 'The Gurgle',
  levels: [
    level('The Overflow', overflow, {
      encounterRate: 0.08,
      encounters: [
        { monster: 'plaguerat', min: 2, max: 5, weight: 4 },
        { monster: 'sludge', min: 1, max: 3, weight: 3 },
        { monster: 'drainbat', min: 2, max: 4, weight: 3 },
        { monster: 'ratfolk', min: 1, max: 4, weight: 4 },
      ],
      theme: { wall: '#6a6450', floor: '#4e5048', ceiling: '#3a3a34', door: '#5a4a3a', style: 'sewer' },
      specials: {
        a: { kind: 'message', text: 'A chalk arrow on the wall, and wobbly letters: TRAPT BEHIND THE GATES. SEND HELP. - DOB' },
        b: { kind: 'treasure', text: 'A lost purse, wrapped in a sock. You choose not to think about the sock.', gold: 90 },
        c: { kind: 'trap', text: 'A rotten plank gives way, and you splash into something warm and lumpy!', dice: [2, 6] },
        m: {
          kind: 'treasure',
          text: "Pinned to a pipe, just above the muck: sheet music! 'Toccata for Drainpipes in G Minor.'",
          item: 'sheetmusic',
        },
        w: {
          kind: 'message',
          text: 'A great iron wheel, rusted stiff. Your strongest hero heaves... and with a long groan it turns. All over the Overflow, sluice gates grind open.',
          after: 'The great wheel has been turned. The sluice gates stand open.',
          flag: WHEEL,
        },
        d: { kind: 'message', text: 'Huge claw marks score the brickwork. Someone has painted: OLD SNAPJAW LIVES DOWN HERE. PLEES DO NOT FEED.' },
        e: {
          kind: 'treasure',
          text: 'Wedged in a drain and glowing faintly: a plunger of unusual quality. A little brass plaque reads THE PLUNGER OF DESTINY.',
          item: 'plunger',
        },
        f: {
          kind: 'fight',
          text: 'Ratfolk drop from the pipes overhead, squeaking a battle cry!',
          groups: [{ monster: 'ratfolk', count: 4 }, { monster: 'plaguerat', count: 3 }],
          reward: { gold: 60 },
          hidden: true,
        },
        g: { kind: 'fountain', text: "A clean-water cistern, fed by the rain. You drink and wash; it's the best you've felt in hours." },
        i: { kind: 'message', text: 'A shrine of rat skulls and bottle caps. Scratched above it: ALL HAIL THE KING UNDER THE CITY.' },
        L: {
          kind: 'lock',
          text: 'A huge sluice gate, scored with claw marks. It is shut fast; somewhere there must be a wheel that lifts it.',
          opened: 'The great wheel has raised the sluice gate. You duck underneath, into the deepest drain.',
          flag: WHEEL,
        },
        M: {
          kind: 'lock',
          text: 'A rusted sluice gate. Behind it, someone bangs on the bars and shouts for help. It won\'t lift from this side.',
          opened: 'The sluice gate has been raised by the great wheel.',
          flag: WHEEL,
        },
        x: sewerman('Dob the sewerman', 1, 'You turned the wheel! I\'ve been in here for days. I wrote a sign. Did you see my sign? I spelt "trapped" wrong.'),
        y: sewerman('Nettle the sewerwoman', 2, 'Took you long enough! The rats locked us in, the cheeky things. Tell Grubb I want a raise.'),
        z: sewerman('Big Alf', 3, 'Oh, thank goodness. I was just about to start eating my boots, and they were my good boots.'),
        J: {
          kind: 'fight',
          text: 'Something enormous stirs in the deepest drain. Old Snapjaw rises from the muck, a golden feather stuck between two of his teeth.',
          groups: [{ monster: 'snapjaw', count: 1 }, { monster: 'sludge', count: 2 }],
          reward: { gold: 250, feather: 'drain' },
          flag: 'snapjaw-defeated',
        },
        o: { kind: 'treasure', text: 'Among the bones: purses, rings and a single shiny shoe buckle.', gold: 80 },
        h: {
          kind: 'treasure',
          text: "Old Snapjaw's moulted hide lies in a great scaly heap. Tanner Hodge would know what to do with this.",
          item: 'gatorhide',
        },
      },
    }),
    level("The Rat King's Court", court, {
      encounterRate: 0.085,
      encounters: [
        { monster: 'ratfolk', min: 2, max: 4, weight: 3 },
        { monster: 'ratshaman', min: 1, max: 2, weight: 2 },
        { monster: 'ratknight', min: 1, max: 2, weight: 2 },
        { monster: 'plaguerat', min: 3, max: 6, weight: 2 },
        { monster: 'sludge', min: 2, max: 3, weight: 1 },
      ],
      theme: { wall: '#5e4a44', floor: '#4a3e3a', ceiling: '#302624', door: '#6a3a2a', style: 'sewer' },
      specials: {
        a: { kind: 'message', text: 'Tattered banners hang from the pipes, each showing a rat in a crown. Someone has drawn a moustache on one. It was probably the King.' },
        b: { kind: 'treasure', text: 'A tax chest: the Rat King charges the other rats one crumb a day. Some paid in coins.', gold: 140 },
        c: { kind: 'trap', text: 'A rat-sized tripwire (a very small one) sets off a very large rockfall!', dice: [2, 8] },
        d: { kind: 'fountain', text: 'A spring of clean water bubbles up through the floor. You drink deep and feel restored.' },
        e: {
          kind: 'treasure',
          text: 'On a rack of rat-sized weapons hangs one full-sized bow, notched a hundred times: a ratcatcher\'s bow, taken as a trophy.',
          item: 'ratcatcher',
        },
        f: {
          kind: 'fight',
          text: 'An ambush! Shamans squeak hexes from the dark while scrappers charge.',
          groups: [{ monster: 'ratfolk', count: 3 }, { monster: 'ratshaman', count: 2 }],
          reward: { gold: 90 },
          hidden: true,
        },
        g: { kind: 'message', text: 'A notice in squeaky handwriting: COURT IS IN SESSION. ALL INTRUDERS WILL BE NIBBLED.' },
        h: { kind: 'treasure', text: 'A royal larder: cheese rinds, stolen buns, and a golden flask someone forgot.', item: 'elixir' },
        o: {
          kind: 'talk',
          name: 'The Pipe Organist',
          text: 'A wild-haired man sits at an organ made of drainpipes. "The rats stole my music! I\'ve played from memory for a year and my memory is TERRIBLE. Find my Toccata, would you?"',
          after: 'Any luck finding my music? It\'s called "Toccata for Drainpipes". You\'d know it if you heard it. Everyone does, eventually.',
          quest: 'sq-organist',
          look: { art: 'townsfolk', palette: { cloth: '#3a3a5a', hair: '#e8e8e8' } },
        },
        S: { kind: 'secret', text: 'The bricks here are loose. Behind them is a dry ledge, and something is purring.' },
        p: {
          kind: 'talk',
          name: 'Sir Pounce',
          text: '"Mrrrow." A large ginger cat sits on a dry ledge beside an impressive pile of rat tails. He looks at you as if YOU are the ones who got lost.',
          after: 'Sir Pounce is washing a paw. He will go home when he is good and ready.',
          flag: 'pounce-found',
          look: { art: 'cat' },
        },
        Q: {
          kind: 'fight',
          text: 'Rat Knights in bottle-cap armour cross their spears. "None shall pass!" one squeaks. "Except the King. And his mum."',
          groups: [{ monster: 'ratknight', count: 3 }, { monster: 'ratshaman', count: 1 }],
          reward: { gold: 200 },
        },
        K: {
          kind: 'fight',
          text: 'On a throne of broken barrels sits the Rat King, sceptre in paw, a golden feather bobbing at its tip. "Intruders!" he squeaks. "Seize them! And somebody fetch my good cape!"',
          groups: [{ monster: 'ratking', count: 1 }, { monster: 'ratknight', count: 2 }, { monster: 'ratshaman', count: 2 }],
          reward: { gold: 600, feather: 'sceptre', item: 'ratcrown' },
          flag: 'ratking-defeated',
        },
        t: { kind: 'treasure', text: "The Rat King's hoard: buttons, bottle caps, and some real gold.", gold: 150 },
        r: {
          kind: 'treasure',
          text: 'Under the throne, a bundle of letters on clockwork-stamped paper. The newest reads: "Will buy feathers by the pound. No questions asked. - Prof. P., The Clocktower."',
          item: 'pinionletter',
          flag: 'pinion-letter',
        },
      },
    }),
  ],
};
