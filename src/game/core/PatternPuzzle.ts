export class PatternPuzzle {
  readonly slots: (string | null)[];
  readonly order: readonly string[];
  attempts = 0;
  constructor(order: readonly string[]) {
    if (!order.length || order.some(id => !id.trim()) || new Set(order).size !== order.length) throw new Error('Puzzle needs unique, nonempty step IDs');
    this.order = [...order]; this.slots = Array(order.length).fill(null);
  }
  get complete() { return this.slots.every(slot => slot !== null); }
  place(card: string, slot: number): 'invalid' | 'used' | 'wrong' | 'placed' | 'complete' {
    if (!this.order.includes(card) || !Number.isInteger(slot) || slot < 0 || slot >= this.slots.length) return 'invalid';
    if (this.slots.includes(card)) return 'used';
    if (this.slots[slot] !== null) return 'invalid';
    this.attempts++;
    if (this.order[slot] !== card) return 'wrong';
    this.slots[slot] = card;
    return this.complete ? 'complete' : 'placed';
  }
  reset() { this.slots.fill(null); this.attempts = 0; }
}
