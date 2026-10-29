import Phaser from 'phaser';
import { session } from '../core/SessionStore';
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    const params = new URLSearchParams(location.search);
    const mode = params.get('mode'); const locale = params.get('lang');
    session.configure(mode === 'explore' || mode === 'presentation' ? mode : session.state.mode,
      locale === 'en' || locale === 'vi' ? locale : session.state.locale);
    // Load Vietnamese-capable fonts before any canvas text is drawn.
    const start = () => this.scene.start('Preload');
    if (document.fonts?.load) {
      Promise.all(['400', '600', '700', '800'].map(w => document.fonts.load(`${w} 14px "Be Vietnam Pro"`)))
        .then(start, start);
    } else start();
  }
}
