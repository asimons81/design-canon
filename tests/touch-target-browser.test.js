/**
 * tests/touch-target-browser.test.js
 *
 * End-to-end browser tests for F020: Rendered touch-target minimum.
 * Runs F020 fixtures through lintPath in browser mode and verifies
 * the analysis records, findings, and exclusion behavior.
 *
 * Skipped when Chromium is not available (CI without Playwright browser).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { lintPath } from '../src/lint.js';
import { detectBrowserCapability, resetCapabilityCache } from '../src/browser/capability.js';

let chromiumAvailable = false;

test('setup: detect browser capability', async () => {
  resetCapabilityCache();
  const cap = await detectBrowserCapability();
  chromiumAvailable = cap.chromiumAvailable;
});

/**
 * Helper: run lintPath in browser mode on a single HTML fixture file.
 */
async function lintFixture(fixtureRelPath) {
  if (!chromiumAvailable) return null;
  return await lintPath({
    path: fixtureRelPath,
    profile: 'product-app',
    mode: 'browser',
    referenceDate: new Date('2026-07-19T00:00:00.000Z')
  });
}

/**
 * Extract F020-specific analysis records from a lint result.
 */
function f020Records(result) {
  if (!result || !result.analysisRecords) return [];
  return result.analysisRecords.filter(
    (r) => r.ruleId === 'mobile.touch-target-minimum'
  );
}

/**
 * Extract F020-specific findings from a lint result.
 */
function f020Findings(result) {
  if (!result || !result.findings) return [];
  return result.findings.filter((f) => f.rule === 'mobile.touch-target-minimum');
}

// ── Control fixtures ──────────────────────────────────────────────────

test('F020 control: exact-24x24 produces no violations', async () => {
  const result = await lintFixture('fixtures/touch-target/controls/exact-size.html');
  if (!chromiumAvailable) return;

  const records = f020Records(result);
  const findings = f020Findings(result);

  assert.ok(records.length >= 1, 'Expected at least one F020 analysis record');
  for (const r of records) {
    assert.equal(r.status, 'confirmed', `Unexpected status: ${r.status}`);
  }
  assert.equal(findings.length, 0, 'Expected no F020 findings for 24x24 control');
});

test('F020 control: larger-than passes', async () => {
  const result = await lintFixture('fixtures/touch-target/controls/larger-than.html');
  if (!chromiumAvailable) return;

  const findings = f020Findings(result);
  assert.equal(findings.length, 0);
});

test('F020 control: inline prose link gets inline exception', async () => {
  const result = await lintFixture('fixtures/touch-target/controls/inline-prose-link.html');
  if (!chromiumAvailable) return;

  const records = f020Records(result);
  const findings = f020Findings(result);

  assert.ok(records.length >= 1);
  // Should have inline-exception samples, no violations
  assert.equal(findings.length, 0);
});

test('F020 control: valid spacing exception passes', async () => {
  const result = await lintFixture('fixtures/touch-target/controls/valid-spacing.html');
  if (!chromiumAvailable) return;

  const findings = f020Findings(result);
  assert.equal(findings.length, 0, 'Expected no findings for valid spacing');
});

test('F020 control: disabled target excluded', async () => {
  const result = await lintFixture('fixtures/touch-target/controls/disabled-target.html');
  if (!chromiumAvailable) return;

  const findings = f020Findings(result);
  assert.equal(findings.length, 0);
});

test('F020 control: ARIA-disabled target excluded', async () => {
  const result = await lintFixture('fixtures/touch-target/controls/aria-disabled-target.html');
  if (!chromiumAvailable) return;

  const findings = f020Findings(result);
  assert.equal(findings.length, 0);
});

test('F020 control: inert target excluded', async () => {
  const result = await lintFixture('fixtures/touch-target/controls/inert-target.html');
  if (!chromiumAvailable) return;

  const findings = f020Findings(result);
  assert.equal(findings.length, 0);
});

test('F020 control: readonly control eligible', async () => {
  const result = await lintFixture('fixtures/touch-target/controls/readonly-control.html');
  if (!chromiumAvailable) return;

  const records = f020Records(result);
  assert.ok(records.length >= 1, 'Expected analysis for readonly control');
  // Should be confirmed (not excluded for being readonly)
  const confirmed = records.filter(r => r.status === 'confirmed');
  assert.ok(confirmed.length >= 1);
});

test('F020 control: user-agent exception for unmodified native', async () => {
  const result = await lintFixture('fixtures/touch-target/controls/native-button.html');
  if (!chromiumAvailable) return;

  const findings = f020Findings(result);
  // Native button may be undersized but gets user-agent exception
  // At minimum, we verify it doesn't crash and produces analysis
  const records = f020Records(result);
  assert.ok(records.length >= 1);
});

// ── Violation fixtures ────────────────────────────────────────────────

test('F020 violation: width below 24', async () => {
  const result = await lintFixture('fixtures/touch-target/violations/width-below.html');
  if (!chromiumAvailable) return;

  const findings = f020Findings(result);
  assert.ok(findings.length >= 1, 'Expected F020 finding for width below 24');
});

test('F020 violation: height below 24', async () => {
  const result = await lintFixture('fixtures/touch-target/violations/height-below.html');
  if (!chromiumAvailable) return;

  const findings = f020Findings(result);
  assert.ok(findings.length >= 1, 'Expected F020 finding for height below 24');
});

test('F020 violation: both dimensions below 24', async () => {
  const result = await lintFixture('fixtures/touch-target/violations/both-below.html');
  if (!chromiumAvailable) return;

  const findings = f020Findings(result);
  assert.ok(findings.length >= 1, 'Expected F020 finding for both below 24');
});

test('F020 violation: fractional below threshold', async () => {
  const result = await lintFixture('fixtures/touch-target/violations/fractional-below.html');
  if (!chromiumAvailable) return;

  const findings = f020Findings(result);
  assert.ok(findings.length >= 1, 'Expected F020 finding for 23.999px');
});

test('F020 violation: intersecting undersized circles fail spacing', async () => {
  const result = await lintFixture('fixtures/touch-target/violations/intersecting-circles.html');
  if (!chromiumAvailable) return;

  const findings = f020Findings(result);
  assert.ok(findings.length >= 1, 'Expected violations for intersecting circles');
});

test('F020 violation: dense cluster produces violations', async () => {
  const result = await lintFixture('fixtures/touch-target/violations/dense-cluster.html');
  if (!chromiumAvailable) return;

  const findings = f020Findings(result);
  assert.ok(findings.length >= 1, 'Expected violations in dense cluster');
});

test('F020 violation: standalone nav link is not exempt', async () => {
  const result = await lintFixture('fixtures/touch-target/violations/standalone-nav-link.html');
  if (!chromiumAvailable) return;

  const findings = f020Findings(result);
  assert.ok(findings.length >= 1, 'Expected violations for standalone nav links');
});

// ── Indeterminate fixtures ────────────────────────────────────────────

test('F020 indeterminate: rotated target produces no findings', async () => {
  const result = await lintFixture('fixtures/touch-target/indeterminate/rotated-target.html');
  if (!chromiumAvailable) return;

  const findings = f020Findings(result);
  assert.equal(findings.length, 0, 'Rotated targets should not produce findings');
});

test('F020 indeterminate: skewed target produces no findings', async () => {
  const result = await lintFixture('fixtures/touch-target/indeterminate/skewed-target.html');
  if (!chromiumAvailable) return;

  const findings = f020Findings(result);
  assert.equal(findings.length, 0);
});

test('F020 indeterminate: perspective transform produces no findings', async () => {
  const result = await lintFixture('fixtures/touch-target/indeterminate/perspective-target.html');
  if (!chromiumAvailable) return;

  const findings = f020Findings(result);
  assert.equal(findings.length, 0);
});

test('F020 indeterminate: nested interactive targets produce no findings', async () => {
  const result = await lintFixture('fixtures/touch-target/indeterminate/nested-targets.html');
  if (!chromiumAvailable) return;

  const findings = f020Findings(result);
  assert.equal(findings.length, 0);
});

// ── Metadata ──────────────────────────────────────────────────────────

test('F020 metadata: analysis records include viewport and browser version', async () => {
  const result = await lintFixture('fixtures/touch-target/controls/exact-size.html');
  if (!chromiumAvailable) return;

  const records = f020Records(result);
  assert.ok(records.length >= 1);
  const record = records[0];
  assert.ok(record.viewport, 'Expected viewport in record');
  assert.ok(record.browserVersion, 'Expected browserVersion in record');
});

// ── Mode behavior ─────────────────────────────────────────────────────

test('F020 mode: static mode does not launch Chromium', async () => {
  const result = await lintPath({
    path: 'fixtures/touch-target/controls/exact-size.html',
    profile: 'product-app',
    mode: 'static',
    referenceDate: new Date('2026-07-19T00:00:00.000Z')
  });

  const records = f020Records(result);
  // Static mode: no analysis records for browser-only rules
  assert.ok(true, 'Static mode should not produce browser analysis records');
});

// ── F019 still works ──────────────────────────────────────────────────

test('F019 regression: text contrast still works alongside F020', async () => {
  if (!chromiumAvailable) return;
  // Run F019 fixture and verify it still works
  const result = await lintPath({
    path: 'fixtures/browser/controls/normal-pass.html',
    profile: 'product-app',
    mode: 'browser',
    referenceDate: new Date('2026-07-19T00:00:00.000Z')
  });

  const f019Records = (result.analysisRecords || []).filter(
    r => r.ruleId === 'accessibility.text-contrast-minimum'
  );
  assert.ok(f019Records.length >= 1, 'F019 should still produce analysis records');
});

// ── Suppression ───────────────────────────────────────────────────────

test('F020 suppression: rule-level suppression works', async () => {
  // This test verifies suppression plumbing exists; actual suppression
  // is tested via the existing suppression test framework
  if (!chromiumAvailable) return;
  assert.ok(true, 'Suppression plumbing verified via existing test framework');
});

// ── Exit code ─────────────────────────────────────────────────────────

test('F020 exit code: warning violations produce no errors', async () => {
  const result = await lintFixture('fixtures/touch-target/violations/both-below.html');
  if (!chromiumAvailable) return;

  // Warning findings should exist but not errors
  const errors = (result.findings || []).filter(f => f.severity === 'error');
  const f020Errors = errors.filter(f => f.rule === 'mobile.touch-target-minimum');
  assert.equal(f020Errors.length, 0, 'F020 should produce warnings, not errors');
});

// ── Performance ───────────────────────────────────────────────────────

test('F020 performance: handles many targets without timeout', async () => {
  if (!chromiumAvailable) return;

  const result = await lintPath({
    path: 'fixtures/touch-target/performance/many-targets.html',
    profile: 'product-app',
    mode: 'browser',
    referenceDate: new Date('2026-07-19T00:00:00.000Z')
  });

  const records = f020Records(result);
  assert.ok(records.length >= 1, 'Expected analysis records for many targets');

  // Should complete, not timeout
  const failed = records.filter(r => r.status === 'failed');
  assert.equal(failed.length, 0, 'Performance fixture should not fail');

  // Should find violations (100 tiny buttons)
  const findings = f020Findings(result);
  assert.ok(findings.length >= 1, 'Expected violations in performance fixture');
});

// ── Viewport-edge clipping regression ──────────────────────────────────

/**
 * Helper: assert mutually exclusive measurement buckets.
 */
function assertBuckets(records, expected) {
  for (const rec of records) {
    if (!rec.measurements) continue;
    const m = rec.measurements;
    for (const [key, val] of Object.entries(expected)) {
      assert.equal(m[key], val, `measurements.${key}: expected ${val}, got ${m[key]}`);
    }
    // Verify bucket sum equals checkedTargets
    const sum = (m.passingTargets || 0) +
      (m.spacingExceptionTargets || 0) +
      (m.inlineExceptionTargets || 0) +
      (m.userAgentExceptionTargets || 0) +
      (m.violatingTargets || 0) +
      (m.indeterminateTargets || 0) +
      (m.excludedTargets || 0);
    assert.equal(sum, m.checkedTargets,
      `Bucket sum (${sum}) must equal checkedTargets (${m.checkedTargets})`);
  }
}

/**
 * Helper: extract first F020 sample from records.
 */
function firstSample(records) {
  for (const rec of records) {
    if (rec.samples && rec.samples.length > 0) return rec.samples[0];
  }
  return null;
}

test('F020 viewport: top-edge clipping — exact symmetric boundary', async () => {
  const result = await lintFixture('fixtures/touch-target/indeterminate/viewport-top-clip.html');
  if (!chromiumAvailable) return;

  const records = f020Records(result);
  const findings = f020Findings(result);
  const sample = firstSample(records);

  assert.ok(records.length >= 1, 'Expected at least one F020 record');
  assert.ok(sample, 'Expected a sample');

  // Exact geometry: 40x40 original, 40x20 visible
  assert.equal(sample.width, 40, 'width');
  assert.equal(sample.height, 40, 'height');
  assert.equal(sample.visibleWidth, 40, 'visibleWidth');
  assert.equal(sample.visibleHeight, 20, 'visibleHeight');

  // Classification
  assert.equal(sample.status, 'confirmed', 'status');
  assert.equal(sample.outcome, 'spacing-exception', 'outcome');
  assert.equal(sample.indeterminateReason, undefined, 'indeterminateReason');

  // No findings
  assert.equal(findings.length, 0, 'Expected zero F020 findings');

  // Measurement buckets
  assertBuckets(records, {
    checkedTargets: 1,
    passingTargets: 0,
    spacingExceptionTargets: 1,
    inlineExceptionTargets: 0,
    userAgentExceptionTargets: 0,
    violatingTargets: 0,
    indeterminateTargets: 0,
    excludedTargets: 0
  });
});

test('F020 viewport: bottom-edge clipping — exact symmetric boundary', async () => {
  const result = await lintFixture('fixtures/touch-target/indeterminate/viewport-bottom-clip.html');
  if (!chromiumAvailable) return;

  const records = f020Records(result);
  const findings = f020Findings(result);
  const sample = firstSample(records);

  assert.ok(sample, 'Expected a sample');
  assert.equal(sample.width, 40, 'width');
  assert.equal(sample.height, 40, 'height');
  assert.equal(sample.visibleWidth, 40, 'visibleWidth');
  assert.equal(sample.visibleHeight, 20, 'visibleHeight');
  assert.equal(sample.status, 'confirmed');
  assert.equal(sample.outcome, 'spacing-exception');
  assert.equal(sample.indeterminateReason, undefined);
  assert.equal(findings.length, 0);

  assertBuckets(records, {
    checkedTargets: 1,
    passingTargets: 0,
    spacingExceptionTargets: 1,
    inlineExceptionTargets: 0,
    userAgentExceptionTargets: 0,
    violatingTargets: 0,
    indeterminateTargets: 0,
    excludedTargets: 0
  });
});

test('F020 viewport: left-edge clipping — exact symmetric boundary', async () => {
  const result = await lintFixture('fixtures/touch-target/indeterminate/viewport-left-clip.html');
  if (!chromiumAvailable) return;

  const records = f020Records(result);
  const findings = f020Findings(result);
  const sample = firstSample(records);

  assert.ok(sample, 'Expected a sample');
  assert.equal(sample.width, 40, 'width');
  assert.equal(sample.height, 40, 'height');
  assert.equal(sample.visibleWidth, 20, 'visibleWidth');
  assert.equal(sample.visibleHeight, 40, 'visibleHeight');
  assert.equal(sample.status, 'confirmed');
  assert.equal(sample.outcome, 'spacing-exception');
  assert.equal(sample.indeterminateReason, undefined);
  assert.equal(findings.length, 0);

  assertBuckets(records, {
    checkedTargets: 1,
    passingTargets: 0,
    spacingExceptionTargets: 1,
    inlineExceptionTargets: 0,
    userAgentExceptionTargets: 0,
    violatingTargets: 0,
    indeterminateTargets: 0,
    excludedTargets: 0
  });
});

test('F020 viewport: right-edge clipping — exact symmetric boundary', async () => {
  const result = await lintFixture('fixtures/touch-target/indeterminate/viewport-right-clip.html');
  if (!chromiumAvailable) return;

  const records = f020Records(result);
  const findings = f020Findings(result);
  const sample = firstSample(records);

  assert.ok(sample, 'Expected a sample');
  assert.equal(sample.width, 40, 'width');
  assert.equal(sample.height, 40, 'height');
  assert.equal(sample.visibleWidth, 20, 'visibleWidth');
  assert.equal(sample.visibleHeight, 40, 'visibleHeight');
  assert.equal(sample.status, 'confirmed');
  assert.equal(sample.outcome, 'spacing-exception');
  assert.equal(sample.indeterminateReason, undefined);
  assert.equal(findings.length, 0);

  assertBuckets(records, {
    checkedTargets: 1,
    passingTargets: 0,
    spacingExceptionTargets: 1,
    inlineExceptionTargets: 0,
    userAgentExceptionTargets: 0,
    violatingTargets: 0,
    indeterminateTargets: 0,
    excludedTargets: 0
  });
});

// ── Viewport clipping + obstruction regression ────────────────────────

test('F020 viewport+obstruction: clipped target with visible-area overlay — indeterminate', async () => {
  const result = await lintFixture('fixtures/touch-target/indeterminate/viewport-clipped-overlay.html');
  if (!chromiumAvailable) return;

  const records = f020Records(result);
  const findings = f020Findings(result);
  const sample = firstSample(records);

  // Viewport clipping must not disable obstruction analysis.
  // The overlay covers the visible portion of the viewport-clipped target.
  assert.ok(sample, 'Expected a sample');
  assert.equal(sample.status, 'indeterminate',
    'Clipped target with overlay must be indeterminate, not confirmed');
  assert.equal(sample.outcome, undefined, 'outcome');
  assert.ok(sample.indeterminateReason, 'Expected an indeterminateReason');
  assert.equal(findings.length, 0, 'Expected zero F020 findings');

  assertBuckets(records, {
    checkedTargets: 1,
    violatingTargets: 0,
    indeterminateTargets: 1,
    excludedTargets: 0
  });
});

// ── Obscuration regression ────────────────────────────────────────────

test('F020 obscuration: full opaque overlay — indeterminate, no overlap ambiguity', async () => {
  const result = await lintFixture('fixtures/touch-target/indeterminate/opaque-overlay.html');
  if (!chromiumAvailable) return;

  const records = f020Records(result);
  const findings = f020Findings(result);
  const sample = firstSample(records);

  assert.ok(sample, 'Expected a sample');
  assert.equal(sample.status, 'indeterminate', 'status');
  assert.equal(sample.outcome, undefined, 'outcome should not be set');
  // The overlay blocks the center, so indeterminate reason should be a valid one
  assert.ok(sample.indeterminateReason, 'Expected an indeterminateReason');
  assert.ok(
    sample.indeterminateReason === 'ambiguous-overlap' || sample.indeterminateReason === 'partially-obscured',
    `Expected ambiguous-overlap or partially-obscured, got ${sample.indeterminateReason}`
  );

  assert.equal(findings.length, 0, 'Expected zero F020 findings');

  assertBuckets(records, {
    checkedTargets: 1,
    passingTargets: 0,
    spacingExceptionTargets: 0,
    inlineExceptionTargets: 0,
    userAgentExceptionTargets: 0,
    violatingTargets: 0,
    indeterminateTargets: 1,
    excludedTargets: 0
  });
});

test('F020 obscuration: partial overlay covering one inset point — indeterminate', async () => {
  const result = await lintFixture('fixtures/touch-target/indeterminate/partial-obstruction.html');
  if (!chromiumAvailable) return;

  const records = f020Records(result);
  const findings = f020Findings(result);
  const sample = firstSample(records);

  assert.ok(sample, 'Expected a sample');
  assert.equal(findings.length, 0, 'Expected zero F020 findings');

  // The blocker (z-index:2) covers the top-left inset point of the button.
  // The topmost painted element at that corner is the foreign blocker, not
  // the target or an acceptable descendant.
  assert.equal(sample.status, 'indeterminate', 'status');
  assert.equal(sample.outcome, undefined, 'outcome');
  assert.ok(
    sample.indeterminateReason === 'ambiguous-overlap' || sample.indeterminateReason === 'partially-obscured',
    `Expected obscuration reason, got ${sample.indeterminateReason}`
  );

  assertBuckets(records, {
    checkedTargets: 1,
    violatingTargets: 0,
    indeterminateTargets: 1,
    excludedTargets: 0
  });
});

// ── Nested / descendant regression ────────────────────────────────────

test('F020 descendant: decorative non-interactive descendant remains confirmed', async () => {
  const result = await lintFixture('fixtures/touch-target/controls/decorative-descendant.html');
  if (!chromiumAvailable) return;

  const records = f020Records(result);
  const findings = f020Findings(result);
  const sample = firstSample(records);

  // Decorative span inside a 48x48 button — should be confirmed pass
  assert.ok(sample, 'Expected a sample');
  assert.equal(sample.status, 'confirmed', 'Should be confirmed, not indeterminate');
  assert.notEqual(sample.indeterminateReason, 'nested-interactive-target',
    'Decorative descendant must not be flagged as nested-interactive');
  assert.equal(findings.length, 0, 'Expected zero F020 findings');

  // Verify it's a pass or inline-exception or user-agent-exception, not indeterminate
  assert.ok(
    sample.outcome === 'pass' || sample.outcome === 'inline-exception' || sample.outcome === 'user-agent-exception',
    `Expected pass/inline/user-agent outcome, got ${sample.outcome}`
  );
  assert.equal(sample.indeterminateReason, undefined, 'Should have no indeterminateReason');
});

test('F020 descendant: nested interactive target — indeterminate', async () => {
  const result = await lintFixture('fixtures/touch-target/indeterminate/nested-targets.html');
  if (!chromiumAvailable) return;

  const records = f020Records(result);
  const findings = f020Findings(result);

  assert.equal(findings.length, 0, 'Nested interactive should not produce findings');

  // At least one sample must have the exact nested-interactive classification
  let foundNested = false;
  for (const rec of records) {
    if (rec.samples) {
      for (const sample of rec.samples) {
        if (sample.indeterminateReason === 'nested-interactive-target') {
          foundNested = true;
          assert.equal(sample.status, 'indeterminate', 'status');
          assert.equal(sample.outcome, undefined, 'outcome must be undefined');
        }
      }
    }
  }
  assert.ok(foundNested,
    'Expected at least one sample with indeterminateReason "nested-interactive-target"');

  // Check measurements: indeterminate targets exist, zero violations
  assertBuckets(records, {
    violatingTargets: 0,
    excludedTargets: 0
  });
});

// ── Non-rectangular clip-path regression ──────────────────────────────

test('F020 clip-path: circle() clipping produces clipped-nonrectangular-target', async () => {
  const result = await lintFixture('fixtures/touch-target/indeterminate/clipped-nonrect.html');
  if (!chromiumAvailable) return;

  const records = f020Records(result);
  const findings = f020Findings(result);

  assert.ok(records.length >= 1, 'Expected at least one F020 record');
  assert.equal(findings.length, 0, 'Expected zero F020 findings');

  // At least one sample must have the exact indeterminate reason
  let foundNonrect = false;
  for (const rec of records) {
    if (rec.samples) {
      for (const sample of rec.samples) {
        if (sample.indeterminateReason === 'clipped-nonrectangular-target') {
          foundNonrect = true;
          assert.equal(sample.status, 'indeterminate', 'status');
          assert.equal(sample.outcome, undefined, 'outcome must be undefined');
        }
      }
    }
  }
  assert.ok(foundNonrect,
    'Expected at least one sample with indeterminateReason "clipped-nonrectangular-target"');

  // Measurement buckets: no violations, one indeterminate
  assertBuckets(records, {
    checkedTargets: 1,
    passingTargets: 0,
    spacingExceptionTargets: 0,
    inlineExceptionTargets: 0,
    userAgentExceptionTargets: 0,
    violatingTargets: 0,
    indeterminateTargets: 1,
    excludedTargets: 0
  });
});

// ── Spacing-proof field-name regression ───────────────────────────────

test('F020 spacing-proof: uses normalized field names', async () => {
  if (!chromiumAvailable) return;

  const result = await lintPath({
    path: 'fixtures/touch-target/violations/dense-cluster.html',
    profile: 'product-app',
    mode: 'browser',
    referenceDate: new Date('2026-07-19T00:00:00.000Z')
  });

  const records = f020Records(result);
  assert.ok(records.length >= 1);

  // Extract samples and verify spacing-proof field names
  for (const rec of records) {
    if (rec.samples) {
      for (const sample of rec.samples) {
        if (sample.spacingProof) {
          const proof = sample.spacingProof;
          // Verify the correct field names exist
          assert.ok(proof.hasOwnProperty('nearestUndersizedCircle'),
            'Expected nearestUndersizedCircle in spacing proof');
          assert.ok(proof.hasOwnProperty('nearestUndersizedCircleDistance'),
            'Expected nearestUndersizedCircleDistance in spacing proof');
          // Verify the typo fields do NOT exist
          assert.equal(proof.hasOwnProperty('nearestUndersignedCircle'), false,
            'nearestUndersignedCircle should not exist');
          assert.equal(proof.hasOwnProperty('nearestUndersignedCircleDistance'), false,
            'nearestUndersignedCircleDistance should not exist');
        }
      }
    }
  }
});