/** All the words that frame the adventure. Edit here to retell the story. */
export const story = {
  title: "Eagle's Tale",
  tagline: 'A tale of talons, treasure and truly terrible plumbing.',
  intro: [
    'The city of Talonreach has stood for nine hundred years beneath the wings of the Great Eagle, Aquila, who watched over its rooftops and, on special occasions, its bakeries.',
    'Three weeks ago the Eagle vanished. Overnight, the sky went grey, the bread went stale, and every feather in the city fell out. Even the pillows are sulking.',
    "The culprit is Malachar the Plucker, a failed court wizard with a grudge against anything that can fly. He plucked all twelve of Aquila's great feathers and handed them out to his servants to hide. Without them the Eagle cannot come home.",
    'His cult has dug in right under your feet, in the Roost Below: the cellars, crypts and sanctum beneath the old Eagle Tower. Bring the feathers back to the tower, one by one, and the city will start to remember itself.',
    'The Mayor has offered a reward to anyone brave, foolish or desperate enough to go down there. So, naturally, he asked you.',
  ],
  townHint: "You stand in Feather Square, facing the Guild. Walk in (Up arrow, twice) to recruit heroes. G lists the places you know in town, and your Journal (J) keeps track of the quest.",
  victory: [
    'You climb the Eagle Tower one last time and lay the final feathers beside the other ten. For a long moment, nothing happens.',
    'Then all twelve blaze gold at once. The clouds over Talonreach split from end to end, a great shadow sweeps across the rooftops, and AQUILA, the Great Eagle, settles on her perch with every feather exactly where it belongs.',
    'The bakeries reopen for good. The pillows forgive everyone. Malachar the Plucker, last seen being carried off by a flock of very indignant pigeons, has not been heard from since.',
    "Congratulations, heroes. Eagle's Tale is complete... but the Guild still has bounties, and the tower keepers have unbarred the North Gate: something stirs in Aquila's old nest, at the top of Mount Talon. Keep playing to find out.",
  ],
};

/** Pre-made heroes offered by the Guild's "Quick-start party" button. */
export const starterParty = [
  { name: 'Sir Bonk', race: 'human', cls: 'knight' },
  { name: 'Dame Gwen', race: 'dwarf', cls: 'paladin' },
  { name: 'Pip', race: 'hobbit', cls: 'rogue' },
  { name: 'Fenwick', race: 'elf', cls: 'ranger' },
  { name: 'Mother Hubbard', race: 'gnome', cls: 'healer' },
  { name: 'Zorp', race: 'elf', cls: 'mage' },
];
