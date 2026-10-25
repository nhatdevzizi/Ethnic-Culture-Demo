const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const localized = (value: unknown) => isRecord(value) && typeof value.vi === 'string' && value.vi.trim().length > 0;
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(v => typeof v === 'string');
export const sourceUrl = (url: string) => {
  try { return ['http:', 'https:'].includes(new URL(url).protocol); } catch { return false; }
};

export function validateFacts(input: unknown, selectedIds: string[], release: boolean): string[] {
  if (!Array.isArray(input)) return ['Facts must be an array'];
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const fact of input) {
    if (!isRecord(fact) || typeof fact.id !== 'string') { errors.push('Invalid fact record'); continue; }
    if (ids.has(fact.id)) errors.push(`Duplicate fact: ${fact.id}`);
    ids.add(fact.id);
    if (!localized(fact.title) || !localized(fact.body) || !strings(fact.communityIds) ||
      !strings(fact.sourceUrls) || !['draft', 'verified', 'approved'].includes(String(fact.reviewStatus))) {
      errors.push(`${fact.id}: invalid content schema`); continue;
    }
    if (fact.sourceUrls.some(url => !sourceUrl(url))) errors.push(`${fact.id}: invalid source URL`);
    if (fact.fictional !== true && fact.sourceUrls.length === 0) errors.push(`${fact.id}: real claims need a source`);
    if (selectedIds.includes(fact.id) && release) {
      if (fact.reviewStatus !== 'approved' || typeof fact.reviewer !== 'string' || !fact.reviewer.trim()) errors.push(`${fact.id}: release needs approved content and a reviewer`);
      if (fact.sourceUrls.length === 0) errors.push(`${fact.id}: release needs a source`);
      if (fact.fictional === true) errors.push(`${fact.id}: fictional demo content cannot be released as cultural learning`);
    }
  }
  for (const id of selectedIds) if (!ids.has(id)) errors.push(`Selected fact missing: ${id}`);
  return errors;
}
