import { test, expect } from '@playwright/test';
import { moveHub, walkToStation } from './helpers/hub';
import hubMap from '../../public/assets/maps/hub.json' with { type: 'json' };
type GameSnapshot = { scene: string; player?: { x: number; y: number }; camera?: { x: number; y: number; worldView: { x: number; y: number; width: number; height: number } }; nearby?: string; stamps: string[]; statuses: Record<string, string>; returnPosition: { x: number; y: number }; puzzle?: { slots: (string | null)[] } };
const snapshot = (page: import('@playwright/test').Page): Promise<GameSnapshot> => page.evaluate(() => JSON.parse((window as unknown as { render_game_to_text: () => string }).render_game_to_text()));
async function start(page: import('@playwright/test').Page) {
  await page.goto('/?mode=presentation&lang=en&seed=42');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).scene).toBe('Hub');
}
async function enter(page: import('@playwright/test').Page) {
  await expect.poll(async () => (await snapshot(page)).nearby).toBe('M01');
  await page.keyboard.press('e');
  await page.getByRole('button', { name: 'Enter studio', exact: true }).click();
  await page.getByRole('button', { name: 'Begin', exact: true }).click();
}

test('title to guide to drag puzzle to same portal, replay and pause', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?mode=presentation&lang=en&seed=42');
  await expect(page.getByRole('heading', { name: 'Cultural Trails' })).toBeVisible();
  await page.screenshot({ path: 'output/playtest/title-1280.png' });
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).nearby).toBe('guide');
  await page.keyboard.press('e');
  await expect(page.getByRole('dialog')).toContainText('imaginary exhibition');
  const beforeDialogue = (await snapshot(page)).player;
  await page.keyboard.down('d'); await page.waitForTimeout(200); await page.keyboard.up('d');
  expect((await snapshot(page)).player).toEqual(beforeDialogue);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.screenshot({ path: 'output/playtest/hub-1280.png' });
  await walkToStation(page, 'M01');
  const portalPosition = (await snapshot(page)).player!;
  await enter(page);
  await page.getByTestId('card-cut').dragTo(page.getByTestId('slot-0'));
  await expect(page.getByRole('status').filter({ hasText: 'different step' })).toBeVisible();
  for (const [index, id] of ['plan', 'cut', 'assemble'].entries()) await page.getByTestId(`card-${id}`).dragTo(page.getByTestId(`slot-${index}`));
  await expect(page.getByRole('heading', { name: 'The model is ready!' })).toBeVisible();
  await page.screenshot({ path: 'output/playtest/m01-completed-1280.png' });
  await page.getByRole('button', { name: 'Return & collect stamp', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).scene).toBe('Hub');
  const returned = await snapshot(page);
  expect(returned.stamps).toEqual(['M01']);
  expect(returned.player!.x).toBeCloseTo(portalPosition.x, 0); expect(returned.player!.y).toBeCloseTo(portalPosition.y, 0);
  await page.keyboard.press('p');
  const paused = (await snapshot(page)).player;
  await page.keyboard.down('d'); await page.waitForTimeout(250); await page.keyboard.up('d');
  expect((await snapshot(page)).player).toEqual(paused);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await enter(page);
  for (const [index, id] of ['plan', 'cut', 'assemble'].entries()) {
    await page.getByTestId(`card-${id}`).focus(); await page.keyboard.press('Enter');
    await page.getByTestId(`slot-${index}`).focus(); await page.keyboard.press('Enter');
  }
  await page.getByRole('button', { name: 'Return & collect stamp', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).scene).toBe('Hub');
  expect((await snapshot(page)).stamps).toEqual(['M01']);
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).stamps).toEqual(['M01']);
  expect(errors).toEqual([]);
});

test('movement, collision, camera bounds, skip and resize', async ({ page }) => {
  await start(page);
  await walkToStation(page, 'M02');
  await moveHub(page, 'w', 1000);
  const north = (await snapshot(page)).player!;
  expect(north.y).toBeGreaterThan(320);
  expect(north.y).toBeLessThan(416);
  await moveHub(page, 's', 2000);
  await moveHub(page, 'a', 6000);
  const west = await snapshot(page);
  expect(west.player!.x).toBeGreaterThanOrEqual(32); expect(west.camera!.worldView.x).toBeGreaterThanOrEqual(-64);
  expect(west.camera!.worldView.x + west.camera!.worldView.width).toBeLessThanOrEqual(hubMap.width * hubMap.tileSize);
  await moveHub(page, 'a', 250);
  expect((await snapshot(page)).player!.x).toBeCloseTo(west.player!.x, 0);
  await page.reload(); await page.getByRole('button', { name: 'Start', exact: true }).click();
  await walkToStation(page, 'M01'); await enter(page);
  await page.screenshot({ path: 'output/playtest/m01-1280.png' });
  await page.keyboard.press('r'); await page.getByRole('button', { name: 'Restart this attempt', exact: true }).click();
  await page.getByRole('button', { name: 'Begin', exact: true }).click();
  expect((await snapshot(page)).puzzle!.slots).toEqual([null, null, null]);
  await page.getByTestId('card-plan').focus(); await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toContainText('activity is paused');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.keyboard.press('n');
  await expect.poll(async () => (await snapshot(page)).scene).toBe('Hub');
  expect((await snapshot(page)).statuses.M01).toBe('skipped'); expect((await snapshot(page)).stamps).toEqual([]);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.screenshot({ path: 'output/playtest/hub-1920.png' });
  const canvas = await page.locator('canvas').boundingBox();
  expect(canvas!.width / canvas!.height).toBeCloseTo(16 / 9, 2);
  await page.keyboard.press('p'); await page.getByRole('button', { name: 'Finish', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Thank you for visiting' })).toBeVisible();
});

test('missing map shows a recoverable error and malformed saves still launch', async ({ page }) => {
  await page.route('**/assets/maps/hub.json', route => route.abort());
  await page.goto('/?lang=en');
  await expect(page.getByRole('heading', { name: 'The game could not start' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reload', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Reload', exact: true })).toBeVisible();
  await page.unroute('**/assets/maps/hub.json');
  await page.evaluate(() => localStorage.setItem('cultural-trails-v1', '{broken'));
  await page.getByRole('button', { name: 'Reload', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Cultural Trails' })).toBeVisible();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect.poll(async () => (await snapshot(page)).scene).toBe('Hub');
  expect((await snapshot(page)).stamps).toEqual([]);
});
