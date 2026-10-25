import { expect, it } from 'vitest';
import facts from '../../src/content/facts.json';
import { validateFacts } from '../../src/game/core/ContentValidation';

it('allows labeled fictional drafts in demo, but blocks them in release', () => {
  expect(validateFacts(facts, ['demo-paper'], false)).toEqual([]);
  expect(validateFacts(facts, ['demo-paper'], true).join(' ')).toMatch(/approved/);
  expect(validateFacts(facts, ['missing'], false).join(' ')).toMatch(/missing/);
  const claim = { ...facts[0], fictional: false };
  expect(validateFacts([claim], ['demo-paper'], false).join(' ')).toMatch(/source/);
  expect(validateFacts([{ ...claim, sourceUrls: ['https://example.org/source'], reviewStatus: 'approved', reviewer: 'Reviewer' }], ['demo-paper'], true)).toEqual([]);
});
