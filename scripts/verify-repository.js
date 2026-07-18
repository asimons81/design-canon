import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { loadCatalog, listProfiles, loadProfile } from '../src/io.js';

const REQUIRED_PACKAGE_FILES = [
  'bin/',
  'src/',
  'rules/',
  'profiles/',
  'schema/',
  'skills/',
  'README.md',
  'LICENSE',
  'SECURITY.md',
  'CHANGELOG.md'
];

const packageJson = JSON.parse(await readFile('package.json', 'utf8'));

assert.equal(packageJson.type, 'module');
assert.equal(packageJson.license, 'MIT');
assert.equal(packageJson.private, undefined);
assert.equal(packageJson.engines?.node, '>=20');
assert.equal(packageJson.publishConfig?.access, 'public');
assert.equal(packageJson.publishConfig?.provenance, true);
assert.deepEqual(packageJson.files, REQUIRED_PACKAGE_FILES);
assert.equal(packageJson.repository?.url, 'git+https://github.com/asimons81/design-canon.git');
assert.equal(packageJson.bin?.['design-canon'], './bin/design-canon.js');

await access('bin/design-canon.js', constants.R_OK);
await access('LICENSE', constants.R_OK);
await access('SECURITY.md', constants.R_OK);

const catalog = await loadCatalog();
assert.ok(catalog.rules.length >= 10, 'Rule catalog unexpectedly small.');

const profileNames = await listProfiles();
assert.deepEqual(profileNames, ['editorial', 'marketing', 'product-app']);
for (const profileName of profileNames) {
  await loadProfile(profileName);
}

console.log(
  `Repository verification passed: ${catalog.rules.length} rules, ${profileNames.length} profiles.`
);
