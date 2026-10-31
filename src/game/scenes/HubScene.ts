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
  private facing: 'down' | 'up' | 'left' | 'right' = 'down';
  private controls!: InputManager;
  private objects: Interactable[] = [];
  private stationPlaques: { id: string; bounds: Rect; node: HTMLElement }[] = [];
  private landscape!: HubLandscape;
  private decorationCounts: Record<string, number> = {};
  private portalCooldown = false;
  private map!: HubMap;
  nearby?: Interactable;

  constructor() {
    super('Hub');
  }

  create() {
    this.objects = [];
    this.nearby = undefined;
    this.stationPlaques = [];
    this.decorationCounts = {};

    ui.bind({
      interact: () => this.interact(),
      finish: () => this.finish(),
      travel: (id) => this.travel(id),
    });
    ui.hud(ui.t('hub'));
    ui.toast('');
    document.querySelector<HTMLElement>('#game-container')!.focus();

    this.map = this.cache.json.get('hub-map') as HubMap;
    const map = this.map;
    // Render every label at high resolution so text stays sharp under camera zoom.
    const addText = this.add.text.bind(this.add) as (...args: unknown[]) => Phaser.GameObjects.Text;
    (this.add as unknown as { text: typeof addText }).text = (...args) => addText(...args).setResolution(3);

    this.landscape = createHubLandscape(
      map,
      minigameRegistry,
      hubSeed(new URLSearchParams(location.search).get('seed'))
    );

    const width = map.width * map.tileSize;
    const height = map.height * map.tileSize;

    this.add
      .tileSprite(-64, -64, width + 128, height + 128, decorations.terrain.ground)
      .setOrigin(0);

    for (const tile of this.landscape.roadTiles) {
      this.add
        .image(tile.x, tile.y, 'nature-roads', tile.frameId)
        .setDisplaySize(world.cellSize + 2, world.cellSize + 2)
        .setAngle(tile.angle)
        .setDepth(1);
    }

    const plazaBorder = this.add.graphics().setDepth(1);
    for (const road of map.roads) {
      plazaBorder
        .fillStyle(0x5c4028, 0.9)
        .fillRoundedRect(road.x - 5, road.y - 5, road.width + 10, road.height + 74, 8);
      plazaBorder
        .fillStyle(0xc99a6b, 0.95)
        .fillRoundedRect(road.x - 2, road.y - 2, road.width + 4, road.height + 68, 6);
      this.add
        .tileSprite(road.x, road.y, road.width, road.height + 64, decorations.terrain.plaza)
        .setOrigin(0)
        .setTilePosition(road.x, road.y)
        .setDepth(1);
    }

    const drawPond = (pond: WaterArea) => {
      const water = waterRects(pond);
      for (const rect of water) {
        this.add
          .tileSprite(rect.x, rect.y, rect.width, rect.height, 'lake-water-tile')
          .setOrigin(0)
          .setDepth(1);
      }
      const size = 32;
      const wet = (x: number, y: number) =>
        water.some(
          (rect) =>
            x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height
        );
      for (let y = pond.y; y < pond.y + pond.height; y += size) {
        for (let x = pond.x; x < pond.x + pond.width; x += size) {
          if (!wet(x + 16, y + 16)) continue;
          for (const [dx, dy] of [
            [0, -1],
            [0, 1],
            [-1, 0],
            [1, 0],
          ]) {
            if (!wet(x + 16 + dx * size, y + 16 + dy * size)) {
              this.add
                .image(x + 16 + dx * 14, y + 16 + dy * 14, 'supplied-biome-3', 'mossy-rocks')
                .setDisplaySize(36, 24)
                .setDepth(1);
            }
          }
        }
      }
    };

    drawPond(map.pond);
    for (const lake of this.landscape.lakes) drawPond(lake);

    for (const item of this.landscape.scenery) {
      const decoration = decorationFrame(item.frameId);
      const sprite = this.add
        .image(item.x, item.y, decoration.atlas, decoration.id)
        .setOrigin(0.5, 1)
        .setDepth(item.ground ? 2 : item.y)
        .setFlipX(item.flip);
      const scale = Math.min(
        (item.width ?? decoration.width) / sprite.width,
        (item.height ?? decoration.height) / sprite.height
      );
      sprite.setScale(scale);
      this.decorationCounts[decoration.atlas] =
        (this.decorationCounts[decoration.atlas] ?? 0) + 1;
    }

    const walls = this.physics.add.staticGroup();
    const block = (x: number, y: number, w: number, h: number) => {
      const body = this.add.rectangle(x, y, w, h, 0, 0);
      walls.add(body);
      const physicsBody = body.body as Phaser.Physics.Arcade.StaticBody;
      physicsBody.setSize(w, h);
    };

    block(width / 2, 40, width, 80);
    block(width / 2, height - 38, width, 76);
    block(42, height / 2, 84, height);
    block(width - 42, height / 2, 84, height);

    for (const bench of map.benches) {
      this.add
        .image(bench.x, bench.y, 'supplied-biome-1', 'bamboo-bench')
        .setOrigin(0)
        .setDisplaySize(64, 32)
        .setDepth(bench.y + 32);
    }

    for (const station of minigameRegistry) {
      const { x, y } = station.portal;
      const houseId = world.houses[station.id as keyof typeof world.houses];
      const house = houseId === 'demo-house' ? undefined : decorationFrame(houseId);
      const facade = this.add
        .image(x, y - 12, house?.atlas ?? 'demo-house', house?.id ?? 'cutout')
        .setOrigin(0.5, 1)
        .setDepth(y - 12);
      facade.setScale(Math.min(192 / facade.width, 128 / facade.height));
      facade.setInteractive({ useHandCursor: true });
      facade.on('pointerdown', () => this.portal(station));
      if (!station.enabled) facade.setTint(0xc0c8b0);

      const zone = this.add
        .zone(x, y - 6, 64, 36)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.portal(station));

      const stationIcons: Record<string, string> = {
        M01: '🏮',
        M02: '🎪',
        M03: '🎵',
        M04: '🔥',
      };
      const icon = stationIcons[station.id] || '⭐';
      const plaque = element('div', 'hub-station-label');
      plaque.dataset.station = station.id;
      plaque.append(
        element('strong', '', `${icon} ${ui.t(station.titleKey)}`),
        element('span', '', ui.t(station.objectiveKey))
      );
      plaque.style.pointerEvents = 'auto';
      plaque.style.cursor = 'pointer';
      plaque.onclick = () => this.portal(station);
      ui.screen.append(plaque);
      this.stationPlaques.push({
        id: station.id,
        bounds: { x: x - 160, y: y - 212, width: 320, height: 68 },
        node: plaque,
      });

      if (station.enabled) {
        const instructor = { x: x + 104, y: y - 10 };
        const npcConfig: Record<string, { key: string; name: string; title: string }> = {
          M01: { key: 'npc_dao', name: 'Chị Mây (Dao Đỏ)', title: 'Chị Mây - Nghệ nhân thêu Thổ Cẩm Dao Đỏ' },
          M02: { key: 'npc_hmong', name: 'A Páo (H\'Mông)', title: 'A Páo - Nghệ nhân khèn H\'Mông' },
          M03: { key: 'npc_ede', name: 'Y Ban (Ê Đê)', title: 'Y Ban - Nghệ nhân Cồng Chiêng Tây Nguyên' },
          M04: { key: 'npc_thai', name: 'Nàng Ban (Thái)', title: 'Nàng Ban - Cô gái Thái bên Lửa Thiêng' },
        };
        const npc = npcConfig[station.id];
        const npcImg = this.add
          .image(
            instructor.x,
            instructor.y + 18,
            npc ? npc.key : (station.id === 'M02' ? 'instructor-a' : 'instructor-b'),
            npc ? undefined : 'cutout'
          )
          .setOrigin(0.5, 1)
          .setDisplaySize(npc ? 46 : (station.id === 'M02' ? 32 : 44), 74)
          .setDepth(instructor.y + 18);
        npcImg.setInteractive({ useHandCursor: true });
        npcImg.on('pointerdown', () => this.portal(station));

        if (npc) {
          this.add
            .dom(instructor.x, instructor.y - 60, 'span', 'font-family:\"Be Vietnam Pro\",Arial,sans-serif;font-size:12px;font-weight:bold;color:#1a3d2e;text-shadow:-1px -1px 0 #fff,1px -1px 0 #fff,-1px 1px 0 #fff,1px 1px 0 #fff;white-space:nowrap;pointer-events:none;user-select:none', npc.name)
            .setOrigin(0.5, 0.5)
            .setDepth(instructor.y + 20);
        }

        this.objects.push({
          ...instructor,
          id: `${station.id}-instructor`,
          label: `${icon} ${npc ? npc.title : ui.t(station.titleKey)}`,
          activate: () => this.portal(station),
        });
      }

      this.objects.push({
        ...station.portal,
        id: station.id,
        label: `${icon} ${ui.t(station.titleKey)}`,
        activate: () => this.portal(station),
      });
    }

    this.add
      .image(map.guide.x, map.guide.y + 24, 'instructor-a', 'cutout')
      .setOrigin(0.5, 1)
      .setDisplaySize(32, 72)
      .setDepth(map.guide.y + 24);
    this.add
      .dom(map.guide.x, map.guide.y - 62, 'span', 'font-family:\"Be Vietnam Pro\",Arial,sans-serif;font-size:16px;font-weight:bold;color:#1a3d2e;text-shadow:-1px -1px 0 #fff,1px -1px 0 #fff,-1px 1px 0 #fff,1px 1px 0 #fff;white-space:nowrap;pointer-events:none;user-select:none', 'An')
      .setOrigin(0.5, 0.5)
      .setDepth(10000);
    this.objects.push({
      ...map.guide,
      id: 'guide',
      label: localize(dialogue.guide.name, session.state.locale),
      activate: () =>
        ui.dialogue(
          localize(dialogue.guide.name, session.state.locale),
          dialogue.guide.pages.map((p) => localize(p, session.state.locale))
        ),
    });

    // Trống Đồng Đông Sơn Hoàng Kim tại quảng trường trung tâm
    const baseAura = this.add
      .circle(map.board.x, map.board.y - 10, 75, 0xffd700, 0.28)
      .setDepth(map.board.y - 2);
    const outerAura = this.add
      .circle(map.board.x, map.board.y - 10, 90, 0xffeb7a, 0.16)
      .setDepth(map.board.y - 1);
    this.tweens.add({
      targets: [baseAura, outerAura],
      scale: 1.25,
      alpha: 0.06,
      duration: 1800,
      yoyo: true,
      repeat: -1,
    });

    const drumSprite = this.add
      .image(map.board.x, map.board.y - 10, 'trong-dong')
      .setOrigin(0.5, 0.5)
      .setDisplaySize(130, 130)
      .setDepth(map.board.y + 8);
    drumSprite.setInteractive({ useHandCursor: true });
    this.tweens.add({
      targets: drumSprite,
      angle: 360,
      duration: 48000,
      repeat: -1,
      ease: 'Linear',
    });
    drumSprite.on('pointerdown', () => this.tryOpenGrandFinale());

    this.add
      .dom(map.board.x, map.board.y - 85, 'span', 'font-family:\"Be Vietnam Pro\",Arial,sans-serif;font-size:13px;font-weight:bold;color:#4a2f00;text-shadow:-1px -1px 0 #ffe680,1px -1px 0 #ffe680,-1px 1px 0 #ffe680,1px 1px 0 #ffe680;white-space:nowrap;pointer-events:none;user-select:none', 'TRỐNG ĐỒNG ĐÔNG SƠN')
      .setOrigin(0.5, 0.5)
      .setDepth(map.board.y + 12);

    for (const obstacle of hubObstacles(map, minigameRegistry, this.landscape)) {
      block(
        obstacle.x + obstacle.width / 2,
        obstacle.y + obstacle.height / 2,
        obstacle.width,
        obstacle.height
      );
    }

    this.objects.push({
      ...map.board,
      id: 'board',
      label: '🥁 Trống Đồng Đông Sơn (Đại Kết Cục)',
      activate: () => this.tryOpenGrandFinale(),
    });

    // === KHU LỄ HỘI VĂN HÓA ĐA SẮC MÀU CÁC DÂN TỘC VIỆT NAM ===
    interface FestivalItem {
      id: string;
      key: string;
      x: number;
      y: number;
      width: number;
      height: number;
      label: string;
      badge: string;
      dialogueTitle: string;
      dialoguePages: string[];
      block: boolean;
      blockW?: number;
      blockH?: number;
    }

    const festivalAttractions: FestivalItem[] = [
      {
        id: 'fest-thuyen-ngo',
        key: 'fest_thuyen_ngo',
        x: 1350,
        y: 350,
        width: 190,
        height: 124,
        label: '🚣 Lễ Hội Đua Ghe Ngo (Đồng bào Khmer)',
        badge: 'Đua Ghe Ngo',
        dialogueTitle: 'Lễ Hội Đua Ghe Ngo - Đồng bào Khmer Nam Bộ',
        dialoguePages: [
          'Ghe Ngo (Chầm Ngo) là báu vật thiêng liêng của đồng bào Khmer Nam Bộ, xuất hiện rực rỡ trong lễ hội Ok Om Bok rằm tháng 10 âm lịch.',
          'Mỗi chiếc ghe Ngo chạm khắc hình rồng hoặc rắn Naga uy nghi dài tới 30m, chở 50-60 tay bơi cùng hòa nhịp mái chèo thần tốc trong tiếng trống rộn rã, thể hiện tình đoàn kết và khát vọng chinh phục sông nước.'
        ],
        block: false
      },
      {
        id: 'fest-mua-sap',
        key: 'fest_mua_sap',
        x: 1120,
        y: 740,
        width: 170,
        height: 116,
        label: '🎋 Điệu Múa Sạp Ngày Hội (Thái - Mường)',
        badge: 'Múa Sạp Tây Bắc',
        dialogueTitle: 'Điệu Múa Sạp Ngày Hội - Dân tộc Thái, Mường',
        dialoguePages: [
          'Múa sạp là điệu múa dân gian rộn ràng không thể thiếu trong các ngày hội xuân và mừng cơm mới của người Thái, Mường.',
          'Hai hàng người gõ nhịp sạp tre giòn giã đón bước chân khéo léo, uyển chuyển của các chàng trai cô gái, thể hiện tinh thần đoàn kết, lạc quan yêu đời và tình yêu đôi lứa.'
        ],
        block: true,
        blockW: 100,
        blockH: 50
      },
      {
        id: 'fest-nem-con',
        key: 'fest_nem_con',
        x: 1440,
        y: 740,
        width: 100,
        height: 118,
        label: '🎯 Trò Chơi Ném Còn (Tày - Nùng - Thái)',
        badge: 'Cây Còn Ngày Hội',
        dialogueTitle: 'Lễ Hội Ném Còn - Dân tộc Tày, Thái, Nùng',
        dialoguePages: [
          'Cột còn cao vút giữa bãi hội tượng trưng cho trục vũ trụ nối đất với trời. Quả còn ngũ sắc khâu từ vải thổ cẩm nhồi hạt thóc mang ước vọng phồn thực.',
          'Người nào ném quả còn lọt qua hồng tâm trên đỉnh cột sẽ mang lại phúc lộc dồi dào, mưa thuận gió hòa và mùa màng bội thu cho khắp thôn bản!'
        ],
        block: true,
        blockW: 60,
        blockH: 30
      },
      {
        id: 'fest-ruou-can',
        key: 'fest_ruou_can',
        x: 1060,
        y: 1330,
        width: 170,
        height: 99,
        label: '🏺 Uống Rượu Cần & Lễ Cầu Mùa (Tây Nguyên)',
        badge: 'Văn Hóa Rượu Cần',
        dialogueTitle: 'Văn Hóa Rượu Cần - Tây Nguyên Hùng Vĩ',
        dialoguePages: [
          'Rượu cần là nét văn hóa cố kết cộng đồng thiêng liêng của các dân tộc Ê Đê, Ba Na, Gia Rai quanh ngọn lửa nhà rông.',
          'Mọi người cùng vít cần thưởng thức hương men say của lá rừng, cùng lắng nghe già làng kể khan và tiếng cồng chiêng trầm hùng ngân vang giữa đại ngàn.'
        ],
        block: true,
        blockW: 90,
        blockH: 50
      },
      {
        id: 'fest-cay-da',
        key: 'fest_cay_da',
        x: 1520,
        y: 1330,
        width: 180,
        height: 154,
        label: '🌳 Cây Đa Làng Quê & Cội Nguồn Đoàn Kết',
        badge: 'Cây Đa Quê Hương',
        dialogueTitle: 'Cây Đa Làng Quê - Cội Nguồn 54 Dân Tộc',
        dialoguePages: [
          'Cây đa cổ thụ tỏa bóng mát là biểu tượng bền vững của làng bản Việt Nam, gắn liền với ký ức bao thế hệ cha ông.',
          'Dưới bóng đa xanh tươi, đại gia đình 54 dân tộc anh em cùng chung cội nguồn, đoàn kết một lòng xây đắp non sông Việt Nam giàu đẹp và đa dạng bản sắc.'
        ],
        block: true,
        blockW: 90,
        blockH: 50
      },
      {
        id: 'fest-bep-lua',
        key: 'fest_bep_lua',
        x: 1280,
        y: 1360,
        width: 100,
        height: 76,
        label: '🔥 Bếp Lửa Thiêng Đoàn Kết',
        badge: 'Bếp Lửa Thiêng',
        dialogueTitle: 'Ngọn Lửa Thiêng Đoàn Kết',
        dialoguePages: [
          'Ngọn lửa sưởi ấm tâm hồn, thắp sáng tình đoàn kết bền chặt giữa các cộng đồng dân tộc Việt Nam từ miền núi đến đồng bằng, từ biên cương đến hải đảo.'
        ],
        block: true,
        blockW: 50,
        blockH: 30
      }
    ];

    for (const attr of festivalAttractions) {
      const sprite = this.add
        .image(attr.x, attr.y, attr.key)
        .setOrigin(0.5, 1)
        .setDisplaySize(attr.width, attr.height)
        .setDepth(attr.y);
      sprite.setInteractive({ useHandCursor: true });
      sprite.on('pointerdown', () => {
        ui.dialogue(attr.dialogueTitle, attr.dialoguePages);
      });

      this.add
        .dom(attr.x, attr.y - attr.height - 8, 'span', 'font-family:\"Be Vietnam Pro\",Arial,sans-serif;font-size:11px;font-weight:bold;color:#7a1a1a;text-shadow:-1px -1px 0 #fff,1px -1px 0 #fff,-1px 1px 0 #fff,1px 1px 0 #fff;white-space:nowrap;pointer-events:none;user-select:none', attr.badge)
        .setOrigin(0.5, 0.5)
        .setDepth(attr.y + 1);

      if (attr.block && attr.blockW !== undefined && attr.blockH !== undefined) {
        block(attr.x, attr.y - attr.blockH / 2, attr.blockW, attr.blockH);
      }

      this.objects.push({
        x: attr.x,
        y: attr.y - 10,
        id: attr.id,
        label: attr.label,
        activate: () => {
          ui.dialogue(attr.dialogueTitle, attr.dialoguePages);
        },
      });
    }

    const position = safeHubPosition(
      session.state.hubReturnPosition,
      map,
      minigameRegistry,
      this.landscape
    );
    if (
      position.x !== session.state.hubReturnPosition.x ||
      position.y !== session.state.hubReturnPosition.y
    ) {
      session.setPosition(position);
    }

    this.facing = 'down';
    this.player = this.physics.add
      .sprite(position.x, position.y, 'player', 0)
      .setDisplaySize(42, 72)
      .setOrigin(0.5, 51 / 72)
      .setCollideWorldBounds(true);

    this.player.body!.setSize(60, 55).setOffset(34, 165);
    this.physics.world.setBounds(84, 76, width - 168, height - 152);
    this.physics.add.collider(this.player, walls);

    const camera = this.cameras.main;
    camera.setZoom(1.25).startFollow(this.player, true, 1, 1, 0, 64);

    const miniMap = element('div', 'hub-minimap');
    miniMap.dataset.testid = 'trail-map';
    miniMap.append(element('strong', '', ui.t('trailMap')));

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('aria-hidden', 'true');
    const colors = {
      meadow: '#d6a246',
      wetland: '#4c9291',
      woodland: '#537d46',
      highland: '#747f87',
    };

    for (const rect of [...waterRects(map.pond), ...this.landscape.lakes]) {
      const lake = document.createElementNS(svg.namespaceURI, 'rect');
      for (const key of ['x', 'y', 'width', 'height'] as const) {
        lake.setAttribute(key, String(rect[key]));
      }
      lake.setAttribute('fill', '#4a9cb1');
      svg.append(lake);
    }

    for (const route of [...this.landscape.routes, ...this.landscape.links]) {
      const line = document.createElementNS(svg.namespaceURI, 'polyline');
      line.setAttribute('points', route.points.map((point) => `${point.x},${point.y}`).join(' '));
      line.setAttribute('fill', 'none');
      line.setAttribute('stroke', colors[route.theme]);
      line.setAttribute('stroke-width', '45');
      svg.append(line);

      if (route.stationId === 'north-loop') continue;
      const point = route.points[route.points.length - 1];
      const label = document.createElementNS(svg.namespaceURI, 'text');
      label.setAttribute('x', String(point.x));
      label.setAttribute('y', String(point.y - 80));
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('font-size', '140');
      label.setAttribute('font-weight', '800');
      label.textContent = route.stationId;
      svg.append(label);
    }

    const marker = document.createElementNS(svg.namespaceURI, 'circle');
    marker.setAttribute('r', '55');
    marker.setAttribute('fill', '#c75336');
    marker.setAttribute('stroke', '#fff9e9');
    marker.setAttribute('stroke-width', '18');
    svg.append(marker);

    const biomeLabel = element('span', 'hub-biome-label', ui.t('hub'));
    miniMap.append(svg, biomeLabel);

    const hudTools = document.querySelector('#hud .tools');
    if (hudTools) hudTools.append(miniMap);
    else ui.screen.append(miniMap);

    const resizeCamera = () => this.fitCamera(width, height);
    resizeCamera();

    const positionLabels = () => {
      marker.setAttribute('cx', String(this.player.x));
      marker.setAttribute('cy', String(this.player.y));
      const region =
        Math.hypot(this.player.x - map.spawn.x, this.player.y - map.spawn.y) < 250
          ? undefined
          : map.biomes.find((biome) => {
              const station = minigameRegistry.find((s) => s.id === biome.stationId)!;
              return (
                station.portal.x < map.spawn.x === this.player.x < map.spawn.x &&
                station.portal.y < map.spawn.y === this.player.y < map.spawn.y
              );
            });
      const regionTitle = region ? localize(region.title, session.state.locale) : ui.t('hub');
      if (biomeLabel.textContent !== regionTitle) biomeLabel.textContent = regionTitle;

      for (const plaque of this.stationPlaques) {
        const bounds = this.labelBounds(plaque.bounds);
        plaque.node.hidden =
          bounds.y < camera.y ||
          bounds.y + bounds.height > camera.y + camera.height ||
          bounds.x + bounds.width < 0 ||
          bounds.x > this.scale.width;
        Object.assign(plaque.node.style, {
          left: `${(bounds.x / this.scale.width) * 100}%`,
          top: `${(bounds.y / this.scale.height) * 100}%`,
          width: `${(bounds.width / this.scale.width) * 100}%`,
          height: `${(bounds.height / this.scale.height) * 100}%`,
        });
      }
    };

    this.game.events.on('postrender', positionLabels);
    this.scale.on('resize', resizeCamera);
    window.addEventListener('resize', resizeCamera);
    document.addEventListener('fullscreenchange', resizeCamera);

    this.events.once('shutdown', () => {
      this.scale.off('resize', resizeCamera);
      window.removeEventListener('resize', resizeCamera);
      document.removeEventListener('fullscreenchange', resizeCamera);
      this.game.events.off('postrender', positionLabels);
      for (const plaque of this.stationPlaques) plaque.node.remove();
      miniMap.remove();
      this.objects = [];
      this.nearby = undefined;
      this.scoreboardNode?.remove();
      this.scoreboardNode = undefined;
    });

    this.controls = new InputManager(this);
    this.renderScoreboard();
    ui.tutorial();
  }

  update() {
    if (!this.player?.body) return;
    const isFrozen = ui.blocked || StationGameModal.get().isOpen;
    if (isFrozen) {
      this.player.setVelocity(0, 0);
      this.player.anims.stop();
      this.player.setAngle(0).setFlipX(false).setFrame({ down: 0, up: 4, left: 8, right: 12 }[this.facing]);
      return;
    }

    const direction = this.controls.movement();
    this.player.setVelocity(direction.x * 280, direction.y * 280).setDepth(this.player.y + 21);

    if (direction.x || direction.y) {
      if (Math.abs(direction.x) >= Math.abs(direction.y)) {
        this.facing = direction.x < 0 ? 'left' : 'right';
      } else {
        this.facing = direction.y < 0 ? 'up' : 'down';
      }
      this.player.setAngle(0).setFlipX(false);
      if (ui.lowMotion) {
        this.player.anims.stop();
        this.player.setFrame({ down: 0, up: 4, left: 8, right: 12 }[this.facing]);
      } else {
        this.player.anims.play(`player-walk-${this.facing}`, true);
      }
    } else {
      this.player.anims.stop();
      this.player.setAngle(0).setFlipX(false).setFrame({ down: 0, up: 4, left: 8, right: 12 }[this.facing]);
    }

    this.nearby = nearestInteraction(this.player, this.objects, 130);
    ui.prompt(this.nearby?.label ?? '');

    // Tự động kiểm tra vào trạm khi đứng gần cổng hoặc bảng Đông Sơn
    if (!StationGameModal.get().isOpen) {
      const map = this.map;
      if (this.portalCooldown) {
        const anyNear = minigameRegistry.some(
          (s) => Math.hypot(this.player.x - s.portal.x, this.player.y - s.portal.y) <= 100
        );
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
        if (
          !this.portalCooldown &&
          Math.hypot(this.player.x - map.board.x, this.player.y - map.board.y) <= 80
        ) {
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
        `Hiện tại các đội mới thu thập được ${keys}/4 Chìa Khóa.\n\nHãy hoàn thành cả 4 Lán Trại văn hóa (còn thiếu ${
          4 - keys
        } chìa khóa) để giải trừ phong ấn và bước vào ĐẠI KẾT CỤC!`,
        [{ label: 'TIẾP TỤC KHÁM PHÁ', run: () => ui.close() }]
      );
      return;
    }
    StationGameModal.get().open('board', () => {
      this.renderScoreboard();
    });
  }

  private interact() {
    if (!ui.blocked) this.nearby?.activate();
  }

  private fitCamera(width: number, height: number) {
    const camera = this.cameras.main;
    camera.setViewport(0, 0, this.scale.width, this.scale.height);
    camera.setFollowOffset(0, 48);
    const padding = Math.max(0, camera.displayWidth - width) / 2;
    camera.setBounds(-padding, 0, width + padding * 2, height);
  }

  layoutSnapshot() {
    const map = this.map ?? (this.cache.json.get('hub-map') as HubMap);
    return {
      worldSeed: this.landscape.seed,
      worldSize: { width: map.width * map.tileSize, height: map.height * map.tileSize },
      routes: this.landscape.routes,
      links: this.landscape.links,
      roadTiles: this.landscape.roadTiles.length,
      decorations: this.decorationCounts,
      scenery: this.landscape.scenery.filter((item) => item.kind === 'landmark'),
      lakes: this.landscape.lakes,
      sceneryCounts: this.landscape.routes.map((route) => ({
        theme: route.theme,
        plants: this.landscape.scenery.filter(
          (item) => item.theme === route.theme && item.kind === 'plant'
        ).length,
        animals: this.landscape.scenery.filter(
          (item) => item.theme === route.theme && item.kind === 'animal'
        ).length,
        landmarks: this.landscape.scenery.filter(
          (item) => item.theme === route.theme && item.kind === 'landmark'
        ).length,
      })),
      stationLabels: this.stationPlaques.map(({ id, bounds }) => ({
        id,
        bounds: this.labelBounds(bounds),
      })),
    };
  }

  private labelBounds(bounds: Rect): Rect {
    const camera = this.cameras.main;
    return {
      x: camera.x + (bounds.x - camera.worldView.x) * camera.zoomX,
      y: camera.y + (bounds.y - camera.worldView.y) * camera.zoomY,
      width: bounds.width * camera.zoomX,
      height: bounds.height * camera.zoomY,
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
        ${gameshow.teams
          .map(
            (t) => `
          <div class="hub-team-pill" style="border-color:${t.color}">
            <span>${t.name}</span>
            <strong>${t.score}đ</strong>
            <small style="color:#9ec7b8">⚡${t.cards.steal_points} 🔒${t.cards.block_turn} 🛡️${t.cards.shield}</small>
          </div>
        `
          )
          .join('')}
      </div>
    `;
    ui.updateKeyTracker();
  }

  private finish() {
    session.setPosition({ x: this.player.x, y: this.player.y });
    this.scene.start('Ending');
  }
}