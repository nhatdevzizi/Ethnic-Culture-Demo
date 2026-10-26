import Phaser from 'phaser';
import { session } from '../core/SessionStore';
import { minigameRegistry } from '../core/MinigameRegistry';
import { facts, localize } from '../core/content';
import { ui, element, button } from '../ui/OverlayController';

export class EndingScene extends Phaser.Scene {
  constructor() { super('Ending'); }
  create() {
    ui.bind({}); ui.hideHud(); ui.toast(''); this.cameras.main.setBackgroundColor('#264e44');
    const panel = element('section', 'title-journal ending journal-ending');
    panel.append(element('span', 'eyebrow', ui.t('journey')), element('h1', '', ui.t('summary')), element('p', '', ui.t('reviewNote')));
    const cards = element('div', 'review-cards');
    for (const station of minigameRegistry.filter(s => s.enabled && s.requiredInPresentation)) {
      const status = session.state.statuses[station.id];
      const card = element('article', 'review-card'); card.dataset.testid = 'review-card'; card.dataset.stationId = station.id; card.dataset.status = status;
      card.append(element('h2', '', ui.t(station.titleKey)), element('span', `review-status ${status}`, ui.t(status)));
      const learned = facts.filter(fact => station.factIds.includes(fact.id) && session.state.learnedFactIds.includes(fact.id));
      if (learned.length) {
        card.append(element('small', '', ui.t('practiceLabel')));
        for (const fact of learned) {
          card.append(element('p', 'fact-body', localize(fact.body, session.state.locale)));
          if (fact.fictional || fact.reviewStatus !== 'approved') card.append(element('small', 'demo-note', ui.t('demo')));
          for (const url of fact.sourceUrls) {
            if (!/^https?:\/\//.test(url)) continue;
            const source = element('a', '', url); source.href = url; source.target = '_blank'; source.rel = 'noopener noreferrer'; card.append(source);
          }
        }
      } else card.append(element('p', '', ui.t('notPracticed')));
      cards.append(card);
    }
    const discussion = element('section', 'closing-prompt');
    discussion.append(element('h2', '', ui.t('discussionTitle')), element('p', '', ui.t('discussionBody')));
    const actions = element('div', 'button-row'); actions.append(button(ui.t('back'), () => this.scene.start('Hub'), 'primary'), button(ui.t('sources'), () => ui.credits()), button(ui.t('start'), () => this.scene.start('Title')));
    panel.append(cards, discussion, actions, element('small', 'demo-note', ui.t('demoNote'))); ui.screen.append(panel);
  }
}
