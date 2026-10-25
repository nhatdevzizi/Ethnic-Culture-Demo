import { readFileSync } from 'node:fs';
import { validateFacts, sourceUrl } from '../src/game/core/ContentValidation';
const read = (name: string) => JSON.parse(readFileSync(new URL(`../src/content/${name}.json`, import.meta.url), 'utf8'));
const release = process.argv.includes('--release');
const stations = read('minigames');
const facts = read('facts');
const communities = read('communities');
const assets = read('assets-manifest');
const errors: string[] = [];
if (!Array.isArray(stations) || !Array.isArray(communities) || !Array.isArray(assets)) throw new Error('Content collections must be arrays');
const selected = stations.filter(s => s.enabled).flatMap(s => s.factIds);
errors.push(...validateFacts(facts, selected, release));
const ids = new Set<string>();
for (const station of stations) {
  if (ids.has(station.id)) errors.push(`Duplicate station ${station.id}`);
  ids.add(station.id);
  if (!station.id || !station.sceneKey || !station.titleKey || !station.objectiveKey || !Array.isArray(station.factIds) ||
    typeof station.enabled !== 'boolean' || !Number.isFinite(station.portal?.x) || !Number.isFinite(station.portal?.y)) errors.push('Invalid station schema');
  if (station.enabled && station.factIds.length === 0) errors.push(`${station.id}: enabled activity needs a learning fact`);
}
for (const community of communities) {
  if (!community.id || !community.displayName || !community.description || !Array.isArray(community.sourceUrls) ||
    !community.sourceUrls.length || !community.sourceUrls.every(sourceUrl)) errors.push('Invalid community record');
  if (release && community.reviewStatus !== 'approved') errors.push(`${community.id}: community needs approval`);
}
for (const fact of facts) {
  for (const id of fact.communityIds ?? []) if (!communities.some(c => c.id === id)) errors.push(`${fact.id}: unknown community ${id}`);
  for (const id of fact.permittedAssetIds ?? []) if (!assets.some(a => a.id === id)) errors.push(`${fact.id}: unknown asset ${id}`);
}
for (const asset of assets) {
  if (!asset.id || !asset.path || !asset.creator || !asset.license || !asset.attribution || !asset.allowedUse) errors.push('Invalid asset attribution');
  if (release && asset.reviewStatus !== 'approved') errors.push(`${asset.id}: asset permission needs approval`);
}
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`Content validation passed (${release ? 'release' : 'DEMO / UNVERIFIED CONTENT'}; ${selected.length} selected fact).`);
