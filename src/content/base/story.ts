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
    "Malachar crumples with a long, dignified squawk. From his tattered robes tumbles Aquila's Golden Pinion, glowing like a small sunrise.",
    'You carry it up through the crypts and cellars. As you step into Talonreach the clouds crack open and a great shadow sweeps over the rooftops. Aquila is home.',
    'The bakeries reopen. The pillows forgive everyone. You are carried through the streets by a crowd smelling faintly of warm bread.',
    "Congratulations, heroes. Eagle's Tale is complete... but the Roost may yet hold more secrets. Keep playing to find them.",
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
