import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAPTURE_VIEWPORTS,
  summarizeAccessibilitySnapshots,
  validateRunManifestForCapture
} from '../research/benchmark/harness/capture.js';

test('capture viewports are frozen at desktop and mobile DPR-1 dimensions', () => {
  assert.deepEqual(CAPTURE_VIEWPORTS, [
    { id: 'desktop', width: 1440, height: 900, isMobile: false },
    { id: 'mobile', width: 390, height: 844, isMobile: true }
  ]);
});

test('run capture accepts only mutable pre-completion statuses', () => {
  for (const status of ['planned', 'running', 'partial']) {
    assert.equal(validateRunManifestForCapture({ runId: 'B001-A-r1', profile: 'marketing', status }).status, status);
  }
  for (const status of ['complete', 'failed', 'invalid']) {
    assert.throws(
      () => validateRunManifestForCapture({ runId: 'B001-A-r1', profile: 'marketing', status }),
      /cannot be captured/
    );
  }
});

test('calibration accessibility summaries preserve per-viewport evidence without a conformance claim', () => {
  const summary = summarizeAccessibilitySnapshots([
    {
      viewport: 'desktop',
      issues: [
        { code: 'image-alt-missing', selector: 'img' },
        { code: 'interactive-name-missing', selector: 'button' }
      ]
    },
    {
      viewport: 'mobile',
      issues: [{ code: 'image-alt-missing', selector: 'img' }]
    }
  ]);
  assert.equal(summary.scanner, 'design-canon-dom-calibration-audit');
  assert.equal(summary.conformanceClaim, false);
  assert.equal(summary.issueTotal, 3);
  assert.deepEqual(summary.issueCounts, {
    'image-alt-missing': 2,
    'interactive-name-missing': 1
  });
  assert.equal(summary.snapshots.length, 2);
});
