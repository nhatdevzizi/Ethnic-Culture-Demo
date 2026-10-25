import { test, expect } from '@playwright/test';
test('cold static build completes M01 without external assets or developer hooks', async ({ page }) => {
  const remote: string[] = []; const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname !== '127.0.0.1') { remote.push(url.href); await route.abort(); }
    else await route.continue();
  });
  await page.goto('/?mode=explore&lang=vi');
  await expect(page.getByRole('heading', { name: 'Hành Trình Sắc Màu' })).toBeVisible();
  expect(await page.evaluate(() => 'render_game_to_text' in window || 'advanceTime' in window)).toBe(false);
  await page.getByRole('button', { name: 'Bắt đầu · Start', exact: true }).click();
  await expect(page.locator('#interact')).toBeVisible();
  await page.locator('#game-container').focus();
  await page.keyboard.down('d'); await page.waitForTimeout(1200); await page.keyboard.up('d');
  await expect(page.locator('#interact')).toContainText('Xưởng Sắp Xếp');
  await page.locator('#interact').click();
  await page.getByRole('button', { name: 'Vào xưởng · Enter', exact: true }).click();
  await page.getByRole('button', { name: 'Thử ngay · Begin', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Bỏ qua · Skip', exact: true })).toHaveCount(0);
  for (const [index, id] of ['plan', 'cut', 'assemble'].entries()) {
    await page.getByTestId(`card-${id}`).click(); await page.getByTestId(`slot-${index}`).click();
  }
  await page.getByRole('button', { name: 'Về vườn & nhận dấu', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Hộ chiếu · Passport 1/1', exact: true })).toBeVisible();
  await page.screenshot({ path: 'output/playtest/production-vi-return.png' });
  expect(errors).toEqual([]); expect(remote).toEqual([]);
});
