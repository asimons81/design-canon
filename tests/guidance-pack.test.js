import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { compileCommand } from '../src/compile.js';
import { loadCatalog, loadProfile } from '../src/io.js';
import { selectRules } from '../src/select.js';
import { validateCatalog } from '../src/validate.js';

const GUIDANCE_IDS = [
  'layout.visual-focal-point',
  'hierarchy.button-visual-levels',
  'states.empty-state-guidance',
  'states.specific-error-messages',
  'mobile.safe-area-viewport'
];

test('effective catalog merges core and guidance packs deterministically', async () => {
  const catalog = await loadCatalog();
  assert.equal(catalog.version, 1);
  assert.equal(catalog.rules.length, 23);
  assert.deepEqual(catalog.rules.slice(-5).map((rule) => rule.id), GUIDANCE_IDS);
  assert.equal(new Set(catalog.rules.map((rule) => rule.id)).size, 23);
});

test('guidance pack validates independently and contains no fake detectors', async () => {
  const pack = validateCatalog(JSON.parse(await readFile('rules/guidance.json', 'utf8')));
  assert.equal(pack.rules.length, 5);
  assert.deepEqual(pack.rules.map((rule) => rule.id), GUIDANCE_IDS);
  for (const rule of pack.rules) {
    assert.equal(rule.detect, undefined, `${rule.id} must remain guidance-only`);
    assert.ok(rule.rationale?.length > 20, `${rule.id} needs a rationale`);
    assert.ok(rule.verify?.length >= 3, `${rule.id} needs explicit review checks`);
  }
});

test('marketing selects focal, action-level, and safe-area guidance', async () => {
  const [catalog, profile] = await Promise.all([
    loadCatalog(),
    loadProfile('marketing')
  ]);
  const selected = new Set(selectRules(catalog, profile).map((rule) => rule.id));
  assert.equal(selected.has('layout.visual-focal-point'), true);
  assert.equal(selected.has('hierarchy.button-visual-levels'), true);
  assert.equal(selected.has('mobile.safe-area-viewport'), true);
  assert.equal(selected.has('states.empty-state-guidance'), false);
  assert.equal(selected.has('states.specific-error-messages'), false);
});

test('product-app selects all five contextual guidance rules', async () => {
  const [catalog, profile] = await Promise.all([
    loadCatalog(),
    loadProfile('product-app')
  ]);
  const selected = new Set(selectRules(catalog, profile).map((rule) => rule.id));
  for (const ruleId of GUIDANCE_IDS) {
    assert.equal(selected.has(ruleId), true, `product-app should select ${ruleId}`);
  }
});

test('editorial does not inherit unrelated contextual guidance', async () => {
  const [catalog, profile] = await Promise.all([
    loadCatalog(),
    loadProfile('editorial')
  ]);
  const selected = new Set(selectRules(catalog, profile).map((rule) => rule.id));
  for (const ruleId of GUIDANCE_IDS) {
    assert.equal(selected.has(ruleId), false, `editorial should not select ${ruleId}`);
  }
});

test('compiled product policy includes accepted guidance and no detector claims', async () => {
  const result = await compileCommand({
    profile: 'product-app',
    target: 'agents',
    output: null
  });
  for (const title of [
    'Establish one clear visual entry point',
    'Give actions distinct visual levels',
    'Make empty states actionable',
    'Make errors specific and recoverable',
    'Protect edge controls with mobile safe areas'
  ]) {
    assert.match(result.content, new RegExp(title));
  }
  assert.doesNotMatch(result.content, /automatic finding|detector proves/i);
});

test('guidance pack is available through the documented package export', async () => {
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
  assert.equal(
    packageJson.exports['./rule-packs/guidance'],
    './rules/guidance.json'
  );
});
