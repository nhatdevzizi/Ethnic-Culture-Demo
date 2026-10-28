import Phaser from 'phaser';
import { element, ui } from '../ui/OverlayController';
import decorations from '../../content/biome-decorations.json';
import { decorationFrame } from '../core/BiomeDecorations';

export class PreloadScene extends Phaser.Scene {
  private failed = false;
  constructor() { super('Preload'); }
  preload() {
    this.failed = false;
    ui.bind({}); ui.hideHud();
    const label = element('p', 'loading', ui.t('loading'));
    const progress = element('progress'); progress.max = 1; progress.value = 0;
    label.append(progress); ui.screen.append(label);
    this.load.on('progress', (value: number) => { progress.value = value; });
    this.load.on('loaderror', () => {
      this.failed = true;
      ui.error(ui.t('criticalAssetError'));
    });
    this.load.json('hub-map', `${import.meta.env.BASE_URL}assets/maps/hub.json`);
    this.load.image('trong-dong', `${import.meta.env.BASE_URL}assets/sprites/trong_dong_dong_son.svg`);
    this.load.spritesheet('player', `${import.meta.env.BASE_URL}assets/sprites/player.png`, {
      frameWidth: 128,
      frameHeight: 220,
    });
    for (const npc of ['npc_dao', 'npc_thai', 'npc_hmong', 'npc_ede']) {
      this.load.image(npc, `${import.meta.env.BASE_URL}assets/sprites/${npc}.png`);
    }
    for (const fest of [
      'fest_mua_sap',
      'fest_nem_con',
      'fest_ruou_can',
      'fest_thuyen_ngo',
      'fest_con_nuoc',
      'fest_bep_lua',
      'fest_cay_da',
    ]) {
      this.load.image(fest, `${import.meta.env.BASE_URL}assets/sprites/${fest}.png`);
    }
    for (const key of ['instructor-a', 'instructor-b', 'demo-house']) this.load.image(key, `${import.meta.env.BASE_URL}assets/sprites/${key}.png`);
    for (const atlas of decorations.atlases) this.load.image(atlas.key, `${import.meta.env.BASE_URL}${atlas.path}`);
  }
  create() {
    if (this.failed) return;
    for (const [row, dir] of (['down', 'up', 'left', 'right'] as const).entries()) {
      if (!this.anims.exists(`player-walk-${dir}`)) {
        this.anims.create({
          key: `player-walk-${dir}`,
          frames: this.anims.generateFrameNumbers('player', { start: row * 4, end: row * 4 + 3 }),
          frameRate: 8,
          repeat: -1,
        });
      }
    }
    // Transparent margins stay in the source PNGs; frames keep feet and house bounds aligned.
    this.textures.get('instructor-a').add('cutout', 0, 387, 91, 494, 1126);
    this.textures.get('instructor-b').add('cutout', 0, 312, 117, 630, 1021);
    this.textures.get('demo-house').add('cutout', 0, 16, 51, 1418, 947);
    for (const frame of decorations.frames) {
      const texture = this.textures.get(frame.atlas), source = texture.getSourceImage();
      const [x, y, width, height] = frame.bounds;
      texture.add(frame.id, 0, Math.round(x / decorations.referenceWidth * source.width), Math.round(y / decorations.referenceHeight * source.height),
        Math.round(width / decorations.referenceWidth * source.width), Math.round(height / decorations.referenceHeight * source.height));
    }
    for (const id of new Set(Object.values(decorations.terrain))) {
      const definition = decorationFrame(id), texture = this.textures.get(definition.atlas);
      const frame = texture.get(id);
      const tile = this.textures.createCanvas(id, 32, 32);
      if (!tile) throw new Error(`Cannot create supplied terrain ${id}`);
      const image = texture.getSourceImage();
      if (!(image instanceof HTMLImageElement)) throw new Error('Supplied terrain image is unavailable');
      tile.context.imageSmoothingEnabled = false;
      tile.context.drawImage(image, frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight, 0, 0, 32, 32);
      tile.refresh();
    }
    this.scene.start('Title');
  }
}
