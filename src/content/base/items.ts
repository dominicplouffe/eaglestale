import type { ItemDef } from '../../rules/types';

export const items: ItemDef[] = [
  // Weapons
  { id: 'fryingpan', name: 'Frying Pan', desc: 'Surprisingly effective. Smells of bacon.', price: 10, slot: 'weapon', proficiency: 'mace', damage: [1, 4], hit: 1 },
  { id: 'dagger', name: 'Dagger', desc: 'Small, sharp, honest.', price: 25, slot: 'weapon', proficiency: 'dagger', damage: [1, 4] },
  { id: 'staff', name: 'Quarterstaff', desc: 'A stick, but a respectable one.', price: 20, slot: 'weapon', proficiency: 'staff', damage: [1, 6] },
  { id: 'mace', name: 'Mace', desc: 'For persuading things to stop.', price: 70, slot: 'weapon', proficiency: 'mace', damage: [1, 6] },
  { id: 'shortsword', name: 'Short Sword', desc: 'Quick and handy.', price: 60, slot: 'weapon', proficiency: 'sword', damage: [1, 6] },
  { id: 'handaxe', name: 'Hand Axe', desc: 'Good for firewood and foes.', price: 55, slot: 'weapon', proficiency: 'axe', damage: [1, 6] },
  { id: 'longsword', name: 'Long Sword', desc: 'The classic.', price: 150, slot: 'weapon', proficiency: 'sword', damage: [1, 8] },
  { id: 'morningstar', name: 'Morning Star', desc: 'Spiky. Not a morning person.', price: 160, slot: 'weapon', proficiency: 'mace', damage: [1, 8] },
  { id: 'battleaxe', name: 'Battle Axe', desc: 'Heavy, loud and very effective.', price: 220, slot: 'weapon', proficiency: 'axe', damage: [1, 10] },
  { id: 'sling', name: 'Sling', desc: 'Ranged, if you count pebbles.', price: 15, slot: 'weapon', proficiency: 'sling', damage: [1, 4], ranged: true },
  { id: 'shortbow', name: 'Short Bow', desc: 'Shoot from the back row.', price: 90, slot: 'weapon', proficiency: 'bow', damage: [1, 6], ranged: true },
  { id: 'longbow', name: 'Long Bow', desc: 'More range, more dignity.', price: 200, slot: 'weapon', proficiency: 'bow', damage: [1, 8], ranged: true },

  // Armour
  { id: 'robe', name: 'Robe', desc: 'Stylish and drafty.', price: 30, slot: 'body', proficiency: 'robe', ac: 1 },
  { id: 'leather', name: 'Leather Armor', desc: 'Light and creaky.', price: 50, slot: 'body', proficiency: 'light', ac: 2 },
  { id: 'chain', name: 'Chain Mail', desc: 'Jingles when you sneak.', price: 300, slot: 'body', proficiency: 'medium', ac: 4 },
  { id: 'plate', name: 'Plate Mail', desc: 'Total coverage, total sweat.', price: 700, slot: 'body', proficiency: 'heavy', ac: 6 },
  { id: 'buckler', name: 'Buckler', desc: 'A small round shield.', price: 40, slot: 'shield', proficiency: 'shield', ac: 1 },
  { id: 'kiteshield', name: 'Kite Shield', desc: 'Bigger is better.', price: 120, slot: 'shield', proficiency: 'shield', ac: 2 },
  { id: 'cap', name: 'Leather Cap', desc: 'Hat-shaped protection.', price: 25, slot: 'head', proficiency: 'light', ac: 1 },
  { id: 'ironhelm', name: 'Iron Helm', desc: 'Dents nicely.', price: 90, slot: 'head', proficiency: 'heavy', ac: 2 },
  { id: 'gloves', name: 'Leather Gloves', desc: 'Keep your fingers.', price: 30, slot: 'hands', proficiency: 'light', ac: 1 },
  { id: 'gauntlets', name: 'Iron Gauntlets', desc: 'Punch-friendly.', price: 110, slot: 'hands', proficiency: 'heavy', ac: 2 },
  { id: 'charm', name: 'Eagle Feather Charm', desc: 'Brings a little luck and a little defense.', price: 150, slot: 'trinket', ac: 1 },

  // Consumables
  { id: 'draught', name: 'Healing Draught', desc: 'Restores 15 HP. Tastes of pond.', price: 40, use: { kind: 'heal', amount: 15 } },
  { id: 'greaterdraught', name: 'Greater Draught', desc: 'Restores 40 HP. Tastes of expensive pond.', price: 120, use: { kind: 'heal', amount: 40 } },
  { id: 'tonic', name: 'Spirit Tonic', desc: 'Restores 8 SP.', price: 80, use: { kind: 'restoreSp', amount: 8 } },

  // Dungeon treasure (not sold in shops)
  { id: 'peckingblade', name: 'Pecking Blade', desc: 'A sword with a beak-shaped edge. Finds the soft bits.', price: 500, slot: 'weapon', proficiency: 'sword', damage: [1, 8, 2], hit: 1 },
  { id: 'downymail', name: 'Downy Mail', desc: 'Chain mail lined with eagle down. Warm and strong.', price: 800, slot: 'body', proficiency: 'medium', ac: 6 },
  { id: 'sparkstaff', name: 'Staff of Sparks', desc: 'Crackles when annoyed.', price: 400, slot: 'weapon', proficiency: 'staff', damage: [1, 6, 2], hit: 1 },
];
