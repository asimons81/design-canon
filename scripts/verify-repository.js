import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';
import { loadCatalog, listProfiles, loadProfile } from '../src/io.js';

const REQUIRED_PACKAGE_FILES = [
  'bin/',
  'src/',
  'rules/',
  'profiles/',
  'schema/',
  'skills/',
  'docs/CONFIGURATION.md',
  'README.md',
  'LICENSE',
  'SECURITY.md',
  'CHANGELOG.md'
];

const REQUIRED_REPOSITORY_FILES = [
  '.editorconfig',
  '.gitattributes',
  '.github/CODEOWNERS',
  '.github/dependabot.yml',
  '.github/pull_request_template.md',
  '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/feature_request.yml',
  '.github/workflows/test.yml',
  '.github/workflows/codeql.yml',
  '.github/workflows/dependency-review.yml',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'docs/CONFIGURATION.md',
  'docs/RELEASING.md',
  'examples/config/design-canon.config.json',
  'schema/config.schema.json',
  'package-lock.json'
];

const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
const packageLock = JSON.parse(await readFile('package-lock.json', 'utf8'));

assert.equal(packageJson.type, 'module');
assert.equal(packageJson.license, 'MIT');
assert.equal(packageJson.private, undefined);
assert.equal(packageJson.engines?.node, '>=20');
assert.equal(packageJson.publishConfig?.access, 'public');
assert.equal(packageJson.publishConfig?.provenance, true);
assert.deepEqual(packageJson.files, REQUIRED_PACKAGE_FILES);
assert.equal(packageJson.repository?.url, 'git+https://github.com/asimons81/design-canon.git');
assert.equal(packageJson.bin?.['design-canon'], './bin/design-canon.js');
assert.equal(packageJson.exports?.['./config-schema'], './schema/config.schema.json');
assert.equal(packageJson.scripts?.prepack, 'npm run check && npm test');

assert.equal(packageLock.name, packageJson.name);
assert.equal(packageLock.version, packageJson.version);
assert.equal(packageLock.lockfileVersion, 3);
assert.equal(packageLock.packages?.['']?.name, packageJson.name);
assert.equal(packageLock.packages?.['']?.version, packageJson.version);

for (const path of REQUIRED_REPOSITORY_FILES) {
  await access(path, constants.R_OK);
}
await access('bin/design-canon.js', constants.R_OK);
await access('LICENSE', constants.R_OK);

const workflowDirectory = '.github/workflows';
const workflowFiles = (await readdir(workflowDirectory))
  .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
  .sort();
assert.ok(workflowFiles.length >= 3, 'Expected test, CodeQL, and dependency-review workflows.');

for (const workflowFile of workflowFiles) {
  const path = join(workflowDirectory, workflowFile);
  const content = await readFile(path, 'utf8');
  assert.doesNotMatch(content, /\bpull_request_target\s*:/, `${path} must not use pull_request_target.`);
  assert.doesNotMatch(content, /permissions\s*:\s*write-all/, `${path} must not grant write-all permissions.`);

  for (const match of content.matchAll(/^\s*uses:\s*([^\s#]+)(?:\s*#.*)?$/gm)) {
    const reference = match[1];
    if (reference.startsWith('./')) continue;
    const separator = reference.lastIndexOf('@');
    assert.ok(separator > 0, `${path} contains an action without a pinned reference: ${reference}`);
    const revision = reference.slice(separator + 1);
    assert.match(revision, /^[0-9a-f]{40}$/i, `${path} must pin ${reference} to a full commit SHA.`);
  }
}

const catalog = await loadCatalog();
assert.ok(catalog.rules.length >= 10, 'Rule catalog unexpectedly small.');

const profileNames = await listProfiles();
assert.deepEqual(profileNames, ['editorial', 'marketing', 'product-app']);
for (const profileName of profileNames) {
  await loadProfile(profileName);
}

console.log(
  `Repository verification passed: ${catalog.rules.length} rules, ${profileNames.length} profiles, ${workflowFiles.length} workflows.`
);
