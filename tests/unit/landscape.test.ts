import { expect, it } from 'vitest';
import map from '../../public/assets/maps/hub.json';
import { minigameRegistry } from '../../src/game/core/MinigameRegistry';
import { createHubLandscape } from '../../src/game/core/HubLandscape';
import { isHubPositionWalkable } from '../../src/game/core/HubLayout';

it('makes repeatable terrain and different winding roads for different seeds', () => {
  const first = createHubLandscape(map, minigameRegistry, 42);
  expect(first).toEqual(createHubLandscape(map, minigameRegistry, 42));
  expect(first.routes).not.toEqual(createHubLandscape(map, minigameRegistry, 43).routes);
  expect(new Set(first.routes.map(route => route.theme)).size).toBe(4);
  expect(first.links.length).toBeGreaterThan(0);
  expect(first.roadTiles.length).toBeGreaterThan(100);
  expect(first.routes.every(route => route.points.length >= 9)).toBe(true);
  for (const route of first.routes) {
    for (const kind of ['plant', 'landmark']) expect(first.scenery.some(item => item.theme === route.theme && item.kind === kind)).toBe(true);
  }
});

it('places wells beside houses, waterwheels at water and craft props at the studio', () => {
  const landscape = createHubLandscape(map, minigameRegistry, 42);
  expect(landscape.scenery.every(item => typeof item.frameId === 'string')).toBe(true);
  for (const item of landscape.scenery) {
    if (item.frameId === 'stone-well') {
      expect(minigameRegistry.some(station => Math.hypot(item.x - station.portal.x, item.y - station.portal.y) <= 200)).toBe(true);
    }
    if (item.frameId === 'waterwheel') {
      expect(landscape.lakes.some(lake => item.x >= lake.x - 100 && item.x <= lake.x + lake.width + 100 && item.y >= lake.y - 100 && item.y <= lake.y + lake.height + 100)).toBe(true);
    }
    if (['loom', 'craft-stall', 'cloth-rack'].includes(item.frameId)) {
      expect(item.theme).toBe('meadow');
      const studio = minigameRegistry.find(station => station.id === 'M01')!;
      expect(Math.hypot(item.x - studio.portal.x, item.y - studio.portal.y)).toBeLessThanOrEqual(400);
    }
  }
  expect(landscape.scenery.some(item => item.kind === 'animal')).toBe(false);
  for (const lake of landscape.lakes) {
    const bridgeY = lake.y + lake.bridgeY + lake.bridgeHeight / 2 - 12;
    for (let x = lake.x - 24; x <= lake.x + lake.width + 24; x += 8) {
      expect(isHubPositionWalkable({ x, y: bridgeY }, map, minigameRegistry, landscape)).toBe(true);
    }
    expect(isHubPositionWalkable({ x: lake.x + lake.width / 2, y: lake.y + 20 }, map, minigameRegistry, landscape)).toBe(false);
  }
});

it('keeps every road walkable across seeds, including all station and guide approaches', () => {
  for (const seed of [0, 1, 2, 9, 42, 43, 99, 1000, -17, 2147483647]) {
    const landscape = createHubLandscape(map, minigameRegistry, seed);
    for (const clearing of landscape.clearings) {
      expect(landscape.scenery.some(item => item.kind === 'plant' && item.x >= clearing.x && item.x <= clearing.x + clearing.width && item.y >= clearing.y && item.y <= clearing.y + clearing.height)).toBe(false);
    }
    for (const route of [...landscape.routes, ...landscape.links]) {
      const station = minigameRegistry.find(station => station.id === route.stationId)!;
      if (station) {
        expect(route.points[0]).toEqual(map.spawn);
        expect(route.points.at(-1)).toEqual({ x: station.portal.x, y: station.portal.y + 48 });
      }
      for (let i = 1; i < route.points.length; i++) {
        const a = route.points[i - 1], b = route.points[i];
        expect(a.x === b.x || a.y === b.y).toBe(true);
        const distance = Math.hypot(b.x - a.x, b.y - a.y);
        for (let step = 0; step <= distance; step += 8) {
          const t = distance ? step / distance : 0;
          const position = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
          expect(isHubPositionWalkable(position, map, minigameRegistry, landscape), `${seed} ${route.stationId}: ${position.x},${position.y}`).toBe(true);
        }
      }
    }
  }
});
