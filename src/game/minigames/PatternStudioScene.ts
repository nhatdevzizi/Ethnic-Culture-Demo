import Phaser from 'phaser';
import { PatternPuzzle } from '../core/PatternPuzzle';
import { emitMinigameResult } from '../core/GameEvents';
import { facts, localize } from '../core/content';
import { session } from '../core/SessionStore';
import { stationById } from '../core/MinigameRegistry';
import type { MinigamePayload, MinigameResult } from '../core/types';
import { button, element, ui } from '../ui/OverlayController';
import dialogue from '../../content/dialogues.json';

export class PatternStudioScene extends Phaser.Scene {
  puzzle!: PatternPuzzle;
  private payload!: MinigamePayload;
  private selected?: string;
  private finishing = false;
  private cards = new Map<string, HTMLButtonElement>();
  private slots: HTMLButtonElement[] = [];
  private feedback!: HTMLParagraphElement;
  private completeArea!: HTMLDivElement;
  constructor() { super('PatternStudio'); }
  init(payload: MinigamePayload) { this.payload = payload; this.finishing = false; this.selected = undefined; }
  create() {
    if (this.payload?.minigameId !== 'M01') throw new Error('M01 needs a valid station payload');
    this.puzzle = new PatternPuzzle(dialogue.paper.order); this.cards.clear(); this.slots = [];
    ui.bind({
      help: () => ui.panel(ui.t('m01'), ui.t('instructions'), [{label:ui.t('close'),run:()=>ui.close()}]),
      restart: () => ui.confirm(ui.t('restart'), ui.t('restartNote'), ui.t('confirmRestart'), () => this.scene.restart(this.payload)),
      back: () => ui.confirm(ui.t('back'), ui.t('returnNote'), ui.t('confirmBack'), () => this.result('abandoned')),
      skip: () => this.result('skipped'), finish: () => this.result('abandoned', 'Ending'),
    });
    ui.hud(ui.t('m01')); ui.toast(''); this.cameras.main.setBackgroundColor('#d9bb87');
    const graphic = this.add.graphics();
    for (let y = 0; y < 540; y += 48) graphic.fillStyle(y % 96 ? 0xd2b380 : 0xd9bb87).fillRect(0, y, 960, 47);
    graphic.fillStyle(0x8b6e48).fillRect(22, 102, 916, 412);
    graphic.fillStyle(0xf7e8c1).fillRect(28, 96, 904, 412);
    const studio = element('section', 'studio');
    const heading = element('div', 'studio-heading');
    const title = element('div'); title.append(element('span', 'eyebrow', ui.t('studio')), element('h1', '', ui.t('arrange')));
    const actions = element('div', 'button-row');
    actions.append(button(ui.t('restart'), () => ui.actions.restart?.()), button(ui.t('back'), () => ui.actions.back?.()));
    if (session.state.mode === 'presentation') actions.append(button(ui.t('skip'), () => ui.actions.skip?.()));
    heading.append(title, actions);
    const layout = element('div', 'studio-layout');
    const note = element('aside', 'studio-note');
    const fact = facts.find(item => item.id === 'demo-paper')!;
    note.append(element('span', 'eyebrow', ui.t('readNote')), element('h2', '', localize(fact.title, session.state.locale)), element('p', '', localize(fact.body, session.state.locale)), element('small', '', ui.t('demoNote')));
    const workbench = element('div', 'workbench');
    const tray = element('div', 'tray'); tray.setAttribute('aria-label', ui.t('tray'));
    const localizedSteps = [...dialogue.paper.steps];
    // shortcut: this slice has one fixed puzzle; use the seed to shuffle when more puzzle variants are added.
    for (const index of [2, 0, 1]) {
      const step = localizedSteps[index];
      const card = button('', () => {
        if (ui.blocked || this.puzzle.complete) return;
        this.selected = step.id;
        this.cards.forEach((node, id) => node.setAttribute('aria-pressed', String(id === step.id)));
        this.feedback.textContent = `${localize(step.label, session.state.locale)}. ${ui.t('select')}`;
      }, 'paper-card');
      card.append(element('span', 'paper-symbol', step.symbol), element('span', '', localize(step.label, session.state.locale)));
      card.setAttribute('data-testid', `card-${step.id}`); card.setAttribute('aria-pressed', 'false'); card.draggable = true;
      card.addEventListener('dragstart', event => {
        if (ui.blocked) { event.preventDefault(); return; }
        this.selected = step.id; event.dataTransfer?.setData('text/plain', step.id);
      });
      this.cards.set(step.id, card); tray.append(card);
    }
    const slots = element('div', 'slots');
    for (let i = 0; i < dialogue.paper.order.length; i++) {
      const slot = button('', () => this.place(this.selected, i), 'paper-slot');
      slot.append(element('span', 'slot-number', `0${i + 1}`), element('span', 'slot-label', `${ui.t('slot')} ${i + 1}`));
      slot.setAttribute('data-testid', `slot-${i}`); slot.setAttribute('aria-label', `${ui.t('slot')} ${i + 1}`);
      slot.addEventListener('dragover', event => { if (!ui.blocked) event.preventDefault(); });
      slot.addEventListener('drop', event => { event.preventDefault(); this.place(event.dataTransfer?.getData('text/plain'), i); });
      this.slots.push(slot); slots.append(slot);
    }
    this.feedback = element('p', 'feedback', ui.t('feedbackStart')); this.feedback.setAttribute('role', 'status'); this.feedback.setAttribute('aria-live', 'polite');
    this.completeArea = element('div', 'completion');
    workbench.append(element('p', 'workbench-label', ui.t('tray')), tray, element('div', 'flow-arrow', '↓'), slots, this.feedback, this.completeArea);
    layout.append(note, workbench); studio.append(heading, layout); ui.screen.append(studio);
    ui.panel(ui.t('m01'), `${ui.t('m01Objective')} ${ui.t('instructions')}`, [{ label: ui.t('begin'), run: () => ui.close() }]);
    this.events.once('shutdown', () => { this.cards.clear(); this.slots = []; });
  }
  private place(card: string | undefined, index: number) {
    if (ui.blocked || this.finishing || this.puzzle.complete) return;
    if (!card) { this.feedback.textContent = ui.t('chooseSlot'); return; }
    const outcome = this.puzzle.place(card, index);
    if (outcome === 'wrong') { this.feedback.textContent = ui.t('wrong'); return; }
    if (outcome === 'invalid' || outcome === 'used') { this.feedback.textContent = ui.t('occupied'); return; }
    const step = dialogue.paper.steps.find(item => item.id === card)!;
    const slot = this.slots[index];
    slot.classList.add('placed'); slot.append(element('strong', '', `${step.symbol} ${localize(step.label, session.state.locale)}`));
    this.cards.get(card)!.disabled = true;
    this.cards.forEach(node => node.setAttribute('aria-pressed', 'false')); this.selected = undefined;
    this.feedback.textContent = ui.t(outcome === 'complete' ? 'success' : 'placed');
    if (outcome === 'complete') {
      this.completeArea.parentElement!.classList.add('is-complete');
      this.completeArea.append(element('h2', '', ui.t('success')), element('p', '', ui.t('recap')), button(ui.t('returnDone'), () => this.result('completed'), 'primary'));
      this.completeArea.querySelector('button')!.focus({ preventScroll: true });
    }
  }
  private result(outcome: MinigameResult['outcome'], destination = 'Hub') {
    if (this.finishing) return;
    this.finishing = true; ui.close();
    emitMinigameResult(this, this.payload, {
      id: this.payload.minigameId, outcome, score: this.puzzle.slots.filter(Boolean).length,
      learnedFactIds: outcome === 'completed' ? [...stationById(this.payload.minigameId)!.factIds] : [], attempts: this.puzzle.attempts,
    }, destination);
  }
}
