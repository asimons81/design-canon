import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, loadProfile } from '../src/io.js';
import { selectRules } from '../src/select.js';
import { renderCompiled } from '../src/compile.js';

test('marketing compilation includes marketing rules and omits product-only rules', async () => {
  const catalog = await loadCatalog();
  const profile = await loadProfile('marketing');
  const rules = selectRules(catalog, profile);
  const ids = new Set(rules.map((rule) => rule.id));
  assert.equal(ids.has('marketing.single-primary-action'), true);
  assert.equal(ids.has('product-app.density-by-task'), false);

  const output = renderCompiled({ profile, rules, target: 'design' });
  assert.match(output, /Marketing and Landing Pages/);
  assert.match(output, /Protect one primary action/);
});

test('skill target includes valid frontmatter', async () => {
  const catalog = await loadCatalog();
  const profile = await loadProfile('editorial');
  const output = renderCompiled({ profile, rules: selectRules(catalog, profile), target: 'skill' });
  assert.match(output, /^---\nname: design-canon-editorial/m);
  assert.match(output, /Protect reading measure/);
});
