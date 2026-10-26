import { expect, test } from '@playwright/test';
import map from '../../public/assets/maps/hub.json' with { type: 'json' };
import { hubState, walkToStation } from './helpers/hub';

test('closer camera keeps the approached station plaque below HUD and scales to desktop displays', async ({ page }) => {
  await page.goto('/?mode=explore&lang=vi');
  await page.getByRole('button', { name: 'Bắt đầu · Start', exact: true }).click();
  await expect.poll(async () => (await hubState(page)).scene).toBe('Hub');
  await walkToStation(page, 'M02');
  for (const [width, height] of [[1280, 720], [1920, 1080], [2560, 1440]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const frame = await hubState(page);
    expect(frame.camera?.worldView, 'camera exposes actual rendered world extent').toBeDefined();
    const world = frame.camera!.worldView!, viewport = frame.camera!.viewport!;
    expect(world.width).toBeCloseTo(1024, 0);
    expect(viewport.y).toBeGreaterThanOrEqual(96);
    const visible = frame.stationLabels!.filter(({ bounds: b }) => b.x >= viewport.x && b.y >= viewport.y && b.x + b.width <= viewport.x + viewport.width && b.y + b.height <= viewport.y + viewport.height);
    expect(visible.some(label => label.id === 'M02'), 'the approached station has a complete name and status plaque').toBe(true);
    for (const { bounds: b } of visible) expect(b.y).toBeGreaterThanOrEqual(96);
    for (const [index, first] of visible.entries()) for (const second of visible.slice(index + 1)) {
      const a = first.bounds, b = second.bounds;
      expect(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y, `${first.id} and ${second.id} plaques overlap`).toBe(true);
    }
    expect(world.x).toBeGreaterThanOrEqual(-64); expect(world.x + world.width).toBeLessThanOrEqual(map.width * map.tileSize + 64);
    expect(world.y).toBeGreaterThanOrEqual(-64); expect(world.y + world.height).toBeLessThanOrEqual(map.height * map.tileSize + 64);
    const canvas = await page.locator('canvas').boundingBox();
    expect(canvas!.width / canvas!.height).toBeCloseTo(16 / 9, 2);
    const logical = await page.locator('canvas').evaluate((node: HTMLCanvasElement) => ({ width: node.width, height: node.height }));
    expect(logical).toEqual({ width: 1280, height: 720 });
    for (const { id, bounds } of visible) {
      const plaque = { x: canvas!.x + bounds.x * canvas!.width / logical.width, y: canvas!.y + bounds.y * canvas!.height / logical.height,
        width: bounds.width * canvas!.width / logical.width, height: bounds.height * canvas!.height / logical.height };
      for (const control of await page.locator('#hud .location, #hud button').all()) {
        const hud = await control.boundingBox();
        if (!hud) continue;
        expect(plaque.x + plaque.width <= hud.x || hud.x + hud.width <= plaque.x || plaque.y + plaque.height <= hud.y || hud.y + hud.height <= plaque.y,
          `${id} plaque overlaps a visible HUD control at ${width}×${height}`).toBe(true);
      }
    }
    await page.screenshot({ path: `output/playtest/campus-hub-vi-${width}.png` });
  }
});

test('legacy return inside a rebuilt station recovers to the plaza without losing stamps', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('cultural-trails-v1', JSON.stringify({
    schemaVersion: 1, contentVersion: 'fictional-demo-1', mode: 'explore', locale: 'en',
    statuses: { M01: 'completed', M02: 'not-started', M03: 'not-started', M04: 'not-started' },
    passportStamps: ['M01'], learnedFactIds: ['demo-paper'], hubReturnPosition: { x: 1120, y: 816 },
  })));
  await page.goto('/?mode=explore&lang=en');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect.poll(async () => (await hubState(page)).scene).toBe('Hub');
  const recovered = await hubState(page);
  expect(recovered.player).toEqual(map.spawn);
  expect(recovered.stamps).toEqual(['M01']);
  expect(recovered.statuses.M01).toBe('completed');
  await page.locator('#game-container').focus();
  await page.keyboard.down('a'); await page.waitForTimeout(200); await page.keyboard.up('a');
  expect((await hubState(page)).player!.x).toBeLessThan(map.spawn.x);
});

test('the fourth station entrance is reachable on foot while its activity stays unavailable', async ({ page }) => {
  await page.goto('/?mode=explore&lang=en');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect.poll(async () => (await hubState(page)).scene).toBe('Hub');
  await walkToStation(page, 'M04');
  await page.locator('#interact').click();
  await page.locator('#modal').getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.locator('#modal')).toContainText('Available later');
  await expect(page.getByRole('button', { name: 'Enter studio', exact: true })).toHaveCount(0);
  expect((await hubState(page)).stamps).toEqual([]);
});
