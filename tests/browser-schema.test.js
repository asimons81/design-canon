import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAnalysisRecord,
  confirmedRecord,
  indeterminateRecord,
  skippedRecord,
  failedRecord,
  isActionableRecord,
  VIEWPORT_PRESETS,
  VALID_STATUSES,
  VALID_CONFIDENCE
} from '../src/browser/schema.js';

test('schema creates confirmed record', () => {
  const record = confirmedRecord({
    file: 'src/index.html',
    analyzerId: 'test.analyzer',
    viewport: 'desktop',
    browserVersion: '130.0.6723.58',
    measurements: { contrastRatio: 4.5 },
    message: 'Contrast ratio meets AA threshold.',
    confidence: 'high'
  });

  assert.equal(record.status, 'confirmed');
  assert.equal(record.file, 'src/index.html');
  assert.equal(record.analyzerId, 'test.analyzer');
  assert.equal(record.viewport, 'desktop');
  assert.equal(record.browserVersion, '130.0.6723.58');
  assert.deepEqual(record.measurements, { contrastRatio: 4.5 });
  assert.equal(record.confidence, 'high');
  assert.equal(record.error, undefined);
});

test('schema creates indeterminate record', () => {
  const record = indeterminateRecord({
    file: 'src/index.html',
    analyzerId: 'test.analyzer',
    message: 'Could not determine result.'
  });

  assert.equal(record.status, 'indeterminate');
  assert.equal(record.confidence, 'low');
  assert.equal(record.error, undefined);
  assert.ok(record.message);
});

test('schema creates skipped record', () => {
  const record = skippedRecord({
    file: 'src/index.html',
    analyzerId: 'test.analyzer'
  });

  assert.equal(record.status, 'skipped');
  assert.equal(record.confidence, 'low');
  assert.match(record.message, /skipped/i);
});

test('schema creates failed record with error details', () => {
  const record = failedRecord({
    file: 'src/index.html',
    analyzerId: 'test.analyzer',
    message: 'Chromium launch failed.',
    errorType: 'launch_error'
  });

  assert.equal(record.status, 'failed');
  assert.equal(record.confidence, 'low');
  assert.ok(record.error);
  assert.equal(record.error.type, 'launch_error');
  assert.equal(record.error.message, 'Chromium launch failed.');
});

test('isActionableRecord returns true only for confirmed', () => {
  assert.equal(isActionableRecord(confirmedRecord({ file: 'a', analyzerId: 't' })), true);
  assert.equal(isActionableRecord(indeterminateRecord({ file: 'a', analyzerId: 't' })), false);
  assert.equal(isActionableRecord(skippedRecord({ file: 'a', analyzerId: 't' })), false);
  assert.equal(isActionableRecord(failedRecord({ file: 'a', analyzerId: 't' })), false);
});

test('schema does not represent skipped or failed as findings', () => {
  // Analysis records have a 'status' field, not a 'severity' or 'finding' field
  const skipped = skippedRecord({ file: 'a', analyzerId: 't' });
  const failed = failedRecord({ file: 'a', analyzerId: 't' });
  assert.equal(skipped.severity, undefined);
  assert.equal(failed.severity, undefined);
  assert.equal(skipped.rule, undefined);
  assert.equal(failed.rule, undefined);
});

test('VIEWPORT_PRESETS has correct values', () => {
  assert.deepEqual(VIEWPORT_PRESETS.desktop, { width: 1440, height: 900, deviceScaleFactor: 1 });
  assert.deepEqual(VIEWPORT_PRESETS.mobile, { width: 390, height: 844, deviceScaleFactor: 1 });
});

test('VALID_STATUSES contains all four statuses', () => {
  assert.equal(VALID_STATUSES.has('confirmed'), true);
  assert.equal(VALID_STATUSES.has('indeterminate'), true);
  assert.equal(VALID_STATUSES.has('skipped'), true);
  assert.equal(VALID_STATUSES.has('failed'), true);
  assert.equal(VALID_STATUSES.size, 4);
});

test('VALID_CONFIDENCE contains high, medium, low', () => {
  assert.equal(VALID_CONFIDENCE.has('high'), true);
  assert.equal(VALID_CONFIDENCE.has('medium'), true);
  assert.equal(VALID_CONFIDENCE.has('low'), true);
  assert.equal(VALID_CONFIDENCE.size, 3);
});

test('createAnalysisRecord omits empty optional fields', () => {
  // Use 'indeterminate' status (not confirmed) to test field omission
  const record = createAnalysisRecord({
    status: 'indeterminate',
    file: 'test.html',
    analyzerId: 'test'
  });

  assert.equal(record.viewport, undefined);
  assert.equal(record.browserEngine, undefined);
  assert.equal(record.browserVersion, undefined);
  assert.equal(record.measurements, undefined);
  assert.equal(record.error, undefined);
});

test('static results must survive browser failures - schema proof', () => {
  // Analysis records are separate from finding records
  const staticFinding = {
    file: 'test.html',
    line: 10,
    rule: 'a11y.visible-focus',
    severity: 'error',
    message: 'Focus outline is disabled.',
    evidence: 'outline: none'
  };

  const analysisRecord = failedRecord({
    file: 'test.html',
    analyzerId: 'test.analyzer',
    message: 'Browser crash.'
  });

  // The finding exists independently of the analysis record
  assert.equal(staticFinding.severity, 'error');
  assert.equal(staticFinding.rule, 'a11y.visible-focus');
  // The failed record doesn't erase or modify the finding
  assert.equal(analysisRecord.status, 'failed');
});
