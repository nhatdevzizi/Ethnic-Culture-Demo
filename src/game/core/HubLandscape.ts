import { hubObstacles } from './HubLayout';
import type { HubMap, Rect } from './HubLayout';
import type { MinigameDefinition, Position } from './types';
import decorations from '../../content/biome-decorations.json' with { type: 'json' };
import layout from '../../content/scenery-layout.json' with { type: 'json' };
import { decorationFrame } from './BiomeDecorations';
import world from '../../content/world-trails.json' with { type: 'json' };

export const biomeThemes = ['meadow', 'wetland', 'woodland', 'highland'] as const;
export type BiomeTheme = typeof biomeThemes[number];
export type HubRoute = { stationId: string; theme: BiomeTheme; points: Position[]; roads: Rect[] };
export type HubLandscape = {
  seed: number; routes: HubRoute[];
  links: HubRoute[];
  roadTiles: (Position & { frameId: string; angle: number })[];
  scenery: (Position & { theme: BiomeTheme; kind: 'plant' | 'animal' | 'landmark'; frameId: string; flip: boolean; width?: number; height?: number; ground?: boolean })[];
  lakes: (Rect & { bridgeY: number; bridgeHeight: number })[];
  clearings: Rect[];
  obstacles: Rect[];
};

export function hubSeed(value: string | null): number {
  const seed = Number(value ?? 42);
  return Number.isSafeInteger(seed) ? seed >>> 0 : 42;
}

const intersects = (a: Rect, b: Rect) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
const expand = (rect: Rect, margin: number): Rect => ({ x: rect.x - margin, y: rect.y - margin, width: rect.width + margin * 2, height: rect.height + margin * 2 });

const plantObstacle = (frameId: string, x: number, y: number): Rect => {
  const sizes: Record<string, [number, number]> = {
    'mossy-rocks': [84, 42],
    'flower-planter': [80, 40],
    'flower-bed': [60, 34],
    'banyan-tree': [80, 42],
    'bamboo-clump': [64, 38],
    'fruit-tree': [56, 36],
    'banana-tree': [56, 36],
    'coconut-tree': [52, 36],
    'slender-palms': [48, 36],
    'grass-clump': [52, 30],
  };
  const [w, h] = sizes[frameId] ?? [52, 34];
  return { x: x - w / 2, y: y - h - 2, width: w, height: h };
};

export function createHubLandscape(map: HubMap, stations: readonly MinigameDefinition[], seed = 42): HubLandscape {
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const tileRandom = (min: number, count: number) => min + Math.floor(random() * count) * 32;
  const landscape: HubLandscape = { seed: seed >>> 0, routes: [], links: [], roadTiles: [], scenery: [], lakes: [], clearings: [], obstacles: [] };
  const width = map.width * map.tileSize, height = map.height * map.tileSize;
  const routeRoads = (points: Position[]) => points.slice(1).map((point, index) => {
    const previous = points[index];
    if (point.x !== previous.x && point.y !== previous.y) throw new Error('Trail segments must follow the tile grid');
    return { x: Math.min(point.x, previous.x) - 32, y: Math.min(point.y, previous.y) - 32,
      width: Math.abs(point.x - previous.x) + 64, height: Math.abs(point.y - previous.y) + 64 };
  });
  for (const biome of map.biomes) {
    const theme = biomeThemes.find(theme => theme === biome.theme);
    if (!theme) throw new Error(`Invalid biome theme ${biome.theme}`);
    const station = stations.find(station => station.id === biome.stationId);
    if (!station) throw new Error(`Missing station for biome ${biome.stationId}`);
    const definition = world.paths[station.id as keyof typeof world.paths];
    if (!definition) throw new Error(`Missing trail ${station.id}`);
    const offset = (Math.floor(random() * 3) - 1) * 64;
    const points = definition.points.map(([x, y]) => ({ x: x + (x === definition.bendX ? offset : 0), y }));
    const roads = routeRoads(points);
    landscape.routes.push({ stationId: station.id, theme, points, roads });
  }
  const loopPoints = world.northLoop.map(([x, y]) => ({ x, y }));
  landscape.links.push({ stationId: 'north-loop', theme: 'wetland', points: loopPoints, roads: routeRoads(loopPoints) });
  const cells = new Map<string, { x: number; y: number; style: keyof typeof decorations.roadVariants }>();
  for (const route of [...landscape.routes, ...landscape.links]) {
    const style = (route.stationId === 'north-loop' ? 'brick' : world.roadStyles[route.theme]) as keyof typeof decorations.roadVariants;
    for (let i = 1; i < route.points.length; i++) {
      const a = route.points[i - 1], b = route.points[i], distance = Math.hypot(b.x - a.x, b.y - a.y);
      if (distance % world.cellSize !== 0) throw new Error('Trail endpoints must align with supplied road tiles');
      for (let step = 0; step <= distance; step += world.cellSize) {
        const t = distance ? step / distance : 0, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
        if (!cells.has(`${x},${y}`)) cells.set(`${x},${y}`, { x, y, style });
      }
    }
  }
  for (const cell of cells.values()) {
    const size = world.cellSize, north = cells.has(`${cell.x},${cell.y - size}`), south = cells.has(`${cell.x},${cell.y + size}`),
      west = cells.has(`${cell.x - size},${cell.y}`), east = cells.has(`${cell.x + size},${cell.y}`);
    const count = Number(north) + Number(south) + Number(west) + Number(east);
    const kind = count >= 3 ? 'junction' : (north || south) && (west || east) ? 'corner' : north || south ? 'vertical' : 'horizontal';
    landscape.roadTiles.push({ x: cell.x, y: cell.y, frameId: decorations.roadVariants[cell.style][kind], angle: kind === 'corner' ? (east ? south ? 0 : 270 : south ? 90 : 180) : 0 });
  }
  const stationAnchor = (id: string) => {
    const station = stations.find(station => station.id === id);
    if (!station) throw new Error(`Missing scenery anchor ${id}`);
    return station;
  };
  for (const lake of layout.lakes) {
    const anchor = stationAnchor(lake.anchor).portal;
    const rect = { x: anchor.x + lake.dx, y: anchor.y + lake.dy, width: lake.width, height: lake.height, bridgeY: lake.bridgeY, bridgeHeight: lake.bridgeHeight };
    landscape.lakes.push(rect);
    landscape.obstacles.push({ x: rect.x, y: rect.y, width: rect.width, height: lake.bridgeY },
      { x: rect.x, y: rect.y + lake.bridgeY + lake.bridgeHeight, width: rect.width, height: rect.height - lake.bridgeY - lake.bridgeHeight });
  }
  for (const clearing of layout.clearings) {
    const anchor = stationAnchor(clearing.anchor).portal;
    landscape.clearings.push({ x: anchor.x + clearing.dx, y: anchor.y + clearing.dy, width: clearing.width, height: clearing.height });
  }
  for (const prop of layout.props) {
    const station = stationAnchor(prop.anchor), theme = landscape.routes.find(route => route.stationId === station.id)!.theme;
    const frame = decorationFrame(prop.frameId);
    const x = station.portal.x + prop.dx, y = station.portal.y + prop.dy;
    const width = prop.width ?? frame.width, height = prop.height ?? frame.height;
    landscape.scenery.push({ x, y, theme, kind: 'landmark', frameId: frame.id, flip: false, width, height, ground: prop.collides === false });
    if (prop.collides !== false) landscape.obstacles.push({ x: x - width * 0.4, y: y - height * 0.55, width: width * 0.8, height: height * 0.55 });
  }
  for (const station of stations) {
    const theme = landscape.routes.find(route => route.stationId === station.id)!.theme;
    for (const side of [-1, 1]) {
      const x = station.portal.x + side * 64, y = station.portal.y;
      landscape.scenery.push({ x, y, theme, kind: 'plant', frameId: 'flower-planter', flip: false, width: 48, height: 40 });
      landscape.obstacles.push({ x: x - 22, y: y - 32, width: 44, height: 30 });
    }
  }
  const festivalZones: Rect[] = [
    [1350, 350, 190, 124], [1120, 740, 170, 116], [1440, 740, 100, 118],
    [1060, 1330, 170, 99], [1520, 1330, 180, 154], [1280, 1360, 90, 64],
  ].map(([x, y, w, h]) => ({ x: x - w / 2 - 40, y: y - h - 40, width: w + 80, height: h + 60 }));
  const reserved = [
    ...festivalZones,
    ...[...landscape.routes, ...landscape.links].flatMap(route => route.roads.map(road => expand(road, 44))),
    ...map.roads.map(road => expand(road, 32)),
    ...stations.map(station => ({ x: station.portal.x - 184, y: station.portal.y - 264, width: 368, height: 368 })),
    { x: map.spawn.x - 240, y: map.spawn.y - 144, width: 480, height: 320 },
    ...hubObstacles(map, stations).map(rect => expand(rect, 24)),
    ...landscape.lakes.map(rect => expand(rect, 56)),
    ...landscape.clearings.map(rect => expand(rect, 24)),
    ...landscape.scenery.map(item => {
      const frame = decorationFrame(item.frameId), w = item.width ?? frame.width, h = item.height ?? frame.height;
      return { x: item.x - w / 2 - 20, y: item.y - h - 12, width: w + 40, height: h + 32 };
    }),
  ];
  const occupied: Rect[] = [];
  const borderReserved = [
    ...festivalZones,
    ...[...landscape.routes, ...landscape.links].flatMap(route => route.roads.map(road => expand(road, 8))),
    ...stations.map(station => ({ x: station.portal.x - 128, y: station.portal.y - 160, width: 256, height: 224 })),
    ...landscape.clearings.map(rect => expand(rect, 24)),
  ];
  for (let side = 0; side < 4; side++) {
    const length = side % 2 ? height : width;
    // Evenly spaced border: equal gaps, no overlap between 128px-wide trees.
    const slots = Math.max(1, Math.round((length - 192) / 144)), gap = (length - 192) / slots;
    for (let slot = 0; slot <= slots; slot++) {
      const along = 96 + slot * gap;
      const x = side % 2 ? side === 1 ? width - 64 : 64 : along;
      const y = side % 2 ? along : side === 0 ? 64 : height - 64;
      const foot = { x: x - 32, y: y - 40, width: 64, height: 38 };
      if (borderReserved.some(rect => intersects(foot, rect))) continue;
      const theme: BiomeTheme = x < map.spawn.x ? 'woodland' : 'meadow';
      landscape.scenery.push({ x, y, theme, kind: 'plant', frameId: theme === 'woodland' ? 'banyan-tree' : 'fruit-tree', flip: false, width: 128, height: 136 });
      landscape.obstacles.push(foot); occupied.push(foot);
    }
  }
  for (const route of landscape.routes) {
    const station = stations.find(station => station.id === route.stationId)!;
    const left = station.portal.x < map.spawn.x;
    const north = station.portal.y < map.spawn.y;
    for (const kind of ['plant'] as const) {
      const count = 14;
      let placed = 0;
      const minX = left ? 112 : map.spawn.x + 160, maxX = left ? map.spawn.x + 128 : width - 112;
      const minY = north ? 128 : map.spawn.y + 176, maxY = north ? map.spawn.y + 128 : height - 112;
      const nearest = (x: number, y: number) => occupied.reduce((best, rect) =>
        Math.min(best, Math.hypot(rect.x + rect.width / 2 - x, rect.y + rect.height / 2 - y)), Infinity);
      for (let attempt = 0; attempt < count * 40 && placed < count; attempt++) {
        // Best-candidate sampling: spread trees evenly instead of clustering them in groves.
        let x = 0, y = 0, bestDistance = -1;
        for (let candidate = 0; candidate < 14; candidate++) {
          const cx = tileRandom(minX, Math.max(1, Math.floor((maxX - minX) / 32))), cy = tileRandom(minY, Math.max(1, Math.floor((maxY - minY) / 32)));
          const clear: Rect = { x: cx - 64, y: cy - 84, width: 128, height: 100 };
          if (cx < 160 || cy < 200 || cx > width - 160 || cy > height - 160 || reserved.some(rect => intersects(clear, rect)) ||
            occupied.some(rect => intersects(expand(clear, 20), rect))) continue;
          const distance = nearest(cx, cy);
          if (distance < 150) continue;
          if (distance > bestDistance) { bestDistance = distance; x = cx; y = cy; }
        }
        if (bestDistance < 0) continue;
        const pool = decorations.biomes[route.theme].plant;
        const frameId = pool[Math.floor(random() * pool.length)];
        const foot = plantObstacle(frameId, x, y);
        landscape.scenery.push({ x, y, theme: route.theme, kind, frameId, flip: random() > 0.5 });
        landscape.obstacles.push(foot);
        occupied.push(foot);
        placed++;
      }
    }
  }
  return landscape;
}
