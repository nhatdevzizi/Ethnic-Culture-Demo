import { expect, test } from '@playwright/test';
import { hubState, moveHub } from './helpers/hub';
import type { Game, GameObjects } from 'phaser';
import type { HubScene } from '../../src/game/scenes/HubScene';

type QAWindow = Window & { __qaGame: Game };

test('walkable scenery stays below the player and work areas share the grass ground', async ({ page }) => {
  await page.route('**/src/main.ts*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('game = createdGame;', 'game = createdGame; window.__qaGame = createdGame;') });
  });
  await page.goto('/?mode=explore&lang=en&seed=42');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect.poll(async () => (await hubState(page)).scene).toBe('Hub');
  const layers = await page.evaluate(() => {
    const scene = (window as QAWindow).__qaGame.scene.getScene('Hub');
    const objects = scene.children.list as GameObjects.Image[];
    const floor = objects.filter(object => ['bamboo-bridge', 'stone-steps'].includes(String(object.frame?.name)));
    const patches = objects.filter(object => object.type === 'TileSprite' && ['wood-tile', 'dirt-tile', 'stone-tile'].includes(object.texture?.key));
    return { floor: floor.map(object => ({ id: object.frame.name, depth: object.depth })), patches: patches.length };
  });
  expect(layers.floor).toHaveLength(2);
  expect.soft(layers.floor.every(object => object.depth <= 2), JSON.stringify(layers.floor)).toBe(true);
  expect.soft(layers.patches).toBe(0);
  // Approach the front-right portion of the hearth, outside the former narrow hitbox.
  await page.evaluate(() => {
    const scene = (window as QAWindow).__qaGame.scene.getScene('Hub') as HubScene;
    scene.player.body!.reset(850, 1710);
  });
  await moveHub(page, 'w', 650);
  expect((await hubState(page)).player!.y).toBeGreaterThanOrEqual(1684);
  expect(await page.evaluate(() => {
    const scene = (window as QAWindow).__qaGame.scene.getScene('Hub') as HubScene;
    const hearth = (scene.children.list as GameObjects.Image[]).find(object => object.frame?.name === 'cooking-hearth')!;
    return scene.player.depth > hearth.depth;
  })).toBe(true);
  await page.screenshot({ path: 'output/playtest/scenery-ground-layering.png' });
});


