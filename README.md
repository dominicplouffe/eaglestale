# Eagle's Tale

A first-person, party-based dungeon crawler for the browser, inspired by the 1985 classic *The Bard's Tale*.
Recruit a party of six, buy and sell gear in town, then descend into **the Roost Below** to find the villain
who stole the city's guardian eagle. Pixel-art graphics and chiptune sound are generated entirely in code, so there are no asset files.

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

Works in any modern browser on macOS or Linux (and Windows). Saves go to the browser's `localStorage`.
(Open the app through a web server, not by double-clicking `index.html`, because browsers block ES modules on `file://`.)

## How to play

| Where | Keys |
|---|---|
| Everywhere | Click a menu entry or press the highlighted letter. `M` toggles sound. `Esc` closes panels. |
| Party panel | Click a hero's card to see their attributes, equipment, pack and spells (works anywhere, even mid-battle). Click again or press `Esc` to close. |
| Dungeon | `Up`/`W` forward, `Left`/`A` and `Right`/`D` turn, `Down`/`S` turn around, `E` use stairs, `C` camp: `P` party sheet (gear, potions, giving items, healing spells), `F` formation, `V` full map, `S` save |
| Combat | Each living hero picks `A`ttack, `C`ast, `D`efend, `I`tem or `R`un, then the round plays out. `Space` skips the animation; the *Battle* button in the title bar sets the pace (normal, fast, instant). |

- **Guild**: create heroes (choose race, class and spend bonus points) or hit *Quick-start party*. Reorder the party: slots 1-3 are the front row, 4-6 the back row.
- **Emporium**: buy and sell equipment (selling pays half price). Each item shows how it compares with what the selected hero has on, and *Buy & equip* puts it on straight away.
- **Temple**: revive the dead (if you can't cover the fee, the temple takes what gold you have) and heal wounds. **Inn**: rest (heals HP/SP) and save.
- **Combat rules in brief**: only the front row can melee, and only against the group at melee range. Archers, slingers and spells reach every group.
  Distant groups march closer each round unless they have ranged attacks. Sleeping monsters are hit automatically and wake when damaged.

## Project layout

```
src/
  rules/       Pure game logic with no DOM: characters, combat, spells, shop, dungeon helpers, game state
  content/     Game data. registry.ts is the lookup; base/ is the built-in campaign (a "content pack")
  engine/      Shell (DOM layout, menus, keyboard, render loop), Game (state + screens), Audio (WebAudio synth)
  gfx/         Graphics, all drawn in code:
                 dungeonView.ts  first-person raycaster (textured walls, floors, doorways, torchlight, smooth movement)
                 textures.ts     wall/floor/ceiling textures painted from a level's theme colours
                 art.ts          32x32 drawings (art/monsters.ts) with recolourable materials for variants
                 portrait.ts     layered head-and-shoulders portraits (art/portraits.ts)
                 scenes.ts       town, title and victory scenes; font.ts the pixel font; minimap.ts the auto-map
  screens/     title, town, guild, shop, temple, inn, dungeon, combat, victory
  ui/          Reusable panels (party sidebar, character sheet)
tests/         Vitest: content integrity, character rules, shop, combat (incl. balance checks), mazes and saves
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
- **Dungeons**: `dungeons.ts` builds levels with `generateMaze` (seeded, so each level is stable) or from a hand-written `grid`
  (`#` wall, `.` floor, `+` door, `<` `>` stairs, letters are special tiles defined in the level's `specials`).
  Special tiles can be messages, treasure, traps, fountains and scripted fights (one with `finale: true` ends the game).
  A level's `theme` colours (and `style`: `brick`, `stone` or `rune`) decide how its textures are painted.
- **Whole expansions**: create a `ContentPack` (see `src/rules/types.ts`) and register it in `src/content/index.ts`.
  Later packs can override earlier content by reusing ids.
- **Story text**: `src/content/base/story.ts`.
- **Tests keep content honest**: `tests/content.test.ts` checks that every id referenced by a class, shop or dungeon exists, that kits are equippable,
  and that every dungeon level is fully connected with the right stairs.

## Current scope (version 0.1)

6 races, 7 classes (Knight, Paladin, Ranger, Rogue, Minstrel, Healer, Mage), 12 spells, 29 items, 15 monsters,
and one dungeon of three levels ending in a boss fight. Saves are versioned: when the format changes, bump `SAVE_VERSION` and add a migration step in `src/rules/state.ts`
so existing saves keep loading. Saves that mention items or places that no longer exist are repaired on load.
