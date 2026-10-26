import { test, expect } from '@playwright/test';
import { walkProductionToStation } from '../e2e/helpers/hub';
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
  const fonts = await page.evaluate(() => Array.from(document.fonts).map(face => ({ family: face.family.replace(/["']/g, ''), status: face.status })));
  expect(fonts.filter(face => face.family === 'Be Vietnam Pro' && face.status === 'loaded')).toHaveLength(4);
  expect(fonts.filter(face => face.family === 'Lora' && face.status === 'loaded')).toHaveLength(1);
  expect(await page.evaluate(() => 'render_game_to_text' in window || 'advanceTime' in window)).toBe(false);
  await page.getByRole('button', { name: 'Bắt đầu · Start', exact: true }).click();
  await expect(page.locator('#interact')).toBeVisible();
  await walkProductionToStation(page, 'M01');
  await expect(page.locator('#interact')).toContainText('Xưởng Sắp Xếp');
  await page.locator('#interact').click();
  await page.getByRole('button', { name: 'Vào xưởng · Enter', exact: true }).click();
  await page.getByRole('button', { name: 'Thử ngay · Begin', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Bỏ qua · Skip', exact: true })).toHaveCount(0);
  for (const [index, id] of ['plan', 'cut', 'assemble'].entries()) {
    await page.getByTestId(`card-${id}`).click(); await page.getByTestId(`slot-${index}`).click();
  }
  await page.getByRole('button', { name: 'Về vườn & nhận dấu', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Hộ chiếu · Passport 1/3', exact: true })).toBeVisible();
  await page.screenshot({ path: 'output/playtest/production-vi-return.png' });
  expect(errors).toEqual([]); expect(remote).toEqual([]);
});

test('production Vietnamese rhythm and story run with external assets blocked', async ({ page }) => {
  const remote: string[] = []; const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', async route => {
    if (new URL(route.request().url()).hostname !== '127.0.0.1') { remote.push(route.request().url()); await route.abort(); }
    else await route.continue();
  });
  const enter = async () => {
    await page.locator('#interact').click();
    await page.getByRole('button', { name: 'Vào xưởng · Enter', exact: true }).click();
    await page.getByRole('button', { name: 'Thử ngay · Begin', exact: true }).click();
  };
  await page.goto('/?mode=explore&lang=vi');
  await page.getByRole('button', { name: 'Bắt đầu · Start', exact: true }).click();
  await expect(page.locator('#interact')).toBeVisible();
  const rhythmEntrance = await walkProductionToStation(page, 'M02');
  await expect(page.locator('#interact')).toContainText('Vườn Âm Thanh'); await enter();
  await page.getByTestId('rhythm-mode-untimed').click(); await page.getByTestId('rhythm-start').click();
  for (const hit of [true, false, true, true, false, true]) await page.getByTestId(hit ? 'rhythm-tap' : 'rhythm-rest').click();
  await page.getByRole('button', { name: 'Về vườn & nhận dấu', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Hộ chiếu · Passport 1/3', exact: true })).toBeVisible();
  await walkProductionToStation(page, 'M03', rhythmEntrance);
  await expect(page.locator('#interact')).toContainText('Lối Đi Câu Chuyện'); await enter();
  for (const id of ['quiet', 'captions', 'schedule']) {
    await page.getByTestId(`story-helper-${id}`).click(); await page.getByTestId('story-choice-ask').click();
  }
  await page.getByTestId('story-plan-choice').click();
  await page.screenshot({ path: 'output/playtest/phase2-production-story-vi.png' });
  await page.getByRole('button', { name: 'Về vườn & nhận dấu', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Hộ chiếu · Passport 2/3', exact: true })).toBeVisible();
  expect(remote).toEqual([]); expect(errors).toEqual([]);
});

test('guided production loads original art and opt-in audio entirely from the local server', async ({ page }) => {
  const remote: string[] = [], images: string[] = [], errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (/\/assets\/(tiles|sprites)\/.+\.(svg|png)$/.test(new URL(response.url()).pathname) && response.ok()) images.push(response.url());
  });
  await page.route('**/*', async route => {
    if (new URL(route.request().url()).hostname !== '127.0.0.1') { remote.push(route.request().url()); await route.abort(); }
    else await route.continue();
  });
  await page.goto('/?mode=presentation&lang=en');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByTestId('tutorial')).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss tutorial', exact: true }).click();
  await page.getByRole('button', { name: 'Presenter', exact: true }).click();
  const loadedAudio = Promise.all(['tap', 'rest', 'stamp'].map(cue => page.waitForResponse(response => new URL(response.url()).pathname.endsWith(`/assets/audio/${cue}.wav`) && response.ok())));
  await page.getByRole('button', { name: 'Sound off', exact: true }).click();
  await loadedAudio;
  await expect(page.getByRole('button', { name: 'Sound on', exact: true })).toBeVisible();
  expect(images.length).toBeGreaterThanOrEqual(4);
  for (const key of ['instructor-a', 'instructor-b', 'demo-house']) {
    expect(images.some(url => url.endsWith(`/assets/sprites/${key}.png`))).toBe(true);
  }
  for (let n = 1; n <= 4; n++) expect(images.some(url => url.endsWith(`/assets/sprites/supplied-biome-${n}.png`))).toBe(true);
  for (const key of ['nature-roads', 'nature-houses', 'nature-workshop']) expect(images.some(url => url.endsWith(`/assets/sprites/${key}.png`))).toBe(true);
  expect(remote).toEqual([]); expect(errors).toEqual([]);
});
