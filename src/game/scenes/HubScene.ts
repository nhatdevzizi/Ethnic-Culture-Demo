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
import type { MinigameDefinition } from '../core/types';
import { ui, element } from '../ui/OverlayController';
import dialogue from '../../content/dialogues.json';
import { StationGameModal } from '../ui/StationGameModal';
import { gameshow } from '../core/GameshowEngine';
export class HubScene extends Phaser.Scene {
  player!: Phaser.Physics.Arcade.Sprite;
  private controls!: InputManager;
  private objects: Interactable[] = [];
  private stationPlaques: { id: string; bounds: Rect; node: HTMLElement }[] = [];
  private landscape!: HubLandscape;
  private decorationCounts: Record<string, number> = {};
  private portalCooldown = false;
  nearby?: Interactable;
  constructor() { super('Hub'); }
  create() {
    this.objects = []; this.nearby = undefined; this.stationPlaques = [];
    this.decorationCounts = {};
    ui.bind({ interact: () => this.interact(), finish: () => this.finish(), travel: id => this.travel(id) }); ui.hud(ui.t('hub')); ui.toast('');
    document.querySelector<HTMLElement>('#game-container')!.focus();
    const map = this.cache.json.get('hub-map') as HubMap;
    this.landscape = createHubLandscape(map, minigameRegistry, hubSeed(new URLSearchParams(location.search).get('seed')));
    const width = map.width * map.tileSize, height = map.height * map.tileSize;
    const graphics = this.add.graphics().setDepth(1);
    this.add.tileSprite(-64, -64, width + 128, height + 128, decorations.terrain.ground).setOrigin(0);
    for (const tile of this.landscape.roadTiles) {
      this.add.image(tile.x, tile.y, 'nature-roads', tile.frameId).setDisplaySize(world.cellSize + 1, world.cellSize + 1).setAngle(tile.angle);
    }
    for (const road of map.roads) this.add.tileSprite(road.x, road.y, road.width, road.height, decorations.terrain.plaza).setOrigin(0).setTilePosition(road.x, road.y);
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
    for (let x = 0; x < map.width; x++) { this.add.image(x * 32, 0, 'stone-tile').setOrigin(0); this.add.image(x * 32, height - 32, 'stone-tile').setOrigin(0); }
    for (let y = 1; y < map.height - 1; y++) { this.add.image(0, y * 32, 'stone-tile').setOrigin(0); this.add.image(width - 32, y * 32, 'stone-tile').setOrigin(0); }
    block(width / 2, 16, width, 32); block(width / 2, height - 16, width, 32); block(16, height / 2, 32, height); block(width - 16, height / 2, 32, height);
    for (const bench of map.benches) this.add.image(bench.x, bench.y, 'supplied-biome-1', 'bamboo-bench').setOrigin(0).setDisplaySize(64, 32).setDepth(bench.y + 32);
    for (const station of minigameRegistry) {
      const { x, y } = station.portal;
      const houseId = world.houses[station.id as keyof typeof world.houses];
      const house = houseId === 'demo-house' ? undefined : decorationFrame(houseId);
      const facade = this.add.image(x, y - 12, house?.atlas ?? 'demo-house', house?.id ?? 'cutout').setOrigin(0.5, 1).setDepth(y - 12);
      facade.setScale(Math.min(192 / facade.width, 128 / facade.height));
      facade.setInteractive({ useHandCursor: true });
      facade.on('pointerdown', () => this.portal(station));
      if (!station.enabled) facade.setTint(0xc0c8b0);
      graphics.fillStyle(station.enabled ? 0xffecad : 0xbcc8a2).fillRect(x - 28, y - 12, 56, 24);

      const zone = this.add.zone(x, y - 6, 64, 36).setOrigin(0.5).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.portal(station));

      const stationIcons: Record<string, string> = {
        M01: '🏮',
        M02: '🎪',
        M03: '🎵',
        M04: '🔥',
      };
      const icon = stationIcons[station.id] || '⭐';
      const plaque = element('div', 'hub-station-label'); plaque.dataset.station = station.id;
      plaque.append(element('strong', '', `${icon} ${ui.t(station.titleKey)}`), element('span', '', ui.t(station.objectiveKey)));
      plaque.style.pointerEvents = 'auto';
      plaque.style.cursor = 'pointer';
      plaque.onclick = () => this.portal(station);
      ui.screen.append(plaque);
      this.stationPlaques.push({ id: station.id, bounds: { x: x - 160, y: y - 212, width: 320, height: 68 }, node: plaque });
      if (station.enabled) {
        const instructor = { x: x + 104, y: y - 10 };
        this.add.image(instructor.x, instructor.y + 18, station.id === 'M02' ? 'instructor-a' : 'instructor-b', 'cutout').setOrigin(0.5, 1).setDisplaySize(station.id === 'M02' ? 32 : 44, 72).setDepth(instructor.y + 18);
        this.objects.push({ ...instructor, id: `${station.id}-instructor`, label: `${icon} ${ui.t(station.titleKey)}`, activate: () => this.portal(station) });
      }
      this.objects.push({ ...station.portal, id: station.id, label: `${icon} ${ui.t(station.titleKey)}`, activate: () => this.portal(station) });
    }
    this.add.image(map.guide.x, map.guide.y + 24, 'instructor-a', 'cutout').setOrigin(0.5, 1).setDisplaySize(32, 72).setDepth(map.guide.y + 24);
    this.add.text(map.guide.x, map.guide.y - 62, 'An', { fontFamily: '"Be Vietnam Pro", Arial, sans-serif', fontSize: '20px', color: '#244e42', backgroundColor: '#fff4d8', padding: { x: 6, y: 3 } }).setResolution(2).setOrigin(0.5).setDepth(10000);
    this.objects.push({ ...map.guide, id: 'guide', label: localize(dialogue.guide.name, session.state.locale), activate: () => ui.dialogue(localize(dialogue.guide.name, session.state.locale), dialogue.guide.pages.map(p => localize(p, session.state.locale))) });
    // Trống Đồng Đông Sơn Hoàng Kim tại quảng trường trung tâm (không có viền/nền đen)
    const baseAura = this.add.circle(map.board.x, map.board.y - 10, 75, 0xffd700, 0.28).setDepth(map.board.y - 2);
    const outerAura = this.add.circle(map.board.x, map.board.y - 10, 90, 0xffeb7a, 0.16).setDepth(map.board.y - 1);
    this.tweens.add({
      targets: [baseAura, outerAura],
      scale: 1.25,
      alpha: 0.06,
      duration: 1800,
      yoyo: true,
      repeat: -1,
    });

    const drumSprite = this.add.image(map.board.x, map.board.y - 10, 'trong-dong').setOrigin(0.5, 0.5).setDisplaySize(130, 130).setDepth(map.board.y + 8);
    drumSprite.setInteractive({ useHandCursor: true });
    this.tweens.add({
      targets: drumSprite,
      angle: 360,
      duration: 48000,
      repeat: -1,
      ease: 'Linear',
    });
    drumSprite.on('pointerdown', () => this.tryOpenGrandFinale());

    this.add.text(map.board.x, map.board.y - 85, '✨ TRỐNG ĐỒNG ĐÔNG SƠN ✨', {
      fontFamily: '"Be Vietnam Pro", Arial, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#4a2f00',
      backgroundColor: '#ffd700',
      padding: { x: 8, y: 3 },
    }).setOrigin(0.5).setDepth(map.board.y + 12);

    for (const obstacle of hubObstacles(map, minigameRegistry, this.landscape)) block(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2, obstacle.width, obstacle.height);
    this.objects.push({
      ...map.board,
      id: 'board',
      label: '🥁 Trống Đồng Đông Sơn (Đại Kết Cục)',
      activate: () => this.tryOpenGrandFinale(),
    });
    const position = safeHubPosition(session.state.hubReturnPosition, map, minigameRegistry, this.landscape);
    if (position.x !== session.state.hubReturnPosition.x || position.y !== session.state.hubReturnPosition.y) session.setPosition(position);
    this.player = this.physics.add.sprite(position.x, position.y, 'instructor-a', 'cutout').setDisplaySize(32, 72).setOrigin(0.5, 51 / 72).setCollideWorldBounds(true);
    const frame = this.player.frame, bodyWidth = frame.width * 22 / 32, bodyHeight = frame.height * 18 / 72;
    this.player.body!.setSize(bodyWidth, bodyHeight).setOffset((frame.width - bodyWidth) / 2, frame.height - bodyHeight);
    this.physics.world.setBounds(32, 32, width - 64, height - 64);
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
    miniMap.append(svg); ui.screen.append(miniMap);
    const biomeLabel = element('span', 'hub-biome-label', ui.t('hub')); miniMap.append(biomeLabel);
    const resizeCamera = () => this.fitCamera(width, height);
    resizeCamera();
    const positionLabels = () => {
      miniMap.style.top = `${(camera.y + 12) / this.scale.height * 100}%`;
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
    const hudObserver = new ResizeObserver(resizeCamera); hudObserver.observe(document.querySelector('#hud')!);
    this.scale.on('resize', resizeCamera); window.addEventListener('resize', resizeCamera); document.addEventListener('fullscreenchange', resizeCamera);
    this.events.once('shutdown', () => {
      hudObserver.disconnect(); this.scale.off('resize', resizeCamera); window.removeEventListener('resize', resizeCamera); document.removeEventListener('fullscreenchange', resizeCamera);
      this.game.events.off('postrender', positionLabels);
      for (const plaque of this.stationPlaques) plaque.node.remove();
      miniMap.remove();
      this.scoreboardNode?.remove();
      this.scoreboardNode = undefined;
    });
    this.controls = new InputManager(this);
    this.renderScoreboard();
    ui.tutorial();
    this.events.once('shutdown', () => { this.objects = []; this.nearby = undefined; });
  }
  update() {
    if (!this.player?.body) return;
    const isFrozen = ui.blocked || StationGameModal.get().isOpen;
    if (isFrozen) {
      this.player.setVelocity(0, 0);
      this.player.setAngle(0);
      return;
    }
    const direction = this.controls.movement();
    this.player.setVelocity(direction.x * 280, direction.y * 280).setDepth(this.player.y + 21);
    if (direction.x || direction.y) {
      this.player.setAngle(ui.lowMotion ? 0 : Math.sin(this.time.now / 95) * 1.5);
      if (direction.x) this.player.setFlipX(direction.x < 0);
    }
    else this.player.setAngle(0);
    this.nearby = nearestInteraction(this.player, this.objects, 130);
    ui.prompt(this.nearby?.label ?? '');

    // Automatic entrance check when stepping on portal pad or approaching board
    if (!StationGameModal.get().isOpen) {
      const map = this.cache.json.get('hub-map') as HubMap;
      if (this.portalCooldown) {
        const anyNear = minigameRegistry.some(s => Math.hypot(this.player.x - s.portal.x, this.player.y - s.portal.y) <= 100);
        const boardNear = Math.hypot(this.player.x - map.board.x, this.player.y - map.board.y) <= 100;
        if (!anyNear && !boardNear) {
          this.portalCooldown = false;
        }
      } else {
        for (const station of minigameRegistry) {
          if (Math.hypot(this.player.x - station.portal.x, this.player.y - station.portal.y) <= 80) {
            this.portalCooldown = true;
            this.portal(station);
            break;
          }
        }
        if (!this.portalCooldown && Math.hypot(this.player.x - map.board.x, this.player.y - map.board.y) <= 80) {
          this.portalCooldown = true;
          this.tryOpenGrandFinale();
        }
      }
    }
  }
  private tryOpenGrandFinale() {
    const keys = gameshow.getCollectedKeysCount();
    if (keys < 4) {
      ui.panel(
        '🔒 TRỐNG ĐỒNG ĐÔNG SƠN ĐANG BỊ PHONG ẤN!',
        `Hiện tại các đội mới thu thập được ${keys}/4 Chìa Khóa.\n\nHãy hoàn thành cả 4 Lán Trại văn hóa (còn thiếu ${4 - keys} chìa khóa) để giải trừ phong ấn và bước vào ĐẠI KẾT CỤC!`,
        [{ label: 'TIẾP TỤC KHÁM PHÁ', run: () => ui.close() }]
      );
      return;
    }
    StationGameModal.get().open('board', () => {
      this.renderScoreboard();
      ui.hud(ui.t('hub'));
    });
  }
  private interact() { if (!ui.blocked) this.nearby?.activate(); }
  private fitCamera(width: number, height: number) {
    const canvas = this.game.canvas.getBoundingClientRect(), hud = document.querySelector('#hud')!.getBoundingClientRect();
    const scale = canvas.height / this.scale.height;
    const reserve = Math.max(96, Math.ceil((hud.bottom - canvas.top) / (scale || 1) + 8));
    const camera = this.cameras.main;
    camera.setViewport(0, reserve, this.scale.width, Math.max(1, this.scale.height - reserve));
    // Keep the approached station's label above the player with HUD space reserved.
    camera.setFollowOffset(0, 64 + (reserve - 96) / (2 * camera.zoom));
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
    const stationId = station.id as 'M01' | 'M02' | 'M03' | 'M04';
    StationGameModal.get().open(stationId, () => {
      this.renderScoreboard();
    });
  }
  private scoreboardNode?: HTMLElement;
  private renderScoreboard() {
    if (!this.scoreboardNode) {
      this.scoreboardNode = element('div', 'hub-live-scoreboard');
      this.scoreboardNode.id = 'hub-live-scoreboard';
      ui.screen.append(this.scoreboardNode);
    }
    const keysCount = gameshow.getCollectedKeysCount();
    this.scoreboardNode.innerHTML = `
      <div class="hub-gs-title">
        <span>🥁</span> THANH ÂM ĐẠI NGÀN
        <span class="hub-keys-pill ${keysCount >= 4 ? 'unlocked' : ''}">🗝️ Chìa Khóa: ${keysCount}/4</span>
      </div>
      <div class="hub-teams-row">
        ${gameshow.teams.map(t => `
          <div class="hub-team-pill" style="border-color:${t.color}">
            <span>${t.name}</span>
            <strong>${t.score}đ</strong>
            <small style="color:#9ec7b8">⚡${t.cards.steal_points} 🔒${t.cards.block_turn} 🛡️${t.cards.shield}</small>
          </div>
        `).join('')}
      </div>
    `;
    ui.hud(ui.t('hub'));
  }
  private finish() { session.setPosition({ x: this.player.x, y: this.player.y }); this.scene.start('Ending'); }
}
