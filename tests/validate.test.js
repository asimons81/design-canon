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

test('valid pattern detector passes', () => {
  const rule = validRule({
    detect: {
      message: 'Pattern detected.',
      patterns: [{ source: 'test', flags: 'gi' }]
    }
  });
  assert.doesNotThrow(() => validateCatalog({ version: 1, rules: [rule] }));
});

test('valid browser detector passes', () => {
  const rule = validRule({
    detect: {
      message: 'Browser check.',
      browserAnalyzer: { id: 'test.analyzer', extensions: ['.html'] }
    }
  });
  assert.doesNotThrow(() => validateCatalog({ version: 1, rules: [rule] }));
});

test('detector rejects neither patterns nor browserAnalyzer', () => {
  const rule = validRule({
    detect: { message: 'Missing detector.' }
  });
  assert.throws(
    () => validateCatalog({ version: 1, rules: [rule] }),
    /must contain either patterns or browserAnalyzer/
  );
});

test('detector rejects both patterns and browserAnalyzer', () => {
  const rule = validRule({
    detect: {
      message: 'Both.',
      patterns: [{ source: 'test' }],
      browserAnalyzer: { id: 'test.a', extensions: ['.html'] }
    }
  });
  assert.throws(
    () => validateCatalog({ version: 1, rules: [rule] }),
    /must not contain both/
  );
});

test('browserAnalyzer rejects empty analyzer ID', () => {
  const rule = validRule({
    detect: {
      message: 'Empty ID.',
      browserAnalyzer: { id: '', extensions: ['.html'] }
    }
  });
  assert.throws(
    () => validateCatalog({ version: 1, rules: [rule] }),
    /non-empty/
  );
});

test('browserAnalyzer rejects empty extension list', () => {
  const rule = validRule({
    detect: {
      message: 'Empty extensions.',
      browserAnalyzer: { id: 'test.a', extensions: [] }
    }
  });
  assert.throws(
    () => validateCatalog({ version: 1, rules: [rule] }),
    /non-empty array/
  );
});

test('browserAnalyzer rejects malformed extension', () => {
  const rule = validRule({
    detect: {
      message: 'Bad ext.',
      browserAnalyzer: { id: 'test.a', extensions: ['html'] }
    }
  });
  assert.throws(
    () => validateCatalog({ version: 1, rules: [rule] }),
    /must start with a dot/
  );
});

test('browserAnalyzer rejects unknown properties', () => {
  const rule = validRule({
    detect: {
      message: 'Bad prop.',
      browserAnalyzer: { id: 'test.a', extensions: ['.html'], unknownProp: true }
    }
  });
  assert.throws(
    () => validateCatalog({ version: 1, rules: [rule] }),
    /unknown property/
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
