import Phaser from 'phaser';
import { session } from '../core/SessionStore';
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    const params = new URLSearchParams(location.search);
    const mode = params.get('mode'); const locale = params.get('lang');
    session.configure(mode === 'explore' || mode === 'presentation' ? mode : session.state.mode,
      locale === 'en' || locale === 'vi' ? locale : session.state.locale);
    this.scene.start('Preload');
  }
}
