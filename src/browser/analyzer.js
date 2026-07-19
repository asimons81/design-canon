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
 * The analyzer promise is raced against the remaining deadline
 * so a never-resolving analyzer cannot hang the operation.
 * The deadline timer is always cancelled when the race ends.
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
    const remaining = context.deadline - Date.now();
    if (remaining <= 0) {
      return {
        status: 'failed',
        measurements: {},
        message: 'Operation deadline exceeded before analyzer could run.',
        confidence: 'low'
      };
    }

    // Race the analyzer against the remaining operation time.
    // The deadline timeout is cleared when the race ends so it
    // cannot keep the event loop alive.
    const result = await raceWithDeadline(analyzerFn(context), remaining);

    return {
      status: result.status ?? 'indeterminate',
      measurements: result.measurements ?? {},
      message: result.message ?? '',
      confidence: result.confidence ?? 'medium'
    };
  } catch (err) {
    const isTimeout = err.message && err.message.includes('deadline exceeded');
    return {
      status: 'failed',
      measurements: {},
      message: isTimeout ? err.message : `Analyzer error: ${err.message}`,
      confidence: 'low'
    };
  }
}

/**
 * Race a promise against a deadline timeout.
 * The timer is always cleared so it cannot keep the event loop alive.
 *
 * @param {Promise<T>} promise
 * @param {number} ms - milliseconds until deadline
 * @returns {Promise<T>}
 * @template T
 */
function raceWithDeadline(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Operation deadline exceeded during analysis.'));
    }, Math.max(1, ms));

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (reason) => {
        clearTimeout(timer);
        reject(reason);
      }
    );
  });
}
