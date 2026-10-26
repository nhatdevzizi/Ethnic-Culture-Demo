import Phaser from 'phaser';
import { StoryPractice } from '../core/StoryPractice';
import stories from '../../content/stories.json';
import '../../styles/story.css';
import { localize } from '../core/content';
import { session } from '../core/SessionStore';
import { emitMinigameResult } from '../core/GameEvents';
import type { MinigamePayload, MinigameResult } from '../core/types';
import { element, button, ui } from '../ui/OverlayController';

export class StoryTrailScene extends Phaser.Scene {
  practice = new StoryPractice(stories.requiredEvidence);
  private payload!: MinigamePayload;
  private finishing = false;

  private greeting!: HTMLParagraphElement;
  private choiceArea!: HTMLDivElement;
  private feedback!: HTMLParagraphElement;
  private recap?: HTMLDivElement;
  private evidenceNodes = new Map<string, HTMLElement>();
  constructor() { super('StoryTrail'); }
  init(payload: MinigamePayload) {
    if (payload?.minigameId !== 'M03') throw new Error('M03 payload required');
    this.payload = payload;
    this.finishing = false;
    this.practice.reset();
    this.recap = undefined;
    this.evidenceNodes.clear();
  }
  create() {
    ui.bind({
      help: () => ui.panel(ui.t('m03'), localize(stories.ui.instructions, session.state.locale), [{label:ui.t('close'),run:()=>ui.close()}]),
      restart: () => ui.confirm(ui.t('restart'), localize(stories.ui.restartNote, session.state.locale), ui.t('confirmRestart'), () => this.scene.restart(this.payload)),
      back: () => ui.confirm(ui.t('back'), localize(stories.ui.returnNote, session.state.locale), ui.t('confirmBack'), () => this.result('abandoned')),
      skip: () => this.result('skipped'),
      finish: () => this.result('abandoned', 'Ending'),
    });
    ui.hud(ui.t('m03'));
    const root = element('section', 'studio story-studio');
    const heading = element('div', 'studio-heading');
    const title = element('div');
    title.append(element('span', 'eyebrow', ui.t('m03')), element('h1', '', ui.t('m03')));
    const actions = element('div', 'button-row');
    actions.append(button(ui.t('restart'), () => ui.actions.restart?.()), button(ui.t('back'), () => ui.actions.back?.()));
    if (session.state.mode === 'presentation') actions.append(button(ui.t('skip'), () => ui.actions.skip?.()));
    heading.append(title, actions);
    const layout = element('div', 'story-layout');
    const conversation = element('div', 'story-conversation');
    const notebook = element('div', 'story-notebook');
    notebook.setAttribute('data-testid', 'story-notebook');
    const notebookHeading = element('h2', '', localize(stories.ui.notebook, session.state.locale));
    notebook.append(notebookHeading);
    for (const id of stories.requiredEvidence) {
      const node = element('div', 'evidence-item');
      node.setAttribute('data-testid', `story-evidence-${id}`);
      const helper = stories.helpers.find(h => h.id === id)!;
      const name = localize(helper.name, session.state.locale);
      const status = this.practice.evidence.has(id) ? localize(stories.ui.found, session.state.locale) : localize(stories.ui.missing, session.state.locale);
      node.append(element('span', 'evidence-name', `${name}: `), element('span', 'evidence-status', status));
      node.setAttribute('data-collected', String(this.practice.evidence.has(id)));
      notebook.append(node);
      this.evidenceNodes.set(id, node);
    }
    const helperArea = element('div', 'story-helpers');
    for (const helper of stories.helpers) {
      const helperButton = button(localize(helper.name, session.state.locale), () => this.selectHelper(helper.id), `story-helper-${helper.id}`);
      helperButton.setAttribute('data-testid', `story-helper-${helper.id}`);
      helperArea.append(helperButton);
    }
    this.greeting = element('p', 'greeting');
    this.choiceArea = element('div', 'choice-area');
    this.feedback = element('p', 'feedback', '');
    this.feedback.setAttribute('role', 'status');
    this.feedback.setAttribute('aria-live', 'polite');
    this.feedback.setAttribute('data-testid', 'story-feedback');
    const planArea = element('div', 'plan-area');
    for (const plan of stories.planChoices) {
      const planButton = button(localize(plan.label, session.state.locale), () => this.choosePlan(plan.correct), `story-plan-${plan.id}`);
      planButton.setAttribute('data-testid', `story-plan-${plan.id}`);
      planArea.append(planButton);
    }
    conversation.append(helperArea, this.greeting, this.choiceArea, this.feedback, planArea);
    layout.append(conversation, notebook);
    root.append(heading, layout);
    ui.screen.append(root);
    this.selectHelper(stories.helpers[0].id);
    ui.panel(ui.t('m03'), localize(stories.ui.intro, session.state.locale) + ' ' + localize(stories.ui.instructions, session.state.locale), [{ label: ui.t('begin'), run: () => ui.close() }]);

  }
  private selectHelper(id: string) {
    if (ui.blocked || this.finishing || this.practice.completed) return;

    const helper = stories.helpers.find(h => h.id === id)!;
    this.greeting.textContent = localize(helper.greeting, session.state.locale);
    this.choiceArea.replaceChildren();
    this.feedback.textContent = '';
    for (const choice of helper.choices) {
      const choiceButton = button(localize(choice.label, session.state.locale), () => this.chooseChoice(choice), `story-choice-${choice.id}`);
      choiceButton.setAttribute('data-testid', `story-choice-${choice.id}`);
      this.choiceArea.append(choiceButton);
    }
  }
  private chooseChoice(choice: (typeof stories.helpers)[number]['choices'][number]) {
    if (ui.blocked || this.finishing || this.practice.completed) return;
    this.practice.choose(choice.evidenceId);
    this.feedback.textContent = localize(choice.response, session.state.locale);
    if (choice.evidenceId) {
      const node = this.evidenceNodes.get(choice.evidenceId)!;
      node.setAttribute('data-collected', 'true');
      const status = element('span', 'evidence-status', localize(stories.ui.found, session.state.locale) + ': ' + localize(choice.response, session.state.locale));
      node.replaceChild(status, node.lastChild!);
    }
  }
  private choosePlan(correct: boolean) {
    if (ui.blocked || this.finishing || this.practice.completed) return;
    const result = this.practice.plan(correct);
    if (result === 'missing') {
      this.feedback.textContent = localize(stories.ui.missingFeedback, session.state.locale);
      return;
    }
    if (result === 'reconsider') {
      this.feedback.textContent = localize(stories.ui.reconsiderFeedback, session.state.locale);
      return;
    }
    if (result === 'complete') {
      this.feedback.textContent = localize(stories.ui.complete, session.state.locale);
      if (!this.recap || this.recap.children.length === 0) {
        this.recap = element('div', 'recap');
        const recapHeading = element('h2', '', localize(stories.ui.complete, session.state.locale));
        const recapText = element('p', '', localize(stories.ui.recap, session.state.locale));
        const returnButton = button(ui.t('returnDone'), () => this.result('completed'));
        this.recap.append(recapHeading, recapText, returnButton);
        this.choiceArea.append(this.recap);
        returnButton.focus({ preventScroll: true });
      }
    }
  }
  private result(outcome: MinigameResult['outcome'], destination = 'Hub') {
    if (this.finishing) return;
    this.finishing = true;
    ui.close();
    emitMinigameResult(this, this.payload, {
      id: 'M03',
      outcome,
      score: this.practice.evidence.size,
      learnedFactIds: outcome === 'completed' ? ['demo-stories'] : [],
      attempts: this.practice.attempts,
    }, destination);
  }
}
