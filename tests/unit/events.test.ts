import { beforeEach, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import { emitMinigameResult } from '../../src/game/core/GameEvents';
import { session } from '../../src/game/core/SessionStore';
import type { MinigamePayload, MinigameResult } from '../../src/game/core/types';

const payload: MinigamePayload = { minigameId: 'M01', mode: 'presentation', seed: 42, returnPosition: { x: 1120, y: 944 } };
const result: MinigameResult = { id: 'M01', outcome: 'completed', score: 3, learnedFactIds: ['demo-paper'], attempts: 1 };
beforeEach(() => { session.configure('presentation', 'vi'); session.reset(); });

it('rejects invalid station handoffs without changing progress or starting another scene', () => {
  const start = vi.fn();
  const scene = { scene: { start } } as unknown as Phaser.Scene;
  const before = structuredClone(session.state);
  for (const [input, outcome, destination] of [
    [{ ...payload, returnPosition: { x: Infinity, y: 944 } }, result, 'Hub'],
    [{ ...payload, returnPosition: null }, result, 'Hub'],
    [{ ...payload, mode: 'explore' }, result, 'Hub'],
    [{ ...payload, mode: 'invalid' }, result, 'Hub'],
    [{ ...payload, seed: NaN }, result, 'Hub'],
    [{ ...payload, minigameId: 'M04' }, { ...result, id: 'M04', learnedFactIds: [] }, 'Hub'],
    [payload, { ...result, id: 'M02' }, 'Hub'],
    [payload, { ...result, attempts: -1 }, 'Hub'],
    [payload, result, 'Title'],
    [null, result, 'Hub'],
    [payload, null, 'Hub'],
  ]) {
    expect(() => emitMinigameResult(scene, input as MinigamePayload, outcome as MinigameResult, destination as string)).toThrow();
    expect(session.state).toEqual(before);
    expect(start).not.toHaveBeenCalled();
  }
});

it('commits a valid stamp and exact return position before one scene transition', () => {
  const start = vi.fn(destination => {
    expect(destination).toBe('Hub');
    expect(session.state.statuses.M01).toBe('completed');
    expect(session.state.passportStamps).toEqual(['M01']);
    expect(session.state.hubReturnPosition).toEqual(payload.returnPosition);
  });
  emitMinigameResult({ scene: { start } } as unknown as Phaser.Scene, payload, result);
  expect(start).toHaveBeenCalledTimes(1);
});
