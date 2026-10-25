import { session } from '../core/SessionStore';
import { facts, localize, text } from '../core/content';
import { minigameRegistry } from '../core/MinigameRegistry';
import assets from '../../content/assets-manifest.json';
import type { TextKey } from '../core/content';

export const element = <K extends keyof HTMLElementTagNameMap>(tag: K, className = '', content = '') => {
  const node = document.createElement(tag); node.className = className; node.textContent = content; return node;
};
export const button = (label: string, action: () => void, className = '') => {
  const node = element('button', className, label); node.type = 'button'; node.addEventListener('click', action); return node;
};
type Actions = { interact?: () => void; restart?: () => void; back?: () => void; skip?: () => void; finish?: () => void };

class OverlayController {
  screen = document.querySelector<HTMLDivElement>('#screen')!;
  modal = document.querySelector<HTMLDialogElement>('#modal')!;
  actions: Actions = {};
  private previousFocus: HTMLElement | null = null;
  private advance?: () => void;
  private pauseOpen = false;
  private onClose?: () => void;
  get blocked() { return this.modal.open || document.hidden; }
  t(key: TextKey | string) { return text(key, session.state.locale); }
  constructor() {
    this.modal.addEventListener('cancel', event => { event.preventDefault(); this.close(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && !this.modal.open && this.actions.finish) this.pause(); });
    document.addEventListener('keydown', event => {
      if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
      const target = event.target as HTMLElement;
      if (target.matches('input, select, textarea')) return;
      if (event.code === 'Escape') {
        event.preventDefault();
        if (this.modal.open) this.close(); else this.pause();
        return;
      }
      if (this.modal.open) {
        if (event.code === 'KeyP' && this.pauseOpen) { event.preventDefault(); this.close(); }
        else if (event.code === 'KeyE' && this.advance) { event.preventDefault(); this.advance(); }
        return;
      }
      if (target.matches('button, a') && ['Space', 'Enter', 'KeyE'].includes(event.code)) return;
      const shortcuts: Record<string, (() => void) | undefined> = {
        KeyE: this.actions.interact, Space: this.actions.interact, KeyP: () => this.pause(),
        KeyH: () => this.help(), KeyR: this.actions.restart, KeyM: () => this.toast(this.t('muted')),
        KeyN: session.state.mode === 'presentation' ? this.actions.skip : undefined, KeyF: () => this.fullscreen(),
      };
      const action = shortcuts[event.code];
      if (action) { event.preventDefault(); action(); }
    });
  }
  bind(actions: Actions) {
    this.close(); this.actions = actions; this.screen.replaceChildren();
    this.prompt('');
    document.querySelector('#demo-badge')!.textContent = this.t('demo');
    document.documentElement.lang = session.state.locale;
  }
  panel(title: string, body: string, actions: { label: string; run: () => void }[], onClose?: () => void) {
    this.close();
    this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.onClose = onClose;
    const heading = element('h2', '', title); heading.id = 'modal-title';
    const buttons = element('div', 'button-row');
    actions.forEach(action => buttons.append(button(action.label, action.run)));
    this.modal.replaceChildren(element('span', 'eyebrow', this.t('journey')), heading, element('p', '', body), buttons);
    this.modal.showModal();
  }
  close() {
    if (!this.modal.open) return;
    this.modal.close(); this.advance = undefined; this.pauseOpen = false;
    const callback = this.onClose; this.onClose = undefined; callback?.();
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
    const hud = document.querySelector<HTMLElement>('#hud')!; hud.hidden = false;
    const place = element('div', 'location'); place.append(element('span', 'eyebrow', this.t('journey')), element('strong', '', location));
    const tools = element('nav', 'tools'); tools.setAttribute('aria-label', 'Game controls');
    tools.append(button(`${this.t('passport')} ${session.state.passportStamps.length}/1`, () => this.passport()), button('?', () => this.help(), 'icon-button'), button('Ⅱ', () => this.pause(), 'icon-button'));
    tools.children[1].setAttribute('aria-label', this.t('help'));
    tools.lastElementChild!.setAttribute('aria-label', this.t('pause'));
    hud.replaceChildren(place, tools);
    if (!session.storageAvailable) this.toast(this.t('savedFallback'));
  }
  hideHud() { document.querySelector<HTMLElement>('#hud')!.hidden = true; }
  error(message: string) {
    this.bind({}); this.hideHud();
    const panel = element('section', 'title-journal');
    panel.append(element('h1', '', this.t('error')), element('p', '', message), button(this.t('retry'), () => location.reload(), 'primary'));
    this.screen.append(panel);
  }
  prompt(label: string) {
    const prompt = document.querySelector<HTMLButtonElement>('#interact')!;
    prompt.hidden = !label;
    prompt.textContent = `E / Space · ${label}`;
    prompt.onclick = () => this.actions.interact?.();
  }
  toast(message: string) { document.querySelector('#toast')!.textContent = message; }
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
    this.panel(this.t('pause'), `${this.t('pauseNote')} ${this.t('muted')}`, options);
    this.pauseOpen = true;
  }
  help() { this.panel(this.t('help'), this.t('controls'), [{ label: this.t('close'), run: () => this.close() }]); }
  passport() {
    const list = minigameRegistry.map(s => `${this.t(s.titleKey)}: ${s.enabled ? this.t(session.state.statuses[s.id]) : this.t('later')}`).join('\n');
    this.panel(this.t('progress'), `${list}\n\n${this.t('demoNote')}`, [{ label: this.t('close'), run: () => this.close() }]);
  }
  credits() {
    this.panel(this.t('sources'), this.t('creditsNote'), [{ label: this.t('close'), run: () => this.close() }]);
    const sources = element('div', 'source-list');
    for (const asset of assets) sources.append(element('p', '', `${asset.creator} · ${asset.license}. ${asset.attribution}`));
    for (const fact of facts) {
      const item = element('p', '', `${localize(fact.title, session.state.locale)} · ${fact.reviewStatus}`);
      sources.append(item);
      for (const url of fact.sourceUrls) {
        if (!/^https?:\/\//.test(url)) continue;
        const link = element('a', '', url); link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; sources.append(link);
      }
    }
    const engine = element('a', '', 'Phaser 4.2.1 · MIT · Technical reference'); engine.href = 'https://phaser.io/download/release/v4.2.1'; engine.target = '_blank'; engine.rel = 'noopener noreferrer';
    sources.append(engine); this.modal.append(sources);
  }
  async fullscreen() {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.querySelector('#app')!.requestFullscreen(); }
    catch { this.toast('Fullscreen unavailable. Use the browser fullscreen control.'); }
  }
  confirm(title: string, note: string, label: string, action: () => void) {
    this.panel(title, note, [{ label, run: () => { this.close(); action(); } }, { label: this.t('close'), run: () => this.close() }]);
  }
}
export const ui = new OverlayController();
