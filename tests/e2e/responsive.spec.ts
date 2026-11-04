import { test, expect } from '@playwright/test';

test('canvas and interface fit the screen after resize', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  for (const [width, height] of [[1280, 720], [1920, 1080], [1024, 600], [667, 375], [390, 844]]) {
    await page.setViewportSize({ width, height });
    await expect.poll(async () => page.evaluate(() => {
      const app = document.querySelector('#app')!.getBoundingClientRect();
      const ui = document.querySelector('#ui')!.getBoundingClientRect();
      const canvas = document.querySelector('canvas')!.getBoundingClientRect();
      return Math.max(Math.abs(ui.width - app.width), Math.abs(ui.height - app.height),
        Math.abs(canvas.width - app.width), Math.abs(canvas.height - app.height));
    })).toBeLessThan(2);
    const bounds = await page.locator('#app').boundingBox();
    expect(bounds!.width).toBeLessThanOrEqual(width + 1);
    expect(bounds!.height).toBeLessThanOrEqual(height + 1);
  }
});
