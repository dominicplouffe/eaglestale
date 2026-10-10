import type { DungeonDef, DungeonLevel } from '../../rules/types';
import { generateLevel, type Vault } from '../levelgen';

/**
 * The Roost Below: the cult's first hideout and the first chapter of the feather quest.
 * Each level is generated from a fixed seed (so it never changes) around hand-drawn set pieces.
 */

const SIZE = 41;

// ---- The Cellars ------------------------------------------------------------------------

const throneRoom: Vault = {
  place: 'far',
  rows: [
    '####*####',
    '#.......#',
    '#.t...t.#',
    '#...K...#',
    '#.......#',
    '#########',
  ],
};

const wineCellar: Vault = {
  place: 'any',
  entrance: 'S',
  rows: [
    '###*###',
    '#.....#',
    '#.w.w.#',
    '#.....#',
    '#######',
  ],
};

const cellars = generateLevel({
  seed: 1985, width: SIZE, height: SIZE, rooms: 17, roomSize: [3, 7], loops: 8, doorChance: 0.35, downStairs: true,
  vaults: [throneRoom, wineCellar],
  specials: ['a', 'n', 'b', 'd', 'h', 'e', 'f', 'g'],
});

// ---- The Mouldering Crypts --------------------------------------------------------------

const ossuary: Vault = {
  place: 'far',
  entrance: 'L',
  rows: [
    '#####*#####',
    '#.........#',
    '#.o.....o.#',
    '#....B....#',
    '#.........#',
    '###########',
  ],
};

const chapel: Vault = {
  place: 'near',
  rows: [
    '###*###',
    '#.....#',
    '#.x.u.#',
    '#.....#',
    '#######',
  ],
};

const tomb: Vault = {
  place: 'any',
  entrance: 'S',
  rows: [
    '##*##',
    '#.y.#',
    '#####',
  ],
};

/** The stairs down to the Sanctum, behind a door that only opens for Aquila's feathers. */
const sanctumSeal: Vault = {
  place: 'far',
  entrance: 'F',
  rows: [
    '###*###',
    '#.....#',
    '#..>..#',
    '#.....#',
    '#######',
  ],
};

const crypts = generateLevel({
  seed: 4096, width: SIZE, height: SIZE, rooms: 16, roomSize: [3, 7], loops: 9, doorChance: 0.3, downStairs: false,
  endKey: 'z',
  vaults: [ossuary, chapel, tomb, sanctumSeal],
  specials: ['a', 'b', 'h', 'c', 'd', 'e', 'g', 'i'],
});

// ---- The Roost Sanctum ------------------------------------------------------------------

const altarHall: Vault = {
  place: 'far',
  rows: [
    '#####*#####',
    '#.........#',
    '#....G....#',
    '#.........#',
    '#..t...t..#',
    '###########',
  ],
};

const library: Vault = {
  place: 'any',
  entrance: 'S',
  rows: [
    '##*##',
    '#.l.#',
    '#...#',
    '#####',
  ],
};

const sanctum = generateLevel({
  seed: 7777, width: SIZE, height: SIZE, rooms: 17, roomSize: [3, 7], loops: 10, doorChance: 0.25, downStairs: false,
  vaults: [altarHall, library],
  specials: ['f', 'a', '1', 'd', 'b', '2', 'e', 'c', 'p', '3'],
});

const level = (
  name: string,
  maze: ReturnType<typeof generateLevel>,
  rest: Omit<DungeonLevel, 'name' | 'grid' | 'start'>,
): DungeonLevel => ({ name, grid: maze.grid, start: maze.start, ...rest });

const cage = (n: number) => ({
  kind: 'talk' as const,
  name: 'A caged songbird',
  text: 'You spring the lock. The songbird bursts out, sings three triumphant notes, and poops on a cult banner on its way out.',
  after: 'An empty cage. A single feather drifts down.',
  flag: `cage-${n}`,
});

export const dungeons: DungeonDef[] = [
  {
    id: 'roost',
    name: 'The Roost Below',
    levels: [
      level('The Cellars', cellars, {
        theme: { wall: '#6b5a48', floor: '#3a3028', ceiling: '#1e1a16', door: '#8a5a2a', style: 'brick' },
        encounterRate: 0.07,
        encounters: [
          { monster: 'rat', min: 2, max: 5, weight: 5 },
          { monster: 'bat', min: 1, max: 3, weight: 3 },
          { monster: 'kobold', min: 1, max: 3, weight: 4 },
          { monster: 'goblin', min: 1, max: 2, weight: 2 },
          { monster: 'blob', min: 1, max: 2, weight: 2 },
        ],
        specials: {
          a: { kind: 'message', text: 'Graffiti on the wall: "MALACHAR IS A BIG MEANIE." Beneath it, in different handwriting: "He is also right behind you." (He is not.)' },
          n: {
            kind: 'talk',
            name: 'Wobbleby the Younger',
            text: "Oh! Adventurers! My great-grandfather, Sir Wobbleby, is buried in the Crypts below. Family legend says his helmet was the finest in Talonreach. Family legend also says he tripped over a rat. If you find his helmet, it's yours.",
            after: "Any luck with great-grandpa's helmet? His tomb is hidden somewhere in the Crypts. Mind the rats.",
            quest: 'sq-wobbleby',
          },
          b: { kind: 'treasure', text: 'A dusty chest holds a few coins and a note: "Not a trap."', gold: 120 },
          d: { kind: 'trap', text: 'CLICK. A pressure plate! A cloud of angry feathers... and a dart.', dice: [1, 6] },
          h: { kind: 'message', text: "A crude kobold drawing shows a kobold in a colander crown, holding a golden feather, above the word BOSS. An arrow points deeper into the Cellars." },
          e: { kind: 'fountain', text: 'A fountain gurgles, spouting water that smells of warm bread. You feel refreshed.' },
          f: { kind: 'treasure', text: 'Behind a loose brick you find a forgotten satchel.', gold: 60, item: 'draught' },
          g: { kind: 'trap', text: 'A loose flagstone tips you into a puddle of something that used to be soup.', dice: [1, 4] },
          K: {
            kind: 'fight',
            text: 'The Kobold Chieftain rises from a throne of crates, a colander on his head and a golden feather tucked in it. "TRIBUTE!" he yaps.',
            groups: [{ monster: 'koboldchief', count: 1 }, { monster: 'kobold', count: 5 }, { monster: 'goblin', count: 2 }],
            reward: { gold: 150, feather: 'crown' },
            flag: 'chief-defeated',
          },
          t: { kind: 'treasure', text: "Part of the kobold hoard: shiny buttons, spoons, and actual coins.", gold: 45 },
          S: { kind: 'secret', text: 'The wall swings inward on a creaky hinge: a forgotten wine cellar!' },
          w: { kind: 'treasure', text: 'A rack of very old bottles. Most are vinegar. One is a Spirit Tonic.', item: 'tonic', gold: 20 },
        },
      }),
      level('The Mouldering Crypts', crypts, {
        theme: { wall: '#4a5a52', floor: '#26302c', ceiling: '#121816', door: '#6a6a50', style: 'stone' },
        encounterRate: 0.08,
        encounters: [
          { monster: 'skeleton', min: 1, max: 3, weight: 5 },
          { monster: 'spider', min: 1, max: 3, weight: 3 },
          { monster: 'ghost', min: 1, max: 2, weight: 2 },
          { monster: 'brigand', min: 1, max: 3, weight: 3 },
          { monster: 'cultist', min: 1, max: 3, weight: 3 },
        ],
        specials: {
          a: { kind: 'message', text: 'A plaque reads: "HERE LIES SIR WOBBLEBY, WHO WAS NOT HERE LONG." The plaque has been moved. His real tomb must be hidden.' },
          b: { kind: 'treasure', text: 'A sarcophagus creaks open: gold, and a very rude mummy-shaped dust cloud.', gold: 250 },
          h: { kind: 'message', text: 'A rusted sign: "OSSUARY. KEY HELD BY THE CHANT-LEADER. NO EXCEPTIONS. NO, NOT EVEN YOU, GERALD."' },
          c: {
            kind: 'fight',
            text: 'A cult prayer circle! The chant-leader wears a bone-handled key around his neck and is furious about the interruption.',
            groups: [{ monster: 'cultist', count: 4 }, { monster: 'cultmage', count: 1 }],
            reward: { gold: 200, item: 'cryptkey' },
          },
          d: { kind: 'trap', text: 'The floor tilts and drops you onto spikes. Small spikes, but spikes.', dice: [2, 6] },
          e: {
            kind: 'fight',
            text: 'Two ghosts argue over who died first. They agree on one thing: you are intruding.',
            groups: [{ monster: 'ghost', count: 3 }],
            reward: { gold: 200, item: 'sparkstaff' },
          },
          g: { kind: 'treasure', text: 'An old knight clutches a sword in his bony hands. He no longer needs it.', gold: 100, item: 'peckingblade' },
          i: { kind: 'treasure', text: 'A collapsed alcove hides a purse of grave-goods.', gold: 140 },
          z: { kind: 'message', text: 'Carved above a great sealed doorway nearby: "ONLY THE EAGLE\'S OWN MAY PASS." The Sanctum lies beyond.' },
          L: { kind: 'lock', text: 'A heavy door carved with skulls. It has a bone-shaped keyhole.', opened: 'The Ossuary Key turns with a dry click. The door groans open.', key: 'cryptkey' },
          o: { kind: 'treasure', text: 'An offering bowl full of tarnished coins.', gold: 60 },
          B: {
            kind: 'fight',
            text: 'Among the stacked bones stands the Bone Warden, ringing a grave-bell. A golden feather is pinned to its breastplate.',
            groups: [{ monster: 'bonewarden', count: 1 }, { monster: 'skeleton', count: 2 }],
            reward: { gold: 300, feather: 'grave' },
            flag: 'warden-defeated',
          },
          x: {
            kind: 'talk',
            name: 'The Weeping Sexton',
            text: 'Five of my charges won\'t stay in their graves. They wander about, rattling, being rude. Put them back to rest? I can pay in gold I found in their pockets.',
            after: 'Bless you for helping. Sit by the fountain a while, it does wonders.',
            quest: 'sq-sexton',
          },
          u: { kind: 'fountain', text: 'A bubbling spring glows softly. Your aches vanish.' },
          S: { kind: 'secret', text: 'A cracked stone slides away: a hidden tomb!' },
          y: { kind: 'treasure', text: 'The real tomb of Sir Wobbleby. On his skull sits a fine, slightly dented helmet.', item: 'wobblebyhelm', gold: 50 },
          F: {
            kind: 'lock',
            text: 'The great sealed door. An eagle is carved on it, with two empty feather-shaped hollows.',
            opened: "You hold up Aquila's feathers. They flare gold and the eagle carving opens its wings: the door swings wide.",
            feathers: 2,
          },
        },
      }),
      level('The Roost Sanctum', sanctum, {
        theme: { wall: '#5a4a6a', floor: '#2a2236', ceiling: '#14101c', door: '#7a4a6a', style: 'rune' },
        encounterRate: 0.08,
        encounters: [
          { monster: 'boneknight', min: 1, max: 2, weight: 4 },
          { monster: 'giantspider', min: 1, max: 2, weight: 3 },
          { monster: 'harpy', min: 1, max: 3, weight: 4 },
          { monster: 'cultmage', min: 1, max: 3, weight: 3 },
          { monster: 'cultist', min: 2, max: 4, weight: 2 },
        ],
        specials: {
          f: {
            kind: 'talk',
            name: 'Finch',
            text: "Psst! Up here! I'm Finch, the Guild's bird-keeper. Malachar's lot caged my songbirds all over this place. Open the cages? They'll sing your praises. Literally.",
            after: 'Three cages, three songbirds. Then they can fly home.',
            quest: 'sq-songbirds',
          },
          a: { kind: 'message', text: "A feather-strewn mural shows Malachar being pecked by a goose. Someone has scratched out the goose's face." },
          '1': cage(1),
          '2': cage(2),
          '3': cage(3),
          d: { kind: 'trap', text: 'A hex-rune flares and singes your eyebrows off.', dice: [3, 6] },
          b: { kind: 'treasure', text: 'A hoard of coins glints. The chest is labelled "FOR A RAINY DAY". It has been raining for three weeks.', gold: 500 },
          e: { kind: 'fountain', text: 'A golden fountain pours water that tastes faintly of sunrise. You feel restored.' },
          c: {
            kind: 'fight',
            text: "The cult's elite guard blocks the corridor, polishing their armour menacingly.",
            groups: [{ monster: 'boneknight', count: 3 }],
            reward: { gold: 400, item: 'tonic' },
          },
          p: { kind: 'treasure', text: "A rack of potions, neatly labelled in Malachar's tiny handwriting.", item: 'greaterdraught', gold: 150 },
          G: {
            kind: 'fight',
            text: 'High Priest Grackle turns from an altar heaped with stolen feathers. "Oh. Visitors. The Plucker will be so disappointed in you."',
            groups: [{ monster: 'grackle', count: 1 }, { monster: 'cultmage', count: 2 }, { monster: 'boneknight', count: 1 }],
            reward: { gold: 600, feather: 'altar', item: 'sewerkey' },
            flag: 'grackle-defeated',
          },
          t: { kind: 'treasure', text: 'Offerings left at the altar: rings, coins and a very nice spoon.', gold: 120 },
          S: { kind: 'secret', text: 'A bookcase swings aside with a theatrical creak: a secret library!' },
          l: {
            kind: 'treasure',
            text: 'Malachar\'s secret library. A diary lies open: "Day 40. The eagle refuses to moult on schedule. Must find a bigger pair of tweezers." Beside it hangs a fine mail coat.',
            item: 'downymail',
          },
        },
      }),
    ],
  },
];
