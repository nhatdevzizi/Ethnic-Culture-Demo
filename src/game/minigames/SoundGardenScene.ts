import Phaser from 'phaser';
import rhythm from '../../content/rhythm.json';
import '../../styles/rhythm.css';
import {RhythmPractice} from '../core/RhythmPractice';
import {facts,localize} from '../core/content';
import {session} from '../core/SessionStore';
import {emitMinigameResult} from '../core/GameEvents';
import type {MinigamePayload,MinigameResult} from '../core/types';
import {element,button,ui} from '../ui/OverlayController';
import {audio} from '../systems/AudioManager';

export class SoundGardenScene extends Phaser.Scene {
  constructor() { super('SoundGarden'); }

  public practice = new RhythmPractice(rhythm.pattern);
  private payload!: MinigamePayload;
  private mode: 'normal' | 'slow' | 'untimed' = 'normal';
  private active = false;
  private finishing = false;
  private attempts = 0;

  private modeButtons: HTMLButtonElement[] = [];
  private beatCells: HTMLElement[] = [];
  private feedbackEl!: HTMLElement;
  private recapEl!: HTMLElement;
  private startBtn!: HTMLButtonElement;
  private tapBtn!: HTMLButtonElement;
  private restBtn!: HTMLButtonElement;

  init(payload: MinigamePayload) {
    if (payload?.minigameId !== 'M02') throw new Error('Invalid minigame ID');
    this.payload = payload;
    this.active = false;
    this.finishing = false;
    this.attempts = 0;
    this.mode = 'normal';
    this.beatCells = [];
    this.modeButtons = [];
  }

  create() {
    this.practice.reset(this.mode);

    const root = element('section', 'studio rhythm-studio');

    // Header
    const header = element('header', 'studio-heading');
    header.appendChild(element('h1', '', ui.t('m02')));

    const controls = element('div', 'studio-controls');
    controls.appendChild(button(ui.t('restart'), () => {
      ui.confirm(
        ui.t('confirmRestart'),
        this.l('restartNote'),
        ui.t('restart'),
        () => this.scene.restart(this.payload)
      );
    }, 'btn-secondary'));

    controls.appendChild(button(ui.t('back'), () => {
      ui.confirm(
        ui.t('confirmBack'),
        this.l('returnNote'),
        ui.t('back'),
        () => this.result('abandoned', 'Hub')
      );
    }, 'btn-secondary'));

    if (session.state.mode === 'presentation') {
      controls.appendChild(button(ui.t('skip'), () => {
        this.result('skipped', 'Hub');
      }, 'btn-secondary'));
    }

    header.appendChild(controls);
    root.appendChild(header);

    // Layout
    const layout = element('div', 'studio-layout');

    // Note section
    const note = element('aside', 'studio-note');
    const fact = facts.find(fact => fact.id === 'demo-rhythm');
    if (fact) {
      note.appendChild(element('h2', '', localize(fact.title, session.state.locale)));
      note.appendChild(element('p', '', localize(fact.body, session.state.locale)));
      note.appendChild(element('p', 'caption', this.l('caption')));
    }

    layout.appendChild(note);

    // Workbench
    const workbench = element('div', 'studio-workbench');

    // Mode buttons
    const modeGroup = element('div', 'mode-buttons');
    const modes: ('normal' | 'slow' | 'untimed')[] = ['normal', 'slow', 'untimed'];
    this.modeButtons = [];

    for (const m of modes) {
      const btn = button(this.l(m), () => this.chooseMode(m), `rhythm-mode-${m}`);
      btn.dataset.testid = `rhythm-mode-${m}`;
      btn.dataset.mode = m;
      modeGroup.appendChild(btn);
      this.modeButtons.push(btn);
    }

    workbench.appendChild(modeGroup);

    // Start button
    this.startBtn = button(this.l('start'), () => this.start(), 'btn-primary rhythm-start');
    this.startBtn.dataset.testid = 'rhythm-start';
    workbench.appendChild(this.startBtn);

    // Beats grid
    const beatsContainer = element('div', 'rhythm-beats');
    beatsContainer.dataset.testid = 'rhythm-board';
    for (let i = 0; i < 6; i++) {
      const cell = element('div', 'rhythm-beat', '');
      cell.dataset.testid = `rhythm-beat-${i}`;
      beatsContainer.appendChild(cell);
      this.beatCells.push(cell);
    }

    workbench.appendChild(beatsContainer);

    // Caption
    const caption = element('p', 'rhythm-caption');
    caption.setAttribute('role', 'status');
    caption.setAttribute('aria-live', 'polite');
    workbench.appendChild(caption);

    // Feedback
    this.feedbackEl = element('p', 'rhythm-feedback', '');
    this.feedbackEl.dataset.testid = 'rhythm-feedback';
    this.feedbackEl.setAttribute('role', 'status');
    this.feedbackEl.setAttribute('aria-live', 'polite');
    workbench.appendChild(this.feedbackEl);

    // Tap/Rest buttons
    this.tapBtn = button(this.l('tap'), () => this.tap(), 'btn-primary rhythm-tap');
    this.tapBtn.dataset.testid = 'rhythm-tap';
    this.restBtn = button(this.l('rest'), () => this.rest(), 'btn-secondary rhythm-rest');
    this.restBtn.dataset.testid = 'rhythm-rest';
    workbench.appendChild(this.tapBtn);
    workbench.appendChild(this.restBtn);

    // Recap
    this.recapEl = element('div', 'rhythm-recap');
    workbench.appendChild(this.recapEl);

    layout.appendChild(workbench);
    root.appendChild(layout);

    ui.bind({
      help: () => ui.panel(ui.t('m02'), this.l('instructions'), [{label:ui.t('close'),run:()=>ui.close()}]),
      interact: () => this.tap(),
      restart: () => {
        ui.confirm(
          ui.t('restart'),
          this.l('restartNote'),
          ui.t('confirmRestart'),
          () => this.scene.restart(this.payload)
        );
      },
      back: () => {
        ui.confirm(
          ui.t('confirmBack'),
          this.l('returnNote'),
          ui.t('back'),
          () => this.result('abandoned', 'Hub')
        );
      },
      skip: () => this.result('skipped', 'Hub'),
      finish: () => this.result('abandoned', 'Ending')
    });

    ui.screen.append(root);
    ui.hud(ui.t('m02'));
    ui.panel(ui.t('m02'), this.l('instructions'), [{label:ui.t('begin'),run:()=>ui.close()}]);

    this.render();
    this.events.once('shutdown', () => audio.stopAll());
  }

  private chooseMode(mode: 'normal' | 'slow' | 'untimed') {
    if (ui.blocked || this.active || this.finishing || this.practice.status === 'completed') return;

    this.mode = mode;
    this.practice.reset(this.mode);
    this.recapEl.innerHTML = '';
    this.render();
  }

  private start() {
    if (ui.blocked || this.finishing) return;

    this.practice.reset(this.mode);
    this.active = true;
    this.attempts++;
    this.recapEl.innerHTML = '';

    this.feedbackEl.textContent = this.l('ready');
    this.render();
    this.playCurrentBeat();
  }

  private tap() {
    if (ui.blocked || !this.active || this.finishing) return;

    const result = this.practice.tap();

    switch (result) {
      case 'hit':
        this.feedbackEl.textContent = this.l('hit');
        break;
      case 'rest':
        this.feedbackEl.textContent = this.l('restError');
        break;
      case 'duplicate':
        this.feedbackEl.textContent = this.l('duplicate');
        break;
    }

    this.render();
    if (this.mode === 'untimed' && result === 'hit') this.playCurrentBeat();

    this.checkOutcome();
  }

  private rest() {
    if (ui.blocked || !this.active || this.finishing) return;

    const success = this.practice.advanceRest();

    if (!success) {
      this.feedbackEl.textContent = this.l('restError');
    } else {
      this.feedbackEl.textContent = this.l('rest');
    }

    this.render();
    if (success) this.playCurrentBeat();

    this.checkOutcome();
  }

  update(_time: number, delta: number) {
    if (!this.active || ui.blocked) return;

    const prevIndex = this.practice.index;
    const prevMistakes = this.practice.mistakes;

    this.practice.tick(Math.min(delta, 100));

    if (prevIndex !== this.practice.index || prevMistakes !== this.practice.mistakes) {
      this.render();
      if (prevIndex !== this.practice.index) this.playCurrentBeat();

      if (this.practice.mistakes > prevMistakes) {
        this.feedbackEl.textContent = this.l('missed');
      }
    }

    this.checkOutcome();
  }

  private checkOutcome() {
    if (this.finishing) return;

    if (this.practice.status === 'retry') {
      this.active = false;
      this.feedbackEl.textContent = this.l('retry');
      this.render();
      return;
    }

    if (this.practice.status === 'completed') {
      this.active = false;

      this.render();
      if(this.recapEl.children.length) return;

      const recap = element('div', '');
      audio.play('stamp');
      recap.appendChild(element('h2', '', this.l('complete')));
      recap.appendChild(element('p', '', this.l('recap')));

      const stampBtn = button(ui.t('returnDone'), () => {
        this.result('completed', 'Hub');
      }, 'btn-primary');
      recap.appendChild(stampBtn);

      this.recapEl.appendChild(recap);
    }
  }

  public render() {
    // Update mode buttons
    for (const btn of this.modeButtons) {
      if (btn.dataset.mode === this.mode) {
        btn.setAttribute('aria-pressed', 'true');
      } else {
        btn.setAttribute('aria-pressed', 'false');
      }
    }

    // Update beat cells
    for (let i = 0; i < 6; i++) {
      const cell = this.beatCells[i];
      const isCurrent = i === this.practice.index;

      if (isCurrent) {
        cell.setAttribute('aria-current', 'step');
        cell.dataset.testid = `rhythm-beat-${i}`;
      } else {
        cell.removeAttribute('aria-current');
      }

      const isHit = rhythm.pattern[i] === true;
      cell.textContent = `${i + 1} · ${isHit ? this.l('tap') : this.l('rest')}`;
      cell.dataset.index = i.toString();
      cell.dataset.status = this.practice.status;
    }

    // Update caption
    const caption = document.querySelector('.rhythm-caption') as HTMLElement;
    if (caption) {
      caption.textContent = this.l(rhythm.pattern[this.practice.index] ? 'tap' : 'rest');
    }

    const board = document.querySelector<HTMLElement>('[data-testid="rhythm-board"]');
    if (board) { board.dataset.index = String(this.practice.index); board.dataset.status = this.practice.status; }
    // Update buttons
    this.tapBtn.disabled = !this.active;
    this.restBtn.disabled = !this.active || this.mode !== 'untimed';
    this.restBtn.style.display = this.mode === 'untimed' ? 'inline-block' : 'none';
    this.startBtn.disabled = this.active || this.finishing || this.practice.status === 'completed';
  }

  private l(key: keyof typeof rhythm.labels) {
    return localize(rhythm.labels[key], session.state.locale);
  }

  private playCurrentBeat() {
    if (this.active && this.practice.status === 'playing') audio.play(rhythm.pattern[this.practice.index] ? 'tap' : 'rest');
  }

  private result(outcome: MinigameResult['outcome'], destination: string) {
    if (this.finishing) return;

    this.finishing = true;

    ui.close();
    emitMinigameResult(this, this.payload, {
      id: 'M02',
      outcome,
      score: this.practice.hits,
      learnedFactIds: outcome === 'completed' ? ['demo-rhythm'] : [],
      attempts: this.attempts
    }, destination);
  }
}
