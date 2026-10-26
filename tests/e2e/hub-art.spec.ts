import { expect, test } from '@playwright/test';
import { hubState, moveHub, walkToStation } from './helpers/hub';

test('house labels stay sharp and instructors keep the station return path working', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?mode=explore&lang=vi');
  await page.getByRole('button', { name: 'Bắt đầu · Start', exact: true }).click();
  await expect.poll(async () => (await hubState(page)).scene).toBe('Hub');
  await walkToStation(page, 'M01');
  for (const [width, height] of [[1280, 720], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    const labels = page.locator('.hub-station-label:visible');
    await expect(page.locator('.hub-station-label[data-station="M01"]')).toBeVisible();
    for (const label of await labels.all()) {
      const metrics = await label.evaluate(node => {
        const title = node.querySelector('strong')!;
        const style = getComputedStyle(title);
        return { font: style.fontFamily, size: parseFloat(style.fontSize), weight: Number(style.fontWeight), fits: title.scrollWidth <= title.clientWidth };
      });
      expect(metrics.font).toContain('Be Vietnam Pro');
      expect(metrics.size).toBeGreaterThanOrEqual(18);
      expect(metrics.weight).toBeGreaterThanOrEqual(700);
      expect(metrics.fits).toBe(true);
    }
    await page.screenshot({ path: `output/playtest/hub-art-vi-${width}.png` });
  }
  await moveHub(page, 'd', 650);
  await moveHub(page, 'w', 200);
  await expect.poll(async () => (await hubState(page)).nearby).toBe('M01-instructor');
  const position = (await hubState(page)).player;
  await page.locator('#interact').click();
  await page.getByRole('button', { name: 'Vào xưởng · Enter', exact: true }).click();
  await expect.poll(async () => (await hubState(page)).scene).toBe('PatternStudio');
  await expect(page.locator('.hub-station-label')).toHaveCount(0);
  await page.getByRole('button', { name: 'Thử ngay · Begin', exact: true }).click();
  for (const [index, id] of ['plan', 'cut', 'assemble'].entries()) {
    await page.getByTestId(`card-${id}`).dragTo(page.getByTestId(`slot-${index}`));
  }
  await page.locator('.completion button').click();
  await expect.poll(async () => (await hubState(page)).scene).toBe('Hub');
  const returned = await hubState(page);
  expect(returned.player).toEqual(position);
  expect(returned.stamps).toEqual(['M01']);
  await expect(page.locator('.hub-station-label')).toHaveCount(4);
  expect(errors).toEqual([]);
});
