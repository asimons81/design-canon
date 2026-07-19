import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));
const ADR_PATH = join(ROOT, '..', 'docs', 'decisions', 'ADR-002-browser-assisted-analysis-architecture.md');
const PACKAGE_PATH = join(ROOT, '..', 'package.json');
const CATALOG_PATH = join(ROOT, '..', 'rules', 'core.json');

async function readAdr() {
  return readFile(ADR_PATH, 'utf8');
}

test('ADR-002 is accepted and records the architecture and implementation PRs', async () => {
  const text = await readAdr();
  assert.match(text, /\*\*Status:\*\* Accepted/);
  assert.match(text, /\*\*PR:\*\* #18/);
  assert.match(text, /\*\*Implemented by:\*\* PR #19, merged as `b856b00`/);
  assert.match(text, /\*\*Extends:\*\* ADR-001/);
});

test('ADR-002 fixes the execution-mode contract', async () => {
  const text = await readAdr();
  assert.match(text, /--mode static\|auto\|browser/);
  assert.match(text, /browser\.mode/);
  assert.match(text, /exit code `3`/);
});

test('ADR-002 pins optional Playwright consistently with package metadata', async () => {
  const text = await readAdr();
  const pkg = JSON.parse(await readFile(PACKAGE_PATH, 'utf8'));
  assert.equal(pkg.optionalDependencies?.playwright, '1.61.1');
  assert.match(text, /Playwright `1\.61\.1`/);
  assert.match(text, /npx playwright install chromium/);
});

test('ADR-002 requires isolated contexts and one Chromium process per operation', async () => {
  const text = await readAdr();
  assert.match(text, /one browser process per lint operation/);
  assert.match(text, /isolated context per page/);
  assert.match(text, /close page and context in `finally`/);
});

test('ADR-002 records deterministic viewports and configurable rendering state', async () => {
  const text = await readAdr();
  assert.match(text, /desktop: 1440 x 900/);
  assert.match(text, /mobile: 390 x 844/);
  assert.match(text, /color-scheme/);
  assert.match(text, /JavaScript/);
});

test('ADR-002 defines hard operation deadlines and four analysis statuses', async () => {
  const text = await readAdr();
  assert.match(text, /hard operation deadline/);
  assert.match(text, /never-resolving analyzers return failed analysis records/);
  for (const status of ['confirmed', 'indeterminate', 'skipped', 'failed']) {
    assert.match(text, new RegExp('`' + status + '`'));
  }
});

test('ADR-002 keeps browser operational records separate from findings', async () => {
  const text = await readAdr();
  assert.match(text, /Only `confirmed` may support a production accessibility finding/);
  assert.match(text, /not suppressible findings/);
  assert.match(text, /never become confirmed accessibility findings/);
});

test('ADR-002 preserves the production-rule sequence without shipping F019 or touch targets', async () => {
  const text = await readAdr();
  const catalog = JSON.parse(await readFile(CATALOG_PATH, 'utf8'));
  const serialized = JSON.stringify(catalog);
  assert.match(text, /rendered text contrast/);
  assert.match(text, /rendered touch targets/);
  assert.doesNotMatch(serialized, /accessibility\.text-contrast-minimum/);
  assert.doesNotMatch(serialized, /mobile\.touch-target-size/);
});
