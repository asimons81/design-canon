import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { lintPath } from '../src/lint.js';

const fixturesDirectory = fileURLToPath(
  new URL('../fixtures/patterns/', import.meta.url)
);

const expectations = {
  F001: {
    profile: 'marketing',
    findings: {
      'typography.generic-primary-font': 1,
      'color.purple-gradient-default': 1,
      'radius.everything-pill': 1,
      'motion.transition-all': 1,
      'depth.shadow-soup': 1,
      'copy.generic-hero': 2
    }
  },
  F002: {
    profile: 'marketing',
    findings: { 'typography.generic-primary-font': 1 }
  },
  F003: {
    profile: 'marketing',
    findings: {
      'radius.everything-pill': 1,
      'typography.generic-primary-font': 1,
      'a11y.visible-focus': 1,
      'forms.input-labels-required': 1
    }
  },
  F004: {
    profile: 'marketing',
    findings: {
      'typography.generic-primary-font': 1,
      'radius.everything-pill': 8,
      'depth.shadow-soup': 3
    }
  },
  F005: {
    profile: 'marketing',
    findings: {
      'typography.generic-primary-font': 1,
      'depth.shadow-soup': 8
    }
  },
  F006: {
    profile: 'marketing',
    findings: {
      'copy.generic-hero': 17,
      'typography.generic-primary-font': 1
    }
  },
  F007: {
    profile: 'marketing',
    findings: {
      'a11y.visible-focus': 23,
      'typography.generic-primary-font': 1,
      'motion.transition-all': 1
    }
  },
  F008: {
    profile: 'marketing',
    findings: {
      'motion.transition-all': 30,
      'typography.generic-primary-font': 1
    }
  },
  F009: {
    profile: 'marketing',
    findings: { 'typography.generic-primary-font': 1 }
  },
  F010: {
    profile: 'editorial',
    findings: { 'typography.generic-primary-font': 1 }
  },
  F011: {
    profile: 'product-app',
    findings: {
      'radius.everything-pill': 3,
      'forms.input-labels-required': 1
    }
  },
  F012: {
    profile: 'marketing',
    findings: {
      'typography.generic-primary-font': 1,
      'radius.everything-pill': 1
    }
  },
  F013: {
    profile: 'marketing',
    findings: { 'typography.generic-primary-font': 1 }
  },
  F014: {
    profile: 'marketing',
    findings: {
      'typography.generic-primary-font': 1,
      'motion.transition-all': 5,
      'depth.shadow-soup': 2
    }
  },
  F015: {
    profile: 'marketing',
    findings: {
      'typography.generic-primary-font': 1,
      'radius.everything-pill': 1,
      'forms.input-labels-required': 1
    }
  }
};

const F016_EXPECTATION = {
  profile: 'marketing',
  findings: {
    'forms.input-labels-required': 5
  }
};

for (const [id, expectation] of Object.entries(expectations)) {
  test(`${id} produces the documented deterministic findings`, async () => {
    const result = await lintPath({
      path: `${fixturesDirectory}${id}-index.html`,
      profile: expectation.profile
    });

    const actual = {};
    for (const finding of result.findings) {
      actual[finding.rule] = (actual[finding.rule] ?? 0) + 1;
    }

    assert.deepEqual(actual, expectation.findings);
  });
}

test('F016 produces the documented deterministic findings', async () => {
  const result = await lintPath({
    path: `${fixturesDirectory}F016-index.html`,
    profile: F016_EXPECTATION.profile
  });

  const actual = {};
  for (const finding of result.findings) {
    actual[finding.rule] = (actual[finding.rule] ?? 0) + 1;
  }

  assert.deepEqual(actual, F016_EXPECTATION.findings);
});
