import Phaser from 'phaser';
import { session } from '../core/SessionStore';
import { minigameRegistry } from '../core/MinigameRegistry';
import { localize } from '../core/content';
import { nextPresentationStation } from '../core/PresentationRoute';
import { hubObstacles, safeHubPosition, waterRects } from '../core/HubLayout';
import type { HubMap, Rect, WaterArea } from '../core/HubLayout';
import { createHubLandscape, hubSeed } from '../core/HubLandscape';
import type { HubLandscape } from '../core/HubLandscape';
import { decorationFrame } from '../core/BiomeDecorations';
import decorations from '../../content/biome-decorations.json';
import world from '../../content/world-trails.json';
import { InputManager } from '../systems/InputManager';
import { nearestInteraction } from '../systems/InteractionSystem';
import type { Interactable } from '../systems/InteractionSystem';
import type { MinigameDefinition, MinigamePayload } from '../core/types';
import { ui, element } from '../ui/OverlayController';
import dialogue from '../../content/dialogues.json';
export class HubScene extends Phaser.Scene {
  player!: Phaser.Physics.Arcade.Sprite;
  private facing: 'down' | 'up' | 'left' | 'right' = 'down';
  private controls!: InputManager;
  private objects: Interactable[] = [];
  private routeDirection?: HTMLElement;
  private routeTarget?: { x: number; y: number };
  private stationPlaques: { id: string; bounds: Rect; node: HTMLElement }[] = [];
  private landscape!: HubLandscape;
  private decorationCounts: Record<string, number> = {};
  nearby?: Interactable;
  constructor() { super('Hub'); }
  create() {
    this.objects = []; this.nearby = undefined; this.routeDirection = undefined; this.routeTarget = undefined; this.stationPlaques = [];
    this.decorationCounts = {};
    ui.bind({ interact: () => this.interact(), finish: () => this.finish(), travel: id => this.travel(id) }); ui.hud(ui.t('hub')); ui.toast('');
    document.querySelector<HTMLElement>('#game-container')!.focus();
    const map = this.cache.json.get('hub-map') as HubMap;
    this.landscape = createHubLandscape(map, minigameRegistry, hubSeed(new URLSearchParams(location.search).get('seed')));
    const width = map.width * map.tileSize, height = map.height * map.tileSize;
    const graphics = this.add.graphics().setDepth(1);
    this.add.tileSprite(-64, -64, width + 128, height + 128, decorations.terrain.ground).setOrigin(0);
    for (const tile of this.landscape.roadTiles) {
      this.add.image(tile.x, tile.y, 'nature-roads', tile.frameId).setDisplaySize(world.cellSize + 2, world.cellSize + 2).setAngle(tile.angle).setDepth(1);
    }
    const plazaBorder = this.add.graphics().setDepth(1);
    for (const road of map.roads) {
      plazaBorder.fillStyle(0x5c4028, 0.9).fillRoundedRect(road.x - 5, road.y - 5, road.width + 10, road.height + 74, 8);
      plazaBorder.fillStyle(0xc99a6b, 0.95).fillRoundedRect(road.x - 2, road.y - 2, road.width + 4, road.height + 68, 6);
      this.add.tileSprite(road.x, road.y, road.width, road.height + 64, decorations.terrain.plaza).setOrigin(0).setTilePosition(road.x, road.y).setDepth(1);
    }
    const drawPond = (pond: WaterArea) => {
      const water = waterRects(pond);
      for (const rect of water) this.add.tileSprite(rect.x, rect.y, rect.width, rect.height, 'lake-water-tile').setOrigin(0).setDepth(1);
      const size = 32, wet = (x: number, y: number) => water.some(rect => x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height);
      for (let y = pond.y; y < pond.y + pond.height; y += size) for (let x = pond.x; x < pond.x + pond.width; x += size) {
        if (!wet(x + 16, y + 16)) continue;
        for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
          if (!wet(x + 16 + dx * size, y + 16 + dy * size)) this.add.image(x + 16 + dx * 14, y + 16 + dy * 14, 'supplied-biome-3', 'mossy-rocks').setDisplaySize(36, 24).setDepth(1);
        }
      }
    };
    drawPond(map.pond); for (const lake of this.landscape.lakes) drawPond(lake);
    for (const item of this.landscape.scenery) {
      const decoration = decorationFrame(item.frameId);
      const sprite = this.add.image(item.x, item.y, decoration.atlas, decoration.id).setOrigin(0.5, 1).setDepth(item.ground ? 2 : item.y).setFlipX(item.flip);
      const scale = Math.min((item.width ?? decoration.width) / sprite.width, (item.height ?? decoration.height) / sprite.height);
      sprite.setScale(scale);
      this.decorationCounts[decoration.atlas] = (this.decorationCounts[decoration.atlas] ?? 0) + 1;
    }
    const walls = this.physics.add.staticGroup();
    const block = (x: number, y: number, w: number, h: number) => {
      const body = this.add.rectangle(x, y, w, h, 0, 0); walls.add(body);
      const physicsBody = body.body as Phaser.Physics.Arcade.StaticBody; physicsBody.setSize(w, h);
    };
    block(width / 2, 40, width, 80); block(width / 2, height - 38, width, 76); block(42, height / 2, 84, height); block(width - 42, height / 2, 84, height);
    for (const bench of map.benches) this.add.image(bench.x, bench.y, 'supplied-biome-1', 'bamboo-bench').setOrigin(0).setDisplaySize(64, 32).setDepth(bench.y + 32);
    for (const station of minigameRegistry) {
      const { x, y } = station.portal;
      const houseId = world.houses[station.id as keyof typeof world.houses];
      const house = houseId === 'demo-house' ? undefined : decorationFrame(houseId);
      const facade = this.add.image(x, y - 12, house?.atlas ?? 'demo-house', house?.id ?? 'cutout').setOrigin(0.5, 1).setDepth(y - 12);
      facade.setScale(Math.min(192 / facade.width, 128 / facade.height));
      if (!station.enabled) facade.setTint(0xc0c8b0);
      graphics.fillStyle(station.enabled ? 0xffecad : 0xbcc8a2).fillRect(x - 28, y - 12, 56, 24);
      const plaque = element('div', 'hub-station-label'); plaque.dataset.station = station.id;
      plaque.append(element('strong', '', ui.t(station.titleKey)), element('span', '', ui.t(station.enabled ? session.state.statuses[station.id] : 'later')));
      ui.screen.append(plaque);
      this.stationPlaques.push({ id: station.id, bounds: { x: x - 160, y: y - 212, width: 320, height: 68 }, node: plaque });
      if (station.enabled) {
        const instructor = { x: x + 104, y: y - 10 };
        this.add.image(instructor.x, instructor.y + 18, station.id === 'M02' ? 'instructor-a' : 'instructor-b', 'cutout').setOrigin(0.5, 1).setDisplaySize(station.id === 'M02' ? 32 : 44, 72).setDepth(instructor.y + 18);
        this.objects.push({ ...instructor, id: `${station.id}-instructor`, label: `${localize(dialogue.instructorName, session.state.locale)} · ${ui.t(station.titleKey)}`, activate: () => this.portal(station) });
      }
      this.objects.push({ ...station.portal, id: station.id, label: ui.t(station.titleKey), activate: () => this.portal(station) });
    }
    this.add.image(map.guide.x, map.guide.y + 24, 'instructor-a', 'cutout').setOrigin(0.5, 1).setDisplaySize(32, 72).setDepth(map.guide.y + 24);
    this.add.text(map.guide.x, map.guide.y - 62, 'An', { fontFamily: '"Be Vietnam Pro", Arial, sans-serif', fontSize: '20px', color: '#244e42', backgroundColor: '#fff4d8', padding: { x: 6, y: 3 } }).setResolution(2).setOrigin(0.5).setDepth(10000);
    this.objects.push({ ...map.guide, id: 'guide', label: localize(dialogue.guide.name, session.state.locale), activate: () => ui.dialogue(localize(dialogue.guide.name, session.state.locale), dialogue.guide.pages.map(p => localize(p, session.state.locale))) });
    this.add.image(map.board.x, map.board.y + 8, 'supplied-biome-1', 'trail-sign').setOrigin(0.5, 1).setDisplaySize(48, 80).setDepth(map.board.y + 8);
    for (const obstacle of hubObstacles(map, minigameRegistry, this.landscape)) block(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2, obstacle.width, obstacle.height);
    this.objects.push({ ...map.board, id: 'board', label: ui.t('board'), activate: () => ui.panel(ui.t('board'), ui.t('boardNote'), [
      { label: ui.t('reviewJourney'), run: () => { ui.close(); this.finish(); } }, { label: ui.t('close'), run: () => ui.close() },
    ]) });
    const position = safeHubPosition(session.state.hubReturnPosition, map, minigameRegistry, this.landscape);
    if (position.x !== session.state.hubReturnPosition.x || position.y !== session.state.hubReturnPosition.y) session.setPosition(position);
    this.facing = 'down';
    this.player = this.physics.add.sprite(position.x, position.y, 'player', 0).setDisplaySize(42, 72).setOrigin(0.5, 51 / 72).setCollideWorldBounds(true);
    const frame = this.player.frame, bodyWidth = frame.width * 22 / 42, bodyHeight = frame.height * 18 / 72;
    this.player.body!.setSize(bodyWidth, bodyHeight).setOffset((frame.width - bodyWidth) / 2, frame.height - bodyHeight);
    this.physics.world.setBounds(84, 76, width - 168, height - 152);
    this.physics.add.collider(this.player, walls);
    const camera = this.cameras.main;
    camera.setZoom(1.25).startFollow(this.player, true, 1, 1, 0, 64);
    const miniMap = element('div', 'hub-minimap');
    miniMap.dataset.testid = 'trail-map';
    miniMap.append(element('strong', '', ui.t('trailMap')));
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`); svg.setAttribute('aria-hidden', 'true');
    const colors = { meadow: '#d6a246', wetland: '#4c9291', woodland: '#537d46', highland: '#747f87' };
    for (const rect of [...waterRects(map.pond), ...this.landscape.lakes]) {
      const lake = document.createElementNS(svg.namespaceURI, 'rect');
      for (const key of ['x', 'y', 'width', 'height'] as const) lake.setAttribute(key, String(rect[key]));
      lake.setAttribute('fill', '#4a9cb1'); svg.append(lake);
    }
    for (const route of [...this.landscape.routes, ...this.landscape.links]) {
      const line = document.createElementNS(svg.namespaceURI, 'polyline');
      line.setAttribute('points', route.points.map(point => `${point.x},${point.y}`).join(' '));
      line.setAttribute('fill', 'none'); line.setAttribute('stroke', colors[route.theme]); line.setAttribute('stroke-width', '45');
      svg.append(line);
      if (route.stationId === 'north-loop') continue;
      const point = route.points[route.points.length - 1];
      const label = document.createElementNS(svg.namespaceURI, 'text'); label.setAttribute('x', String(point.x)); label.setAttribute('y', String(point.y - 80));
      label.setAttribute('text-anchor', 'middle'); label.setAttribute('font-size', '140'); label.setAttribute('font-weight', '800'); label.textContent = route.stationId; svg.append(label);
    }
    const marker = document.createElementNS(svg.namespaceURI, 'circle'); marker.setAttribute('r', '55'); marker.setAttribute('fill', '#c75336'); marker.setAttribute('stroke', '#fff9e9'); marker.setAttribute('stroke-width', '18'); svg.append(marker);
    const biomeLabel = element('span', 'hub-biome-label', ui.t('hub'));
    miniMap.append(svg, biomeLabel);
    const hudTools = document.querySelector('#hud .tools');
    if (hudTools) hudTools.append(miniMap); else ui.screen.append(miniMap);
    const resizeCamera = () => this.fitCamera(width, height);
    resizeCamera();
    const positionLabels = () => {
      marker.setAttribute('cx', String(this.player.x)); marker.setAttribute('cy', String(this.player.y));
      const region = Math.hypot(this.player.x - map.spawn.x, this.player.y - map.spawn.y) < 250 ? undefined : map.biomes.find(biome => {
        const station = minigameRegistry.find(station => station.id === biome.stationId)!;
        return (station.portal.x < map.spawn.x) === (this.player.x < map.spawn.x) && (station.portal.y < map.spawn.y) === (this.player.y < map.spawn.y);
      });
      const regionTitle = region ? localize(region.title, session.state.locale) : ui.t('hub');
      if (biomeLabel.textContent !== regionTitle) biomeLabel.textContent = regionTitle;
      for (const plaque of this.stationPlaques) {
        const bounds = this.labelBounds(plaque.bounds);
        plaque.node.hidden = bounds.y < camera.y || bounds.y + bounds.height > camera.y + camera.height || bounds.x + bounds.width < 0 || bounds.x > this.scale.width;
        Object.assign(plaque.node.style, { left: `${bounds.x / this.scale.width * 100}%`, top: `${bounds.y / this.scale.height * 100}%`, width: `${bounds.width / this.scale.width * 100}%`, height: `${bounds.height / this.scale.height * 100}%` });
      }
    };
    this.game.events.on('postrender', positionLabels);
    this.scale.on('resize', resizeCamera); window.addEventListener('resize', resizeCamera); document.addEventListener('fullscreenchange', resizeCamera);
    this.events.once('shutdown', () => {
      this.scale.off('resize', resizeCamera); window.removeEventListener('resize', resizeCamera); document.removeEventListener('fullscreenchange', resizeCamera);
      this.game.events.off('postrender', positionLabels);
      for (const plaque of this.stationPlaques) plaque.node.remove();
      miniMap.remove(); this.objects = []; this.nearby = undefined;
    });
    this.controls = new InputManager(this);
    const hint = element('div', 'world-hint');
    if (session.state.mode === 'presentation') {
      const next = nextPresentationStation(session.state.statuses);
      hint.dataset.testid = 'route-hint';
      const title = element('p', '', next ? ui.t(next.titleKey) : ui.t('routeDone'));
      if (next) {
        this.routeTarget = next.portal;
        this.routeDirection = element('span', 'route-direction');
        this.routeDirection.dataset.testid = 'route-direction';
        title.append(' ', this.routeDirection);
        graphics.lineStyle(3, 0xffecc2).strokeRect(next.portal.x - 34, next.portal.y - 17, 68, 34);
      }
      hint.append(element('span', 'eyebrow', ui.t(next ? 'nextStation' : 'reviewJourney')), title);
    } else hint.append(element('span', 'eyebrow', ui.t('available')), element('p', '', ui.t('allDone')));
    ui.screen.append(hint);
    ui.tutorial();
  }
  update() {
    if (!this.player?.body) return;
    const direction = ui.blocked ? { x: 0, y: 0 } : this.controls.movement();
    this.player.setVelocity(direction.x * 160, direction.y * 160).setDepth(this.player.y + 21);
    if (direction.x || direction.y) {
      if (Math.abs(direction.x) >= Math.abs(direction.y)) {
        this.facing = direction.x < 0 ? 'left' : 'right';
      } else {
        this.facing = direction.y < 0 ? 'up' : 'down';
      }
      this.player.setFlipX(false).setAngle(0);
      if (ui.lowMotion) {
        this.player.anims.stop();
        this.player.setFrame({ down: 0, up: 4, left: 8, right: 12 }[this.facing]);
      } else {
        this.player.anims.play(`player-walk-${this.facing}`, true);
      }

    }
    else {
      this.player.anims.stop();
      this.player.setFlipX(false).setAngle(0).setFrame({ down: 0, up: 4, left: 8, right: 12 }[this.facing]);
    }
    this.nearby = ui.blocked ? undefined : nearestInteraction(this.player, this.objects);
    ui.prompt(this.nearby?.label ?? '');
    if (this.routeDirection && this.routeTarget) {
      const dx = this.routeTarget.x - this.player.x, dy = this.routeTarget.y - this.player.y;
      const key = Math.hypot(dx, dy) <= 78 ? 'directionNear' : Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'directionLeft' : 'directionRight') : (dy < 0 ? 'directionUp' : 'directionDown');
      const label = ui.t(key);
      if (this.routeDirection.textContent !== label) this.routeDirection.textContent = label;
    }
  }
  private interact() { if (!ui.blocked) this.nearby?.activate(); }
  private fitCamera(width: number, height: number) {
    const camera = this.cameras.main;
    camera.setViewport(0, 0, this.scale.width, this.scale.height);
    camera.setFollowOffset(0, 48);
    const padding = Math.max(0, camera.displayWidth - width) / 2;
    camera.setBounds(-padding, 0, width + padding * 2, height);
  }
  layoutSnapshot() {
    const map = this.cache.json.get('hub-map') as HubMap;
    return { worldSeed: this.landscape.seed, worldSize: { width: map.width * map.tileSize, height: map.height * map.tileSize }, routes: this.landscape.routes, links: this.landscape.links, roadTiles: this.landscape.roadTiles.length, decorations: this.decorationCounts,
      scenery: this.landscape.scenery.filter(item => item.kind === 'landmark'), lakes: this.landscape.lakes,
      sceneryCounts: this.landscape.routes.map(route => ({ theme: route.theme, plants: this.landscape.scenery.filter(item => item.theme === route.theme && item.kind === 'plant').length,
        animals: this.landscape.scenery.filter(item => item.theme === route.theme && item.kind === 'animal').length, landmarks: this.landscape.scenery.filter(item => item.theme === route.theme && item.kind === 'landmark').length })),
      stationLabels: this.stationPlaques.map(({ id, bounds }) => ({ id, bounds: this.labelBounds(bounds) })) };
  }
  private labelBounds(bounds: Rect): Rect {
    const camera = this.cameras.main;
    return {
      x: camera.x + (bounds.x - camera.worldView.x) * camera.zoomX,
      y: camera.y + (bounds.y - camera.worldView.y) * camera.zoomY,
      width: bounds.width * camera.zoomX, height: bounds.height * camera.zoomY,
    };
  }
  private travel(id: string) {
    const station = nextPresentationStation(session.state.statuses);
    if (session.state.mode !== 'presentation' || station?.id !== id) return;
    session.setPosition({ x: station.portal.x, y: station.portal.y + 48 });
    this.scene.restart();
  }
  private portal(station: MinigameDefinition) {
    if (!station.enabled) { ui.dialogue(ui.t(station.titleKey), [ui.t(station.objectiveKey), ui.t('later')]); return; }
    ui.panel(ui.t(station.titleKey), ui.t(station.objectiveKey), [
      { label: ui.t('enter'), run: () => {
        const returnPosition = { x: this.player.x, y: this.player.y };
        session.begin(station.id, returnPosition); ui.close();
        const seed = Number(new URLSearchParams(location.search).get('seed') ?? 42);
        const payload: MinigamePayload = { minigameId: station.id, mode: session.state.mode, seed: Number.isFinite(seed) ? seed : 42, returnPosition };
        this.scene.start(station.sceneKey, payload);
      } }, { label: ui.t('close'), run: () => ui.close() },
    ]);
  }
  private finish() { session.setPosition({ x: this.player.x, y: this.player.y }); this.scene.start('Ending'); }
}
