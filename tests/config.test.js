import test from 'node:test';
import assert from 'node:assert/strict';
import { globToRegExp } from '../src/config.js';
import { validateConfig } from '../src/validate.js';

const catalog = {
  version: 1,
  rules: [
    {
      id: 'a11y.visible-focus',
      category: 'a11y',
      title: 'Keep focus visible',
      severity: 'error',
      appliesTo: ['*'],
      instruction: 'Do not remove visible focus without a replacement.'
    }
  ]
};

function validConfig(overrides = {}) {
  return {
    version: 1,
    profile: 'marketing',
    suppressions: [
      {
        rule: 'a11y.visible-focus',
        files: ['src/**/*.css'],
        reason: 'A custom focus ring is injected by the component runtime.',
        approvedBy: 'design-systems',
        expires: '2099-01-01'
      }
    ],
    ...overrides
  };
}

test('glob matcher supports project-relative double-star patterns', () => {
  const matcher = globToRegExp('src/**/*.css');
  assert.equal(matcher.test('src/app.css'), true);
  assert.equal(matcher.test('src/components/button.css'), true);
  assert.equal(matcher.test('test/button.css'), false);
});

test('config validation accepts justified scoped suppressions', () => {
  const config = validateConfig(validConfig(), catalog, {
    referenceDate: new Date('2026-07-17T00:00:00.000Z')
  });
  assert.equal(config.suppressions.length, 1);
  assert.equal(config.suppressions[0].rule, 'a11y.visible-focus');
});

test('config validation rejects unknown rules', () => {
  const config = validConfig();
  config.suppressions[0].rule = 'a11y.invented-rule';
  assert.throws(
    () => validateConfig(config, catalog),
    /references unknown rule/
  );
});

test('config validation rejects expired suppressions', () => {
  const config = validConfig();
  config.suppressions[0].expires = '2026-07-17';
  assert.throws(
    () =>
      validateConfig(config, catalog, {
        referenceDate: new Date('2026-07-17T12:00:00.000Z')
      }),
    /expired on 2026-07-17/
  );
});

test('config validation rejects weak rationale and project-root escape', () => {
  const weak = validConfig();
  weak.suppressions[0].reason = 'because';
  assert.throws(() => validateConfig(weak, catalog), /at least 12 characters/);

  const escaped = validConfig();
  escaped.suppressions[0].files = ['../outside.css'];
  assert.throws(() => validateConfig(escaped, catalog), /must not escape/);
});

test('config validation rejects duplicate file patterns', () => {
  const config = validConfig();
  config.suppressions[0].files = ['src/**/*.css', 'src/**/*.css'];
  assert.throws(() => validateConfig(config, catalog), /duplicate patterns/);
});
