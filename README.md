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
| Dungeon | `Up`/`W` forward, `Left`/`A` and `Right`/`D` turn, `Down`/`S` turn around, `E` use stairs, `J` journal, `C` camp: `P` party sheet (gear, potions, giving items, healing spells), `F` formation, `V` full map, `J` journal, `S` save |
| Combat | Each living hero picks `A`ttack, `C`ast, `D`efend, `I`tem or `R`un, then the round plays out. `Space` skips the animation; the *Battle* button in the title bar sets the pace (normal, fast, instant). |

- **The quest**: Aquila's twelve feathers are hidden in five dungeons, each kept by one of Malachar's servants.
  Carry the feathers you find to the **Eagle Tower** in town: the city recovers in stages (the bakery reopens, the armourer
  returns with better steel, and so on) and new goods appear in the Emporium. The **Journal** (`J`) shows the story so far,
  your side tasks, which feathers you have and what the city is like now.
- **Side tasks**: people you meet in the dungeons ask for help, and the Guild's **bounty board** offers jobs (take up to three;
  come back to the Guild to claim the reward). Monsters drop the tails, sigils and silk that bounties ask for.
- **Locks and secrets**: some doors need a key, or a number of Aquila's feathers. Some walls are not walls at all;
  walk into them to find out, and a rogue in the party will feel a draught when one is straight ahead.
- **Guild**: create heroes (choose race, class and spend bonus points) or hit *Quick-start party*. Reorder the party: slots 1-3 are the front row, 4-6 the back row.
- **Emporium**: buy and sell equipment (selling pays half price; quest items can't be sold). Each item shows how it compares with what the selected hero has on, and *Buy & equip* puts it on straight away.
- **Temple**: revive the dead (if you can't cover the fee, the temple takes what gold you have) and heal wounds (1g per 5 HP). **Inn**: rest (heals HP/SP).
- **Combat rules in brief**: only the front row can melee, and only against the group at melee range. Archers, slingers and spells reach every group.
  Distant groups march closer each round unless they have ranged attacks. Sleeping monsters are hit automatically and wake when damaged.

## Project layout

```
src/
  rules/       Pure game logic with no DOM: characters, combat, spells, shop, quests and feathers, dungeon helpers, game state
  content/     Game data. registry.ts is the lookup; base/ is the built-in campaign (a "content pack");
               levelgen.ts builds levels of rooms, winding corridors and hand-drawn set pieces
  engine/      Shell (DOM layout, menus, keyboard, render loop), Game (state + screens), save slots, Audio (WebAudio synth)
  gfx/         Graphics, all drawn in code:
                 dungeonView.ts  first-person raycaster (textured walls, floors, doorways, torchlight, smooth movement)
                 textures.ts     wall/floor/ceiling textures painted from a level's theme colours
                 art.ts          32x32 drawings (art/monsters.ts) with recolourable materials for variants
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
- **Spell looks**: a spell's `look` (`bolt`, `fire`, `ice`, `holy`, `sleep`, `song`, `ward`, `heal`) picks its battle effect.
- **Dungeons**: `dungeons.ts` builds each level with `generateLevel` (`src/content/levelgen.ts`): a seed (same seed, same level),
  a size, how many rooms and extra loops, and the special letters to scatter from near the stairs up to far away.
  Hand-drawn set pieces ("vaults") are placed among the rooms: draw one as text, mark its single way in with `*`,
  and say what that entrance becomes (a door, a lock letter, a secret-wall letter) and whether it sits `near` or `far`:

  ```ts
  const throneRoom: Vault = { place: 'far', rows: ['####*####', '#.t...t.#', '#...K...#', '#########'] };
  ```

  A level can also be a hand-written `grid` (`#` wall, `.` floor, `+` door, `<` `>` stairs, letters are special tiles).
  Each letter is defined in the level's `specials`: a `message`, `treasure` (gold, an item, a feather), `trap`, `fountain`,
  `fight` (a scripted battle with a reward), `lock` (needs a `key` item and/or a number of `feathers`), `secret`
  (a wall that opens when walked into) or `talk` (someone who can start a `quest`). Any of them can set a story `flag`.
  A `fight` with `finale: true` ends the game. A level's `theme` colours (and `style`: `brick`, `stone` or `rune`) decide how its textures are painted.
- **Quests, feathers and the city**: `src/content/base/campaign.ts`. A quest is a list of steps, each with a goal:
  `kill` a number of a monster, `collect` items, reach a story `flag`, find or `offered` a number of `feathers`.
  Its `source` says how it starts: at the beginning (`start`), on the Guild's bounty board (`board`, optionally
  unlocked by earlier quests or a feather count), or `given` by a `talk` special or by another quest's `next`.
  `feathers` lists the feathers to find, and `cityStages` says what changes in town (text, and extra shop stock) as feathers come home.
  A monster's `drops` (item and chance) feed the `collect` goals.
- **Whole expansions**: create a `ContentPack` (see `src/rules/types.ts`) and register it in `src/content/index.ts`.
  Later packs can override earlier content by reusing ids.
- **Story text**: `src/content/base/story.ts`.
- **Tests keep content honest**: `tests/content.test.ts` checks that every id referenced by a class, shop, dungeon or quest exists, that kits are equippable,
  and that every dungeon level is fully connected with the right stairs and can be finished (every square can be reached,
  with each lock's key or feathers found before the door that needs them). `tests/balance.test.ts` fights each boss with simulated parties to check it is beatable at the intended level, and not before.

## Current scope (version 0.2)

6 races, 7 classes (Knight, Paladin, Ranger, Rogue, Minstrel, Healer, Mage), 12 spells, 44 items, 18 monsters.
The campaign is being built in chapters. Done so far: **the Roost Below**, three 41x41 levels with three feathers,
three bosses, three side tasks and six bounties. Later chapters (the Gurgle, Professor Pinion's Clocktower, the Moulted Wood
and Malachar's Featherless Spire) and a walkable Talonreach are planned; the main quest stops at "Into the Gurgle" until they exist.

Saves are versioned: when the format changes, bump `SAVE_VERSION` and add a migration step in `src/rules/state.ts`
so existing saves keep loading. Saves that mention items or places that no longer exist are repaired on load.
