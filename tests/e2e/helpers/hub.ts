import { expect, type Page } from '@playwright/test';
import stations from '../../../src/content/minigames.json' with { type: 'json' };
import map from '../../../public/assets/maps/hub.json' with { type: 'json' };
import { createHubLandscape, hubSeed } from '../../../src/game/core/HubLandscape';

type Position = { x: number; y: number };
type Rect = Position & { width: number; height: number };
export type HubSnapshot = {
  scene: string; player?: Position; nearby?: string; stamps: string[]; statuses: Record<string, string>;
  returnPosition: Position; camera?: { x: number; y: number; worldView?: Rect; viewport?: Rect };
  stationLabels?: { id: string; bounds: Rect }[]; virtualSize?: { width: number; height: number };
  worldSeed?: number; worldSize?: { width: number; height: number };
  decorations?: Record<string, number>;
  routes?: { stationId: string; theme: string; points: Position[] }[];
  links?: { stationId: string; points: Position[] }[];
  roadTiles?: number;
  sceneryCounts?: { theme: string; plants: number; animals: number; landmarks: number }[];
};
export const hubState = (page: Page): Promise<HubSnapshot> => page.evaluate(() => JSON.parse((window as unknown as { render_game_to_text(): string }).render_game_to_text()));

export async function moveHub(page: Page, key: string, ms: number) {
  await page.locator('#game-container').focus();
  await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

function route(from: Position, id: string, seed: number) {
  const landscape = createHubLandscape(map, stations, seed);
  const destination = landscape.routes.find(route => route.stationId === id)!;
  const nearest = [...landscape.routes].sort((a, b) => {
    const endA = a.points[a.points.length - 1], endB = b.points[b.points.length - 1];
    return Math.hypot(from.x - endA.x, from.y - endA.y) - Math.hypot(from.x - endB.x, from.y - endB.y);
  })[0];
  const returning = Math.hypot(from.x - map.spawn.x, from.y - map.spawn.y) > 300;
  return [...(returning ? [...nearest.points].reverse() : [{ ...map.spawn }]), ...destination.points.slice(1)];
}

export const portalApproach = (id: string): Position => {
  const station = stations.find(station => station.id === id);
  if (!station) throw new Error(`Unknown station ${id}`);
  return { x: station.portal.x, y: station.portal.y + 48 };
};

export async function walkToStation(page: Page, id: string) {
  await expect.poll(async () => { const frame = await hubState(page); return frame.scene === 'Hub' && Boolean(frame.player); }).toBe(true);
  const start = (await hubState(page)).player!;
  for (const target of route(start, id, hubSeed(new URL(page.url()).searchParams.get('seed')))) {
    for (const axis of ['x', 'y'] as const) {
      for (let correction = 0; correction < 3; correction++) {
        const position = (await hubState(page)).player!;
        const distance = target[axis] - position[axis];
        if (Math.abs(distance) <= 4) break;
        await moveHub(page, axis === 'x' ? distance > 0 ? 'd' : 'a' : distance > 0 ? 's' : 'w', Math.abs(distance) / 160 * 1000);
      }
      expect(Math.abs((await hubState(page)).player![axis] - target[axis]), `roadway ${axis} coordinate`).toBeLessThanOrEqual(8);
    }
  }
  await expect.poll(async () => (await hubState(page)).nearby).toBe(id);
}

// Production deliberately has no debug hooks. Follow the same authored roads with actual keyboard input.
export async function walkProductionToStation(page: Page, id: string, from: Position = map.spawn) {
  let position = { ...from };
  for (const target of route(from, id, hubSeed(new URL(page.url()).searchParams.get('seed')))) {
    const dx = target.x - position.x, dy = target.y - position.y;
    if (Math.abs(dx) > 1) await moveHub(page, dx > 0 ? 'd' : 'a', Math.abs(dx) / 160 * 1000);
    if (Math.abs(dy) > 1) await moveHub(page, dy > 0 ? 's' : 'w', Math.abs(dy) / 160 * 1000);
    position = target;
  }
  return portalApproach(id);
}
