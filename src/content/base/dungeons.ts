import type { DungeonDef, DungeonLevel } from '../../rules/types';
import { generateMaze } from '../maze';

const cellars = generateMaze({
  seed: 1985, w: 7, h: 7, loops: 6, doorChance: 0.18, downStairs: true,
  specials: ['a', 'b', 'c', 'd', 'e', 'f'],
});
const crypts = generateMaze({
  seed: 4096, w: 8, h: 8, loops: 8, doorChance: 0.15, downStairs: true,
  specials: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
});
const sanctum = generateMaze({
  seed: 7777, w: 9, h: 9, loops: 10, doorChance: 0.12, downStairs: false, endKey: 'Z',
  specials: ['a', 'b', 'c', 'd', 'e', 'f'],
});

const level = (
  name: string,
  maze: ReturnType<typeof generateMaze>,
  rest: Omit<DungeonLevel, 'name' | 'grid' | 'start'>,
): DungeonLevel => ({ name, grid: maze.grid, start: maze.start, ...rest });

export const dungeons: DungeonDef[] = [
  {
    id: 'roost',
    name: 'The Roost Below',
    levels: [
      level('The Cellars', cellars, {
        theme: { wall: '#6b5a48', floor: '#3a3028', ceiling: '#1e1a16', door: '#8a5a2a', style: 'brick' },
        encounterRate: 0.08,
        encounters: [
          { monster: 'rat', min: 2, max: 5, weight: 5 },
          { monster: 'bat', min: 1, max: 3, weight: 3 },
          { monster: 'kobold', min: 1, max: 3, weight: 4 },
          { monster: 'goblin', min: 1, max: 2, weight: 2 },
          { monster: 'blob', min: 1, max: 2, weight: 2 },
        ],
        specials: {
          a: { kind: 'message', text: 'Graffiti on the wall: "MALACHAR IS A BIG MEANIE." Beneath it, in different handwriting: "He is also right behind you." (He is not.)' },
          b: { kind: 'treasure', text: 'A dusty chest holds a few coins and a note: "Not a trap."', gold: 120 },
          c: { kind: 'fight', text: 'A kobold chieftain, wearing a colander as a crown, demands tribute.', groups: [{ monster: 'kobold', count: 4 }], reward: { gold: 150, item: 'greaterdraught' } },
          d: { kind: 'trap', text: 'CLICK. A pressure plate! A cloud of angry feathers... and a dart.', dice: [1, 6] },
          e: { kind: 'fountain', text: 'A fountain gurgles, spouting water that smells of warm bread. You feel refreshed.' },
          f: { kind: 'treasure', text: 'Behind a loose brick you find a forgotten satchel.', gold: 60, item: 'draught' },
        },
      }),
      level('The Mouldering Crypts', crypts, {
        theme: { wall: '#4a5a52', floor: '#26302c', ceiling: '#121816', door: '#6a6a50', style: 'stone' },
        encounterRate: 0.09,
        encounters: [
          { monster: 'skeleton', min: 1, max: 3, weight: 5 },
          { monster: 'spider', min: 1, max: 3, weight: 3 },
          { monster: 'ghost', min: 1, max: 2, weight: 2 },
          { monster: 'brigand', min: 1, max: 3, weight: 3 },
          { monster: 'cultist', min: 1, max: 3, weight: 3 },
        ],
        specials: {
          a: { kind: 'message', text: 'A plaque reads: "HERE LIES SIR WOBBLEBY, WHO WAS NOT HERE LONG." The skeleton in the corner looks embarrassed.' },
          b: { kind: 'treasure', text: 'A sarcophagus creaks open: gold, and a very rude mummy-shaped dust cloud.', gold: 250 },
          c: { kind: 'fight', text: 'A cult prayer circle! The cultists are mid-chant and furious about the interruption.', groups: [{ monster: 'cultist', count: 4 }, { monster: 'cultmage', count: 1 }], reward: { gold: 300 } },
          d: { kind: 'trap', text: 'The floor tilts and drops you onto spikes. Small spikes, but spikes.', dice: [2, 6] },
          e: { kind: 'fountain', text: 'A bubbling spring glows softly. Your aches vanish.' },
          f: { kind: 'fight', text: 'Two ghosts argue over who died first. They agree on one thing: you are intruding.', groups: [{ monster: 'ghost', count: 3 }], reward: { gold: 200, item: 'sparkstaff' } },
          g: { kind: 'treasure', text: 'An old knight clutches a sword in his bony hands. He no longer needs it.', gold: 100, item: 'peckingblade' },
        },
      }),
      level('The Roost Sanctum', sanctum, {
        theme: { wall: '#5a4a6a', floor: '#2a2236', ceiling: '#14101c', door: '#7a4a6a', style: 'rune' },
        encounterRate: 0.1,
        encounters: [
          { monster: 'boneknight', min: 1, max: 2, weight: 4 },
          { monster: 'giantspider', min: 1, max: 2, weight: 3 },
          { monster: 'harpy', min: 1, max: 3, weight: 4 },
          { monster: 'cultmage', min: 1, max: 3, weight: 3 },
          { monster: 'cultist', min: 2, max: 4, weight: 2 },
        ],
        specials: {
          a: { kind: 'message', text: 'A feather-strewn mural shows Malachar being pecked by a goose. Someone has scratched out the goose\'s face.' },
          b: { kind: 'treasure', text: 'A hoard of coins glints. The chest is labelled "FOR A RAINY DAY". It has been raining for three weeks.', gold: 500 },
          c: { kind: 'fight', text: 'The Cult\'s elite guard blocks the corridor, polishing their armour menacingly.', groups: [{ monster: 'boneknight', count: 3 }], reward: { gold: 400, item: 'downymail' } },
          d: { kind: 'trap', text: 'A hex-rune flares and singes your eyebrows off.', dice: [3, 6] },
          e: { kind: 'fountain', text: 'A golden fountain pours water that tastes faintly of sunrise. You feel restored.' },
          f: { kind: 'treasure', text: 'A rack of potions, neatly labelled in Malachar\'s tiny handwriting.', item: 'greaterdraught', gold: 150 },
          Z: {
            kind: 'fight',
            text: 'Malachar the Plucker turns from a cage of stolen feathers. "Oh. Visitors. How... moulting-ly inconvenient."',
            groups: [{ monster: 'malachar', count: 1 }, { monster: 'cultmage', count: 2 }],
            reward: { gold: 1000 },
            finale: true,
          },
        },
      }),
    ],
  },
];
