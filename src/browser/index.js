/**
 * browser/index.js
 *
 * Public API for browser-assisted analysis.
 * Provides a single entry point for all browser functionality.
 */

export {
  detectBrowserCapability,
  resetCapabilityCache,
  resolveMode
} from './capability.js';

export {
  launchBrowser,
  createAnalysisPage,
  closeAnalysisPage,
  closeBrowser
} from './launcher.js';

export {
  loadLocalPage,
  setViewport,
  navigateAndWait,
  resolveLocalAsset,
  getComputedStyle,
  getBoundingBox,
  getTextContent,
  elementExists,
  captureScreenshot
} from './page.js';

export {
  createAnalysisRecord,
  confirmedRecord,
  indeterminateRecord,
  skippedRecord,
  failedRecord,
  isActionableRecord,
  VIEWPORT_PRESETS,
  VALID_STATUSES,
  VALID_CONFIDENCE
} from './schema.js';

export {
  registerAnalyzer,
  getAnalyzer,
  hasAnalyzer,
  listAnalyzers,
  unregisterAnalyzer,
  clearAnalyzers,
  runAnalyzer
} from './analyzer.js';

export {
  parseBrowserConfig,
  effectiveMode,
  DEFAULT_BROWSER_CONFIG
} from './config.js';

export {
  createSecurityPolicy,
  routeRequest,
  isNavigationAllowed,
  isWithinScanRoot,
  hasPathTraversal
} from './security.js';
