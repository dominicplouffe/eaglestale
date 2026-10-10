import type { ShopDef } from '../../rules/types';

export const shops: ShopDef[] = [
  {
    id: 'emporium',
    name: "Dusty Gizzard's Emporium",
    greeting: 'Dusty Gizzard squints at you. "Buying, selling, or just dripping on my floor?"',
    stock: [
      'fryingpan', 'dagger', 'staff', 'mace', 'shortsword', 'handaxe', 'longsword', 'morningstar',
      'battleaxe', 'sling', 'shortbow', 'longbow', 'robe', 'leather', 'chain', 'plate', 'buckler',
      'kiteshield', 'cap', 'ironhelm', 'gloves', 'gauntlets', 'charm', 'draught', 'greaterdraught',
      'tonic',
    ],
  },
];
