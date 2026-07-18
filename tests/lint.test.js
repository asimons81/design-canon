import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lintPath } from '../src/lint.js';

test('linter reports mechanical design violations', async () => {
  const result = await lintPath({ path: './examples/sloppy', profile: 'marketing' });
  const rules = new Set(result.findings.map((finding) => finding.rule));
  assert.equal(rules.has('a11y.visible-focus'), true);
  assert.equal(rules.has('color.purple-gradient-default'), true);
  assert.equal(rules.has('copy.generic-hero'), true);
  assert.ok(result.errors >= 1);
});

test('linter preserves suppressed evidence and reports unused exceptions', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'design-canon-suppressions-'));
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
    JSON.stringify(
      {
        version: 1,
        profile: 'marketing',
        suppressions: [
          {
            rule: 'a11y.visible-focus',
            files: ['**/index.html'],
            reason: 'The runtime injects a documented custom focus ring.',
            approvedBy: 'design-systems',
            expires: '2099-01-01'
          },
          {
            rule: 'color.purple-gradient-default',
            files: ['**/index.html'],
            reason: 'Reserved for a future branded campaign treatment.',
            expires: '2099-01-01'
          }
        ]
      },
      null,
      2
    ),
    'utf8'
  );

  const result = await lintPath({
    path: sourcePath,
    configPath,
    referenceDate: new Date('2026-07-17T00:00:00.000Z')
  });

  assert.equal(result.profile, 'marketing');
  assert.equal(result.errors, 0);
  assert.equal(result.suppressedFindings.length, 1);
  assert.equal(result.suppressedFindings[0].rule, 'a11y.visible-focus');
  assert.match(result.suppressedFindings[0].suppression.reason, /custom focus ring/);
  assert.equal(result.suppressions.configured, 2);
  assert.equal(result.suppressions.used, 1);
  assert.equal(result.suppressions.unused.length, 1);
  assert.equal(
    result.suppressions.unused[0].rule,
    'color.purple-gradient-default'
  );
});
