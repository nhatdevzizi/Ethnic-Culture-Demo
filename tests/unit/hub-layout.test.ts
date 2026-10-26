import { describe, expect, it } from 'vitest';
import map from '../../public/assets/maps/hub.json';
import { isHubPositionWalkable, safeHubPosition, waterRects } from '../../src/game/core/HubLayout';
import { minigameRegistry } from '../../src/game/core/MinigameRegistry';

describe('authored campus collision and saved-position recovery', () => {
  it('uses the same masked lake cells for drawing and collision and rejects malformed shorelines', () => {
    const lake = { x: 100, y: 200, width: 96, height: 64, cellSize: 32, rows: [' XX', 'X  '] };
    expect(waterRects(lake)).toEqual([
      { x: 132, y: 200, width: 64, height: 32 },
      { x: 100, y: 232, width: 32, height: 32 },
    ]);
    expect(() => waterRects({ ...lake, rows: ['XX', 'X  '] })).toThrow('Invalid lake shoreline data');
    expect(() => waterRects({ ...lake, rows: [' ?X', 'X  '] })).toThrow('Invalid lake shoreline data');
  });
  it('keeps the plaza, every entrance, and the southern outer lanes walkable', () => {
    for (const position of [map.spawn, ...minigameRegistry.map(station => ({ x: station.portal.x, y: station.portal.y + 48 }))]) {
      expect(isHubPositionWalkable(position, map), `walkable ${position.x},${position.y}`).toBe(true);
      expect(safeHubPosition(position, map)).toEqual(position);
    }
  });
  it('rejects building, pond, bed, and boundary positions and recovers a legacy blocked return', () => {
    for (const position of [...minigameRegistry.map(station => ({ x: station.portal.x, y: station.portal.y - 80 })), { x: map.pond.x + 96, y: map.pond.y + 80 }, { x: 16, y: map.spawn.y }]) {
      expect(isHubPositionWalkable(position, map), `blocked ${position.x},${position.y}`).toBe(false);
      expect(safeHubPosition(position, map)).toEqual(map.spawn);
    }
    expect(safeHubPosition({ x: Number.NaN, y: 672 }, map)).toEqual(map.spawn);
  });
  it('blocks instructor feet while keeping their southern approaches clear', () => {
    for (const position of minigameRegistry.filter(station => station.enabled).map(station => ({ x: station.portal.x + 104, y: station.portal.y - 10 }))) {
      expect(isHubPositionWalkable(position, map)).toBe(false);
      expect(safeHubPosition(position, map)).toEqual(map.spawn);
      expect(isHubPositionWalkable({ x: position.x, y: position.y + 48 }, map)).toBe(true);
    }
  });
});
