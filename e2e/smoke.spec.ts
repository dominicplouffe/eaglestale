import { expect, test, type Page } from '@playwright/test';

/**
 * Smoke tests that play the real game in a browser. They use the dev server, where the
 * game exposes `window.__game` and source modules can be imported for setting up a scene.
 */

let errors: string[] = [];

test.beforeEach(({ page }) => {
  errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('dialog', (d) => void d.accept());
});

test.afterEach(() => {
  expect(errors, 'uncaught errors in the page').toEqual([]);
});

const log = (page: Page) => page.locator('#log p');
const menuTitle = (page: Page) => page.locator('#menu .menu-title');

/** New game with the Guild's six ready-made heroes, back out in the street. */
async function startWithParty(page: Page): Promise<void> {
  await page.goto('/');
  await page.keyboard.press('n');
  // The game starts in Feather Square facing the Guild: two steps forward and in.
  await expect(page.locator('#location')).toHaveText('Talonreach - Feather Square');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await page.getByRole('button', { name: 'Quick-start party' }).click();
  await page.keyboard.press('l');
  await expect(page.locator('#location')).toHaveText('Talonreach - Market Street');
}

/** Walks straight to a place in town with Go to. */
async function goTo(page: Page, key: string): Promise<void> {
  await page.keyboard.press('g');
  await expect(menuTitle(page)).toHaveText('Go to...');
  await page.keyboard.press(key);
}

test('explore, camp, save, and continue the saved game', async ({ page }) => {
  await startWithParty(page);
  // No random fights, so the walk is predictable.
  await page.evaluate(async () => {
    const path = '/src/content/registry.ts';
    const { content } = await import(/* @vite-ignore */ path);
    for (const level of content.dungeon('roost').levels) level.encounterRate = 0;
  });
  await goTo(page, 'r');
  await page.keyboard.press('y');
  await expect(page.locator('#location')).toHaveText(/The Cellars/);
  for (const key of ['ArrowUp', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowUp']) await page.keyboard.press(key);

  await page.keyboard.press('c');
  await expect(menuTitle(page)).toHaveText('Camp');
  await page.keyboard.press('v');
  await expect(page.locator('#overlay canvas.bigmap')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.keyboard.press('f');
  await expect(page.locator('#overlay h2')).toHaveText('Formation');
  await page.keyboard.press('Escape');
  await page.keyboard.press('s');
  await expect(menuTitle(page)).toHaveText('Save to which slot?');
  await page.keyboard.press('2');
  await expect(log(page).last()).toHaveText('Game saved to Slot 2.');
  await expect(menuTitle(page)).toHaveText('Camp');

  await page.reload();
  await expect(log(page).last()).toHaveText(/^Last played: 6 heroes, level 1 · The Cellars/);
  await page.keyboard.press('c'); // Continue: the most recent save
  await expect(log(page).last()).toHaveText('Game loaded.');
  await expect(page.locator('#location')).toHaveText(/The Cellars/);
  await expect(page.locator('.party-card')).toHaveCount(6);

  // Going down into the Roost autosaved too, back in town.
  await page.reload();
  await page.keyboard.press('l');
  await expect(menuTitle(page)).toHaveText('Load which game?');
  await expect(page.locator('#menu button', { hasText: 'Slot 1 (empty)' })).toBeDisabled();
  await expect(page.locator('#overlay .row', { hasText: 'Slot 2' })).toContainText('The Cellars');
  await page.keyboard.press('a');
  await expect(log(page).last()).toHaveText('Game loaded.');
  await expect(page.locator('#location')).toHaveText(/The Cellars/);
});

test('a battle plays out to victory', async ({ page }) => {
  await startWithParty(page);
  const speed = page.locator('#speed');
  while ((await speed.textContent()) !== 'Battle: instant') await speed.click();
  await page.evaluate(async () => {
    const path = '/src/screens/combat.ts';
    const { startBattle } = await import(/* @vite-ignore */ path);
    const game = (window as unknown as { __game: unknown }).__game;
    const theme = { wall: '#555', floor: '#333', ceiling: '#111', door: '#844' };
    startBattle(game, [{ monster: 'rat', count: 3 }], theme, { onWin() {}, onFlee() {}, onDefeat() {} });
  });

  const menu = page.locator('#menu');
  for (let i = 0; i < 300; i++) {
    const title = (await menuTitle(page).textContent()) ?? '';
    if (/Victory|Defeat|Escaped/.test(title)) break;
    const attack = menu.locator('button', { hasText: 'Attack' });
    const defend = menu.locator('button', { hasText: 'Defend' });
    if ((await attack.count()) && (await attack.isEnabled())) await attack.click();
    else if (await defend.count()) await defend.click();
    else await page.waitForTimeout(25); // the round is still playing out
  }
  await expect(menuTitle(page)).toHaveText('Victory!');
  await expect(log(page).filter({ hasText: /^Victory!/ })).toHaveCount(1);
});

test('inspect a hero, compare gear and buy in the shop', async ({ page }) => {
  await startWithParty(page);
  await page.locator('.party-card').first().click();
  await expect(page.locator('#inspect h2')).toHaveText('Sir Bonk');
  await expect(page.locator('#inspect')).toContainText('Attributes');
  await page.keyboard.press('Escape');
  await expect(page.locator('#inspect')).toBeHidden();

  await goTo(page, 'e');
  const chain = page.locator('#overlay .row', { hasText: 'Chain Mail' });
  await expect(chain.locator('.compare')).toHaveText('+2 def');
  await chain.getByRole('button', { name: 'Buy & equip' }).click();
  await expect(log(page).last()).toHaveText('Sir Bonk buys and equips Chain Mail for 300g.');
  await expect(chain.locator('.compare')).toHaveText('no change');
});

test('the game still runs when the browser blocks site storage', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Site storage is blocked', 'SecurityError');
      },
    });
  });
  await startWithParty(page);
  await page.keyboard.press('c');
  await page.keyboard.press('s');
  await page.keyboard.press('1');
  await expect(log(page).last()).toHaveText(/Couldn't save/);
});

test('take a bounty and follow it in the journal', async ({ page }) => {
  await startWithParty(page);
  await goTo(page, 'w');
  await expect(log(page).last()).toHaveText(/perch stands empty/);
  await goTo(page, 'g');
  await page.keyboard.press('b');
  await page.locator('#overlay .row', { hasText: 'Rat Problem' }).getByRole('button', { name: 'Take' }).click();
  await expect(log(page).last()).toHaveText(/^New task: Rat Problem/);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.keyboard.press('l');
  await page.keyboard.press('j');
  await expect(page.locator('#overlay h2')).toHaveText('Journal');
  await expect(page.locator('#overlay')).toContainText('The Plucked Eagle');
  await expect(page.locator('#overlay')).toContainText('Rat Problem');
});

test('walk the town: shops, the sewer grate, and down into the Gurgle and back', async ({ page }) => {
  await startWithParty(page);
  // Coming out of a building, the party faces the street.
  await goTo(page, 't');
  await expect(page.locator('#location')).toHaveText(/Temple/);
  await page.keyboard.press('l');
  await expect(page.locator('#location')).toHaveText('Talonreach - Temple Row');

  // The sewer grate on Drain Street needs Grackle's key.
  await page.evaluate(async () => {
    const path = '/src/screens/dungeon.ts';
    const { dungeonScreen } = await import(/* @vite-ignore */ path);
    const game = (window as unknown as { __game: { state: { location: unknown }; go(s: unknown): void } }).__game;
    game.state.location = { dungeon: 'talonreach', level: 0, x: 7, y: 19, dir: 3 };
    game.go(dungeonScreen);
  });
  await page.keyboard.press('ArrowUp');
  await expect(log(page).last()).toHaveText(/You need the Sewer Grate Key/);
  await page.evaluate(() => {
    const game = (window as unknown as { __game: { party: { inventory: string[] }[] } }).__game;
    game.party[0].inventory.push('sewerkey');
  });
  await page.keyboard.press('e');
  await expect(menuTitle(page)).toHaveText('Go down into The Gurgle?');
  await page.keyboard.press('y');
  await expect(page.locator('#location')).toHaveText('The Gurgle - The Overflow (level 1)');

  // Back up the stairs: out of the grate, onto Drain Street.
  await page.keyboard.press('e');
  await page.keyboard.press('y');
  await expect(page.locator('#location')).toHaveText('Talonreach - Drain Street');
});

test("the Clocktower opens to Pinion's letter, and its stairs lead back down to the street", async ({ page }) => {
  await startWithParty(page);
  const go = (dungeon: string, level: number, x: number, y: number, dir: number) =>
    page.evaluate(
      async ([dungeon, level, x, y, dir]) => {
        const path = '/src/screens/dungeon.ts';
        const { dungeonScreen } = await import(/* @vite-ignore */ path);
        const game = (window as unknown as { __game: { state: { location: unknown }; go(s: unknown): void } }).__game;
        game.state.location = { dungeon, level, x, y, dir };
        game.go(dungeonScreen);
      },
      [dungeon, level, x, y, dir] as const,
    );
  // At the end of Clock Lane, facing the Clocktower's door.
  await go('talonreach', 0, 28, 3, 1);
  await page.keyboard.press('ArrowUp');
  await expect(log(page).last()).toHaveText(/You need Professor Pinion's Letter/);
  await page.evaluate(() => {
    const game = (window as unknown as { __game: { party: { inventory: string[] }[] } }).__game;
    game.party[0].inventory.push('pinionletter');
  });
  await page.keyboard.press('ArrowUp');
  await expect(menuTitle(page)).toHaveText("Go into Pinion's Clocktower?");
  await page.keyboard.press('y');
  await expect(page.locator('#location')).toHaveText("Pinion's Clocktower - The Workshop (level 1)");
  await expect(log(page).last()).toHaveText(/leaves Professor Pinion's Letter behind/);

  // The stairs out of a tower lead down to the street.
  await page.keyboard.press('e');
  await expect(menuTitle(page)).toHaveText('Go back down to the street?');
  await page.keyboard.press('y');
  await expect(page.locator('#location')).toHaveText('Talonreach - Clock Lane');
});

test('the East Gate opens for eight feathers, and the twelfth feather ends the story', async ({ page }) => {
  await startWithParty(page);
  const setUp = (script: string) => page.evaluate(script);
  const go = (x: number, y: number, dir: number) =>
    setUp(`import('/src/screens/dungeon.ts').then(({ dungeonScreen }) => {
      const g = window.__game; g.state.location = { dungeon: 'talonreach', level: 0, x: ${x}, y: ${y}, dir: ${dir} }; g.go(dungeonScreen);
    })`);
  await go(33, 10, 1);
  await page.keyboard.press('ArrowUp');
  await expect(log(page).last()).toHaveText(/You need 8 of Aquila's feathers/);
  await setUp(`window.__game.state.feathers = ['crown', 'grave', 'altar', 'sceptre', 'drain', 'cog', 'pendulum', 'tin']`);
  await page.keyboard.press('ArrowUp');
  await expect(menuTitle(page)).toHaveText('Go into The Moulted Wood?');
  await page.keyboard.press('y');
  await expect(page.locator('#location')).toHaveText('The Moulted Wood - The Fringe (level 1)');
  await page.keyboard.press('e');
  await expect(menuTitle(page)).toHaveText('Go back to Talonreach?');
  await page.keyboard.press('y');
  await expect(page.locator('#location')).toHaveText('Talonreach - East Gate Road');

  // All twelve feathers found, eleven already home: the last one ends the story.
  await setUp(`(() => {
    const s = window.__game.state;
    s.feathers = ['crown', 'grave', 'altar', 'sceptre', 'drain', 'cog', 'pendulum', 'tin', 'songbird', 'thorn', 'storm', 'heart'];
    s.offered = 11;
    for (const id of ['mq-roost', 'mq-gurgle', 'mq-clocktower', 'mq-wood']) s.quests[id] = { step: 9, count: 0, status: 'done' };
    s.quests['mq-spire'] = { step: 2, count: 0, status: 'active' };
  })()`);
  await go(15, 10, 1);
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('#location')).toHaveText('Victory!');
  await expect(log(page).last()).toHaveText(/Eagle's Tale is complete/);
});

test('after the ending, the North Gate opens onto Mount Talon', async ({ page }) => {
  await startWithParty(page);
  const setUp = (script: string) => page.evaluate(script);
  await setUp(`import('/src/screens/dungeon.ts').then(({ dungeonScreen }) => {
    const g = window.__game; g.state.location = { dungeon: 'talonreach', level: 0, x: 11, y: 1, dir: 0 }; g.go(dungeonScreen);
  })`);
  await page.keyboard.press('ArrowUp');
  await expect(log(page).last()).toHaveText(/North Gate.*It won't budge/);
  await setUp(`window.__game.state.story['aquila-home'] = true`);
  await page.keyboard.press('ArrowUp');
  await expect(menuTitle(page)).toHaveText('Climb Mount Talon?');
  await page.keyboard.press('y');
  await expect(page.locator('#location')).toHaveText("Mount Talon - The Pilgrims' Road (level 1)");
  await page.keyboard.press('e');
  await expect(menuTitle(page)).toHaveText('Go back to Talonreach?');
  await page.keyboard.press('y');
  await expect(page.locator('#location')).toHaveText(/^Talonreach - /);
});
