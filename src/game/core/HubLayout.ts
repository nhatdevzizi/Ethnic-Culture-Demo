import { minigameRegistry } from './MinigameRegistry';
import type { MinigameDefinition, Position } from './types';
import type { HubLandscape } from './HubLandscape';

export type Rect = Position & { width: number; height: number };
export type WaterArea = Rect & { cellSize?: number; rows?: string[] };
export type HubMap = {
  width: number; height: number; tileSize: number;
  spawn: Position; guide: Position; board: Position;
  pond: WaterArea; beds: Rect[]; roads: Rect[]; trees: number[][]; benches: Position[];
  biomes: { stationId: string; theme: string; title: { vi: string; en: string } }[];
};

export function waterRects(pond: WaterArea): Rect[] {
  if (!pond.rows) return [pond];
  const size = pond.cellSize ?? 32;
  if (pond.rows.length * size !== pond.height || pond.rows.some(row => row.length * size !== pond.width || /[^ X]/.test(row))) throw new Error('Invalid lake shoreline data');
  return pond.rows.flatMap((row, y) => Array.from(row.matchAll(/X+/g), match => ({ x: pond.x + match.index! * size, y: pond.y + y * size, width: match[0].length * size, height: size })));
}

export function hubObstacles(map: HubMap, stations: readonly MinigameDefinition[] = minigameRegistry, landscape?: HubLandscape): Rect[] {
  return [
    ...(landscape?.obstacles ?? []),
    ...map.beds.flatMap(bed => [
      { x: bed.x + 8, y: bed.y, width: bed.width - 16, height: bed.height },
      { x: bed.x, y: bed.y + 8, width: bed.width, height: bed.height - 16 },
    ]),
    ...waterRects(map.pond),
    ...map.trees.map(([x, y]) => ({ x: x - 14, y: y + 14, width: 28, height: 24 })),
    ...map.benches.map(bench => ({ x: bench.x + 4, y: bench.y + 8, width: 56, height: 24 })),
    ...stations.map(station => ({ x: station.portal.x - 68, y: station.portal.y - 144, width: 136, height: 88 })),
    ...stations.filter(station => station.enabled).map(station => ({ x: station.portal.x + 92, y: station.portal.y - 8, width: 24, height: 16 })),
    { x: map.guide.x - 15, y: map.guide.y, width: 30, height: 24 },
    { x: map.board.x - 32, y: map.board.y - 32, width: 64, height: 40 },
  ];
}

export function isHubPositionWalkable(position: Position, map: HubMap, stations: readonly MinigameDefinition[] = minigameRegistry, landscape?: HubLandscape) {
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y) || position.x < 48 || position.y < 48 ||
    position.x > map.width * map.tileSize - 48 || position.y > map.height * map.tileSize - 48) return false;
  // The avatar's Arcade body is at its feet, below its sprite origin.
  return !hubObstacles(map, stations, landscape).some(rect => position.x + 11 > rect.x && position.x - 11 < rect.x + rect.width &&
    position.y + 21 > rect.y && position.y + 3 < rect.y + rect.height);
}

export function safeHubPosition(position: Position, map: HubMap, stations: readonly MinigameDefinition[] = minigameRegistry, landscape?: HubLandscape): Position {
  return isHubPositionWalkable(position, map, stations, landscape) ? { ...position } : { ...map.spawn };
}
