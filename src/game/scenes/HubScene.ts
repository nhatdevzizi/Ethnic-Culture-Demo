import Phaser from 'phaser';
import { session } from '../core/SessionStore';
import { minigameRegistry } from '../core/MinigameRegistry';
import { localize } from '../core/content';
import { InputManager } from '../systems/InputManager';
import { nearestInteraction } from '../systems/InteractionSystem';
import type { Interactable } from '../systems/InteractionSystem';
import type { MinigameDefinition, MinigamePayload } from '../core/types';
import { ui, element } from '../ui/OverlayController';
import dialogue from '../../content/dialogues.json';
type HubMap = {
  width: number; height: number; tileSize: number;
  guide: { x: number; y: number }; board: { x: number; y: number };
  pond: { x: number; y: number; width: number; height: number };
  beds: { x: number; y: number; width: number; height: number }[]; trees: number[][];
};
export class HubScene extends Phaser.Scene {
  player!: Phaser.Physics.Arcade.Sprite;
  private controls!: InputManager;
  private objects: Interactable[] = [];
  nearby?: Interactable;
  constructor() { super('Hub'); }
  create() {
    this.objects = []; this.nearby = undefined;
    ui.bind({ interact: () => this.interact(), finish: () => this.finish() }); ui.hud(ui.t('hub')); ui.toast('');
    document.querySelector<HTMLElement>('#game-container')!.focus();
    const map = this.cache.json.get('hub-map') as HubMap;
    const width = map.width * map.tileSize, height = map.height * map.tileSize;
    const graphics = this.add.graphics().setDepth(1);
    for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
      const path = (y >= 19 && y <= 22) || (x >= 20 && x <= 24) || (x >= 11 && x <= 14 && y >= 12 && y <= 28) || (y >= 10 && y <= 13 && x >= 12 && x <= 35);
      this.add.image(x * 32, y * 32, path ? 'path' : 'grass').setOrigin(0);
    }
    const walls = this.physics.add.staticGroup();
    const block = (x: number, y: number, w: number, h: number) => {
      const body = this.add.rectangle(x, y, w, h, 0, 0); walls.add(body);
      const physicsBody = body.body as Phaser.Physics.Arcade.StaticBody; physicsBody.setSize(w, h);
    };
    for (let x = 0; x < map.width; x++) { this.add.image(x * 32, 0, 'stone').setOrigin(0); this.add.image(x * 32, height - 32, 'stone').setOrigin(0); }
    for (let y = 1; y < map.height - 1; y++) { this.add.image(0, y * 32, 'stone').setOrigin(0); this.add.image(width - 32, y * 32, 'stone').setOrigin(0); }
    block(width / 2, 16, width, 32); block(width / 2, height - 16, width, 32); block(16, height / 2, 32, height); block(width - 16, height / 2, 32, height);
    for (const [x, y] of map.trees) { this.add.image(x, y, 'tree').setScale(1.5).setDepth(y + 38); block(x, y + 26, 28, 24); }
    for (const bed of map.beds) {
      graphics.fillStyle(0x6e6847).fillRect(bed.x - 4, bed.y - 4, bed.width + 8, bed.height + 8);
      graphics.fillStyle(0x477b51).fillRect(bed.x, bed.y, bed.width, bed.height);
      for (let x = 12; x < bed.width; x += 24) for (let y = 12; y < bed.height; y += 24) {
        graphics.fillStyle(0xf4d18a).fillRect(bed.x + x, bed.y + y, 6, 6); graphics.fillStyle(0xd58266).fillRect(bed.x + x + 4, bed.y + y + 4, 5, 5);
      }
      block(bed.x + bed.width / 2, bed.y + bed.height / 2, bed.width, bed.height);
    }
    const pond = map.pond;
    graphics.fillStyle(0xe5d49e).fillRect(pond.x - 10, pond.y - 10, pond.width + 20, pond.height + 20);
    graphics.fillStyle(0x6aa7a4).fillRect(pond.x, pond.y, pond.width, pond.height);
    for (let i = 0; i < 12; i++) graphics.fillStyle(0x9dcbc0).fillRect(pond.x + 12 + ((i * 53) % 190), pond.y + 12 + ((i * 29) % 100), 24, 3);
    block(pond.x + pond.width / 2, pond.y + pond.height / 2, pond.width + 12, pond.height + 12);
    for (const station of minigameRegistry) {
      const { x, y } = station.portal;
      const color = station.enabled ? 0xc97956 : 0x78918a;
      graphics.fillStyle(0x9b8b64).fillRect(x - 74, y - 58, 148, 18);
      graphics.fillStyle(0xf5dfae).fillRect(x - 64, y - 130, 128, 74);
      graphics.fillStyle(color).fillRect(x - 80, y - 150, 160, 26);
      graphics.fillStyle(0x304e43).fillRect(x - 24, y - 96, 48, 40);
      graphics.fillStyle(0xf5e4b6).fillRect(x - 48, y - 116, 20, 18);
      graphics.fillStyle(0xf5e4b6).fillRect(x + 28, y - 116, 20, 18);
      graphics.fillStyle(station.enabled ? 0xffecad : 0xbcc8a2).fillRect(x - 28, y - 12, 56, 24);
      this.add.text(x, y - 181, ui.t(station.titleKey), { fontFamily: 'Segoe UI, sans-serif', fontSize: '18px', color: '#183b38', backgroundColor: '#fff4d8', padding: { x: 10, y: 6 } }).setOrigin(0.5).setDepth(2);
      this.add.text(x, y + 26, ui.t(station.enabled ? session.state.statuses[station.id] : 'later'), { fontFamily: 'Segoe UI, sans-serif', fontSize: '14px', color: '#284e42' }).setOrigin(0.5).setDepth(2);
      block(x, y - 100, 136, 88);
      this.objects.push({ ...station.portal, id: station.id, label: ui.t(station.titleKey), activate: () => this.portal(station) });
    }
    const guide = this.physics.add.staticImage(map.guide.x, map.guide.y, 'guide').setScale(1.5).setDepth(map.guide.y + 24);
    guide.body.setSize(20, 16).setOffset(6, 16); walls.add(guide);
    this.add.text(map.guide.x, map.guide.y - 40, 'An', { fontFamily: 'Segoe UI', fontSize: '18px', color: '#244e42', backgroundColor: '#fff4d8', padding: { x: 6, y: 3 } }).setOrigin(0.5);
    this.objects.push({ ...map.guide, id: 'guide', label: localize(dialogue.guide.name, session.state.locale), activate: () => ui.dialogue(localize(dialogue.guide.name, session.state.locale), dialogue.guide.pages.map(p => localize(p, session.state.locale))) });
    graphics.fillStyle(0x805e42).fillRect(map.board.x - 32, map.board.y - 32, 64, 40);
    graphics.fillStyle(0xffecc2).fillRect(map.board.x - 27, map.board.y - 27, 54, 30);
    block(map.board.x, map.board.y - 12, 64, 40);
    this.objects.push({ ...map.board, id: 'board', label: ui.t('board'), activate: () => ui.dialogue(ui.t('board'), [ui.t('boardNote')]) });
    const position = session.state.hubReturnPosition;
    this.player = this.physics.add.sprite(position.x, position.y, 'visitor-0').setScale(1.5).setCollideWorldBounds(true);
    this.player.body!.setSize(14, 12).setOffset(9, 18);
    this.physics.world.setBounds(32, 32, width - 64, height - 64);
    this.physics.add.collider(this.player, walls);
    this.cameras.main.setBounds(0, 0, width, height).startFollow(this.player, true, 1, 1);
    this.controls = new InputManager(this);
    const hint = element('div', 'world-hint'); hint.append(element('span', 'eyebrow', session.state.passportStamps.length ? ui.t('stamp') : '01 / 01'), element('p', '', ui.t(session.state.passportStamps.length ? 'allDone' : 'objective')), element('small', '', 'WASD / ↑↓←→ · E / Space'));
    ui.screen.append(hint);
    this.events.once('shutdown', () => { this.objects = []; this.nearby = undefined; });
  }
  update() {
    if (!this.player?.body) return;
    const direction = ui.blocked ? { x: 0, y: 0 } : this.controls.movement();
    this.player.setVelocity(direction.x * 160, direction.y * 160).setDepth(this.player.y + 24);
    if (direction.x || direction.y) { this.player.play('walk', true); if (direction.x) this.player.setFlipX(direction.x < 0); }
    else { this.player.anims.stop(); this.player.setTexture('visitor-0'); }
    this.nearby = ui.blocked ? undefined : nearestInteraction(this.player, this.objects);
    ui.prompt(this.nearby?.label ?? '');
  }
  private interact() { if (!ui.blocked) this.nearby?.activate(); }
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
