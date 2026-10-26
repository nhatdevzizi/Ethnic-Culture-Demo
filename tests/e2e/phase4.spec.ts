import { expect, test, type Locator, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { hubState, moveHub } from './helpers/hub';

async function start(page: Page, mode = 'presentation') {
  await page.goto(`/?mode=${mode}&lang=en&seed=42`);
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect.poll(async () => (await hubState(page)).scene).toBe('Hub');
}
async function presenter(page: Page) {
  await page.getByRole('button', { name: 'Presenter', exact: true }).click();
  return page.locator('#modal');
}
async function enterNext(page: Page, id: string) {
  const modal = await presenter(page);
  await modal.getByRole('button', { name: 'Go to next activity', exact: true }).click();
  await expect.poll(async () => (await hubState(page)).nearby).toBe(id);
  await page.locator('#interact').click();
  await page.getByRole('button', { name: 'Enter studio', exact: true }).click();
  await page.getByRole('button', { name: 'Begin', exact: true }).click();
}
async function completePaper(page: Page) {
  for (const [index, id] of ['plan', 'cut', 'assemble'].entries()) {
    await page.getByTestId(`card-${id}`).click(); await page.getByTestId(`slot-${index}`).click();
  }
  await page.getByRole('button', { name: 'Return & collect stamp', exact: true }).click();
  await expect.poll(async () => (await hubState(page)).scene).toBe('Hub');
}
async function startRhythm(page: Page) {
  await start(page); await enterNext(page, 'M01'); await page.keyboard.press('n');
  await expect.poll(async () => (await hubState(page)).scene).toBe('Hub');
  await enterNext(page, 'M02'); await page.getByTestId('rhythm-start').click();
}
async function keyboardActivate(page: Page, target: Locator) {
  await expect(target).toBeVisible();
  for (let tabs = 0; tabs < 80; tabs++) {
    if (await target.evaluate(node => node === document.activeElement)) {
      await expect(target).toBeFocused(); await page.keyboard.press('Enter'); return;
    }
    const direction = await target.evaluate(node => {
      const root = document.querySelector('dialog[open]') ?? document;
      const controls = Array.from(root.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]'))
        .filter(control => control.getClientRects().length > 0);
      const active = controls.indexOf(document.activeElement as HTMLElement), destination = controls.indexOf(node as HTMLElement);
      return active >= 0 && destination >= 0 && destination < active ? 'Shift+Tab' : 'Tab';
    });
    await page.keyboard.press(direction);
  }
  throw new Error(`Keyboard focus could not reach ${await target.textContent()}`);
}
async function keyboardEnterNext(page: Page, id: string) {
  await keyboardActivate(page, page.getByRole('button', { name: 'Presenter', exact: true }));
  await keyboardActivate(page, page.locator('#modal').getByRole('button', { name: 'Go to next activity', exact: true }));
  await expect.poll(async () => (await hubState(page)).nearby).toBe(id);
  await page.keyboard.press('e');
  await keyboardActivate(page, page.getByRole('button', { name: 'Enter studio', exact: true }));
  await keyboardActivate(page, page.getByRole('button', { name: 'Begin', exact: true }));
}

test('keyboard-only guided run uses native tab order through all activities and ending', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?mode=presentation&lang=en&seed=42');
  await keyboardActivate(page, page.getByRole('button', { name: 'Start', exact: true }));
  await expect.poll(async () => (await hubState(page)).scene).toBe('Hub');
  await keyboardActivate(page, page.getByRole('button', { name: 'Dismiss tutorial', exact: true }));
  await page.keyboard.press('e');
  await expect(page.locator('#modal')).toContainText('imaginary exhibition');
  await page.keyboard.press('Space');
  await expect(page.locator('#modal').getByRole('button', { name: 'Close', exact: true })).toBeVisible();
  await page.keyboard.press('Space'); await expect(page.locator('#modal')).not.toBeVisible();
  await keyboardEnterNext(page, 'M01');
  for (const [index, id] of ['plan', 'cut', 'assemble'].entries()) {
    await keyboardActivate(page, page.getByTestId(`card-${id}`));
    await keyboardActivate(page, page.getByTestId(`slot-${index}`));
  }
  await keyboardActivate(page, page.getByRole('button', { name: 'Return & collect stamp', exact: true }));
  await expect.poll(async () => (await hubState(page)).scene).toBe('Hub');
  await keyboardEnterNext(page, 'M02');
  await keyboardActivate(page, page.getByTestId('rhythm-mode-untimed'));
  await keyboardActivate(page, page.getByTestId('rhythm-start'));
  for (const hit of [true, false, true, true, false, true]) await keyboardActivate(page, page.getByTestId(hit ? 'rhythm-tap' : 'rhythm-rest'));
  await keyboardActivate(page, page.getByRole('button', { name: 'Return & collect stamp', exact: true }));
  await expect.poll(async () => (await hubState(page)).scene).toBe('Hub');
  await keyboardEnterNext(page, 'M03');
  for (const id of ['quiet', 'captions', 'schedule']) {
    await keyboardActivate(page, page.getByTestId(`story-helper-${id}`));
    await keyboardActivate(page, page.getByTestId('story-choice-ask'));
  }
  await keyboardActivate(page, page.getByTestId('story-plan-choice'));
  await keyboardActivate(page, page.getByRole('button', { name: 'Return & collect stamp', exact: true }));
  await expect.poll(async () => (await hubState(page)).scene).toBe('Hub');
  await keyboardActivate(page, page.getByRole('button', { name: 'Presenter', exact: true }));
  await keyboardActivate(page, page.locator('#modal').getByRole('button', { name: 'Finish', exact: true }));
  await expect(page.locator('[data-testid="review-card"][data-status="completed"]')).toHaveCount(3);
  expect((await hubState(page)).stamps).toEqual(['M01', 'M02', 'M03']);
  await page.screenshot({ path: 'output/playtest/phase4-keyboard-ending.png' });
  expect(errors).toEqual([]);
});

test('low motion follows the OS default, persists an explicit choice, and preserves walking', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await start(page);
  await presenter(page);
  const lowMotion = page.getByRole('button', { name: 'Low motion', exact: true });
  await expect(lowMotion).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#app')).toHaveAttribute('data-low-motion', 'true');
  await lowMotion.click(); await expect(lowMotion).toHaveAttribute('aria-pressed', 'false');
  await page.reload(); await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-low-motion', 'false');
  await presenter(page); await page.getByRole('button', { name: 'Low motion', exact: true }).click();
  await page.keyboard.press('Escape');
  const before = (await hubState(page)).player!;
  await moveHub(page, 'a', 250);
  expect((await hubState(page)).player!.x).toBeLessThan(before.x - 10);
  await expect(page.locator('#app')).toHaveAttribute('data-low-motion', 'true');
  await page.screenshot({ path: 'output/playtest/phase4-low-motion.png' });
  await presenter(page);
  await page.getByRole('button', { name: 'Low motion', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'output/playtest/phase4-low-motion-control.png' });
});

test('fullscreen enters and exits through a real user gesture', async ({ page }) => {
  await start(page); await presenter(page);
  expect(await page.evaluate(() => document.fullscreenEnabled)).toBe(true);
  const full = page.locator('#modal').getByRole('button', { name: 'Fullscreen', exact: true });
  await keyboardActivate(page, full);
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.id)).toBe('app');
  await keyboardActivate(page, full);
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  await expect(page.locator('#modal')).toBeVisible();
});

test('fullscreen rejection gives a visible browser-control fallback', async ({ page }) => {
  await page.addInitScript(() => { Element.prototype.requestFullscreen = () => Promise.reject(new DOMException('Injected denial', 'NotAllowedError')); });
  await start(page); await presenter(page);
  await page.getByRole('button', { name: 'Fullscreen', exact: true }).click();
  await expect(page.locator('#toast')).toContainText('Fullscreen is unavailable');
  await expect(page.locator('#modal')).toBeVisible();
});

test('short and large windows retain progress, visible focus, and clear station plaques', async ({ page }) => {
  await start(page); await enterNext(page, 'M01'); await completePaper(page);
  for (const [width, height] of [[1280, 650], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const frame = await hubState(page), viewport = frame.camera!.viewport!;
    expect(frame.stamps).toEqual(['M01']);
    expect(viewport.y).toBeGreaterThanOrEqual(96);
    const canvas = (await page.locator('canvas').boundingBox())!;
    const visible = frame.stationLabels!.filter(({ bounds: b }) => b.x >= viewport.x && b.y >= viewport.y && b.x + b.width <= viewport.x + viewport.width && b.y + b.height <= viewport.y + viewport.height);
    expect(visible.some(label => label.id === 'M01')).toBe(true);
    for (const { id, bounds: b } of visible) for (const control of await page.locator('#hud .location, #hud button').all()) {
      const hud = await control.boundingBox(); if (!hud) continue;
      const label = { x: canvas.x + b.x * canvas.width / 1280, y: canvas.y + b.y * canvas.height / 720, width: b.width * canvas.width / 1280, height: b.height * canvas.height / 720 };
      expect(label.x + label.width <= hud.x || hud.x + hud.width <= label.x || label.y + label.height <= hud.y || hud.y + hud.height <= label.y, `${id} intersects HUD at ${width}×${height}`).toBe(true);
    }
    await keyboardActivate(page, page.getByRole('button', { name: 'Presenter', exact: true }));
    const resume = page.getByRole('button', { name: 'Resume', exact: true });
    for (let tabs = 0; tabs < 40 && !(await resume.evaluate(node => node === document.activeElement)); tabs++) await page.keyboard.press('Tab');
    await expect(resume).toBeFocused();
    const outline = await resume.evaluate(node => getComputedStyle(node).outlineStyle);
    expect(outline).not.toBe('none');
    const box = (await resume.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(0); expect(box.y + box.height).toBeLessThanOrEqual(height);
    await page.screenshot({ path: `output/playtest/phase4-focus-${width}x${height}.png` });
    await page.keyboard.press('Enter');
  }
});

test('critical garden image failure has Vietnamese recovery and can reload successfully', async ({ page }) => {
  await page.route('**/assets/sprites/supplied-biome-3.png', route => route.abort());
  await page.goto('/?mode=explore&lang=vi');
  await expect(page.getByRole('heading', { name: 'Không thể mở trò chơi', exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Không tải được');
  await expect(page.getByRole('button', { name: 'Tải lại', exact: true })).toBeVisible();
  await expect(page.locator('#toast')).not.toContainText('Đang chuẩn bị');
  await page.screenshot({ path: 'output/playtest/phase4-critical-vi.png' });
  await page.unroute('**/assets/sprites/supplied-biome-3.png');
  await page.getByRole('button', { name: 'Tải lại', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hành Trình Sắc Màu', exact: true })).toBeVisible();
});

test('missing optional fonts still launch and permit a complete visual puzzle', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('**/assets/fonts/*.ttf', route => route.abort());
  await start(page); await enterNext(page, 'M01'); await completePaper(page);
  expect((await hubState(page)).stamps).toEqual(['M01']);
  expect(errors).toEqual([]);
});

for (const failure of ['access-denied', 'quota-exceeded']) test(`storage ${failure} retains playable in-memory progress and explains the limitation`, async ({ page }) => {
  await page.addInitScript(failure => {
    if (failure === 'access-denied') Object.defineProperty(window, 'localStorage', { configurable: true, get: () => { throw new DOMException('Injected denial', 'SecurityError'); } });
    else Storage.prototype.setItem = () => { throw new DOMException('Injected quota', 'QuotaExceededError'); };
  }, failure);
  await start(page);
  await expect(page.locator('#toast')).toContainText('Browser storage is unavailable');
  await enterNext(page, 'M01'); await completePaper(page);
  expect((await hubState(page)).stamps).toEqual(['M01']);
  await expect(page.getByRole('button', { name: 'Passport 1/3', exact: true })).toBeVisible();
});

const save = { schemaVersion: 1, contentVersion: 'fictional-demo-1', mode: 'presentation', locale: 'en', statuses: { M01: 'not-started', M02: 'not-started', M03: 'not-started', M04: 'not-started' }, passportStamps: [], learnedFactIds: [], hubReturnPosition: { x: 704, y: 672 } };
for (const [name, raw] of [
  ['malformed', '{broken'], ['outdated', JSON.stringify({ ...save, schemaVersion: 0 })],
  ['inconsistent', JSON.stringify({ ...save, learnedFactIds: ['demo-paper'] })],
]) test(`${name} save recovers without claiming earned progress or unavailable storage`, async ({ page }) => {
  await page.addInitScript(raw => localStorage.setItem('cultural-trails-v1', raw), raw);
  await page.goto('/?mode=presentation&lang=en');
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect.poll(async () => (await hubState(page)).scene).toBe('Hub');
  expect((await hubState(page)).stamps).toEqual([]);
  await expect(page.locator('#toast')).not.toContainText('Browser storage is unavailable');
});

test('unexpected error freezes the world behind recovery and retains earned stamps on reload', async ({ page }) => {
  await start(page); await enterNext(page, 'M01'); await completePaper(page);
  const before = await hubState(page);
  await page.evaluate(() => window.dispatchEvent(new ErrorEvent('error', { message: 'Injected phase4 failure' })));
  await expect(page.getByRole('alert')).toBeVisible();
  await page.keyboard.down('d'); await page.waitForTimeout(250); await page.keyboard.up('d');
  expect((await hubState(page)).player).toEqual(before.player);
  await page.screenshot({ path: 'output/playtest/phase4-fatal-recovery.png' });
  await page.getByRole('button', { name: 'Reload', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect.poll(async () => (await hubState(page)).stamps).toEqual(['M01']);
});

test('optional audio error updates an already open caption without reopening the panel', async ({ page }) => {
  await page.route('**/assets/audio/*.wav', route => route.abort());
  await start(page); await presenter(page);
  await page.getByRole('button', { name: 'Sound off', exact: true }).click();
  await expect(page.getByTestId('audio-status')).toContainText('Sound is unavailable');
  await expect(page.locator('#modal')).toBeVisible();
});

test('synthetic window blur pauses rhythm and requires explicit resume', async ({ page }) => {
  await startRhythm(page);
  const index = await page.getByTestId('rhythm-board').getAttribute('data-index');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await page.evaluate(() => (window as unknown as { advanceTime(ms: number): void }).advanceTime(5000));
  await expect(page.getByTestId('rhythm-board')).toHaveAttribute('data-index', index!);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
});

test('real browser tab switch pauses rhythm when the browser exposes page hiding', async ({ page, context }, testInfo) => {
  await startRhythm(page);
  const other = await context.newPage(); await other.goto('about:blank'); await other.bringToFront();
  const hidden = await page.waitForFunction(() => document.hidden, undefined, { polling: 100, timeout: 1500 }).then(() => true, () => false);
  await mkdir('output/playtest', { recursive: true });
  await writeFile('output/playtest/phase4-visibility.json', JSON.stringify({ observedDocumentHidden: hidden, physicalAltTabTested: false, browser: 'headless Edge', recordedAt: new Date().toISOString() }, null, 2));
  testInfo.annotations.push({ type: 'visibility-observation', description: hidden ? 'Browser reported actual hidden page.' : 'Headless Edge kept the background page visible; physical tab switching remains unverified.' });
  if (!hidden) { await other.close(); test.skip(true, 'This headless browser does not expose hidden state for background tabs.'); }
  const index = await page.getByTestId('rhythm-board').getAttribute('data-index');
  await page.evaluate(() => (window as unknown as { advanceTime(ms: number): void }).advanceTime(5000));
  await expect(page.getByTestId('rhythm-board')).toHaveAttribute('data-index', index!);
  await other.close(); await page.bringToFront();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
});

test('four-times CPU-throttled browser remains operable and records measured frame observations', async ({ page, context }) => {
  test.setTimeout(60000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const cdp = await context.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.addInitScript(() => {
    const samples: number[] = []; Object.assign(window, { phase4FrameSamples: samples });
    const record = (timestamp: number) => { if (samples.length < 6000) samples.push(timestamp); requestAnimationFrame(record); }; requestAnimationFrame(record);
  });
  const startAt = performance.now();
  await start(page); const launchWallMilliseconds = performance.now() - startAt;
  const before = (await hubState(page)).player!; await moveHub(page, 'a', 400); const after = (await hubState(page)).player!;
  expect(after.x).toBeLessThan(before.x - 10);
  await enterNext(page, 'M01');
  await page.getByTestId('card-cut').click(); await page.getByTestId('slot-0').click();
  await expect(page.getByRole('status').filter({ hasText: 'different step' })).toBeVisible();
  await page.keyboard.press('p'); await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.keyboard.press('r'); await page.getByRole('button', { name: 'Restart this attempt', exact: true }).click();
  await page.getByRole('button', { name: 'Begin', exact: true }).click(); await completePaper(page);
  const samples = await page.evaluate(() => (window as unknown as { phase4FrameSamples: number[] }).phase4FrameSamples);
  const intervals = samples.slice(1).map((timestamp, index) => timestamp - samples[index]);
  expect(intervals.length).toBeGreaterThan(2); expect(errors).toEqual([]);
  await mkdir('output/playtest', { recursive: true });
  await writeFile('output/playtest/phase4-performance.json', JSON.stringify({ recordedAt: new Date().toISOString(), profile: 'CDP Emulation CPU throttling rate 4', launchWallMilliseconds, runWallMilliseconds: performance.now() - startAt, viewport: page.viewportSize(), movement: { before, after, deltaX: after.x - before.x }, observedFrameIntervalsMilliseconds: intervals, uncaughtExceptions: errors, hardwareAcceptance: false }, null, 2));
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
});
