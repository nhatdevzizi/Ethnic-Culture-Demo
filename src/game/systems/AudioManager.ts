type Cue = 'tap' | 'rest' | 'stamp';

export class AudioManager {
  muted = true;
  volume = 0.4;
  unavailable = false;
  onUnavailable?: () => void;
  private unlocked = false;
  private paused = false;
  private generation = 0;
  private clips = new Map<Cue, HTMLAudioElement>();

  constructor(private createAudio: (src: string) => HTMLAudioElement = src => new Audio(src)) {}

  async unlock(): Promise<void> {
    if (this.unlocked || this.unavailable) return;
    try {
      for (const cue of ['tap', 'rest', 'stamp'] as const) {
        const clip = this.createAudio(`${import.meta.env.BASE_URL}assets/audio/${cue}.wav`);
        clip.preload = 'auto';
        clip.volume = this.volume;
        clip.addEventListener('error', () => this.fail());
        this.clips.set(cue, clip);
        clip.load();
      }
      this.unlocked = true;
    } catch { this.fail(); }
  }

  async toggleMute(): Promise<void> {
    this.muted = !this.muted;
    if (this.muted) this.stopAll();
    else await this.unlock();
  }

  setVolume(value: number): void {
    if (!Number.isFinite(value)) return;
    this.volume = Math.max(0, Math.min(1, value));
    for (const clip of this.clips.values()) clip.volume = this.volume;
    if (this.volume === 0) this.stopAll();
  }

  play(cue: Cue): void {
    if (!this.unlocked || this.muted || this.paused || this.unavailable || this.volume === 0 ||
      (typeof document !== 'undefined' && document.hidden)) return;
    const clip = this.clips.get(cue);
    if (!clip) return;
    this.stopAll();
    const generation = this.generation;
    try {
      clip.volume = this.volume;
      void clip.play().catch(() => { if (generation === this.generation) this.fail(); });
    } catch { this.fail(); }
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused) this.stopAll();
  }

  stopAll(): void {
    this.generation++;
    for (const clip of this.clips.values()) {
      clip.pause();
      try { clip.currentTime = 0; } catch { /* An unloaded optional cue has no seekable timeline. */ }
    }
  }

  private fail(): void {
    if (this.unavailable) return;
    this.unavailable = true;
    this.stopAll();
    this.onUnavailable?.();
  }
}

export const audio = new AudioManager();
