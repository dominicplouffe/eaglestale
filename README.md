# Eagle's Tale

A first-person, party-based dungeon crawler for the browser, inspired by the 1985 classic *The Bard's Tale*.
Recruit a party of six, gear up in Talonreach, and win back the twelve feathers that Malachar the Plucker stole from
the city's guardian eagle. Each feather you return to the Eagle Tower brings the city a little further back to life.
Pixel-art graphics and chiptune sound are generated entirely in code, so there are no asset files.

## Run it

Requires Node 20.19+ or 22.12+ (Vite 8's minimum).

```bash
npm install
npm run dev        # development server with hot reload (http://localhost:5173)
npm test           # rules and content tests (Vitest)
npm run test:e2e   # browser smoke tests (Playwright; first run `npx playwright install chromium`)
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build locally
```

Works in any modern browser on macOS or Linux (and Windows). Saves go to the browser's `localStorage`: three slots
you choose, plus an autosave written whenever you take the stairs, rest at the inn or return feathers.
(Open the app through a web server, not by double-clicking `index.html`, because browsers block ES modules on `file://`.)

## How to play

| Where | Keys |
|---|---|
| Everywhere | Click a menu entry or press the highlighted letter. `M` toggles sound. `Esc` closes panels. |
| Party panel | Click a hero's card to see their attributes, equipment, pack and spells (works anywhere, even mid-battle). Click again or press `Esc` to close. |
| Town | Walk the streets like a dungeon. Walk into a front door to go inside. `G` *Go to*: walk straight to any place you know (the Guild, Emporium, Temple, Inn, Eagle Tower, and the ways down once you have found them). `E` go down the steps or grate you're standing on, `J` journal, `C` party sheet, formation, map and saving, `Q` quit to title. |
| Dungeon | `Up`/`W` forward, `Left`/`A` and `Right`/`D` turn, `Down`/`S` turn around, `E` use stairs, `J` journal, `C` camp: `P` party sheet (gear, potions, giving items, healing spells), `F` formation, `V` full map, `J` journal, `S` save |
| Combat | Each living hero picks `A`ttack, `C`ast, `D`efend, `I`tem or `R`un, then the round plays out. `Space` skips the animation; the *Battle* button in the title bar sets the pace (normal, fast, instant). |

- **The quest**: Aquila's twelve feathers are hidden in five dungeons, each kept by one of Malachar's servants.
  Carry the feathers you find to the **Eagle Tower** in the middle of Feather Square: the city recovers in stages (the bakery
  reopens, the armourer returns with better steel, silver and eagle plate follow) and new goods appear in the Emporium; even the sky
  over the city clears a little with each feather. The **Journal** (`J`) shows the story so far, your side tasks, which feathers
  you have and what the city is like now. Lay all twelve on the perch and the story ends (you can keep playing afterwards).
- **Talonreach** is a town you walk: timber-framed streets, the Eagle Tower, the temple and a suspicious clocktower. Townsfolk
  stand in the streets (some want help), most front doors answer back, and there is at least one hidden corner.
  Steps beside the Eagle Tower lead down into the Roost Below; the sewer grate on Drain Street into the Gurgle; and
  Professor Pinion's Clocktower, at the end of Clock Lane, opens to anyone carrying his letter. Its floors go up, not down.
  The East Gate opens onto the Moulted Wood for heroes carrying eight feathers, and deep in the wood, behind the druids'
  thorn-throne, a path leads to Malachar's Featherless Spire. When you face Malachar at its summit, you won't fight alone.
- **Side tasks**: people you meet in town and in the dungeons ask for help, and the Guild's **bounty board** offers jobs (take up to three;
  come back to the Guild to claim the reward). Monsters drop the tails, sigils, fangs and sludge that bounties ask for.
- **Locks and secrets**: some doors need a key, or a number of Aquila's feathers, and some gates need a wheel or lever
  worked somewhere else. Some walls are not walls at all; walk into them to find out, and a rogue in the party will feel a
  draught when one is straight ahead. Brass tubes and lifts whisk the party about (the Clocktower's lift needs switching on
  first). People, bosses and chests can be seen standing in the distance.
- **Guild**: create heroes (choose race, class and spend bonus points) or hit *Quick-start party*. Reorder the party: slots 1-3 are the front row, 4-6 the back row.
- **Emporium**: buy and sell equipment (selling pays half price; quest items can't be sold). Each item shows how it compares with what the selected hero has on, and *Buy & equip* puts it on straight away.
- **Temple**: revive the dead (if you can't cover the fee, the temple takes what gold you have) and heal wounds (1g per 5 HP). **Inn**: rest (heals HP/SP).
- **Saving**: three save slots (`C`, then `S`, in town or at camp) and an autosave, written whenever you take the stairs, leave a building, rest or return feathers.
- **Combat rules in brief**: only the front row can melee, and only against the group at melee range. Archers, slingers and spells reach every group.
  Distant groups march closer each round unless they have ranged attacks. Sleeping monsters are hit automatically and wake when damaged.
  Clockwork never sleeps, but Rust Bolt and Corrosion hit it twice as hard.
- **Spells** run up to level 12 for every spellcaster: group and party-wide spells, party heals, and Revive, which brings a
  fallen hero back in battle or at camp. Hover over a spell in battle to see what it does.

## Project layout

```
src/
  rules/       Pure game logic with no DOM: characters, combat, spells, shop, quests and feathers, dungeon helpers, game state
  content/     Game data. registry.ts is the lookup; base/ is the built-in campaign (a "content pack");
               levelgen.ts builds levels of rooms, winding corridors and hand-drawn set pieces
  engine/      Shell (DOM layout, menus, keyboard, render loop), Game (state + screens), save slots, Audio (WebAudio synth)
  gfx/         Graphics, all drawn in code:
                 dungeonView.ts  first-person raycaster (textured walls, floors, doorways, torchlight, smooth movement,
                                 sky and two-storey streets outdoors, sprites for people, foes and chests)
                 textures.ts     wall/floor/ceiling textures from a level's theme (brick, stone, rune, sewer, city, clockwork, forest)
                 art.ts          32x32 drawings (art/monsters.ts, sewer.ts, clockwork.ts, wild.ts, people.ts), recolourable
                 portrait.ts     layered head-and-shoulders portraits (art/portraits.ts)
                 scenes.ts       town, title and victory scenes; font.ts the pixel font; minimap.ts the auto-map
  screens/     title, town, guild, shop, temple, inn, dungeon, combat, victory; saveMenu.ts picks save slots
  ui/          Reusable panels (party sidebar, character sheet, journal)
tests/         Vitest: content integrity, character rules, shop, combat, quests, boss balance, mazes and saves
e2e/           Playwright smoke tests that play the real game in a browser
```

## Extending the game

Everything the player sees as *content* is data. Add or change it without touching the engine:

- **Classes, races, items, spells, monsters, shops**: edit the files in `src/content/base/`. For example, a new class is one object
  in `classes.ts`; a new spell is one object in `spells.ts` and an entry in a class's `spellbook`.
  Items are restricted by `proficiency` tags that classes list in `canUse`.
- **Monster looks**: a monster's `sprite` names a drawing in `src/gfx/art/monsters.ts` (32 rows of 32 palette keys).
  Its `palette` can recolour a drawing's named `materials` for a variant, e.g. the Cult Mage is the cultist drawing
  with `{ robe: '#3a4aa8', trim: '#e8e8f0' }`; highlight and shadow tones are derived automatically.
- **Spells**: a spell's `effect` is `damage` (optionally with a `bane`: double against `construct` monsters), `heal`
  (one ally, or the whole `party`), `sleep`, `defense` or `revive` (target `fallen`). Its `look` (`bolt`, `fire`, `ice`,
  `holy`, `sleep`, `song`, `ward`, `heal`) picks its battle effect. A monster marked `construct` never sleeps.
- **Dungeons**: `dungeons.ts`, `gurgle.ts`, `clocktower.ts`, `wood.ts` and `spire.ts` build each level with `generateLevel` (`src/content/levelgen.ts`): a seed (same seed, same level),
  a size, how many rooms and extra loops, and the special letters to scatter from near the stairs up to far away.
  Hand-drawn set pieces ("vaults") are placed among the rooms: draw one as text, mark its single way in with `*`,
  and say what that entrance becomes (a door, a lock letter, a secret-wall letter) and whether it sits `near` or `far`:

  ```ts
  const throneRoom: Vault = { place: 'far', rows: ['####*####', '#.t...t.#', '#...K...#', '#########'] };
  ```

  A level can also be a hand-written `grid` (`#` wall, `.` floor, `+` door, `<` `>` stairs, letters are special tiles).
  Each letter is defined in the level's `specials`: a `message`, `treasure` (gold, an item, a feather), `trap`, `fountain`,
  `fight` (a scripted battle with a reward), `lock` (needs a `key` item, a number of `feathers` and/or a story `flag`,
  e.g. one a wheel sets somewhere else), `secret` (a wall that opens when walked into) or `talk` (someone who can start
  a `quest`, with a `look` so they can be seen standing there) or `teleport` (a tube or lift to the square marked `to`,
  on another `level` if given, working only once its `flag` is set). Any of them can set a story `flag`. A `fight` with
  `finale: true` ends the game, and one with an `assist` brings an ally in on a given round (Aquila, at Malachar: she strikes
  every foe, heals the party and raises the fallen). A level's `theme` colours (and `style`: `brick`, `stone`, `rune`, `sewer`,
  `city`, `clockwork` or `forest`) decide how its textures are painted; a `sky` puts it outdoors, with `light` for how bright.
  A dungeon marked `ascending` is a tower: its stairs climb.
- **The town**: `city.ts` is a dungeon with `city: true` and one hand-drawn level. Its `building` specials are front doors
  set in walls (`place` opens the Guild, Emporium, Temple, Inn or Eagle Tower; other doors just say their `text`), and
  `portal` squares lead down into a dungeon (optionally needing a `key` or feathers); a `building` with a `dungeon` is a
  front door into one, like the Clocktower's. Once a way in with a `flag` has been used it stays open, and its story key is
  left behind. `areas` name the streets, `landmarks` draw a block of wall as a taller tower, clocktower or temple, and a
  `sky` colour puts the level outdoors. A `portal` can also sit inside a dungeon (the path from the Thorn Grove to the
  Spire); leaving a dungeon brings the party back to the way they came in, wherever it is.
- **Quests, feathers and the city**: `src/content/base/campaign.ts`. A quest is a list of steps, each with a goal:
  `kill` a number of a monster, `collect` items, reach a story `flag`, find or `offered` a number of `feathers`.
  Its `source` says how it starts: at the beginning (`start`), on the Guild's bounty board (`board`, optionally
  unlocked by earlier quests or a feather count), or `given` by a `talk` special or by another quest's `next`.
  `feathers` lists the feathers to find, and `cityStages` says what changes in town (text, and extra shop stock) as feathers come home.
  The quest marked `ending` finishes the story: completing it (by laying the last feathers on the perch) shows the victory screen.
  A monster's `drops` (item and chance) feed the `collect` goals.
- **Whole expansions**: create a `ContentPack` (see `src/rules/types.ts`) and register it in `src/content/index.ts`.
  Later packs can override earlier content by reusing ids.
- **Story text**: `src/content/base/story.ts`.
- **Tests keep content honest**: `tests/content.test.ts` checks that every id referenced by a class, shop, dungeon or quest exists, that kits are equippable,
  and that every dungeon level is fully connected with the right stairs and can be finished (every square can be reached,
  with each lock's key, feathers or wheel found before the door that needs them). `tests/balance.test.ts` fights each boss
  with simulated parties to check it is beatable at the intended level, and not before; `tests/campaign.test.ts` plays the
  main story through its flags and feathers.

## Current scope (version 0.5)

6 races, 7 classes (Knight, Paladin, Ranger, Rogue, Minstrel, Healer, Mage), 26 spells (up to level 12), 118 items, 51 monsters.
The whole story can now be played from start to finish, across the walkable city of **Talonreach** and 15 dungeon levels:
**the Roost Below** (three levels), **the Gurgle** (two levels of sewers), **Professor Pinion's Clocktower** (three floors
going up), **the Moulted Wood** (three levels out of doors) and **Malachar's Featherless Spire** (four floors up to an open
summit). All 12 feathers, 13 side tasks, 19 bounties and twelve stages of the city's recovery. Still to come: Aquila's old
nest, after the ending, and a final balance pass.

Saves are versioned: when the format changes, bump `SAVE_VERSION` and add a migration step in `src/rules/state.ts`
so existing saves keep loading. Saves that mention items or places that no longer exist are repaired on load.
