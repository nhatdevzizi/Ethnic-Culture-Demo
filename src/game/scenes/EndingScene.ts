import Phaser from 'phaser';
import { session } from '../core/SessionStore';
import { minigameRegistry } from '../core/MinigameRegistry';
import { ui, element, button } from '../ui/OverlayController';
export class EndingScene extends Phaser.Scene {
  constructor() { super('Ending'); }
  create() {
    ui.bind({}); ui.hideHud(); ui.toast(''); this.cameras.main.setBackgroundColor('#264e44');
    const panel = element('section', 'title-journal ending');
    panel.append(element('span', 'eyebrow', ui.t('journey')), element('h1', '', ui.t('summary')), element('p', '', ui.t('summaryNote')));
    for (const station of minigameRegistry.filter(s => s.enabled)) panel.append(element('p', 'recap-line', `${ui.t(station.titleKey)} · ${ui.t(session.state.statuses[station.id])}`));
    const actions = element('div', 'button-row'); actions.append(button(ui.t('back'), () => this.scene.start('Hub'), 'primary'), button(ui.t('sources'), () => ui.credits()), button(ui.t('start'), () => this.scene.start('Title')));
    panel.append(actions, element('small', 'demo-note', ui.t('demoNote'))); ui.screen.append(panel);
  }
}
