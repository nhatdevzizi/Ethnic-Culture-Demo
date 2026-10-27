import { session } from '../core/SessionStore';
import { facts, localize, text } from '../core/content';
import { nextPresentationStation, TutorialProgress } from '../core/PresentationRoute';
import { AccessibilityPreferences } from '../core/AccessibilityPreferences';
import { audio } from '../systems/AudioManager';
import assets from '../../content/assets-manifest.json';
import presentation from '../../content/presentation.json';
import type { TextKey } from '../core/content';
import { gameshow } from '../core/GameshowEngine';
import '../../styles/presentation.css';

export const element = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', content = '') => {
  const node = document.createElement(tag); node.className = className; node.textContent = content; return node;
};
export const button = (label: string, action: () => void, className = '') => {
  const node = element('button', className, label); node.type = 'button'; node.addEventListener('click', action); return node;
};
export const presentationText = (key: keyof typeof presentation) => localize(presentation[key], session.state.locale);
type Actions = { help?: () => void; interact?: () => void; restart?: () => void; back?: () => void; skip?: () => void; finish?: () => void; travel?: (id: string) => void };

let tutorialStorage: Storage | undefined;
try { tutorialStorage = window.localStorage; } catch { /* First-run help also works without browser storage. */ }

class OverlayController {
  screen = document.querySelector<HTMLDivElement>('#screen')!;
  modal = document.querySelector<HTMLDialogElement>('#modal')!;
  actions: Actions = {};
  private previousFocus: HTMLElement | null = null;
  private advance?: () => void;
  private pauseOpen = false;
  private onClose?: () => void;
  private tutorialProgress = new TutorialProgress(tutorialStorage);
  private accessibility = new AccessibilityPreferences(tutorialStorage, window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  private errorActive = false;
  onFatalError?: () => void;
  get lowMotion() { return this.accessibility.lowMotion; }
  get hasError() { return this.errorActive; }
  get blocked() {
    const stationModal = document.getElementById('station-game-modal');
    const isStationOpen = stationModal && stationModal.style.display === 'flex';
    return this.errorActive || this.modal.open || document.hidden || Boolean(isStationOpen);
  }
  t(key: TextKey | string) {
    return key in presentation ? presentationText(key as keyof typeof presentation) : text(key, session.state.locale);
  }
  constructor() {
    this.applyMotionPreference();
    audio.onUnavailable = () => this.refreshAudioStatus(true);
    this.modal.addEventListener('cancel', event => { event.preventDefault(); this.close(); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && !this.modal.open && this.actions.finish) this.pause();
      audio.setPaused(this.blocked);
    });
    window.addEventListener('blur', () => {
      if (!this.modal.open && this.actions.finish) this.pause();
      audio.setPaused(true);
    });
    document.addEventListener('keydown', event => {
      if (this.errorActive) return;
      if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
      const target = event.target as HTMLElement;
      if (target.matches('input, select, textarea')) return;
      if (event.code === 'KeyM') { event.preventDefault(); void this.toggleSound(); return; }
      if (event.code === 'Escape') {
        event.preventDefault();
        if (this.modal.open) this.close(); else this.pause();
        return;
      }
      if (this.modal.open) {
        if (event.code === 'KeyP' && this.pauseOpen) { event.preventDefault(); this.close(); }
        else if (this.advance && (event.code === 'KeyE' || (event.code === 'Space' && !target.closest('button, a, input, select, textarea')))) { event.preventDefault(); this.advance(); }
        return;
      }
      if (target.matches('button, a') && ['Space', 'Enter', 'KeyE'].includes(event.code)) return;
      const shortcuts: Record<string, (() => void) | undefined> = {
        KeyE: this.actions.interact, Space: this.actions.interact, KeyP: () => this.pause(),
        KeyH: () => this.help(), KeyR: this.actions.restart,
        KeyN: session.state.mode === 'presentation' ? this.actions.skip : undefined, KeyF: () => this.fullscreen(),
      };
      const action = shortcuts[event.code];
      if (action) { event.preventDefault(); action(); }
    });
  }
  bind(actions: Actions) {
    if (this.errorActive) return;
    this.close(); audio.stopAll(); this.actions = actions; this.screen.replaceChildren();
    audio.setPaused(this.blocked); this.prompt('');
    document.querySelector('#demo-badge')!.textContent = this.t('demo');
    document.documentElement.lang = session.state.locale;
    document.querySelector('#app')!.setAttribute('aria-label', this.t('appLabel'));
    document.querySelector('#game-container')!.setAttribute('aria-label', this.t('worldLabel'));
  }
  panel(title: string, body: string, actions: { label: string; run: () => void }[], onClose?: () => void) {
    if (this.errorActive) return;
    this.close();
    this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.onClose = onClose;
    const heading = element('h2', '', title); heading.id = 'modal-title';
    const buttons = element('div', 'button-row');
    actions.forEach(action => buttons.append(button(action.label, action.run)));
    this.modal.replaceChildren(element('span', 'eyebrow', this.t('journey')), heading, element('p', '', body), buttons);
    this.modal.showModal(); audio.setPaused(true);
  }
  close() {
    if (!this.modal.open) return;
    this.modal.close(); this.advance = undefined; this.pauseOpen = false;
    const callback = this.onClose; this.onClose = undefined; callback?.();
    audio.setPaused(this.blocked);
    (this.previousFocus?.isConnected ? this.previousFocus : document.querySelector<HTMLElement>('#game-container'))?.focus({ preventScroll: true });
  }
  dialogue(name: string, pages: string[]) {
    let index = 0;
    const show = () => {
      const next = () => { index++; if (index >= pages.length) this.close(); else show(); };
      this.panel(name, pages[index], [{ label: this.t(index === pages.length - 1 ? 'close' : 'next'), run: next }]);
      this.advance = next;
    }; show();
  }
  hud(location: string) {
    if (this.errorActive) return;
    const hud = document.querySelector<HTMLElement>('#hud')!; hud.hidden = false;
    const place = element('div', 'location'); place.append(element('span', 'eyebrow', this.t('journey')), element('strong', '', location));
    const tools = element('nav', 'tools'); tools.setAttribute('aria-label', this.t('controlsLabel'));
    const help = button('?', () => this.help(), 'icon-button'); help.setAttribute('aria-label', this.t('help'));
    const pause = button('Ⅱ', () => this.pause(), 'icon-button'); pause.setAttribute('aria-label', this.t('pause'));
    const keysCount = gameshow.getCollectedKeysCount();
    const keyButton = button(`🗝️ Chìa khóa thu thập: ${keysCount}/4`, () => this.keysPanel(), 'key-tracker-btn');
    tools.append(keyButton, help, pause);
    if (session.state.mode === 'presentation') tools.append(button(this.t('presenter'), () => this.presenter(), 'presenter-button'));
    hud.replaceChildren(place, tools);
    if (!session.storageAvailable) this.toast(this.t('savedFallback'));
  }
  hideHud() { document.querySelector<HTMLElement>('#hud')!.hidden = true; }
  error(message: string) {
    if (this.errorActive) return;
    this.errorActive = true; this.onClose = undefined; this.actions = {}; this.close(); this.hideHud();
    audio.stopAll(); audio.setPaused(true); this.prompt(''); this.toast(''); this.screen.replaceChildren();
    const panel = element('section', 'title-journal fatal-recovery'); panel.setAttribute('role', 'alert');
    const reload = button(this.t('retry'), () => location.reload(), 'primary');
    panel.append(element('h1', '', this.t('error')), element('p', '', message), reload);
    this.screen.append(panel);
    reload.focus(); this.onFatalError?.();
  }
  prompt(label: string) {
    const prompt = document.querySelector<HTMLButtonElement>('#interact')!;
    prompt.hidden = !label; prompt.textContent = `E / Space · ${label}`;
    prompt.onclick = () => this.actions.interact?.();
  }
  toast(message: string) { document.querySelector('#toast')!.textContent = message || (session.storageAvailable ? '' : this.t('savedFallback')); }
  pause() {
    if (!this.actions.finish || this.modal.open) return;
    const options = [{ label: this.t('resume'), run: () => this.close() },
      { label: this.t('help'), run: () => this.help() },
      { label: this.t('sources'), run: () => this.credits() },
      { label: this.t('fullscreen'), run: () => this.fullscreen() }];
    if (this.actions.restart) options.push({ label: this.t('restart'), run: () => this.actions.restart?.() });
    if (this.actions.back) options.push({ label: this.t('back'), run: () => this.actions.back?.() });
    if (this.actions.skip && session.state.mode === 'presentation') options.push({ label: this.t('skip'), run: () => this.actions.skip?.() });
    options.push({ label: this.t('finish'), run: () => { this.close(); this.actions.finish?.(); } });
    this.panel(this.t('pause'), this.t('pauseNote'), options); this.audioSettings(); this.motionSettings(); this.pauseOpen = true;
  }
  help() { if (this.actions.help) { this.actions.help(); return; } this.panel(this.t('help'), this.t('controls'), [{ label: this.t('close'), run: () => this.close() }]); }
  passport() {
    this.keysPanel();
  }
  keysPanel() {
    const count = gameshow.getCollectedKeysCount();
    const r1 = gameshow.isStationCompleted('M01') ? '✅ ĐÃ THU THẬP (Vòng 1: Mảnh ghép thổ cẩm)' : '🔒 CHƯA HOÀN THÀNH (Vòng 1: Mảnh ghép thổ cẩm)';
    const r2 = gameshow.isStationCompleted('M02') ? '✅ ĐÃ THU THẬP (Vòng 2: Phiên chợ vùng cao)' : '🔒 CHƯA HOÀN THÀNH (Vòng 2: Phiên chợ vùng cao)';
    const r3 = gameshow.isStationCompleted('M03') ? '✅ ĐÃ THU THẬP (Vòng 3: Tiếng vang đại ngàn)' : '🔒 CHƯA HOÀN THÀNH (Vòng 3: Tiếng vang đại ngàn)';
    const r4 = gameshow.isStationCompleted('M04') ? '✅ ĐÃ THU THẬP (Vòng 4: Lửa thiêng đại ngàn)' : '🔒 CHƯA HOÀN THÀNH (Vòng 4: Lửa thiêng đại ngàn)';

    const statusMsg = count >= 4
      ? '✨ XIN CHÚC MỪNG! Bạn đã thu thập đủ 4/4 Chìa Khóa! Phong ấn Trống Đồng Đông Sơn tại quảng trường trung tâm đã được giải trừ. Hãy tiến tới Trống Đồng để bước vào ĐẠI KẾT CỤC!'
      : `⚡ Bạn đang có ${count}/4 Chìa Khóa. Hãy ghé thăm và hoàn thành cả 4 Lán Trại xung quanh bản đồ để mở khóa Đại Kết Cục!`;

    this.panel(
      `🗝️ CHÌA KHÓA THU THẬP (${count}/4)`,
      `${r1}\n${r2}\n${r3}\n${r4}\n\n${statusMsg}`,
      [{ label: this.t('close'), run: () => this.close() }]
    );
  }
  credits() {
    this.panel(this.t('sources'), this.t('creditsNote'), [{ label: this.t('close'), run: () => this.close() }]);
    const sources = element('div', 'source-list');
    const link = (url: string) => {
      if (!/^https?:\/\//.test(url)) return;
      const item = element('a', '', url); item.href = url; item.target = '_blank'; item.rel = 'noopener noreferrer'; sources.append(item);
    };
    for (const asset of assets) {
      sources.append(element('p', '', `${asset.creator} · ${asset.license}. ${asset.attribution}`));
      if ('sourceUrls' in asset) asset.sourceUrls?.forEach(link);
    }
    for (const fact of facts) {
      sources.append(element('p', '', `${localize(fact.title, session.state.locale)} · ${fact.reviewStatus}`));
      fact.sourceUrls.forEach(link);
    }
    link('https://phaser.io/download/release/v4.2.1'); this.modal.append(sources);
  }
  async fullscreen() {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.querySelector('#app')!.requestFullscreen(); }
    catch { this.toast(this.t('fullscreenUnavailable')); }
  }
  confirm(title: string, note: string, label: string, action: () => void) {
    this.panel(title, note, [{ label, run: () => { this.close(); action(); } }, { label: this.t('close'), run: () => this.close() }]);
  }
  tutorial(force = false) {
    if (session.state.mode !== 'presentation' || (!force && this.tutorialProgress.dismissed)) return;
    this.screen.querySelector('[data-testid="tutorial"]')?.remove();
    const tutorial = element('aside', 'first-run-tutorial'); tutorial.dataset.testid = 'tutorial';
    tutorial.append(element('h2', '', this.t('tutorialTitle')), element('p', '', this.t('tutorialBody')),
      button(this.t('dismissTutorial'), () => { this.tutorialProgress.dismiss(); tutorial.remove(); }));
    this.screen.append(tutorial);
  }
  presenter() {
    if (session.state.mode !== 'presentation' || !this.actions.finish) return;
    const station = nextPresentationStation(session.state.statuses);
    const options: { label: string; run: () => void }[] = [];
    if (station && this.actions.travel) options.push({ label: this.t('goNext'), run: () => { this.close(); this.actions.travel?.(station.id); } });
    if (this.actions.restart) options.push({ label: this.t('restart'), run: () => { this.close(); this.actions.restart?.(); } });
    if (this.actions.back) options.push({ label: this.t('back'), run: () => { this.close(); this.actions.back?.(); } });
    if (this.actions.skip) options.push({ label: this.t('skip'), run: () => { this.close(); this.actions.skip?.(); } });
    if (this.actions.travel) options.push({ label: this.t('replayTutorial'), run: () => { this.close(); this.tutorial(true); } });
    options.push({ label: this.t('sources'), run: () => this.credits() }, { label: this.t('fullscreen'), run: () => this.fullscreen() },
      { label: this.t('finish'), run: () => { this.close(); this.actions.finish?.(); } }, { label: this.t('resume'), run: () => this.close() });
    this.panel(this.t('presenter'), station ? `${this.t('nextStation')}: ${this.t(station.titleKey)}\n${this.t('travelNote')}` : `${this.t('reviewJourney')}\n${this.t('routeDone')}`, options);
    this.audioSettings(); this.motionSettings(); this.pauseOpen = true;
  }
  private applyMotionPreference() { document.querySelector<HTMLElement>('#app')!.dataset.lowMotion = String(this.lowMotion); }
  private motionSettings() {
    const settings = element('section', 'motion-settings');
    const toggle = button(this.t('lowMotion'), () => {
      this.accessibility.setLowMotion(!this.lowMotion); this.applyMotionPreference(); toggle.setAttribute('aria-pressed', String(this.lowMotion));
    });
    toggle.setAttribute('aria-pressed', String(this.lowMotion));
    settings.append(toggle, element('small', '', this.t('lowMotionNote'))); this.modal.append(settings);
  }
  private audioSettings() {
    const settings = element('section', 'audio-settings');
    const toggle = button(this.t(audio.muted ? 'soundOff' : 'soundOn'), () => { void this.toggleSound(); });
    toggle.dataset.audioToggle = ''; toggle.setAttribute('aria-pressed', String(!audio.muted));
    const label = element('label', '', this.t('volume'));
    const volume = element('input'); volume.type = 'range'; volume.min = '0'; volume.max = '1'; volume.step = '0.05'; volume.value = String(audio.volume);
    volume.setAttribute('aria-label', this.t('volume')); volume.addEventListener('input', () => audio.setVolume(Number(volume.value))); label.append(volume);
    const caption = element('small', '', this.t(audio.unavailable ? 'audioUnavailable' : 'soundCaption')); caption.dataset.audioCaption = ''; caption.dataset.testid = 'audio-status';
    settings.append(toggle, label, caption); this.modal.append(settings);
  }
  private async toggleSound() {
    await audio.toggleMute();
    this.refreshAudioStatus(true);
  }
  private refreshAudioStatus(announce = false) {
    document.querySelectorAll<HTMLButtonElement>('[data-audio-toggle]').forEach(toggle => {
      toggle.textContent = this.t(audio.muted ? 'soundOff' : 'soundOn'); toggle.setAttribute('aria-pressed', String(!audio.muted));
    });
    document.querySelectorAll<HTMLElement>('[data-audio-caption]').forEach(caption => { caption.textContent = this.t(audio.unavailable ? 'audioUnavailable' : 'soundCaption'); });
    if (announce && !this.errorActive) this.toast(this.t(audio.unavailable ? 'audioUnavailable' : audio.muted ? 'soundOff' : 'soundOn'));
  }
}
export const ui = new OverlayController();
