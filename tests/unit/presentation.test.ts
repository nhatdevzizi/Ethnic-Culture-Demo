import { describe, expect, it } from 'vitest';
import { nextPresentationStation, TutorialProgress } from '../../src/game/core/PresentationRoute';

describe('guided presentation progress', () => {
  it('follows registry order and advances after completed or skipped stations', () => {
    expect(nextPresentationStation({})?.id).toBe('M01');
    expect(nextPresentationStation({ M01: 'completed' })?.id).toBe('M02');
    expect(nextPresentationStation({ M01: 'skipped', M02: 'completed' })?.id).toBe('M03');
    expect(nextPresentationStation({ M01: 'skipped', M02: 'skipped', M03: 'completed' })).toBeUndefined();
    expect(nextPresentationStation({ M01: 'not-started', M02: 'completed' })?.id).toBe('M01');
    expect(nextPresentationStation({ M01: 'in-progress' })?.id).toBe('M01');
  });
  it('retains tutorial dismissal without depending on progress saves', () => {
    const entries = new Map<string, string>();
    const storage = { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => { entries.set(key, value); } };
    const first = new TutorialProgress(storage);
    expect(first.dismissed).toBe(false);
    first.dismiss();
    expect(new TutorialProgress(storage).dismissed).toBe(true);
  });
  it('still dismisses help when browser storage throws', () => {
    const storage = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    const tutorial = new TutorialProgress(storage);
    expect(tutorial.dismissed).toBe(false);
    expect(() => tutorial.dismiss()).not.toThrow();
    expect(tutorial.dismissed).toBe(true);
  });
});
