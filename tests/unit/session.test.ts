import { expect, it } from 'vitest';
import { SessionStore } from '../../src/game/core/SessionStore';
const result = { id: 'M01', outcome: 'completed' as const, score: 3, learnedFactIds: ['demo-paper'], attempts: 4 };

it('awards one stamp and preserves the hub position across replay', () => {
  const store = new SessionStore();
  store.begin('M01', { x: 912, y: 672 });
  store.applyResult(result);
  store.begin('M01', { x: 912, y: 672 });
  store.applyResult(result);
  expect(store.state.passportStamps).toEqual(['M01']);
  expect(store.state.learnedFactIds).toEqual(['demo-paper']);
  expect(store.state.hubReturnPosition).toEqual({ x: 912, y: 672 });
});

it('keeps skips distinct and never awards stamps for abandon', () => {
  const store = new SessionStore();
  store.applyResult({ ...result, outcome: 'abandoned' });
  expect(store.state.statuses.M01).toBe('not-started');
  store.applyResult({ ...result, outcome: 'skipped' });
  expect(store.state.statuses.M01).toBe('skipped');
  expect(store.state.passportStamps).toEqual([]);
  expect(() => store.applyResult({ ...result, id: 'unknown' })).toThrow();
  expect(() => store.applyResult({ ...result, learnedFactIds: ['invented'] })).toThrow();
});

it('recovers invalid and outdated saves and blocked storage', () => {
  for (const raw of ['{bad', '{}', JSON.stringify({ schemaVersion: 0 })]) {
    const store = new SessionStore({ getItem: () => raw, setItem: () => {} });
    expect(store.state.passportStamps).toEqual([]);
  }
  const throwing = new SessionStore({ getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } });
  throwing.applyResult(result);
  expect(throwing.state.passportStamps).toEqual(['M01']);
  expect(throwing.storageAvailable).toBe(false);
  let raw = '';
  const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value; } };
  const first = new SessionStore(storage);
  first.applyResult(result);
  expect(new SessionStore(storage).state.passportStamps).toEqual(['M01']);
  const corrupted = JSON.parse(raw);
  corrupted.hubReturnPosition.x = null;
  expect(new SessionStore({ getItem: () => JSON.stringify(corrupted), setItem: () => {} }).state.passportStamps).toEqual([]);
});
