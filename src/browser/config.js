/**
 * browser/config.js
 *
 * Browser-analysis configuration parsing and validation.
 * Extends the existing Design Canon config with optional browser settings.
 */

/**
 * @typedef {object} BrowserConfig
 * @property {'static'|'auto'|'browser'} [mode='static'] - analysis execution mode
 * @property {'desktop'|'mobile'} [viewport='desktop'] - viewport preset
 * @property {boolean} [javaScriptEnabled=true] - enable JavaScript execution
 * @property {'light'|'dark'} [colorScheme='light'] - preferred color scheme
 * @property {number} [concurrency=2] - max concurrent browser pages
 * @property {number} [pageTimeout=10000] - per-page timeout in ms
 * @property {number} [operationTimeout=60000] - total operation timeout in ms
 */

/**
 * Default browser configuration.
 *
 * @type {BrowserConfig}
 */
export const DEFAULT_BROWSER_CONFIG = {
  mode: 'static',
  viewport: 'desktop',
  javaScriptEnabled: true,
  colorScheme: 'light',
  concurrency: 2,
  pageTimeout: 10_000,
  operationTimeout: 60_000
};

const VALID_MODES = new Set(['static', 'auto', 'browser']);
const VALID_VIEWPORTS = new Set(['desktop', 'mobile']);
const VALID_COLOR_SCHEMES = new Set(['light', 'dark']);

/**
 * Parse and validate browser configuration from a config object.
 *
 * @param {object} raw - raw browser config (e.g. from design-canon.config.json)
 * @returns {BrowserConfig}
 */
export function parseBrowserConfig(raw = {}) {
  const config = { ...DEFAULT_BROWSER_CONFIG };

  if (raw.mode !== undefined) {
    if (!VALID_MODES.has(raw.mode)) {
      throw new Error(
        `Invalid browser mode '${raw.mode}'. Use 'static', 'auto', or 'browser'.`
      );
    }
    config.mode = raw.mode;
  }

  if (raw.viewport !== undefined) {
    if (!VALID_VIEWPORTS.has(raw.viewport)) {
      throw new Error(
        `Invalid viewport '${raw.viewport}'. Use 'desktop' or 'mobile'.`
      );
    }
    config.viewport = raw.viewport;
  }

  if (raw.javaScriptEnabled !== undefined) {
    if (typeof raw.javaScriptEnabled !== 'boolean') {
      throw new Error('javaScriptEnabled must be a boolean.');
    }
    config.javaScriptEnabled = raw.javaScriptEnabled;
  }

  if (raw.colorScheme !== undefined) {
    if (!VALID_COLOR_SCHEMES.has(raw.colorScheme)) {
      throw new Error(
        `Invalid color scheme '${raw.colorScheme}'. Use 'light' or 'dark'.`
      );
    }
    config.colorScheme = raw.colorScheme;
  }

  if (raw.concurrency !== undefined) {
    if (!Number.isInteger(raw.concurrency) || raw.concurrency < 1 || raw.concurrency > 10) {
      throw new Error('concurrency must be an integer between 1 and 10.');
    }
    config.concurrency = raw.concurrency;
  }

  if (raw.pageTimeout !== undefined) {
    if (!Number.isInteger(raw.pageTimeout) || raw.pageTimeout < 1000 || raw.pageTimeout > 120000) {
      throw new Error('pageTimeout must be an integer between 1000 and 120000 ms.');
    }
    config.pageTimeout = raw.pageTimeout;
  }

  if (raw.operationTimeout !== undefined) {
    if (!Number.isInteger(raw.operationTimeout) || raw.operationTimeout < 5000 || raw.operationTimeout > 300000) {
      throw new Error('operationTimeout must be an integer between 5000 and 300000 ms.');
    }
    config.operationTimeout = raw.operationTimeout;
  }

  return config;
}

/**
 * Determine the effective CLI mode, respecting config defaults.
 *
 * @param {object} options
 * @param {'static'|'auto'|'browser'|null} [options.cliMode] - from --mode flag
 * @param {BrowserConfig} [options.browserConfig] - from config file
 * @returns {'static'|'auto'|'browser'}
 */
export function effectiveMode({ cliMode, browserConfig = DEFAULT_BROWSER_CONFIG } = {}) {
  if (cliMode && VALID_MODES.has(cliMode)) {
    return cliMode;
  }
  return browserConfig.mode ?? 'static';
}
