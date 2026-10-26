export class RhythmPractice {
  private pattern: boolean[];
  private mode: 'normal' | 'slow' | 'untimed';
  index = 0;
  elapsed = 0;
  mistakes = 0;
  hits = 0;
  status: 'playing' | 'completed' | 'retry' = 'playing';
  private hitThisBeat = false;

  constructor(pattern: boolean[], mode: 'normal' | 'slow' | 'untimed' = 'normal') {
    if (pattern.length === 0) throw new Error('Pattern cannot be empty');
    if (!pattern.every(b => typeof b === 'boolean')) throw new Error('All entries must be boolean');
    if (!pattern.includes(true)) throw new Error('Pattern must contain at least one true beat');
    this.pattern = [...pattern];
    this.mode = mode;
  }

  get beatMs(): number {
    switch (this.mode) {
      case 'slow': return 1100;
      case 'untimed': return Infinity;
      default: return 700;
    }
  }

  private advance(): void {
    this.index++;
    this.hitThisBeat = false;
    if (this.index === this.pattern.length) {
      this.status = this.mistakes === 0 ? 'completed' : 'retry';
    }
  }

  tap(): 'hit' | 'duplicate' | 'inactive' | 'rest' {
    if (this.status !== 'playing') return 'inactive';

    if (!this.pattern[this.index]) {
      this.mistakes++;
      return 'rest';
    }

    if (this.hitThisBeat) {
      this.mistakes++;
      return 'duplicate';
    }

    this.hitThisBeat = true;
    this.hits++;

    if (this.mode === 'untimed') {
      this.advance();
    }

    return 'hit';
  }

  tick(delta: number): void {
    if (!Number.isFinite(delta) || delta < 0) throw new Error('Invalid delta');

    if (this.mode === 'untimed' || this.status !== 'playing') return;

    this.elapsed += delta;

    while (this.elapsed >= this.beatMs && this.status === 'playing') {
      this.elapsed -= this.beatMs;

      if (this.pattern[this.index] && !this.hitThisBeat) {
        this.mistakes++;
      }

      this.advance();
    }
  }

  advanceRest(): boolean {
    if (this.mode !== 'untimed' || this.status !== 'playing' || this.pattern[this.index]) return false;
    this.advance();
    return true;
  }

  reset(mode: 'normal' | 'slow' | 'untimed' = this.mode): void {
    this.mode = mode;
    this.index = 0;
    this.elapsed = 0;
    this.mistakes = 0;
    this.hits = 0;
    this.hitThisBeat = false;
    this.status = 'playing';
  }
}
