/**
 * browser/schema.js
 *
 * Structured analysis-record schema for browser-assisted analysis.
 * Analysis records are separate from findings and do not participate
 * in suppression, sorting, or finding-level output.
 */

/**
 * Create an analysis record for a completed browser analysis.
 *
 * @param {object} options
 * @param {'confirmed'|'indeterminate'|'skipped'|'failed'} options.status
 * @param {string} options.file - normalized file path
 * @param {string} options.analyzerId - analyzer or capability ID
 * @param {string} [options.ruleId] - optional rule ID (for rule-scoped records)
 * @param {string} [options.viewport] - viewport preset name
 * @param {string} [options.browserEngine] - 'chromium'
 * @param {string|null} [options.browserVersion] - browser version string
 * @param {object} [options.measurements] - analysis-specific measured values
 * @param {string} [options.message] - human-readable message
 * @param {'high'|'medium'|'low'} [options.confidence] - bounded confidence level
 * @param {object|null} [options.error] - operational failure details
 * @param {Array} [options.samples] - individual sample results
 * @returns {object}
 */
export function createAnalysisRecord(options) {
  const {
    status,
    file,
    analyzerId,
    ruleId = null,
    viewport = null,
    browserEngine = null,
    browserVersion = null,
    measurements = {},
    message = '',
    confidence = 'medium',
    error = null,
    samples = null
  } = options;

  const record = {
    status,
    file,
    analyzerId
  };

  // Add ruleId when provided
  if (ruleId) record.ruleId = ruleId;
  // Only add metadata fields when they have meaningful values
  if (viewport) record.viewport = viewport;
  if (browserEngine) record.browserEngine = browserEngine;
  if (browserVersion !== null && browserVersion !== undefined) {
    record.browserVersion = browserVersion;
  }
  if (Object.keys(measurements).length > 0) {
    record.measurements = measurements;
  }
  if (message) record.message = message;
  if (confidence !== 'medium' || status === 'confirmed') {
    record.confidence = confidence;
  }
  if (error) {
    record.error = {
      type: error.type ?? 'operation_error',
      message: error.message ?? 'An unexpected error occurred.'
    };
  }
  // Preserve samples when provided
  if (samples !== null && samples !== undefined) {
    record.samples = samples;
  }

  return record;
}

/**
 * Create a "confirmed" analysis record.
 * Only "confirmed" records may support a production finding.
 *
 * @param {object} options
 * @param {string} options.file
 * @param {string} options.analyzerId
 * @param {string} [options.ruleId]
 * @param {string} [options.viewport]
 * @param {string|null} [options.browserVersion]
 * @param {object} [options.measurements]
 * @param {string} [options.message]
 * @param {'high'|'medium'|'low'} [options.confidence]
 * @param {Array} [options.samples]
 * @returns {object}
 */
export function confirmedRecord(options) {
  return createAnalysisRecord({ ...options, status: 'confirmed' });
}

/**
 * Create an "indeterminate" analysis record.
 * Indeterminate is not a violation.
 *
 * @param {object} options
 * @param {string} options.file
 * @param {string} options.analyzerId
 * @param {string} [options.ruleId]
 * @param {string} [options.message]
 * @returns {object}
 */
export function indeterminateRecord(options) {
  return createAnalysisRecord({
    ...options,
    status: 'indeterminate',
    confidence: 'low'
  });
}

/**
 * Create a "skipped" analysis record.
 * Skipped is not a pass — it means analysis was not performed.
 *
 * @param {object} options
 * @param {string} options.file
 * @param {string} options.analyzerId
 * @param {string} [options.ruleId]
 * @param {string} [options.message]
 * @returns {object}
 */
export function skippedRecord(options) {
  return createAnalysisRecord({
    ...options,
    status: 'skipped',
    confidence: 'low',
    message: options.message ?? 'Analysis skipped: browser runtime not available.'
  });
}

/**
 * Create a "failed" analysis record.
 * Failed is not a violation — it indicates an operational error.
 *
 * @param {object} options
 * @param {string} options.file
 * @param {string} options.analyzerId
 * @param {string} [options.ruleId]
 * @param {string} [options.message]
 * @param {string} [options.errorType]
 * @returns {object}
 */
export function failedRecord(options) {
  return createAnalysisRecord({
    ...options,
    status: 'failed',
    confidence: 'low',
    error: {
      type: options.errorType ?? 'operation_error',
      message: options.message ?? 'Analysis failed due to an operational error.'
    }
  });
}

/**
 * Check whether an analysis record has a status that could
 * contribute to a production finding.
 *
 * @param {object} record
 * @returns {boolean}
 */
export function isActionableRecord(record) {
  return record.status === 'confirmed';
}

/**
 * Viewport preset definitions.
 */
export const VIEWPORT_PRESETS = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
  mobile: { width: 390, height: 844, deviceScaleFactor: 1 }
};

/**
 * Valid analysis statuses.
 */
export const VALID_STATUSES = new Set([
  'confirmed',
  'indeterminate',
  'skipped',
  'failed'
]);

/**
 * Valid confidence levels.
 */
export const VALID_CONFIDENCE = new Set(['high', 'medium', 'low']);

/**
 * Valid sample statuses.
 */
export const VALID_SAMPLE_STATUSES = new Set(['confirmed', 'indeterminate']);

/**
 * Valid sample outcomes.
 */
export const VALID_SAMPLE_OUTCOMES = new Set(['pass', 'violation']);

/**
 * Indeterminate reason codes.
 */
export const INDETERMINATE_REASONS = new Set([
  'background-image',
  'gradient',
  'image-background',
  'opacity',
  'mix-blend-mode',
  'background-blend-mode',
  'filter',
  'backdrop-filter',
  'mask',
  'background-clip-text',
  'text-shadow',
  'text-stroke',
  'unsupported-color-space',
  'unresolved-color',
  'ambiguous-overlap'
]);
