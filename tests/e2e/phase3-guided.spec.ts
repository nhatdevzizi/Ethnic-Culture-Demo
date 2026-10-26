import { expect, test, type Page } from '@playwright/test';

type State = { scene: string; nearby?: string; player?: { x: number; y: number }; stamps: string[]; statuses: Record<string, string> };
const state = (page: Page): Promise<State> => page.evaluate(() => JSON.parse((window as unknown as { render_game_to_text(): string }).render_game_to_text()));

async function start(page: Page, mode = 'presentation') {
  await page.goto(`/?mode=${mode}&lang=en&seed=42`);
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect.poll(async () => (await state(page)).scene).toBe('Hub');
}
async function presenter(page: Page) {
  await page.getByRole('button', { name: 'Presenter', exact: true }).click();
  return page.locator('#modal');
}
async function travel(page: Page, id: string, title: string) {
  await expect(page.getByTestId('route-hint')).toContainText(title);
  const modal = await presenter(page);
  await expect(modal).toContainText(title);
  await modal.getByRole('button', { name: 'Go to next activity', exact: true }).click();
  await expect.poll(async () => (await state(page)).nearby).toBe(id);
  const position = (await state(page)).player!;
  await page.locator('#interact').click();
  await page.getByRole('button', { name: 'Enter studio', exact: true }).click();
  await page.getByRole('button', { name: 'Begin', exact: true }).click();
  return position;
}
async function skip(page: Page) {
  await page.locator('#game-container').focus();
  await page.keyboard.press('n');
  await expect.poll(async () => (await state(page)).scene).toBe('Hub');
}
async function finish(page: Page) {
  const modal = await presenter(page);
  await modal.getByRole('button', { name: 'Finish', exact: true }).click();
  await expect.poll(async () => (await state(page)).scene).toBe('Ending');
}

test('guided tutorial, three skips, honest recap and source credits', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await start(page);
  await expect(page.getByTestId('tutorial')).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss tutorial', exact: true }).click();
  await expect(page.getByTestId('tutorial')).toBeHidden();
  await page.reload();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByTestId('tutorial')).toBeHidden();
  const modal = await presenter(page);
  await modal.getByRole('button', { name: 'Tutorial', exact: true }).click();
  await expect(page.getByTestId('tutorial')).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss tutorial', exact: true }).click();
  await page.screenshot({ path: 'output/playtest/phase3-hub-1280.png' });

  for (const [id, title] of [['M01', 'Pattern Studio'], ['M02', 'Sound Garden'], ['M03', 'Story Trail']]) {
    const position = await travel(page, id, title);
    await skip(page);
    const returned = await state(page);
    expect(returned.statuses[id]).toBe('skipped');
    expect(returned.stamps).toEqual([]);
    expect(returned.player!.x).toBeCloseTo(position.x, 0);
    expect(returned.player!.y).toBeCloseTo(position.y, 0);
  }
  await expect(page.getByTestId('route-hint')).toContainText('Review journey');
  await presenter(page);
  await page.screenshot({ path: 'output/playtest/phase3-presenter-1280.png' });
  await page.keyboard.press('Escape');
  await finish(page);
  await expect(page.getByTestId('review-card')).toHaveCount(3);
  for (const id of ['M01', 'M02', 'M03']) {
    const card = page.locator(`[data-testid="review-card"][data-station-id="${id}"]`);
    await expect(card).toHaveAttribute('data-status', 'skipped');
    await expect(card).toContainText('Skipped');
    await expect(card).not.toContainText('plan → cut → assemble');
  }
  await expect(page.locator('#demo-badge')).toContainText('DEMO');
  await page.screenshot({ path: 'output/playtest/phase3-ending-1280.png' });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.screenshot({ path: 'output/playtest/phase3-ending-1920.png' });
  await page.getByRole('button', { name: 'Sources & credits', exact: true }).click();
  await expect(page.locator('#modal')).toBeVisible();
  await expect(page.locator('#modal a[href^="https://"]').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('earned learning and stamps remain distinct from skipped stations', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: 'Dismiss tutorial', exact: true }).click();
  await travel(page, 'M01', 'Pattern Studio');
  for (const [index, id] of ['plan', 'cut', 'assemble'].entries()) {
    await page.getByTestId(`card-${id}`).click();
    await page.getByTestId(`slot-${index}`).click();
  }
  await page.getByRole('button', { name: 'Return & collect stamp', exact: true }).click();
  await expect.poll(async () => (await state(page)).scene).toBe('Hub');
  expect((await state(page)).stamps).toEqual(['M01']);
  await page.locator('#interact').click();
  await page.getByRole('button', { name: 'Enter studio', exact: true }).click();
  await page.getByRole('button', { name: 'Begin', exact: true }).click();
  for (const [index, id] of ['plan', 'cut', 'assemble'].entries()) {
    await page.getByTestId(`card-${id}`).click();
    await page.getByTestId(`slot-${index}`).click();
  }
  await page.getByRole('button', { name: 'Return & collect stamp', exact: true }).click();
  await expect.poll(async () => (await state(page)).scene).toBe('Hub');
  expect((await state(page)).stamps).toEqual(['M01']);
  await travel(page, 'M02', 'Sound Garden'); await skip(page);
  await travel(page, 'M03', 'Story Trail'); await skip(page);
  await finish(page);
  const completed = page.locator('[data-testid="review-card"][data-station-id="M01"]');
  await expect(completed).toHaveAttribute('data-status', 'completed');
  await expect(completed).toContainText('plan → cut → assemble');
  await expect(page.locator('[data-testid="review-card"][data-station-id="M02"]')).toHaveAttribute('data-status', 'skipped');
});

test('explore mode remains free of forced tutorial and presenter route', async ({ page }) => {
  await start(page, 'explore');
  await expect(page.getByTestId('tutorial')).toHaveCount(0);
  await expect(page.getByTestId('route-hint')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Presenter', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Passport 0/3', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.locator('#modal').getByRole('button', { name: 'Finish', exact: true }).click();
  await expect(page.getByTestId('review-card')).toHaveCount(3);
  await expect(page.locator('[data-testid="review-card"][data-status="not-started"]')).toHaveCount(3);
  await expect(page.locator('.fact-body')).toHaveCount(0);
  expect((await state(page)).stamps).toEqual([]);
});

test('all three guided activities complete with earned recap and Vietnamese ending', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await start(page);
  await page.getByRole('button', { name: 'Dismiss tutorial', exact: true }).click();
  await travel(page, 'M01', 'Pattern Studio');
  for (const [index, id] of ['plan', 'cut', 'assemble'].entries()) {
    await page.getByTestId(`card-${id}`).click(); await page.getByTestId(`slot-${index}`).click();
  }
  await page.getByRole('button', { name: 'Return & collect stamp', exact: true }).click();
  await expect.poll(async () => (await state(page)).scene).toBe('Hub');
  await travel(page, 'M02', 'Sound Garden');
  await page.getByTestId('rhythm-mode-untimed').click(); await page.getByTestId('rhythm-start').click();
  for (const hit of [true, false, true, true, false, true]) await page.getByTestId(hit ? 'rhythm-tap' : 'rhythm-rest').click();
  await page.getByRole('button', { name: 'Return & collect stamp', exact: true }).click();
  await expect.poll(async () => (await state(page)).scene).toBe('Hub');
  await travel(page, 'M03', 'Story Trail');
  for (const id of ['quiet', 'captions', 'schedule']) {
    await page.getByTestId(`story-helper-${id}`).click(); await page.getByTestId('story-choice-ask').click();
  }
  await page.getByTestId('story-plan-choice').click();
  await page.getByRole('button', { name: 'Return & collect stamp', exact: true }).click();
  await expect.poll(async () => (await state(page)).scene).toBe('Hub');
  expect((await state(page)).stamps).toEqual(['M01', 'M02', 'M03']);
  await expect(page.getByRole('button', { name: 'Passport 3/3', exact: true })).toBeVisible();
  await expect(page.getByTestId('route-hint')).toContainText('Review journey');
  await finish(page);
  await expect(page.locator('[data-testid="review-card"][data-status="completed"]')).toHaveCount(3);
  await expect(page.locator('.fact-body')).toHaveCount(3);
  await expect(page.locator('[data-station-id="M01"] .fact-body')).toContainText('plan → cut → assemble');
  await expect(page.locator('[data-station-id="M02"] .fact-body')).toContainText('HIT-rest-HIT-HIT-rest-HIT');
  await expect(page.locator('[data-station-id="M03"] .fact-body')).toContainText('individual needs');
  await page.goto('/?mode=presentation&lang=vi');
  await page.getByRole('button', { name: 'Tiếp tục · Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Điều khiển trình bày', exact: true }).click();
  await page.locator('#modal').getByRole('button', { name: 'Kết thúc · Finish', exact: true }).click();
  await expect(page.locator('[data-testid="review-card"][data-status="completed"]')).toHaveCount(3);
  await expect(page.locator('[data-station-id="M01"] .fact-body')).toContainText('phác thảo → cắt giấy → ghép hình');
  await page.screenshot({ path: 'output/playtest/phase3-ending-vi-1280.png' });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.screenshot({ path: 'output/playtest/phase3-ending-vi-1920.png' });
  expect(errors).toEqual([]);
});

test('sound starts off, can be enabled and adjusted, and hidden rhythm stays paused', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await start(page);
  const modal = await presenter(page);
  await expect(modal.getByRole('button', { name: 'Sound off', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await modal.getByRole('button', { name: 'Sound off', exact: true }).click();
  await expect(modal.getByRole('button', { name: 'Sound on', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const volume = modal.getByRole('slider', { name: 'Volume', exact: true });
  await volume.focus();
  await expect(volume).toBeFocused();
  await page.keyboard.press('Home');
  for (let step = 0; step < 5; step++) await page.keyboard.press('ArrowRight');
  await expect(volume).toHaveValue('0.25');
  await page.keyboard.press('Escape');
  await page.locator('#game-container').focus();
  await page.keyboard.press('m');
  await presenter(page);
  await expect(modal.getByRole('button', { name: 'Sound off', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('Escape');
  await travel(page, 'M01', 'Pattern Studio'); await skip(page);
  await travel(page, 'M02', 'Sound Garden');
  await page.getByTestId('rhythm-start').click();
  const index = await page.getByTestId('rhythm-board').getAttribute('data-index');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.locator('#modal')).toBeVisible();
  await page.evaluate(() => (window as unknown as { advanceTime(ms: number): void }).advanceTime(6000));
  await expect(page.getByTestId('rhythm-board')).toHaveAttribute('data-index', index!);
  await page.evaluate(() => { Reflect.deleteProperty(document, 'hidden'); document.dispatchEvent(new Event('visibilitychange')); });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  expect(errors).toEqual([]);
});

test('missing optional audio still permits captioned rhythm completion', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/assets/audio/*.wav', route => route.abort());
  await start(page);
  await presenter(page);
  const failed = page.waitForEvent('requestfailed', request => request.url().endsWith('/assets/audio/tap.wav'));
  await page.getByRole('button', { name: 'Sound off', exact: true }).click();
  await failed;
  await page.keyboard.press('Escape');
  await presenter(page);
  await expect(page.getByTestId('audio-status')).toContainText('Sound is unavailable');
  await page.keyboard.press('Escape');
  await travel(page, 'M01', 'Pattern Studio'); await skip(page);
  await travel(page, 'M02', 'Sound Garden');
  await page.getByTestId('rhythm-mode-untimed').click();
  await page.getByTestId('rhythm-start').click();
  for (const hit of [true, false, true, true, false, true]) await page.getByTestId(hit ? 'rhythm-tap' : 'rhythm-rest').click();
  await expect(page.getByRole('heading', { name: 'Rhythm complete', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Return & collect stamp', exact: true }).click();
  await expect.poll(async () => (await state(page)).stamps).toEqual(['M02']);
  expect(errors).toEqual([]);
});

test('native local cues play and pause without stale playback on resume or scene return', async ({ page }) => {
  await page.addInitScript(() => {
    const probe = { plays: [] as string[], clips: [] as HTMLMediaElement[] };
    Object.assign(window, { __audioProbe: probe });
    const observe = (clip: HTMLMediaElement) => {
      if (clip.src.includes('/assets/audio/') && !probe.clips.includes(clip)) probe.clips.push(clip);
    };
    const nativePlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      observe(this);
      return nativePlay.call(this).then(() => { probe.plays.push(this.currentSrc || this.src); });
    };
    const nativePause = HTMLMediaElement.prototype.pause;
    HTMLMediaElement.prototype.pause = function () { observe(this); nativePause.call(this); };
  });
  const playback = () => page.evaluate(() => {
    const probe = (window as unknown as { __audioProbe: { plays: string[]; clips: HTMLMediaElement[] } }).__audioProbe;
    return { plays: probe.plays.slice(), clips: probe.clips.map(clip => ({ paused: clip.paused, time: clip.currentTime })) };
  });
  await start(page);
  const modal = await presenter(page);
  await modal.getByRole('button', { name: 'Sound off', exact: true }).click();
  await expect(modal.getByRole('button', { name: 'Sound on', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await travel(page, 'M01', 'Pattern Studio'); await skip(page);
  await travel(page, 'M02', 'Sound Garden');
  await page.getByTestId('rhythm-mode-untimed').click(); await page.getByTestId('rhythm-start').click();
  await expect.poll(async () => (await playback()).plays.some(src => src.endsWith('/tap.wav'))).toBe(true);
  await page.getByTestId('rhythm-tap').click();
  await expect.poll(async () => (await playback()).plays.some(src => src.endsWith('/rest.wav'))).toBe(true);
  await page.locator('#game-container').focus(); await page.keyboard.press('p');
  const paused = await playback();
  expect(paused.clips).toHaveLength(3);
  expect(paused.clips.every(clip => clip.paused && clip.time === 0)).toBe(true);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  // Observe a full cue duration: resuming untimed play must not replay the paused cue.
  await page.waitForTimeout(250);
  expect((await playback()).plays).toHaveLength(paused.plays.length);
  await page.getByTestId('rhythm-rest').click();
  await expect.poll(async () => (await playback()).plays.length).toBe(paused.plays.length + 1);
  await skip(page);
  const returned = await playback();
  expect(returned.clips.every(clip => clip.paused && clip.time === 0)).toBe(true);
  await page.waitForTimeout(250);
  expect((await playback()).plays).toHaveLength(returned.plays.length);
});
