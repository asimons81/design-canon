/**
 * Deterministic regression for F020 nested-interactive ancestor-chain detection.
 *
 * The outer target's center lands on a decorative span that completely covers
 * an inner button. A topmost-only implementation sees the span as decorative
 * and incorrectly confirms the outer target. Correct behavior walks
 * span -> button -> outer target and detects the interactive button.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { lintPath } from '../src/lint.js';
import { detectBrowserCapability, resetCapabilityCache } from '../src/browser/capability.js';

let chromiumAvailable = false;

test('setup: detect browser capability for nested chain regression', async () => {
  resetCapabilityCache();
  const capability = await detectBrowserCapability();
  chromiumAvailable = capability.chromiumAvailable;
});

test('F020 nested chain: decorative topmost child still exposes interactive ancestor', async () => {
  if (!chromiumAvailable) return;

  const result = await lintPath({
    path: 'fixtures/touch-target/indeterminate/nested-decorative-child.html',
    profile: 'product-app',
    mode: 'browser',
    referenceDate: new Date('2026-07-19T00:00:00.000Z')
  });

  const records = (result.analysisRecords || []).filter(
    (record) => record.ruleId === 'mobile.touch-target-minimum'
  );
  const findings = (result.findings || []).filter(
    (finding) => finding.rule === 'mobile.touch-target-minimum'
  );

  assert.ok(records.length >= 1, 'Expected at least one F020 analysis record');
  assert.equal(findings.length, 0, 'Nested interactive targets must not produce F020 findings');

  const outerSamples = records.flatMap((record) => record.samples || []).filter(
    (sample) => sample.selector === '#outer-target'
  );

  assert.ok(outerSamples.length >= 1, 'Expected the specific #outer-target sample');

  for (const sample of outerSamples) {
    assert.equal(sample.width, 100, 'outer target width');
    assert.equal(sample.height, 100, 'outer target height');
    assert.equal(sample.status, 'indeterminate', 'outer target status');
    assert.equal(
      sample.indeterminateReason,
      'nested-interactive-target',
      'outer target must be classified through the span -> button -> target chain'
    );
    assert.equal(sample.outcome, undefined, 'indeterminate outer target must not have an outcome');
    assert.equal(
      Object.hasOwn(sample, 'outcome'),
      false,
      'indeterminate outer target must omit the outcome field'
    );
  }

  for (const record of records) {
    const measurements = record.measurements;
    assert.ok(measurements, 'Expected F020 measurements');
    assert.equal(measurements.checkedTargets, 2, 'checkedTargets');
    assert.equal(measurements.passingTargets, 1, 'passingTargets');
    assert.equal(measurements.spacingExceptionTargets, 0, 'spacingExceptionTargets');
    assert.equal(measurements.inlineExceptionTargets, 0, 'inlineExceptionTargets');
    assert.equal(measurements.userAgentExceptionTargets, 0, 'userAgentExceptionTargets');
    assert.equal(measurements.violatingTargets, 0, 'violatingTargets');
    assert.equal(measurements.indeterminateTargets, 1, 'indeterminateTargets');
    assert.equal(measurements.excludedTargets, 0, 'excludedTargets');

    const bucketTotal = measurements.passingTargets +
      measurements.spacingExceptionTargets +
      measurements.inlineExceptionTargets +
      measurements.userAgentExceptionTargets +
      measurements.violatingTargets +
      measurements.indeterminateTargets +
      measurements.excludedTargets;

    assert.equal(bucketTotal, measurements.checkedTargets, 'measurement buckets must be exclusive');
  }
});
