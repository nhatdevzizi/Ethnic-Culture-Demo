import Phaser from 'phaser';
import { element, ui } from '../ui/OverlayController';

export class PreloadScene extends Phaser.Scene {
  private failed = false;
  constructor() { super('Preload'); }
  preload() {
    ui.bind({}); ui.hideHud();
    const label = element('p', 'loading', ui.t('loading'));
    const progress = element('progress'); progress.max = 1; progress.value = 0;
    label.append(progress); ui.screen.append(label);
    this.load.on('progress', (value: number) => { progress.value = value; });
    this.load.on('loaderror', () => {
      this.failed = true;
      ui.error('Local map asset could not load. Serve the game with npm run dev or npm run preview.');
    });
    this.load.json('hub-map', `${import.meta.env.BASE_URL}assets/maps/hub.json`);
  }
  create() {
    if (this.failed) return;
    const graphics = this.add.graphics();
    const texture = (key: string, draw: () => void, width = 32, height = 32) => {
      graphics.clear(); draw(); graphics.generateTexture(key, width, height);
    };
    const rect = (color: number, x: number, y: number, w: number, h: number) => graphics.fillStyle(color).fillRect(x, y, w, h);
    texture('grass', () => { rect(0x83ac73, 0, 0, 32, 32); rect(0x91b87b, 4, 8, 4, 2); rect(0x739c66, 22, 24, 2, 4); });
    texture('path', () => { rect(0xe3c68f, 0, 0, 32, 32); rect(0xd7b980, 3, 29, 25, 1); rect(0xf0d69e, 6, 8, 2, 2); });
    texture('stone', () => { rect(0x7b9482, 0, 0, 32, 32); rect(0x9eb09a, 2, 2, 28, 25); rect(0x718b78, 0, 28, 32, 4); });
    texture('tree', () => {
      rect(0x587b58, 12, 55, 42, 10); rect(0x825b3e, 27, 35, 10, 27);
      rect(0x285642, 7, 19, 50, 30); rect(0x346b4d, 2, 12, 58, 27);
      rect(0x428358, 12, 2, 40, 29); rect(0x69a36b, 18, 6, 24, 8);
    }, 64, 72);
    for (let frame = 0; frame < 3; frame++) {
      texture(`visitor-${frame}`, () => {
        rect(0x52774e, 6, 28, 22, 4);
        rect(0x254943, 10 - (frame === 1 ? 2 : 0), 25, 5, 5);
        rect(0x254943, 19 + (frame === 2 ? 2 : 0), 25, 5, 5);
        rect(0xe7b965, 9, 15, 16, 12); rect(0xf5d68d, 12, 15, 7, 10);
        rect(0xe4ae80, 8, 8, 17, 10); rect(0x334139, 7, 3, 19, 8); rect(0x465648, 11, 1, 11, 4);
        rect(0x243c37, 20, 12, 2, 2); rect(0xd57c57, 23, 17, 4, 10);
      });
    }
    texture('guide', () => {
      rect(0x52774e, 5, 29, 24, 3); rect(0x284941, 10, 26, 5, 5); rect(0x284941, 21, 26, 5, 5);
      rect(0xe9edcc, 8, 15, 19, 13); rect(0x709a92, 13, 17, 9, 10);
      rect(0xe3b98e, 10, 6, 15, 12); rect(0x72503c, 9, 3, 17, 6); rect(0x344b43, 20, 11, 2, 2);
    });
    graphics.destroy();
    if (!this.anims.exists('walk')) this.anims.create({ key: 'walk', frames: [{ key: 'visitor-0' }, { key: 'visitor-1' }, { key: 'visitor-0' }, { key: 'visitor-2' }], frameRate: 8, repeat: -1 });
    this.scene.start('Title');
  }
}
