/**
 * tests/text-contrast-browser.test.js
 *
 * End-to-end browser tests for F019: Rendered text contrast minimum.
 * Runs F019 fixtures through lintPath in browser mode and verifies
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
 * Returns the lint result or null if skipped.
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
 * Extract F019-specific analysis records from a lint result.
 */
function f019Records(result) {
  if (!result || !result.analysisRecords) return [];
  return result.analysisRecords.filter(
    (r) => r.ruleId === 'accessibility.text-contrast-minimum'
  );
}

/**
 * Extract F019-specific findings from a lint result.
 */
function f019Findings(result) {
  if (!result || !result.findings) return [];
  return result.findings.filter((f) => f.rule === 'accessibility.text-contrast-minimum');
}

// ── Control fixtures ────────────────────────────────────────────────

test('F019 control: normal-pass fixture produces no violations', async () => {
  const result = await lintFixture('fixtures/browser/controls/normal-pass.html');
  if (!chromiumAvailable) return;

  const records = f019Records(result);
  const findings = f019Findings(result);

  // Should have at least one analysis record for F019
  assert.ok(records.length >= 1, 'Expected at least one F019 analysis record');
  // All F019 records should be confirmed (not failed, not skipped)
  for (const r of records) {
    assert.equal(r.status, 'confirmed', `Unexpected status: ${r.status} for ${r.analyzerId}`);
  }
  // No violations should be emitted
  assert.equal(findings.length, 0, 'Expected no F019 findings for control fixture');
});

test('F019 violation: exact-normal-threshold emits a violation (4.48:1 < 4.5:1 with unrounded comparison)', async () => {
  const result = await lintFixture('fixtures/browser/controls/exact-normal-threshold.html');
  if (!chromiumAvailable) return;

  const findings = f019Findings(result);
  assert.ok(findings.length >= 1,
    'Expected at least one F019 finding at unrounded 4.48:1 (below 4.5:1 threshold)');
});

test('F019 control: normal-pass includes measured samples', async () => {
  const result = await lintFixture('fixtures/browser/controls/normal-pass.html');
  if (!chromiumAvailable) return;

  const records = f019Records(result);
  assert.ok(records.length >= 1);

  const record = records[0];
  assert.ok(record.measurements, 'Expected measurements on analysis record');
  assert.equal(typeof record.measurements.checkedElements, 'number');
  assert.ok(record.measurements.checkedElements > 0, 'Expected at least one checked element');
  assert.equal(record.measurements.violatingElements, 0, 'Expected zero violations in control');
});

// ── Violation fixtures ─────────────────────────────────────────────

test('F019 violation: normal-low-contrast emits F019 findings', async () => {
  const result = await lintFixture('fixtures/browser/violations/normal-low-contrast.html');
  if (!chromiumAvailable) return;

  const records = f019Records(result);
  const findings = f019Findings(result);

  assert.ok(records.length >= 1, 'Expected at least one F019 analysis record');
  assert.ok(findings.length >= 1, 'Expected at least one F019 violation finding');
  assert.ok(records[0].measurements.violatingElements >= 1, 'Expected at least one violating element');

  // Verify finding shape
  for (const finding of findings) {
    assert.equal(finding.rule, 'accessibility.text-contrast-minimum');
    assert.ok(finding.evidence, 'Expected evidence on violation finding');
    assert.match(finding.evidence, /ratio=/, 'Expected ratio in evidence string');
    assert.match(finding.evidence, /selector=/, 'Expected selector in evidence string');
  }
});

test('F019 violation: multiple-violations fixture reports all violations', async () => {
  const result = await lintFixture('fixtures/browser/violations/multiple-violations.html');
  if (!chromiumAvailable) return;

  const findings = f019Findings(result);
  assert.ok(findings.length >= 2, 'Expected at least 2 F019 violations for multiple-violations fixture');
});

test('F019 violation: violation findings have proper severity (from catalog)', async () => {
  const result = await lintFixture('fixtures/browser/violations/normal-low-contrast.html');
  if (!chromiumAvailable) return;

  const findings = f019Findings(result);
  for (const finding of findings) {
    assert.equal(finding.severity, 'warning');
  }
});

// ── Indeterminate fixtures ─────────────────────────────────────────

test('F019 indeterminate: gradient fixture reports indeterminate', async () => {
  const result = await lintFixture('fixtures/browser/indeterminate/gradient.html');
  if (!chromiumAvailable) return;

  const records = f019Records(result);
  assert.ok(records.length >= 1, 'Expected at least one F019 analysis record');

  // Gradient text should be marked indeterminate in measurements
  assert.ok(
    records[0].measurements.indeterminateElements >= 1 ||
    records[0].status === 'indeterminate',
    'Expected gradient fixture to produce indeterminate results'
  );
});

test('F019 indeterminate: element-opacity fixture reports indeterminate', async () => {
  const result = await lintFixture('fixtures/browser/indeterminate/element-opacity.html');
  if (!chromiumAvailable) return;

  const records = f019Records(result);
  assert.ok(records.length >= 1);

  const measurements = records[0].measurements;
  assert.ok(
    measurements.indeterminateElements >= 1 || records[0].status === 'indeterminate',
    'Expected element-opacity to produce indeterminate results'
  );
  assert.equal(measurements.violatingElements ?? 0, 0,
    'Indeterminate fixture should not produce violations');
});

test('F019 indeterminate: image-background fixture reports indeterminate', async () => {
  const result = await lintFixture('fixtures/browser/indeterminate/image-background.html');
  if (!chromiumAvailable) return;

  const records = f019Records(result);
  assert.ok(records.length >= 1);

  const measurements = records[0].measurements;
  assert.ok(
    measurements.indeterminateElements >= 1 || records[0].status === 'indeterminate',
    'Expected image-background to produce indeterminate results'
  );
});

// ── Excluded fixtures ──────────────────────────────────────────────

test('F019 excluded: display-none content excluded from analysis', async () => {
  const result = await lintFixture('fixtures/browser/excluded/display-none.html');
  if (!chromiumAvailable) return;

  const records = f019Records(result);
  assert.ok(records.length >= 1);

  // display-none text should not be counted
  const measurements = records[0].measurements;
  assert.equal(measurements.violatingElements, 0,
    'display-none fixture should not produce violations');
});

test('F019 excluded: disabled-component content excluded', async () => {
  const result = await lintFixture('fixtures/browser/excluded/disabled-component.html');
  if (!chromiumAvailable) return;

  const records = f019Records(result);
  assert.ok(records.length >= 1);

  const findings = f019Findings(result);
  // The only text should be "Normal text." which passes, so no violations
  assert.equal(findings.length, 0,
    'Expected no F019 findings for disabled-component fixture');
});

test('F019 excluded: aria-disabled ancestor content excluded', async () => {
  const result = await lintFixture('fixtures/browser/excluded/aria-disabled.html');
  if (!chromiumAvailable) return;

  const records = f019Records(result);
  assert.ok(records.length >= 1);

  const findings = f019Findings(result);
  // Only "Normal text." should be analyzed; "Aria-disabled container text."
  // should be excluded because its ancestor has aria-disabled="true"
  assert.equal(findings.length, 0,
    'Expected no F019 findings for aria-disabled fixture');
});

test('F019 excluded: noscript content excluded', async () => {
  const result = await lintFixture('fixtures/browser/excluded/noscript-content.html');
  if (!chromiumAvailable) return;

  const records = f019Records(result);
  assert.ok(records.length >= 1);

  const findings = f019Findings(result);
  assert.equal(findings.length, 0,
    'Expected no F019 findings for noscript fixture');
});

// ── Viewport and color-scheme ──────────────────────────────────────

test('F019 viewport: browser version recorded in analysis records', async () => {
  const result = await lintFixture('fixtures/browser/controls/normal-pass.html');
  if (!chromiumAvailable) return;

  const records = f019Records(result);
  assert.ok(records.length >= 1);
  // browserEngine should be recorded
  assert.equal(records[0].browserEngine, 'chromium');
  assert.ok(typeof records[0].browserVersion === 'string' && records[0].browserVersion.length > 0);
});

// ── Failure boundary ───────────────────────────────────────────────

test('F019 boundary: empty or minimal fixture does not crash', async () => {
  const result = await lintFixture('fixtures/browser/controls/inherited-background.html');
  if (!chromiumAvailable) return;

  // Should complete without throwing — any valid result shape is acceptable
  assert.ok(result);
  assert.ok(Array.isArray(result.analysisRecords));
  assert.ok(Array.isArray(result.findings));
});

// ── Regression: page closed by popup blocker ───────────────────────

test('F019 regression: analysis page is NOT closed by popup blocker', async () => {
  // This tests Correction 1 — the primary page must survive the popup blocker.
  // Before the fix, the analysis page was closed by context.on('page') handler.
  // A successful return from lintPath in browser mode proves the fix works.
  const result = await lintFixture('fixtures/browser/controls/normal-pass.html');
  if (!chromiumAvailable) return;

  assert.ok(result, 'Expected lintPath to complete without crashing');
  const runtimeRecords = result.analysisRecords.filter(
    (r) => r.analyzerId === '__runtime__' && r.status !== 'failed'
  );
  assert.ok(runtimeRecords.length >= 1,
    'Expected at least one non-failed runtime record (would fail if page was closed by popup blocker)');
});
