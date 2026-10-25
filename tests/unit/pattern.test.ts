import { describe, expect, it } from 'vitest';
import { PatternPuzzle } from '../../src/game/core/PatternPuzzle';

describe('fictional paper ordering', () => {
  it('rejects a wrong step without losing the card and completes the correct sequence', () => {
    const puzzle = new PatternPuzzle(['plan', 'cut', 'assemble']);
    expect(puzzle.place('cut', 0)).toBe('wrong');
    expect(puzzle.slots).toEqual([null, null, null]);
    expect(puzzle.place('plan', 0)).toBe('placed');
    expect(puzzle.place('plan', 1)).toBe('used');
    expect(puzzle.place('assemble', -1)).toBe('invalid');
    expect(puzzle.place('cut', 1)).toBe('placed');
    expect(puzzle.place('assemble', 2)).toBe('complete');
    expect(puzzle.complete).toBe(true);
    expect(puzzle.attempts).toBe(4);
    puzzle.reset();
    expect(puzzle.slots).toEqual([null, null, null]);
    expect(puzzle.complete).toBe(false);
  });
});
