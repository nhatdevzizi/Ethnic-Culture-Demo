import Phaser from 'phaser';
import { session } from '../core/SessionStore';
import { element, button, ui } from '../ui/OverlayController';
export class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }
  create() {
    ui.bind({}); ui.hideHud(); ui.toast('');
    this.cameras.main.setBackgroundColor('#244f45');
    const { width, height } = this.cameras.main;
    this.add.tileSprite(0, 0, width, height, 'grass-tile').setOrigin(0).setAlpha(0.36);
    for (const [x, y] of [[0.07, 0.16], [0.9, 0.2], [0.85, 0.8], [0.08, 0.84]]) this.add.image(width * x, height * y, 'supplied-biome-3', 'banyan-tree').setDisplaySize(200, 180);
    const journal = element('section', 'title-journal');
    journal.append(element('span', 'eyebrow', 'CULTURAL CROSSROADS · 01'), element('h1', '', ui.t('title')), element('p', 'subtitle', ui.t('subtitle')), element('p', 'premise', ui.t('premise')));
    const choices = element('div', 'button-row mode-row');
    for (const mode of ['presentation', 'explore'] as const) {
      const option = button(ui.t(mode), () => { session.configure(mode, session.state.locale); this.scene.restart(); }, 'mode');
      option.setAttribute('aria-pressed', String(session.state.mode === mode)); choices.append(option);
    }
    journal.append(choices);
    const start = () => { session.reset(); this.scene.start('Hub'); };
    const actions = element('div', 'button-row'); actions.append(button(ui.t('start'), start, 'primary'));
    if (session.state.passportStamps.length || Object.values(session.state.statuses).some(s => s === 'skipped')) actions.append(button(ui.t('continue'), () => this.scene.start('Hub')));
    journal.append(actions, element('small', 'demo-note', ui.t('demoNote')));
    const footer = element('div', 'title-footer');
    footer.append(button(session.state.locale === 'vi' ? 'English' : 'Tiếng Việt', () => { session.configure(session.state.mode, session.state.locale === 'vi' ? 'en' : 'vi'); this.scene.restart(); }), button(ui.t('sources'), () => ui.credits()), element('small', '', ui.t('localOnly')));
    ui.screen.append(journal, footer);
  }
}
