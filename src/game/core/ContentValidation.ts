const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const nonempty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const localized = (value: unknown) => isRecord(value) && nonempty(value.vi) && (value.en === undefined || nonempty(value.en));
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(nonempty);
const reviewStatus = (value: unknown) => typeof value === 'string' && ['draft', 'verified', 'approved'].includes(value);
export const sourceUrl = (url: unknown) => {
  if (!nonempty(url)) return false;
  try { return ['http:', 'https:'].includes(new URL(url).protocol); } catch { return false; }
};

export function validateFacts(input: unknown, selectedIds: string[], release: boolean): string[] {
  if (!Array.isArray(input)) return ['Facts must be an array'];
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const fact of input) {
    if (!isRecord(fact) || !nonempty(fact.id)) { errors.push('Invalid fact record'); continue; }
    if (ids.has(fact.id)) errors.push(`Duplicate fact: ${fact.id}`);
    ids.add(fact.id);
    if (!localized(fact.title) || !localized(fact.body) || !strings(fact.communityIds) ||
      !strings(fact.sourceUrls) || !reviewStatus(fact.reviewStatus) ||
      (fact.permittedAssetIds !== undefined && !strings(fact.permittedAssetIds)) ||
      (fact.fictional !== undefined && typeof fact.fictional !== 'boolean') ||
      (fact.reviewer !== undefined && !nonempty(fact.reviewer)) ||
      (fact.context !== undefined && (!isRecord(fact.context) ||
        (fact.context.place !== undefined && !nonempty(fact.context.place)) ||
        (fact.context.period !== undefined && !nonempty(fact.context.period)) ||
        (fact.context.qualifiers !== undefined && !strings(fact.context.qualifiers))))) {
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

export function validateContentBundle(input: unknown, release: boolean): string[] {
  if (!isRecord(input)) return ['Content bundle must be an object'];
  const errors: string[] = [];
  const records = (value: unknown, label: string): Record<string, unknown>[] => {
    if (!Array.isArray(value)) { errors.push(`${label} must be an array`); return []; }
    const ids = new Set<string>();
    return value.filter(record => {
      if (!isRecord(record) || !nonempty(record.id)) { errors.push(`Invalid ${label} record`); return false; }
      if (ids.has(record.id)) errors.push(`Duplicate ${label}: ${record.id}`);
      ids.add(record.id);
      return true;
    });
  };
  const stations = records(input.stations, 'station');
  const communities = records(input.communities, 'community');
  const assets = records(input.assets, 'asset');
  const selected: string[] = [];
  for (const station of stations) {
    if (![station.sceneKey, station.titleKey, station.objectiveKey, station.symbol].every(nonempty) ||
      !strings(station.factIds) || typeof station.enabled !== 'boolean' || typeof station.requiredInPresentation !== 'boolean' ||
      typeof station.estimatedSeconds !== 'number' || !Number.isFinite(station.estimatedSeconds) || station.estimatedSeconds <= 0 ||
      !isRecord(station.portal) || typeof station.portal.x !== 'number' || typeof station.portal.y !== 'number' ||
      !Number.isFinite(station.portal.x) || !Number.isFinite(station.portal.y) || station.portal.x < 0 || station.portal.y < 0) {
      errors.push(`${station.id}: invalid station schema`);
    }
    if (station.enabled === true && strings(station.factIds)) {
      if (!station.factIds.length) errors.push(`${station.id}: enabled activity needs a learning fact`);
      selected.push(...station.factIds);
    }
  }
  errors.push(...validateFacts(input.facts, selected, release));
  for (const community of communities) {
    if (!(nonempty(community.displayName) || localized(community.displayName)) ||
      !(nonempty(community.description) || localized(community.description)) ||
      !strings(community.sourceUrls) || !community.sourceUrls.length || !community.sourceUrls.every(sourceUrl) ||
      !reviewStatus(community.reviewStatus) ||
      (community.alternateNames !== undefined && !strings(community.alternateNames)) ||
      (community.places !== undefined && !strings(community.places))) errors.push(`${community.id}: invalid community schema`);
    if (release && community.reviewStatus !== 'approved') errors.push(`${community.id}: community needs approval`);
  }
  for (const asset of assets) {
    if (![asset.path, asset.creator, asset.license, asset.attribution, asset.allowedUse].every(nonempty) || !reviewStatus(asset.reviewStatus) ||
      (asset.paths !== undefined && !strings(asset.paths)) ||
      (asset.sourceUrls !== undefined && (!strings(asset.sourceUrls) || !asset.sourceUrls.every(sourceUrl)))) errors.push(`${asset.id}: invalid asset attribution`);
    if (release && asset.reviewStatus !== 'approved') errors.push(`${asset.id}: asset permission needs approval`);
  }
  if (Array.isArray(input.facts)) for (const fact of input.facts) {
    if (!isRecord(fact)) continue;
    if (strings(fact.communityIds)) for (const id of fact.communityIds) {
      if (!communities.some(community => community.id === id)) errors.push(`${fact.id}: unknown community ${id}`);
    }
    if (strings(fact.permittedAssetIds)) for (const id of fact.permittedAssetIds) {
      if (!assets.some(asset => asset.id === id)) errors.push(`${fact.id}: unknown asset ${id}`);
    }
  }
  return errors;
}
