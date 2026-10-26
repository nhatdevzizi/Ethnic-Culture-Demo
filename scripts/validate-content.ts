import { readFileSync } from 'node:fs';
import { validateContentBundle } from '../src/game/core/ContentValidation';
const read = (name: string): unknown => {
  try { return JSON.parse(readFileSync(new URL(`../src/content/${name}.json`, import.meta.url), 'utf8')); }
  catch { errors.push(`${name}: content file could not be read as JSON`); return undefined; }
};
const release = process.argv.includes('--release');
const errors: string[] = [];
const stations = read('minigames');
const facts = read('facts');
const communities = read('communities');
const assets = read('assets-manifest');
errors.push(...validateContentBundle({ stations, facts, communities, assets }, release));
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`Content validation passed (${release ? 'release' : 'DEMO / UNVERIFIED CONTENT'}).`);
