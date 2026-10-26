import { expect, test, type Page } from '@playwright/test';
import { walkToStation } from './helpers/hub';

type State = { scene: string; player?: { x: number; y: number }; nearby?: string; stamps: string[]; statuses: Record<string, string>; returnPosition: { x: number; y: number } };
const state = (page: Page): Promise<State> => page.evaluate(() => JSON.parse((window as unknown as { render_game_to_text(): string }).render_game_to_text()));
const advance = (page: Page, ms: number) => page.evaluate(ms => (window as unknown as { advanceTime(ms: number): void }).advanceTime(ms), ms);

async function start(page: Page) {
  await page.goto('/?mode=presentation&lang=en&seed=42');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect.poll(async () => (await state(page)).scene).toBe('Hub');
}
async function enter(page: Page, id: string) {
  await expect.poll(async () => (await state(page)).nearby).toBe(id);
  const position = (await state(page)).player!;
  await page.locator('#interact').click();
  await page.getByRole('button', { name: 'Enter studio', exact: true }).click();
  await page.getByRole('button', { name: 'Begin', exact: true }).click();
  return position;
}
async function finishRhythmUntimed(page: Page) {
  await page.getByTestId('rhythm-mode-untimed').click();
  await page.getByTestId('rhythm-start').click();
  for (const hit of [true, false, true, true, false, true]) await page.getByTestId(hit ? 'rhythm-tap' : 'rhythm-rest').click();
  await expect(page.getByRole('heading', { name: 'Rhythm complete', exact: true })).toBeVisible();
}
async function collectStories(page: Page) {
  for (const id of ['quiet', 'captions', 'schedule']) {
    await page.getByTestId(`story-helper-${id}`).click();
    await page.getByTestId('story-choice-ask').focus(); await page.keyboard.press('Enter');
    await expect(page.getByTestId(`story-evidence-${id}`)).toHaveAttribute('data-collected', 'true');
  }
}

test('M02 untimed retry, pause, instructions, recap and exact hub return', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await start(page); await walkToStation(page, 'M02'); const position = await enter(page, 'M02');
  await page.getByTestId('rhythm-mode-untimed').click(); await page.getByTestId('rhythm-start').click();
  await page.getByTestId('rhythm-tap').click();
  await expect(page.getByTestId('rhythm-board')).toHaveAttribute('data-index', '1');
  await page.getByTestId('rhythm-tap').click();
  await expect(page.getByTestId('rhythm-feedback')).not.toBeEmpty();
  for (const hit of [false, true, true, false, true]) await page.getByTestId(hit ? 'rhythm-tap' : 'rhythm-rest').click();
  await expect(page.getByTestId('rhythm-board')).toHaveAttribute('data-status', 'retry');
  await page.getByTestId('rhythm-start').click();
  await page.keyboard.press('p'); await advance(page, 5000);
  await expect(page.getByTestId('rhythm-board')).toHaveAttribute('data-index', '0');
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.screenshot({ path: 'output/playtest/phase2-m02-1280.png' });
  for (const hit of [true, false, true, true, false, true]) await page.getByTestId(hit ? 'rhythm-tap' : 'rhythm-rest').click();
  await expect(page.getByRole('heading', { name: 'Rhythm complete', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Return & collect stamp', exact: true }).click();
  await expect.poll(async () => (await state(page)).scene).toBe('Hub');
  const returned = await state(page); expect(returned.stamps).toEqual(['M02']);
  expect(returned.player!.x).toBeCloseTo(position.x, 0); expect(returned.player!.y).toBeCloseTo(position.y, 0);
  expect(errors).toEqual([]);
});

test('M02 timed beats freeze under pause, slow mode and scene return cleanly', async ({ page }) => {
  await start(page); await walkToStation(page, 'M02'); await enter(page, 'M02');
  await page.getByTestId('rhythm-mode-slow').click(); await page.getByTestId('rhythm-start').click();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.getByRole('dialog')).toContainText('activity is paused');
  const index = await page.getByTestId('rhythm-board').getAttribute('data-index');
  await advance(page, 6000);
  await expect(page.getByTestId('rhythm-board')).toHaveAttribute('data-index', index!);
  await page.evaluate(() => { Reflect.deleteProperty(document, 'hidden'); document.dispatchEvent(new Event('visibilitychange')); });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.keyboard.press('r'); await page.getByRole('button', { name: 'Restart this attempt', exact: true }).click();
  await page.getByRole('button', { name: 'Begin', exact: true }).click();
  await page.getByTestId('rhythm-mode-normal').click(); await page.getByTestId('rhythm-start').click();
  for (const hit of [true, false, true, true, false, true]) {
    if (hit) await page.getByTestId('rhythm-tap').click();
    await advance(page, 700);
  }
  await expect(page.getByRole('heading', { name: 'Rhythm complete', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.screenshot({ path: 'output/playtest/phase2-m02-1920.png' });
  await page.getByRole('button', { name: 'Return & collect stamp', exact: true }).click();
  await expect.poll(async () => (await state(page)).scene).toBe('Hub');
  await page.keyboard.press('e'); await page.getByRole('button', { name: 'Enter studio', exact: true }).click();
  await page.getByRole('button', { name: 'Begin', exact: true }).click(); await page.keyboard.press('n');
  await expect.poll(async () => (await state(page)).scene).toBe('Hub');
  expect((await state(page)).stamps).toEqual(['M02']);
});

test('M03 branches, missing evidence, recovery, all stamps and save reload', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await start(page); await walkToStation(page, 'M01'); await enter(page, 'M01');
  for (const [index, id] of ['plan', 'cut', 'assemble'].entries()) {
    await page.getByTestId(`card-${id}`).click(); await page.getByTestId(`slot-${index}`).click();
  }
  await page.getByRole('button', { name: 'Return & collect stamp', exact: true }).click();
  await expect.poll(async () => (await state(page)).scene).toBe('Hub');
  await walkToStation(page, 'M02'); await enter(page, 'M02'); await finishRhythmUntimed(page);
  await page.getByRole('button', { name: 'Return & collect stamp', exact: true }).click();
  await expect.poll(async () => (await state(page)).scene).toBe('Hub');
  await walkToStation(page, 'M03'); const position = await enter(page, 'M03');
  await page.getByTestId('story-plan-choice').click();
  await expect(page.getByRole('heading', { name: 'Story complete', exact: true })).toHaveCount(0);
  await page.getByTestId('story-helper-quiet').click(); await page.getByTestId('story-choice-assume').click();
  await expect(page.getByTestId('story-evidence-quiet')).toHaveAttribute('data-collected', 'false');
  await expect(page.getByTestId('story-feedback')).not.toBeEmpty();
  await page.keyboard.press('h');
  await expect(page.getByRole('dialog')).toContainText('Meet each helper');
  await page.getByTestId('story-choice-ask').evaluate((button: HTMLButtonElement) => button.click());
  await expect(page.getByTestId('story-evidence-quiet')).toHaveAttribute('data-collected', 'false');
  await page.keyboard.press('Escape');
  await collectStories(page);
  await page.getByTestId('story-plan-uniform').click();
  await expect(page.getByRole('heading', { name: 'Story complete', exact: true })).toHaveCount(0);
  await page.screenshot({ path: 'output/playtest/phase2-m03-1280.png' });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.getByTestId('story-plan-choice').click();
  await expect(page.getByRole('heading', { name: 'Story complete', exact: true })).toBeVisible();
  await page.screenshot({ path: 'output/playtest/phase2-m03-1920.png' });
  await page.getByRole('button', { name: 'Return & collect stamp', exact: true }).click();
  await expect.poll(async () => (await state(page)).scene).toBe('Hub');
  const returned = await state(page); expect(returned.stamps).toEqual(['M01', 'M02', 'M03']);
  expect(returned.player!.x).toBeCloseTo(position.x, 0); expect(returned.player!.y).toBeCloseTo(position.y, 0);
  await expect(page.getByRole('button', { name: 'Passport 3/3', exact: true })).toBeVisible();
  await page.reload(); await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect.poll(async () => (await state(page)).stamps).toEqual(['M01', 'M02', 'M03']);
  expect(errors).toEqual([]);
});

test('M03 abandon, skip, restart and repeated completion preserve unique progress', async ({ page }) => {
  await start(page); await walkToStation(page, 'M03'); const position = await enter(page, 'M03');
  await page.getByTestId('story-choice-ask').click();
  await page.getByRole('button', { name: 'Return to hub', exact: true }).click();
  await page.getByRole('button', { name: 'Leave studio', exact: true }).click();
  await expect.poll(async () => (await state(page)).scene).toBe('Hub');
  expect((await state(page)).stamps).toEqual([]);
  expect((await state(page)).player!.x).toBeCloseTo(position.x, 0);
  await enter(page, 'M03'); await page.keyboard.press('n');
  await expect.poll(async () => (await state(page)).scene).toBe('Hub');
  expect((await state(page)).statuses.M03).toBe('skipped');
  await enter(page, 'M03');
  await page.getByRole('button', { name: 'Return to hub', exact: true }).click();
  await page.getByRole('button', { name: 'Leave studio', exact: true }).click();
  await expect.poll(async () => (await state(page)).scene).toBe('Hub');
  expect((await state(page)).statuses.M03).toBe('skipped');
  await enter(page, 'M03'); await page.getByTestId('story-choice-ask').click();
  await page.keyboard.press('r'); await page.getByRole('button', { name: 'Restart this attempt', exact: true }).click();
  await page.getByRole('button', { name: 'Begin', exact: true }).click();
  await expect(page.getByTestId('story-evidence-quiet')).toHaveAttribute('data-collected', 'false');
  await collectStories(page); await page.getByTestId('story-plan-choice').click();
  await page.getByRole('button', { name: 'Return & collect stamp', exact: true }).click();
  await expect.poll(async () => (await state(page)).scene).toBe('Hub');
  await enter(page, 'M03'); await collectStories(page); await page.getByTestId('story-plan-choice').click();
  await expect(page.getByRole('heading', { name: 'Story complete', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Return & collect stamp', exact: true }).click();
  await expect.poll(async () => (await state(page)).scene).toBe('Hub');
  expect((await state(page)).stamps).toEqual(['M03']);
});
