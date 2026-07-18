import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertSafeProfileName,
  validateCatalog,
  validateProfile
} from '../src/validate.js';

function validRule(overrides = {}) {
  return {
    id: 'layout.intentional-grid',
    category: 'layout',
    title: 'Use an intentional grid',
    severity: 'warning',
    appliesTo: ['*'],
    instruction: 'Choose a grid that supports the content.',
    ...overrides
  };
}

test('profile names reject path traversal and unsafe characters', () => {
  for (const value of ['../secret', 'marketing/other', 'Marketing', 'a--b', '']) {
    assert.throws(() => assertSafeProfileName(value), /Invalid profile name/);
  }
  assert.equal(assertSafeProfileName('product-app'), 'product-app');
});

test('catalog validation rejects duplicate rule ids', () => {
  const rule = validRule();
  assert.throws(
    () => validateCatalog({ version: 1, rules: [rule, { ...rule }] }),
    /duplicate rule id/
  );
});

test('catalog validation rejects invalid regex data before linting', () => {
  assert.throws(
    () =>
      validateCatalog({
        version: 1,
        rules: [
          validRule({
            detect: {
              message: 'broken',
              patterns: [{ source: '(', flags: 'gi' }]
            }
          })
        ]
      }),
    /invalid detector regex/
  );
});

test('profile validation requires filename and id agreement', () => {
  assert.throws(
    () =>
      validateProfile(
        {
          id: 'marketing',
          name: 'Marketing',
          intent: 'Make the message clear.'
        },
        'editorial'
      ),
    /does not match filename/
  );
});
