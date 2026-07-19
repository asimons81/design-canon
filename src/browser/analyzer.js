/**
 * browser/analyzer.js
 *
 * Analyzer interface and registry for browser-assisted analysis.
 * Analyzers are registered by capability ID and receive a bounded
 * internal context. They must not launch browsers, perform network
 * requests, access files outside the scan root, or modify global state.
 */

/**
 * @typedef {object} AnalyzerContext
 * @property {string} filePath - normalized absolute file path
 * @property {string} scanRoot - absolute scan root path
 * @property {string} viewport - viewport preset name ('desktop' or 'mobile')
 * @property {number} deadline - operation deadline timestamp (ms since epoch)
 * @property {object} rule - rule metadata (id, severity, title, etc.)
 * @property {Function} getComputedStyle - (selector, property) => Promise<string|null>
 * @property {Function} getBoundingBox - (selector) => Promise<Rect|null>
 * @property {Function} getTextContent - (selector) => Promise<string|null>
 * @property {Function} elementExists - (selector) => Promise<boolean>
 * @property {Function} captureScreenshot - () => Promise<Buffer|null>
 * @property {object} page - controlled page adapter (bounded)
 */

/**
 * @typedef {Function} AnalyzerFunction
 * @param {AnalyzerContext} context
 * @returns {Promise<{status:string, measurements:object, message:string, confidence:string}>}
 */

const registry = new Map();

/**
 * Register an analyzer function.
 *
 * @param {string} capabilityId - unique analyzer ID (e.g. 'rendered.contrast', 'touch-target')
 * @param {AnalyzerFunction} analyzerFn - the analyzer function
 */
export function registerAnalyzer(capabilityId, analyzerFn) {
  if (registry.has(capabilityId)) {
    throw new Error(`Analyzer '${capabilityId}' is already registered.`);
  }
  registry.set(capabilityId, analyzerFn);
}

/**
 * Get a registered analyzer function.
 *
 * @param {string} capabilityId
 * @returns {AnalyzerFunction|undefined}
 */
export function getAnalyzer(capabilityId) {
  return registry.get(capabilityId);
}

/**
 * Check if an analyzer is registered.
 *
 * @param {string} capabilityId
 * @returns {boolean}
 */
export function hasAnalyzer(capabilityId) {
  return registry.has(capabilityId);
}

/**
 * List all registered analyzer IDs.
 *
 * @returns {string[]}
 */
export function listAnalyzers() {
  return [...registry.keys()];
}

/**
 * Remove a registered analyzer (for testing).
 *
 * @param {string} capabilityId
 */
export function unregisterAnalyzer(capabilityId) {
  registry.delete(capabilityId);
}

/**
 * Clear all registered analyzers (for testing).
 */
export function clearAnalyzers() {
  registry.clear();
}

/**
 * Run an analyzer against a loaded page.
 *
 * @param {string} capabilityId
 * @param {AnalyzerContext} context
 * @returns {Promise<{status:string, measurements:object, message:string, confidence:string}>}
 */
export async function runAnalyzer(capabilityId, context) {
  const analyzerFn = registry.get(capabilityId);
  if (!analyzerFn) {
    return {
      status: 'failed',
      measurements: {},
      message: `Unknown analyzer '${capabilityId}'.`,
      confidence: 'low'
    };
  }

  try {
    // Check deadline
    if (Date.now() > context.deadline) {
      return {
        status: 'failed',
        measurements: {},
        message: 'Operation deadline exceeded before analyzer could run.',
        confidence: 'low'
      };
    }

    const result = await analyzerFn(context);
    return {
      status: result.status ?? 'indeterminate',
      measurements: result.measurements ?? {},
      message: result.message ?? '',
      confidence: result.confidence ?? 'medium'
    };
  } catch (err) {
    return {
      status: 'failed',
      measurements: {},
      message: `Analyzer error: ${err.message}`,
      confidence: 'low'
    };
  }
}
