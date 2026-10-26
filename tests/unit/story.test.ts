import { test, expect } from 'vitest';
import { StoryPractice } from '../../src/game/core/StoryPractice';

const requiredEvidence = ['quiet', 'captions', 'schedule'];

// Test 1: Correct plan before evidence returns missing/completed false
// choose(null), evidence size0; choose quiet and captions; plan(true) still missing;
// choose schedule, duplicate quiet does not increase size beyond3; plan(false) reconsider;
// plan(true) complete and completed true.
test('StoryPractice basic flow', () => {
  const practice = new StoryPractice(requiredEvidence);

  // Correct plan before evidence returns missing/completed false
  expect(practice.plan(true)).toBe('missing');
  expect(practice.completed).toBe(false);

  // choose(null), evidence size0
  practice.choose(null);
  expect(practice.evidence.size).toBe(0);

  // choose quiet and captions
  practice.choose('quiet');
  practice.choose('captions');

  // plan(true) still missing
  expect(practice.plan(true)).toBe('missing');
  expect(practice.completed).toBe(false);

  // choose schedule
  practice.choose('schedule');

  // duplicate quiet does not increase size beyond3
  practice.choose('quiet');
  expect(practice.evidence.size).toBe(3);

  // plan(false) reconsider
  expect(practice.plan(false)).toBe('reconsider');

  // plan(true) complete and completed true
  expect(practice.plan(true)).toBe('complete');
  expect(practice.completed).toBe(true);
});

test('StoryPractice unknown ID throws', () => {
  const practice = new StoryPractice(requiredEvidence);
  expect(() => practice.choose('unknown')).toThrow('Unknown evidence ID: unknown');
  expect(practice.evidence.size).toBe(0);
  expect(practice.attempts).toBe(0);
});

test('StoryPractice reset clears progress', () => {
  const practice = new StoryPractice(requiredEvidence);
  practice.choose('quiet');
  practice.plan(false);
  practice.reset();
  expect(practice.evidence.size).toBe(0);
  expect(practice.attempts).toBe(0);
  expect(practice.completed).toBe(false);
});

test('StoryPractice constructor validation', () => {
  expect(() => new StoryPractice([])).toThrow('Required evidence cannot be empty');
  expect(() => new StoryPractice(['quiet', 'quiet'])).toThrow('Required evidence contains duplicates');
  expect(() => new StoryPractice(['quiet', ''])).toThrow('Required evidence must be non-empty strings');
  expect(() => new StoryPractice([1 as unknown as string])).toThrow('Required evidence must be non-empty strings');
});
