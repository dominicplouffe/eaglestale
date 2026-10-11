import type { DungeonDef, Look } from '../../rules/types';

/**
 * Talonreach, the city above the dungeons, walked like one. Front doors are letters set in the walls
 * (`building` specials): the Guild, Emporium, Temple, Inn and Eagle Tower open into their screens;
 * other doors just answer back. `portal` squares lead down into the dungeons.
 */

const townsfolk = (palette: Record<string, string>): Look => ({ art: 'townsfolk', palette });

export const talonreach: DungeonDef = {
  id: 'talonreach',
  name: 'Talonreach',
  city: true,
  levels: [
    {
      name: 'Talonreach',
      grid: [
        '###################################',
        '#.............................m...#',
        '#.#########.#n#########.####.####.#',
        '#.#########.###########.####.C###.#',
        '#.########E.###########.l###.####.#',
        '#.#########.###########.#########.#',
        '#.###q#####.#####H#####.#########.#',
        '#.................................#',
        '#.#########...f.........#########.#',
        '#.#########.....###.....#########.#',
        '#.########G.....W##.R...T########.X',
        '#.#########.....###.....#########.#',
        '#.b########.............#########.#',
        '#...p..............c..............#',
        '#.#########.#####I###d#.#########.#',
        '#.#########.###########.....e####.#',
        '#.......a##.###########...k.#####.#',
        '#.#########.###########.....#####.#',
        '#.#########.##h########.#########.#',
        '#.....U.g.........................#',
        '#.#########.#####.#####.#########.#',
        '#.##....x##.#####.#####.#########.#',
        '#.##..z..##.#####.#####.#########.#',
        '#.##.....##.#####.#####.#########.#',
        '#.####S####.#####.#####.######j##.#',
        '#.................................#',
        '###################################',
      ],
      // In Feather Square, facing the Guild across Market Street.
      start: { x: 12, y: 10, dir: 3 },
      encounters: [],
      encounterRate: 0,
      theme: { wall: '#d6c8a2', floor: '#8c867c', ceiling: '#000000', door: '#4e7088', style: 'city', sky: '#8e8c98' },
      landmarks: [
        { x: 16, y: 9, w: 3, h: 3, look: 'tower' },
        { x: 29, y: 2, w: 4, h: 5, look: 'clock' },
        { x: 24, y: 8, w: 9, h: 5, look: 'temple' },
      ],
      areas: [
        { name: 'Feather Square', x: 12, y: 7, w: 11, h: 7 },
        { name: "Aquila's Forgotten Shrine", x: 4, y: 21, w: 5, h: 3 },
        { name: 'Pigeon Yard', x: 24, y: 15, w: 4, h: 3 },
        { name: 'Gizzard Alley', x: 2, y: 16, w: 6, h: 1 },
        { name: 'Sluice Passage', x: 17, y: 20, w: 1, h: 5 },
        { name: 'Clock Lane', x: 28, y: 2, w: 1, h: 3 },
        { name: 'Clock Lane', x: 1, y: 1, w: 33, h: 1 },
        { name: 'Quill Street', x: 1, y: 7, w: 33, h: 1 },
        { name: 'Crumb Lane', x: 1, y: 13, w: 33, h: 1 },
        { name: 'Drain Street', x: 1, y: 19, w: 33, h: 1 },
        { name: "Tanner's Row", x: 1, y: 25, w: 33, h: 1 },
        { name: 'West Wall Walk', x: 1, y: 1, w: 1, h: 25 },
        { name: 'Market Street', x: 11, y: 1, w: 1, h: 25 },
        { name: 'Temple Row', x: 23, y: 1, w: 1, h: 25 },
        { name: 'East Gate Road', x: 33, y: 1, w: 1, h: 25 },
      ],
      specials: {
        // ---- The places everybody knows ----
        G: { kind: 'building', name: 'Guild of Questionable Heroes', place: 'guild', known: true, hotkey: 'g' },
        W: { kind: 'building', name: 'Eagle Tower', place: 'tower', known: true, hotkey: 'w' },
        E: { kind: 'building', name: "Dusty Gizzard's Emporium", place: 'shop', known: true, hotkey: 'e' },
        T: { kind: 'building', name: 'Temple of the Gentle Peck', place: 'temple', known: true, hotkey: 't' },
        I: { kind: 'building', name: 'The Drowsy Hen Inn', place: 'inn', known: true, hotkey: 'i' },
        R: {
          kind: 'portal',
          dungeon: 'roost',
          name: 'Steps down to the Roost',
          text: 'Worn steps beside the Eagle Tower lead down into the Roost Below, where the cult has dug in.',
          known: true,
          hotkey: 'r',
        },
        U: {
          kind: 'portal',
          dungeon: 'gurgle',
          name: 'The sewer grate',
          text: 'A heavy iron grate in Drain Street, locked with a great padlock. Below it, something gurgles.',
          key: 'sewerkey',
          flag: 'gurgle-entered',
          hotkey: 'u',
        },

        // ---- Doors that only answer back ----
        H: {
          kind: 'building',
          name: 'the Town Hall',
          text: '"The Mayor is in a very important meeting," says his secretary. From his office comes a long, peaceful snore.',
        },
        C: {
          kind: 'building',
          name: "Professor Pinion's Clocktower",
          text: "Professor Pinion's Clocktower. A sign on the door says BACK IN FIVE MINUTES. It is dated last spring, and something inside is ticking far too loudly.",
        },
        X: {
          kind: 'building',
          name: 'the East Gate',
          text: 'The East Gate is barred. A notice says: ROAD TO THE MOULTED WOOD CLOSED BY ORDER OF THE MAYOR. TOO MANY TREES.',
        },
        q: {
          kind: 'building',
          name: "Thimblewick's tailoring",
          text: 'Thimblewick the tailor shouts through the letterbox: "Unless that\'s spider silk, go away! The Guild knows what I need!"',
        },
        a: { kind: 'building', name: 'a house', text: 'A cross voice from inside: "If you\'re selling feathers, we\'ve got none. Nobody has. That\'s rather the point."' },
        b: { kind: 'building', name: 'a house', text: 'A small child opens the door, looks at your party, says "Mum, it\'s adventurers," and shuts it again.' },
        d: { kind: 'building', name: 'a house', text: 'Through the window you see a family eating stale bread in dignified silence.' },
        e: { kind: 'building', name: 'the pigeon loft', text: 'The pigeon loft is empty. A single grey feather sits on the step, looking sorry for itself.' },
        h: {
          kind: 'building',
          name: 'a house',
          text: 'The owner says the house has always smelt of drains. "But lately," she whispers, "the drains have started squeaking."',
        },
        j: { kind: 'building', name: "Tanner Hodge's yard", text: 'Tanner Hodge says he\'d pay good money for a gator hide, if anyone were mad enough to get one.' },
        l: { kind: 'building', name: 'a house', text: 'Nobody is home. A note on the door says: GONE TO LOOK FOR THE EAGLE. BACK SOON (PROBABLY).' },
        n: {
          kind: 'building',
          name: 'a house',
          text: 'A retired adventurer answers. "In my day we had to walk to the dungeon. Uphill. Both ways." He shuts the door.',
        },

        // ---- People in the streets ----
        c: {
          kind: 'talk',
          name: 'Bellows the town crier',
          text: 'Hear ye! The Eagle is gone, the bread is stale and the pillows are sulking! Whoever brings back a feather of Aquila wins the Mayor\'s eternal gratitude (worth nothing) and a reward from the Guild (worth slightly more)!',
          after: 'Hear ye! Feathers go to the Eagle Tower, in the middle of the square! Bounties at the Guild! Lost cats to Mother Plover on Crumb Lane!',
          look: townsfolk({ cloth: '#b03a3a', hair: '#e8e0d0' }),
        },
        p: {
          kind: 'talk',
          name: 'Mother Plover',
          text: 'Oh, heroes! My Sir Pounce chased a rat down the sewer grate on Drain Street and never came back. If you ever go down into the Gurgle, please look for him. He answers to "Sir Pounce" and to the sound of a tin being opened.',
          after: 'Any sign of Sir Pounce? He\'s ginger, round and very judgemental.',
          quest: 'sq-pounce',
          look: townsfolk({ cloth: '#6a5a9a', hair: '#cfcac0' }),
        },
        g: {
          kind: 'talk',
          name: 'Foreman Grubb',
          text: 'The Gurgle? Nobody\'s been down since the rats got organised. Three of my lads are still stuck down there behind the sluice gates. If you go down, find them, would you? Turn the wheels and the gates\'ll lift.',
          after: 'Find my lads. And mind the gator. We call him Old Snapjaw. He doesn\'t call us anything; he just eats.',
          quest: 'sq-sewermen',
          look: townsfolk({ cloth: '#c08a3a', hair: '#5a3a24' }),
        },
        k: {
          kind: 'talk',
          name: 'Old Coo the pigeon keeper',
          text: 'The pigeons left when the eagle did. Silly birds. Bring a few feathers home to the tower and I reckon they\'ll come back too.',
          after: 'Coo, coo. That\'s pigeon for "hurry up".',
          look: townsfolk({ cloth: '#5a7a4a', hair: '#9a9a9a' }),
        },
        m: {
          kind: 'message',
          text: 'Somewhere above Clock Lane, a great clock ticks. Every so often it says "cuckoo" in a voice that sounds suspiciously human.',
        },
        f: { kind: 'treasure', text: 'The fountain in Feather Square has run dry. Among the dead leaves at the bottom: a few coins. Finders keepers.', gold: 12 },

        // ---- A hidden corner ----
        S: { kind: 'secret', text: 'A loose plank in the fence swings aside: a hidden yard!' },
        z: {
          kind: 'fountain',
          text: "A forgotten shrine to Aquila. Clear water still trickles from a stone beak. You drink, and every ache washes away.",
        },
        x: { kind: 'treasure', text: 'Tucked behind the shrine, an old offering: a feather charm on a leather cord.', item: 'charm' },
      },
    },
  ],
};
