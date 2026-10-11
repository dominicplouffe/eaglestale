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

  // Sold once the city starts to recover (see the city stages in campaign.ts)
  { id: 'honeybun', name: 'Honey Bun', desc: 'From the reopened bakery on Crumb Lane. Still warm. Restores 25 HP.', price: 25, use: { kind: 'heal', amount: 25 } },
  { id: 'steelsword', name: 'Steel Sword', desc: 'Talonreach steel, back at last.', price: 420, slot: 'weapon', proficiency: 'sword', damage: [1, 10], hit: 1 },
  { id: 'warhammer', name: 'War Hammer', desc: 'Argues persuasively with armour.', price: 450, slot: 'weapon', proficiency: 'mace', damage: [1, 10, 1] },
  { id: 'greataxe', name: 'Great Axe', desc: 'Mostly edge. Some handle.', price: 480, slot: 'weapon', proficiency: 'axe', damage: [1, 12] },
  { id: 'warbow', name: 'War Bow', desc: 'Pulls like a mule. Hits like one too.', price: 480, slot: 'weapon', proficiency: 'bow', damage: [1, 10], ranged: true },
  { id: 'scalemail', name: 'Scale Mail', desc: 'Overlapping steel scales. Sounds like a nervous fish.', price: 520, slot: 'body', proficiency: 'medium', ac: 5 },
  { id: 'towershield', name: 'Tower Shield', desc: 'Basically a door with a handle.', price: 320, slot: 'shield', proficiency: 'shield', ac: 3 },
  { id: 'steelhelm', name: 'Steel Helm', desc: 'Polished to a smug shine.', price: 260, slot: 'head', proficiency: 'heavy', ac: 3 },
  { id: 'pinioncharm', name: 'Pinion Charm', desc: 'A golden token blessed at the Eagle Tower.', price: 600, slot: 'trinket', ac: 2 },
  { id: 'silversword', name: 'Silver Sword', desc: 'Talonreach silver, folded a hundred times. Rats hate it.', price: 1150, slot: 'weapon', proficiency: 'sword', damage: [2, 6, 1], hit: 1 },
  { id: 'silvermace', name: 'Silver Mace', desc: 'A blessed mace with a silver head shaped like a beak.', price: 1150, slot: 'weapon', proficiency: 'mace', damage: [2, 6, 1], hit: 1 },
  { id: 'yewbow', name: 'Yew Longbow', desc: 'Strung with spider silk. Sings when it shoots.', price: 1050, slot: 'weapon', proficiency: 'bow', damage: [1, 12, 1], hit: 1, ranged: true },
  { id: 'rowanstaff', name: 'Rowan Staff', desc: 'Rowan wood keeps ill luck away, and sometimes ratfolk.', price: 700, slot: 'weapon', proficiency: 'staff', damage: [1, 8, 2], hit: 1 },
  { id: 'mithrilshirt', name: 'Mithril Shirt', desc: 'Light as a pillow (a happy one) and very hard to stab.', price: 1300, slot: 'body', proficiency: 'light', ac: 5 },
  { id: 'eagleplate', name: 'Eagle Plate', desc: 'Plate armour with a golden eagle on the breast. Clanks proudly.', price: 2400, slot: 'body', proficiency: 'heavy', ac: 8 },
  { id: 'eaglehelm', name: 'Eagle Helm', desc: 'A helm with a crest of bronze feathers.', price: 950, slot: 'head', proficiency: 'heavy', ac: 4 },
  { id: 'elixir', name: 'Golden Elixir', desc: 'Restores 80 HP. Tastes like sunshine and honey.', price: 240, use: { kind: 'heal', amount: 80 } },
  { id: 'greatertonic', name: 'Greater Spirit Tonic', desc: 'Restores 20 SP.', price: 260, use: { kind: 'restoreSp', amount: 20 } },

  // Bounty goods dropped by monsters (the Guild pays for these)
  { id: 'rattail', name: 'Rat Tail', desc: 'The Guild pays for these. Nobody asks why.', price: 2 },
  { id: 'cultsigil', name: 'Cult Sigil', desc: 'A plucked-feather badge worn by Malachar\'s followers.', price: 5 },
  { id: 'spidersilk', name: 'Spider Silk', desc: 'A skein of strong, sticky thread.', price: 8 },
  { id: 'ratfang', name: 'Plague Rat Fang', desc: 'Yellow, chipped and faintly glowing. The Guild wants them counted.', price: 4 },
  { id: 'slimejar', name: 'Jar of Sludge', desc: 'For the alchemists. They say it is "promising". It is gurgling.', price: 6 },

  // Keys and story items (can't be sold or dropped)
  { id: 'cryptkey', name: 'Ossuary Key', desc: 'A bone-handled key carved with an eagle. Opens the Ossuary in the Crypts.', price: 0, quest: true },
  { id: 'sewerkey', name: 'Sewer Grate Key', desc: 'Taken from High Priest Grackle. Opens the way into the Gurgle beneath the city.', price: 0, quest: true },
  { id: 'wobblebyhelm', name: "Wobbleby's Helm", desc: 'An heirloom helmet. Fits anyone; slightly dented on one side.', price: 350, slot: 'head', ac: 3 },
  { id: 'gatorhide', name: "Snapjaw's Hide", desc: 'A great scaly hide. Tanner Hodge, on Tanner\'s Row, would know what to do with it.', price: 0, quest: true },
  { id: 'sheetmusic', name: 'Sheet Music', desc: '"Toccata for Drainpipes in G Minor". Soggy, but still legible.', price: 0, quest: true },
  { id: 'pinionletter', name: "Professor Pinion's Letter", desc: 'Clockwork-stamped paper: "Will buy feathers by the pound. No questions asked. - Prof. P., The Clocktower."', price: 0, quest: true },

  // Dungeon treasure (not sold in shops)
  { id: 'peckingblade', name: 'Pecking Blade', desc: 'A sword with a beak-shaped edge. Finds the soft bits.', price: 500, slot: 'weapon', proficiency: 'sword', damage: [1, 8, 2], hit: 1 },
  { id: 'downymail', name: 'Downy Mail', desc: 'Chain mail lined with eagle down. Warm and strong.', price: 800, slot: 'body', proficiency: 'medium', ac: 6 },
  { id: 'sparkstaff', name: 'Staff of Sparks', desc: 'Crackles when annoyed.', price: 400, slot: 'weapon', proficiency: 'staff', damage: [1, 6, 2], hit: 1 },
  { id: 'plunger', name: 'The Plunger of Destiny', desc: 'A legendary plunger. Clears blockages and ratfolk alike.', price: 900, slot: 'weapon', proficiency: 'mace', damage: [2, 6, 2], hit: 2 },
  { id: 'ratcatcher', name: "Ratcatcher's Bow", desc: 'A short, mean bow with a hundred notches on the grip.', price: 1100, slot: 'weapon', proficiency: 'bow', damage: [1, 10, 3], hit: 2, ranged: true },
  { id: 'pipestaff', name: 'Organ-Pipe Staff', desc: 'A brass pipe that hums a low note. Spells come out louder.', price: 1200, slot: 'weapon', proficiency: 'staff', damage: [2, 6, 2], hit: 2 },
  { id: 'gatorarmor', name: 'Gator-Hide Armour', desc: 'Made by Tanner Hodge from Old Snapjaw. Tough, scaly, and it still smells a bit.', price: 1500, slot: 'body', proficiency: 'medium', ac: 7 },
  { id: 'ratcrown', name: "The Rat King's Crown", desc: 'A crown of bottle caps. Surprisingly protective, and nobody laughs at it twice.', price: 1400, slot: 'trinket', ac: 3 },
  { id: 'catseye', name: "Cat's-Eye Charm", desc: 'From Mother Plover. Its green stone seems to watch your back.', price: 600, slot: 'trinket', ac: 2 },
];
