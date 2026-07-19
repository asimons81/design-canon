/**
 * browser/capability.js
 *
 * Deterministic Playwright/Chromium capability detection.
 * Results are cached for the duration of the lint operation.
 */

let cachedCapability = null;

/**
 * @typedef {object} BrowserCapability
 * @property {boolean} playwrightAvailable - true if the playwright module can be imported
 * @property {boolean} chromiumAvailable - true if playwright's chromium can be launched
 * @property {string|null} chromiumVersion - installed chromium version string, or null
 * @property {string|null} error - human-readable error message if unavailable
 */

/**
 * Check whether Playwright and Chromium are available.
 * Result is cached after the first call.
 *
 * @returns {Promise<BrowserCapability>}
 */
export async function detectBrowserCapability() {
  if (cachedCapability) {
    return cachedCapability;
  }

  const result = await probeCapability();
  cachedCapability = result;
  return result;
}

/**
 * Reset the cached capability result. Used in tests and when
 * the runtime environment may have changed between operations.
 */
export function resetCapabilityCache() {
  cachedCapability = null;
}

async function probeCapability() {
  // Check Playwright module availability
  let playwright;
  try {
    // Fast synchronous check: does node_modules/playwright exist?
    const { statSync } = await import('node:fs');
    const { resolve, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const { homedir } = await import('node:os');

    // Resolve playwright from several likely locations
    const candidates = [
      resolve(process.cwd(), 'node_modules', 'playwright'),
      resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'node_modules', 'playwright'),
      resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', 'playwright'),
      resolve(homedir(), 'node_modules', 'playwright')
    ];
    let found = false;
    for (const candidate of candidates) {
      try {
        statSync(candidate);
        found = true;
        break;
      } catch {
        continue;
      }
    }
    if (!found) {
      return {
        playwrightAvailable: false,
        chromiumAvailable: false,
        chromiumVersion: null,
        error:
          'Playwright is not installed. Run "npx playwright install chromium" to enable browser-assisted analysis.'
      };
    }
    // Use a promise race to limit import time
    playwright = await Promise.race([
      import('playwright'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Import timed out')), 500))
    ]);
  } catch {
    return {
      playwrightAvailable: false,
      chromiumAvailable: false,
      chromiumVersion: null,
      error:
        'Playwright is not installed. Run "npx playwright install chromium" to enable browser-assisted analysis.'
    };
  }

  // Check Chromium availability
  if (!playwright.chromium) {
    return {
      playwrightAvailable: true,
      chromiumAvailable: false,
      chromiumVersion: null,
      error:
        'Playwright is installed but Chromium was not found. Run "npx playwright install chromium" to install it.'
    };
  }

  // Probe Chromium version
  let browser;
  try {
    browser = await playwright.chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    const version = await page.evaluate(() => navigator.userAgent);
    await context.close();
    await browser.close();

    return {
      playwrightAvailable: true,
      chromiumAvailable: true,
      chromiumVersion: version,
      error: null
    };
  } catch (err) {
    // Cleanup on failure
    if (browser) {
      try {
        await browser.close();
      } catch {
        // Best-effort cleanup
      }
    }
    return {
      playwrightAvailable: true,
      chromiumAvailable: false,
      chromiumVersion: null,
      error: `Chromium launch failed: ${err.message}`
    };
  }
}

/**
 * Determine the effective analysis mode based on CLI mode and capability.
 *
 * @param {'static'|'auto'|'browser'} requestedMode
 * @param {BrowserCapability} capability
 * @returns {{ mode: 'static'|'auto'|'browser', available: boolean, skipped: boolean, error: string|null }}
 */
export function resolveMode(requestedMode, capability) {
  if (requestedMode === 'static') {
    return { mode: 'static', available: true, skipped: false, error: null };
  }

  if (requestedMode === 'auto') {
    if (capability.chromiumAvailable) {
      return { mode: 'auto', available: true, skipped: false, error: null };
    }
    // Auto mode skips silently when browser is unavailable
    return { mode: 'auto', available: false, skipped: true, error: null };
  }

  if (requestedMode === 'browser') {
    if (capability.chromiumAvailable) {
      return { mode: 'browser', available: true, skipped: false, error: null };
    }
    // Browser mode produces an explicit error
    return {
      mode: 'browser',
      available: false,
      skipped: false,
      error: capability.error ?? 'Browser runtime is not available.'
    };
  }

  return {
    mode: 'static',
    available: true,
    skipped: false,
    error: null
  };
}
