import { expect, it } from 'vitest';
import facts from '../../src/content/facts.json';
import stations from '../../src/content/minigames.json';
import assets from '../../src/content/assets-manifest.json';
import { validateContentBundle, validateFacts } from '../../src/game/core/ContentValidation';

it('allows labeled fictional drafts in demo, but blocks them in release', () => {
  expect(validateFacts(facts, ['demo-paper'], false)).toEqual([]);
  expect(validateFacts(facts, ['demo-paper'], true).join(' ')).toMatch(/approved/);
  expect(validateFacts(facts, ['missing'], false).join(' ')).toMatch(/missing/);
  const claim = { ...facts[0], fictional: false };
  expect(validateFacts([claim], ['demo-paper'], false).join(' ')).toMatch(/source/);
  expect(validateFacts([{ ...claim, sourceUrls: ['https://example.org/source'], reviewStatus: 'approved', reviewer: 'Reviewer' }], ['demo-paper'], true)).toEqual([]);
});

it('rejects malformed optional translations before they reach the interface', () => {
  expect(validateFacts([{ ...facts[0], title: { vi: 'Tiêu đề', en: 42 } }], ['demo-paper'], false).join(' ')).toMatch(/schema/);
  expect(validateFacts([{ ...facts[0], permittedAssetIds: null }], ['demo-paper'], false).join(' ')).toMatch(/schema/);
});

it('reports malformed collections and records without throwing TypeErrors', () => {
  for (const bundle of [null, {}, { facts: [null], stations: [null], communities: [null], assets: [null] }, { facts: {}, stations: {}, communities: null, assets: 'bad' }]) {
    let errors: string[] = [];
    expect(() => { errors = validateContentBundle(bundle, false); }).not.toThrow();
    expect(errors.length).toBeGreaterThan(0);
  }
  const current = { facts, stations, communities: [], assets };
  expect(validateContentBundle(current, false)).toEqual([]);
  expect(validateContentBundle(current, true).join(' ')).toMatch(/approved/);
});

it('checks duplicate identities, cross-record references, source safety, and the selected release gate', () => {
  const current = { facts, stations, communities: [], assets };
  const duplicate = validateContentBundle({ ...current, facts: [...facts, facts[0]], stations: [...stations, stations[0]], assets: [...assets, assets[0]] }, false).join(' ');
  expect(duplicate).toMatch(/Duplicate fact/);
  expect(duplicate).toMatch(/Duplicate station/);
  expect(duplicate).toMatch(/Duplicate asset/);
  expect(validateContentBundle({ ...current, facts: [{ ...facts[0], communityIds: ['missing-community'], permittedAssetIds: ['missing-asset'] }] }, false).join(' ')).toMatch(/unknown community missing-community.*unknown asset missing-asset/);
  expect(validateContentBundle({ ...current, facts: [{ ...facts[0], sourceUrls: ['javascript:alert(1)'] }] }, false).join(' ')).toMatch(/invalid source URL/);
  expect(validateContentBundle({ ...current, assets: [{ ...assets[0], sourceUrls: ['data:text/html,bad'] }] }, false).join(' ')).toMatch(/invalid asset attribution/);
  expect(validateContentBundle({ ...current, stations: [{ ...stations[0], factIds: ['missing'] }] }, false).join(' ')).toMatch(/Selected fact missing: missing/);
  const approved = { ...facts[0], fictional: false, reviewStatus: 'approved', reviewer: 'Qualified reviewer', sourceUrls: ['https://example.org/documented-claim'] };
  const reviewed = { ...current, facts: [approved], stations: [stations[0]], assets: assets.map(asset => ({ ...asset, reviewStatus: 'approved' })) };
  expect(validateContentBundle(reviewed, true)).toEqual([]);
  expect(validateContentBundle({ ...reviewed, facts: [{ ...approved, reviewer: '' }] }, true).join(' ')).toMatch(/schema|reviewer/);
  expect(validateContentBundle({ ...reviewed, assets: [{ ...assets[0], reviewStatus: 'draft' }] }, true).join(' ')).toMatch(/asset permission needs approval/);
});
