// Generates app-seed.html, the page app.vault-it.co/eligent serves. It lifts the release app's own demo loader
// (loadDemoData and its guards) out of the release index.html verbatim, so the seeded persona is always the app's own.
// Usage: node build-seed.mjs [path/to/release/index.html]   (default: git show origin/release/pioneer-v2:index.html)
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = process.argv[2] ? readFileSync(process.argv[2], 'utf8') : execSync('git show origin/release/pioneer-v2:index.html', { cwd: here, maxBuffer: 64 * 1024 * 1024 }).toString('utf8');
const start = src.indexOf('var _VI_SAVED_KEYS = [');
const end = src.indexOf('function clearDemoData() {');
if (start < 0 || end < 0 || end < start) throw new Error('could not find the demo loader in the release index.html');
const lifted = src.slice(start, end).trimEnd();
for (const fn of ['function _viKeyHasData', 'function _viDeviceHasSavedData', 'function _demoPut', 'function loadDemoData']) {
  if (!lifted.includes(fn)) throw new Error('lifted block is missing ' + fn);
}

const template = readFileSync(join(here, 'app-seed.template.html'), 'utf8');
const out = template.replace('/*__LIFTED_FROM_RELEASE__*/', lifted);
writeFileSync(join(here, 'app-seed.html'), out);
console.log('app-seed.html written:', out.length, 'bytes, lifted', lifted.split('\n').length, 'lines from the release loader');
