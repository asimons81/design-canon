/**
 * browser/analyzers/index.js
 *
 * Production analyzer registry.
 * Registers all first-tranche browser analyzers and provides
 * repository-verification helpers.
 *
 * Registration is idempotent — calling setupAnalyzers() multiple
 * times does not cause duplicate-registration errors.
 */

import { registerAnalyzer, hasAnalyzer } from '../analyzer.js';
import { analyzeTextContrast } from './text-contrast.js';
import { analyzeTouchTargetSize } from './touch-target-size.js';

let initialized = false;

/**
 * Register all production analyzers.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export function setupAnalyzers() {
  if (initialized) return;
  initialized = true;

  if (!hasAnalyzer('rendered.text-contrast')) {
    registerAnalyzer('rendered.text-contrast', analyzeTextContrast);
  }

  if (!hasAnalyzer('rendered.touch-target-size')) {
    registerAnalyzer('rendered.touch-target-size', analyzeTouchTargetSize);
  }
}

/**
 * Reset the initialization flag (for testing).
 */
export function resetAnalyzers() {
  initialized = false;
}

/**
 * Check whether a given analyzer ID has a production implementation.
 * Used by repository verification to detect catalog bindings with
 * no production analyzer.
 *
 * @param {string} analyzerId
 * @returns {boolean}
 */
export function hasProductionAnalyzer(analyzerId) {
  const productionIds = new Set([
    'rendered.text-contrast',
    'rendered.touch-target-size'
  ]);
  return productionIds.has(analyzerId);
}

/**
 * Get the set of all production analyzer IDs.
 * @returns {Set<string>}
 */
export function getProductionAnalyzerIds() {
  return new Set(['rendered.text-contrast', 'rendered.touch-target-size']);
}
