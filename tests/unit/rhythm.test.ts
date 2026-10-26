import { test, expect } from 'vitest';
import { RhythmPractice } from '../../src/game/core/RhythmPractice';

test('Test1 literal sequence', () => {
  const r = new RhythmPractice([true, false, true, true, false, true]);
  expect(r.tap()).toBe('hit');
  expect(r.index).toBe(0);
  r.tick(700);
  expect(r.index).toBe(1);
  r.tick(700);
  expect(r.tap()).toBe('hit');
  r.tick(700);
  expect(r.tap()).toBe('hit');
  r.tick(700);
  r.tick(700);
  expect(r.tap()).toBe('hit');
  r.tick(700);
  expect(r.status).toBe('completed');
  expect(r.hits).toBe(4);
  expect(r.mistakes).toBe(0);
  expect(r.tap()).toBe('inactive');
});

test('Test2', () => {
  const r = new RhythmPractice([true, false, true]);
  r.tap();
  expect(r.tap()).toBe('duplicate');
  expect(r.index).toBe(0);
  r.tick(700);
  expect(r.tap()).toBe('rest');
  expect(r.index).toBe(1);
  r.tick(1400);
  expect(r.status).toBe('retry');
  expect(r.mistakes).toBe(3);
  expect(r.hits).toBe(1);
});

test('Test3', () => {
  const r = new RhythmPractice([true, false], 'slow');
  expect(r.beatMs).toBe(1100);
  r.tick(1099);
  expect(r.index).toBe(0);
  expect(r.elapsed).toBe(1099);
  r.tick(1);
  expect(r.index).toBe(1);
  expect(r.elapsed).toBe(0);
  expect(r.mistakes).toBe(1);
  r.reset('normal');
  expect(r.beatMs).toBe(700);
  expect(r.index).toBe(0);
  expect(r.mistakes).toBe(0);
  r.reset();
  expect(r.beatMs).toBe(700);
});

test('Test4', () => {
  const r = new RhythmPractice([true, false, true], 'untimed');
  r.tick(100000);
  expect(r.index).toBe(0);
  expect(r.tap()).toBe('hit');
  expect(r.index).toBe(1);
  expect(r.advanceRest()).toBe(true);
  expect(r.index).toBe(2);
  expect(r.tap()).toBe('hit');
  expect(r.status).toBe('completed');
  expect(r.advanceRest()).toBe(false);
  expect(() => new RhythmPractice([])).toThrow();
  expect(() => new RhythmPractice([false])).toThrow();
  expect(() => r.tick(-1)).toThrow();
  expect(() => r.tick(Infinity)).toThrow();
  expect(() => r.tick(NaN)).toThrow();
});
