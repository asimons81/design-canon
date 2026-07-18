import test from 'node:test';
import assert from 'node:assert/strict';
import { lintPath } from '../src/lint.js';

test('linter reports mechanical design violations', async () => {
  const result = await lintPath({ path: './examples/sloppy', profile: 'marketing' });
  const rules = new Set(result.findings.map((finding) => finding.rule));
  assert.equal(rules.has('a11y.visible-focus'), true);
  assert.equal(rules.has('color.purple-gradient-default'), true);
  assert.equal(rules.has('copy.generic-hero'), true);
  assert.ok(result.errors >= 1);
});
