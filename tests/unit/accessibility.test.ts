import { describe, expect, it } from 'vitest';
import { AccessibilityPreferences } from '../../src/game/core/AccessibilityPreferences';

describe('low-motion preferences', () => {
  it('uses the operating-system preference until the player chooses otherwise', () => {
    expect(new AccessibilityPreferences(undefined, true).lowMotion).toBe(true);
    expect(new AccessibilityPreferences(undefined, false).lowMotion).toBe(false);
    expect(new AccessibilityPreferences({ getItem: () => 'invalid', setItem: () => {} }, true).lowMotion).toBe(true);
  });
  it('persists an explicit choice across reloads, including full motion on a reduced-motion system', () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    const first = new AccessibilityPreferences(storage, true);
    first.setLowMotion(false);
    expect(first.lowMotion).toBe(false);
    expect(new AccessibilityPreferences(storage, true).lowMotion).toBe(false);
    first.setLowMotion(true);
    expect(new AccessibilityPreferences(storage, false).lowMotion).toBe(true);
  });
  it('retains the current choice when browser storage cannot be read or written', () => {
    const storage = { getItem: (): string | null => { throw new Error('denied'); }, setItem: () => { throw new Error('quota'); } };
    const preference = new AccessibilityPreferences(storage, false);
    preference.setLowMotion(true);
    expect(preference.lowMotion).toBe(true);
    preference.setLowMotion(false);
    expect(preference.lowMotion).toBe(false);
  });
});
