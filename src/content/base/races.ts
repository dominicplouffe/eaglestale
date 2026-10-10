import type { RaceDef } from '../../rules/types';

export const races: RaceDef[] = [
  {
    id: 'human',
    name: 'Human',
    desc: 'Adaptable, ambitious and chronically underfed.',
    stats: { str: 10, iq: 10, dex: 10, con: 10, lck: 10 },
    skin: '#e0ac86',
  },
  {
    id: 'elf',
    name: 'Elf',
    desc: 'Graceful and clever. Will mention how old they are.',
    stats: { str: 9, iq: 12, dex: 11, con: 8, lck: 10 },
    skin: '#f0d2b0',
  },
  {
    id: 'dwarf',
    name: 'Dwarf',
    desc: 'Sturdy as a boulder, and about as chatty.',
    stats: { str: 12, iq: 9, dex: 8, con: 12, lck: 9 },
    skin: '#c98a5e',
  },
  {
    id: 'hobbit',
    name: 'Hobbit',
    desc: 'Small, lucky, and always thinking about second breakfast.',
    stats: { str: 7, iq: 10, dex: 12, con: 9, lck: 12 },
    skin: '#e8b98f',
  },
  {
    id: 'gnome',
    name: 'Gnome',
    desc: 'Tinkerers whose inventions mostly work, eventually.',
    stats: { str: 8, iq: 12, dex: 9, con: 9, lck: 12 },
    skin: '#d99a8a',
  },
  {
    id: 'halforc',
    name: 'Half-Orc',
    desc: 'Strong and surprisingly polite once you get to know them.',
    stats: { str: 13, iq: 7, dex: 10, con: 12, lck: 8 },
    skin: '#8fae6a',
  },
];
