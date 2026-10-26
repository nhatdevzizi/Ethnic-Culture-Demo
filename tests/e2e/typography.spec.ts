import { expect, test } from '@playwright/test';

const vietnamese = 'Hành Trình Sắc Màu · Xưởng Sắp Xếp · Lối Đi Câu Chuyện · Ăă Ââ Đđ Êê Ôô Ơơ Ưư ' +
  Array.from({ length: 0x1efa - 0x1ea0 }, (_, index) => String.fromCodePoint(0x1ea0 + index)).join('');

test('local fonts render Vietnamese precomposed and combining marks without system fallback', async ({ page, context }) => {
  await page.goto('/?lang=vi');
  await expect(page.getByRole('heading', { name: 'Hành Trình Sắc Màu' })).toBeVisible();
  expect(await page.locator('body').evaluate(node => getComputedStyle(node).fontFamily)).toContain('Be Vietnam Pro');
  expect(await page.locator('h1').evaluate(node => getComputedStyle(node).fontFamily)).toContain('Lora');
  await page.evaluate(sample => {
    for (const [id, family] of [['body-font', 'Be Vietnam Pro'], ['heading-font', 'Lora']]) {
      const probe = document.createElement('div'); probe.id = id;
      probe.style.cssText = `position:fixed;left:-9999px;font:500 28px "${family}"`;
      probe.textContent = sample + ' ' + sample.normalize('NFD'); document.body.append(probe);
    }
  }, vietnamese);
  await page.evaluate(() => document.fonts.ready);
  const cdp = await context.newCDPSession(page);
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument');
  for (const [selector, family] of [['#body-font', 'Be Vietnam Pro'], ['#heading-font', 'Lora']]) {
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector });
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    expect(fonts.length).toBeGreaterThan(0);
    expect(fonts.every(font => font.isCustomFont && font.familyName === family)).toBe(true);
  }
  await page.screenshot({ path: 'output/playtest/typography-title-vi-1280.png' });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.screenshot({ path: 'output/playtest/typography-title-vi-1920.png' });
});

test('house labels use sharp browser text and the loaded Vietnamese font', async ({ page }) => {
  await page.addInitScript(() => {
    const draws: { text: string; font: string }[] = [];
    Object.assign(window, { fontDraws: draws });
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      if (/[À-ỹ]/u.test(text) && draws.length < 60) draws.push({ text, font: this.font });
      if (maxWidth === undefined) fillText.call(this, text, x, y);
      else fillText.call(this, text, x, y, maxWidth);
    };
  });
  await page.goto('/?lang=vi');
  await page.getByRole('button', { name: 'Bắt đầu · Start', exact: true }).click();
  await expect(page.locator('#interact')).toBeVisible();
  const draws = await page.evaluate(() => (window as unknown as { fontDraws: { text: string; font: string }[] }).fontDraws);
  const label = page.locator('.hub-station-label[data-station="M01"] strong');
  await expect(label).toHaveText('Xưởng Sắp Xếp');
  expect(await label.evaluate(node => getComputedStyle(node).fontFamily)).toContain('Be Vietnam Pro');
  expect(draws.every(draw => draw.font.includes('Be Vietnam Pro'))).toBe(true);
  await page.screenshot({ path: 'output/playtest/typography-hub-vi-1280.png' });
});
