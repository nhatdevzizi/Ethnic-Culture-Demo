import { expect, test } from '@playwright/test';
import { hubState, moveHub, walkToStation } from './helpers/hub';

test('larger seeded world keeps four different living trails and a closer camera', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const generatedArt: string[] = [];
  page.on('request', request => { if (/\/assets\/(sprites|tiles)\/.+\.svg$/.test(new URL(request.url()).pathname)) generatedArt.push(request.url()); });
  await page.goto('/?mode=explore&lang=en&seed=42');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect.poll(async () => (await hubState(page)).scene).toBe('Hub');
  const first = await hubState(page);
  expect(first.worldSize).toEqual({ width: 2560, height: 1920 });
  expect(first.camera!.worldView!.width).toBeCloseTo(1024, 0);
  expect(new Set(first.routes!.map(route => route.theme)).size).toBe(4);
  expect(first.links!.length).toBeGreaterThan(0); expect(first.roadTiles).toBeGreaterThan(100);
  for (let n = 1; n <= 4; n++) expect(first.decorations?.[`supplied-biome-${n}`]).toBeGreaterThan(0);
  expect(generatedArt).toEqual([]);
  for (const count of first.sceneryCounts!) {
    expect(count.plants).toBeGreaterThan(0); expect(count.animals).toBe(0); expect(count.landmarks).toBeGreaterThan(0);
  }
  await expect(page.getByTestId('trail-map')).toBeVisible();
  await page.screenshot({ path: 'output/playtest/living-trails-plaza.png' });
  await page.reload(); await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect.poll(async () => (await hubState(page)).scene).toBe('Hub');
  expect((await hubState(page)).routes).toEqual(first.routes);
  await page.goto('/?mode=explore&lang=en&seed=43');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect.poll(async () => (await hubState(page)).scene).toBe('Hub');
  expect((await hubState(page)).routes).not.toEqual(first.routes);
  expect(errors).toEqual([]);
});

for (const [id, theme] of [['M01', 'Flower Meadow'], ['M02', 'Reed Wetlands'], ['M03', 'Whispering Woods'], ['M04', 'Stone Highlands']]) {
  test(`${id} has a clear walkable road through ${theme}`, async ({ page }) => {
    await page.goto('/?mode=explore&lang=en&seed=42');
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await walkToStation(page, id);
    await expect(page.locator('.hub-biome-label')).toHaveText(theme);
    await expect(page.locator(`.hub-station-label[data-station="${id}"]`)).toBeVisible();
    const frame = await hubState(page), view = frame.camera!.worldView!;
    expect(view.x).toBeGreaterThanOrEqual(0); expect(view.y).toBeGreaterThanOrEqual(0);
    expect(view.x + view.width).toBeLessThanOrEqual(2560); expect(view.y + view.height).toBeLessThanOrEqual(1920);
    await page.screenshot({ path: `output/playtest/living-trails-${id}.png` });
  });
}

test('lakeside bridge is aligned with the water and can be crossed on foot', async ({ page }) => {
  await page.goto('/?mode=explore&lang=en&seed=42');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await walkToStation(page, 'M02');
  for (const target of [{ x: 704, y: 496 }, { x: 704, y: 396 }, { x: 1016, y: 396 }]) {
    for (const axis of ['x', 'y'] as const) {
      const position = (await hubState(page)).player!, distance = target[axis] - position[axis];
      if (Math.abs(distance) > 3) await moveHub(page, axis === 'x' ? distance > 0 ? 'd' : 'a' : distance > 0 ? 's' : 'w', Math.abs(distance) / 160 * 1000);
      expect(Math.abs((await hubState(page)).player![axis] - target[axis])).toBeLessThan(10);
    }
  }
  await page.screenshot({ path: 'output/playtest/scenery-lakeside-bridge.png' });
});
