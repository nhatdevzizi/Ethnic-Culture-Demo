import { expect, it } from 'vitest';
import { SessionStore } from '../../src/game/core/SessionStore';
import hubMap from '../../public/assets/maps/hub.json';

it('migrates old map positions without losing stamps and accepts new distant station returns', () => {
  const store = new SessionStore();
  store.applyResult({ id: 'M01', outcome: 'completed', score: 3, attempts: 1, learnedFactIds: ['demo-paper'] });
  const legacy = { ...store.state, hubLayoutVersion: undefined, hubReturnPosition: { x: 1120, y: 944 } };
  const restored = new SessionStore({ getItem: () => JSON.stringify(legacy), setItem: () => {} });
  expect(restored.state.passportStamps).toEqual(['M01']);
  expect(restored.state.hubReturnPosition).toEqual(hubMap.spawn);
  const distant = { ...restored.state, hubReturnPosition: { x: 2112, y: 1488 } };
  const current = new SessionStore({ getItem: () => JSON.stringify(distant), setItem: () => {} });
  expect(current.state.hubReturnPosition).toEqual(distant.hubReturnPosition);
  expect(current.state.passportStamps).toEqual(['M01']);
});
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

it('preserves a skipped station when a later attempt is abandoned', () => {
  const store = new SessionStore();
  store.applyResult({ ...result, id: 'M03', learnedFactIds: [], outcome: 'skipped' });
  store.begin('M03', { x: 1120, y: 432 });
  store.applyResult({ ...result, id: 'M03', learnedFactIds: [], outcome: 'abandoned' });
  expect(store.state.statuses.M03).toBe('skipped');
  expect(store.state.passportStamps).toEqual([]);
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

it('treats malformed saves as data recovery, not a storage outage', () => {
  for (const raw of ['{bad', 'null', '[]', '{}']) {
    const store = new SessionStore({ getItem: () => raw, setItem: () => {} });
    expect(store.state.passportStamps).toEqual([]);
    expect(store.storageAvailable).toBe(true);
    store.applyResult(result);
    expect(store.state.passportStamps).toEqual(['M01']);
  }
});

it('rejects learned facts without completion and unknown station keys, and recovers valid progress', () => {
  const saved = new SessionStore();
  saved.applyResult(result);
  const raw = structuredClone(saved.state);
  raw.passportStamps.push('M01');
  raw.learnedFactIds.push('demo-paper');
  raw.statuses.M02 = 'in-progress';
  const load = (value: unknown) => new SessionStore({ getItem: () => JSON.stringify(value), setItem: () => {} });
  const restored = load(raw);
  expect(restored.state.passportStamps).toEqual(['M01']);
  expect(restored.state.learnedFactIds).toEqual(['demo-paper']);
  expect(restored.state.statuses.M02).toBe('not-started');
  expect(restored.storageAvailable).toBe(true);
  expect(load({ ...raw, learnedFactIds: ['demo-rhythm'] }).state.passportStamps).toEqual([]);
  expect(load({ ...raw, statuses: { ...raw.statuses, invented: 'completed' } }).state.passportStamps).toEqual([]);
});

it('keeps quota failures playable and rejects malformed results before mutation', () => {
  const store = new SessionStore({ getItem: () => null, setItem: () => { throw new Error('quota'); } });
  store.applyResult(result);
  expect(store.storageAvailable).toBe(false);
  expect(store.state.passportStamps).toEqual(['M01']);
  const before = structuredClone(store.state);
  for (const bad of [null, {}, { ...result, outcome: ['completed'] }, { ...result, attempts: 1.5 }, { ...result, score: Infinity }, { ...result, learnedFactIds: [null] }]) {
    expect(() => store.applyResult(bad as typeof result)).toThrow('Invalid minigame result');
    expect(store.state).toEqual(before);
  }
});

it('commits an optional return position in one write and rejects it before progress changes', () => {
  const writes: string[] = [];
  const store = new SessionStore({ getItem: () => null, setItem: (_key, raw) => writes.push(raw) });
  const before = structuredClone(store.state);
  expect(() => store.applyResult(result, { x: -1, y: 700 })).toThrow();
  expect(store.state).toEqual(before);
  expect(writes).toEqual([]);
  store.applyResult(result, { x: 1120, y: 944 });
  expect(writes).toHaveLength(1);
  expect(JSON.parse(writes[0]).hubReturnPosition).toEqual({ x: 1120, y: 944 });
  expect(JSON.parse(writes[0]).passportStamps).toEqual(['M01']);
});
