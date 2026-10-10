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

/** New game with the Guild's six ready-made heroes, standing in the town square. */
async function startWithParty(page: Page): Promise<void> {
  await page.goto('/');
  await page.keyboard.press('n');
  await page.keyboard.press('g');
  await page.getByRole('button', { name: 'Quick-start party' }).click();
  await page.keyboard.press('l');
  await expect(page.locator('#location')).toHaveText(/Talonreach/);
}

test('explore, camp, save, and continue the saved game', async ({ page }) => {
  await startWithParty(page);
  // No random fights, so the walk is predictable.
  await page.evaluate(async () => {
    const path = '/src/content/registry.ts';
    const { content } = await import(/* @vite-ignore */ path);
    for (const level of content.dungeon('roost').levels) level.encounterRate = 0;
  });
  await page.keyboard.press('d');
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
  await expect(log(page).last()).toHaveText('Game saved.');

  await page.reload();
  await page.keyboard.press('c'); // Continue saved game
  await expect(log(page).last()).toHaveText('Game loaded.');
  await expect(page.locator('#location')).toHaveText(/The Cellars/);
  await expect(page.locator('.party-card')).toHaveCount(6);
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

  await page.keyboard.press('e');
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
  await page.keyboard.press('s');
  await expect(log(page).last()).toHaveText(/Couldn't save/);
});
