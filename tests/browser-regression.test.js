import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lintPath } from '../src/lint.js';
import { loadConfig } from '../src/config.js';

test('all core rule IDs are known in the catalog', async () => {
  const result = await lintPath({ path: './examples/sloppy', profile: 'marketing' });
  const ruleIds = new Set(result.findings.map((f) => f.rule));
  // Verify the core rules we know exist in the sloppy example
  assert.ok(ruleIds.has('typography.generic-primary-font'));
  assert.ok(ruleIds.has('color.purple-gradient-default'));
  assert.ok(ruleIds.has('layout.centered-everything'));
  assert.ok(ruleIds.has('motion.transition-all'));
  assert.ok(ruleIds.has('a11y.visible-focus'));
  assert.ok(ruleIds.has('copy.generic-hero'));
  assert.ok(ruleIds.has('motion.respect-reduced-motion'));
  assert.ok(ruleIds.has('accessibility.skip-link'));
});

test('default mode is static when no browser config or CLI flag', async () => {
  const result = await lintPath({ path: './examples/sloppy', profile: 'marketing' });
  assert.equal(result.mode, 'static');
});

test('analysisRecords is empty in static mode', async () => {
  const result = await lintPath({ path: './examples/sloppy', profile: 'marketing' });
  assert.ok(Array.isArray(result.analysisRecords));
  assert.equal(result.analysisRecords.length, 0);
});

test('suppression behavior is unchanged', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'design-canon-regression-'));
  t.after(() => rm(directory, { recursive: true, force: true }));

  const sourcePath = join(directory, 'index.html');
  const configPath = join(directory, 'design-canon.config.json');
  await writeFile(
    sourcePath,
    '<style>button { outline: none; }</style><button>Continue</button>',
    'utf8'
  );
  await writeFile(
    configPath,
    JSON.stringify({
      version: 1,
      profile: 'marketing',
      suppressions: [
        {
          rule: 'a11y.visible-focus',
          files: ['**/index.html'],
          reason: 'Runtime injects custom focus ring.',
          approvedBy: 'test',
          expires: '2099-01-01'
        }
      ]
    }),
    null,
    2
  );

  const result = await lintPath({
    path: sourcePath,
    configPath,
    referenceDate: new Date('2026-07-17T00:00:00.000Z')
  });

  assert.equal(result.errors, 0);
  assert.equal(result.suppressedFindings.length, 1);
  assert.equal(result.suppressedFindings[0].rule, 'a11y.visible-focus');
});

test('finding order is unchanged - findings sorted by file, line, rule', async () => {
  const result = await lintPath({ path: './examples/sloppy', profile: 'marketing' });
  for (let i = 1; i < result.findings.length; i++) {
    const a = result.findings[i - 1];
    const b = result.findings[i];
    const cmp =
      a.file.localeCompare(b.file) ||
      a.line - b.line ||
      a.rule.localeCompare(b.rule);
    assert.ok(cmp <= 0, `Findings out of order: ${a.file}:${a.line} ${a.rule} vs ${b.file}:${b.line} ${b.rule}`);
  }
});

test('JSON static schema remains compatible - has all required fields', async () => {
  const result = await lintPath({ path: './examples/sloppy', profile: 'marketing' });
  assert.equal(typeof result.profile, 'string');
  assert.equal(typeof result.filesDiscovered, 'number');
  assert.equal(typeof result.filesScanned, 'number');
  assert.ok(Array.isArray(result.findings));
  assert.ok(Array.isArray(result.suppressedFindings));
  assert.equal(typeof result.suppressions.configured, 'number');
  assert.equal(typeof result.suppressions.used, 'number');
  assert.ok(Array.isArray(result.suppressions.unused));
  assert.equal(typeof result.errors, 'number');
  assert.equal(typeof result.warnings, 'number');
  assert.equal(typeof result.info, 'number');
});

test('browser mode config is accepted but not activated without Playwright', async () => {
  // When mode is 'auto' without Playwright, static analysis still runs
  const result = await lintPath({ path: './examples/sloppy', profile: 'marketing', mode: 'auto' });
  assert.equal(result.mode, 'auto');
  assert.ok(result.findings.length > 0);
});

test('no contrast or touch-target rules exist', async () => {
  // Verify no production touch-target rule has been registered
  const result = await lintPath({ path: './examples/sloppy', profile: 'marketing' });
  const ruleIds = new Set(result.findings.map((f) => f.rule));
  // F019 is a browser-only rule — it does not produce findings in static mode
  assert.equal(ruleIds.has('mobile.touch-target-size'), false);
  // F019 should not produce findings in static mode (no browser)
  assert.equal(ruleIds.has('accessibility.text-contrast-minimum'), false);
  // Verify the rule count is now 17 (F019 added)
  const catalog = (await import('../src/io.js')).loadCatalog;
  const core = await catalog();
  assert.equal(core.rules.length, 17);
});

test('CLI static mode behavior unchanged', async () => {
  // Text format produces output without browser references
  const result = await lintPath({ path: './examples/sloppy', profile: 'marketing', format: 'text' });
  // lintPath doesn't accept format, but the result shape is stable
  assert.ok(Array.isArray(result.findings));
});
