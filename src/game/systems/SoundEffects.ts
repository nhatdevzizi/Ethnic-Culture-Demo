/**
 * Web Audio Sound Effects Synthesizer for "Thanh Âm Đại Ngàn"
 * Zero external CDN or audio file dependency; pure deterministic browser audio synthesis.
 */

class SoundEffectsSystem {
  private ctx: AudioContext | null = null;
  private muted = false;

  private getContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (muted && this.ctx && this.ctx.state === 'running') {
      void this.ctx.suspend();
    }
  }

  isMuted() {
    return this.muted;
  }

  /**
   * Cồng Chiêng Tây Nguyên (Deep resonance gong with metallic harmonics)
   */
  playGong() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const fundamental = 110; // A2
    const harmonics = [1, 2.76, 5.4, 8.9];
    const gains = [0.8, 0.4, 0.2, 0.1];

    harmonics.forEach((mult, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = index === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(fundamental * mult, now);

      gain.gain.setValueAtTime(gains[index], now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (index === 0 ? 3.5 : 1.8));

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 3.6);
    });
  }

  /**
   * Chuông Bấm Phản Xạ (Buzzer Chime - bright ding)
   */
  playBuzzer() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now); // A5
    osc.frequency.exponentialRampToValueAtTime(1760, now + 0.08);

    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.65);
  }

  /**
   * Đúng! Cộng Điểm (Sparkling success arpeggio)
   */
  playSuccess() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(0.4, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.55);
    });
  }

  /**
   * Sai / Bị Trừ Điểm (Low thud / regret buzz)
   */
  playFailure() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(65, now + 0.4);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.5);
  }

  /**
   * Đồng hồ đếm ngược 5 giây (Ticking sound)
   */
  playTick(pitch = 880) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(pitch, now);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  /**
   * Trao Thẻ Chức Năng (Triumph Fanfare)
   */
  playCardAwardFanfare() {
    this.playGong();
    this.playSuccess();
    this.playCardActivate();
  }

  /**
   * Kích Hoạt Thẻ Chức Năng (Magic whoosh & chime)
   */
  playCardActivate() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.25);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.55);
  }

  /**
   * Cảnh Báo Quỹ Săn Mồi (Dramatic warning alert)
   */
  playPreyWarning() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    [220, 233.08].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.85);
    });
  }

  /**
   * Mô phỏng tiếng Đàn Tính (Tày/Nùng - Plucked string with warm body)
   */
  playDanTinhSample() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const melody = [329.63, 392.0, 440.0, 493.88, 587.33, 440.0, 493.88]; // Pentatonic E-G-A-B-D
    melody.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.22);

      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(0.45, now + idx * 0.22);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.22 + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.22);
      osc.stop(now + idx * 0.22 + 0.45);
    });
  }

  /**
   * Mô phỏng tiếng Khèn Mông (Breathy reed polyphony)
   */
  playKhenMongSample() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Drone
    const drone = ctx.createOscillator();
    const droneGain = ctx.createGain();
    drone.type = 'sawtooth';
    drone.frequency.setValueAtTime(196, now); // G3 drone
    droneGain.gain.setValueAtTime(0.2, now);
    droneGain.gain.exponentialRampToValueAtTime(0.01, now + 2.0);
    drone.connect(droneGain);
    droneGain.connect(ctx.destination);
    drone.start(now);
    drone.stop(now + 2.1);

    // Melody pipes
    const tunes = [293.66, 329.63, 392.0, 440.0, 392.0, 329.63, 293.66];
    tunes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + idx * 0.26);

      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(0.25, now + idx * 0.26);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.26 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.26);
      osc.stop(now + idx * 0.26 + 0.4);
    });
  }
}

export const sfx = new SoundEffectsSystem();
