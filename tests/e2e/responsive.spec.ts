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

test('long station statements do not overlap rows or submit controls', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).__StationGameModal));
  await page.evaluate(() => {
    const modal = (window as any).__StationGameModal.get();
    modal.open('M04');
    const panel = modal.renderTrueFalseQuestionCard({
      question: 'Hãy tích chọn ĐÚNG hoặc SAI cho 4 mệnh đề sau đây:',
      statements: Array.from({ length: 4 }, () => ({ text: 'Một câu hỏi dài cần hiển thị đầy đủ nội dung để người chơi có thể đọc và chọn câu trả lời. '.repeat(3), is_true: true }))
    }, 'Kiểm tra bố cục', () => {});
    document.querySelector('.gs-station-body')!.replaceChildren(panel);
  });
  for (const [width, height] of [[1850, 1080], [1280, 720], [1024, 600], [390, 844]]) {
    await page.setViewportSize({ width, height });
    await expect.poll(() => page.evaluate(() => {
      const rows = [...document.querySelectorAll('.gs-tf-row')];
      return rows.every((row, i) => {
        const r = row.getBoundingClientRect();
        const text = row.querySelector('.gs-tf-statement')!.getBoundingClientRect();
        const next = (rows[i + 1] ?? document.querySelector('.gs-interactive-submit-row'))!.getBoundingClientRect();
        return text.bottom <= r.bottom && next.top >= r.bottom - 1 && r.right <= innerWidth;
      });
    })).toBe(true);
    await page.locator('.gs-fillin-submit-btn').scrollIntoViewIfNeeded();
    await expect(page.locator('.gs-fillin-submit-btn')).toBeInViewport();
  }
});
