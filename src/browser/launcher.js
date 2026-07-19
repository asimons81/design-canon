/**
 * browser/launcher.js
 *
 * Browser lifecycle management.
 * One Chromium process per lint operation.
 * Isolated browser context per page.
 * Maximum two concurrent pages by default.
 */

import { createSecurityPolicy, routeRequest, isNavigationAllowed } from './security.js';

const DEFAULT_CONCURRENCY = 2;
const DEFAULT_PAGE_TIMEOUT = 10_000;
const DEFAULT_OPERATION_TIMEOUT = 60_000;

/**
 * @typedef {object} BrowserInstance
 * @property {import('playwright').Browser} browser
 * @property {import('playwright').BrowserContext} context
 * @property {string} browserVersion
 * @property {number} concurrency
 * @property {Set<import('playwright').Page>} activePages
 * @property {AbortController} operationController
 */

/**
 * Launch a Chromium browser instance for analysis.
 *
 * @param {object} [options]
 * @param {number} [options.concurrency=2] - max concurrent pages
 * @param {number} [options.pageTimeout=10000] - per-page timeout in ms
 * @param {number} [options.operationTimeout=60000] - total operation timeout in ms
 * @param {object} [options.securityPolicy] - security policy overrides
 * @param {string} [options.scanRoot] - normalized scan root
 * @returns {Promise<BrowserInstance>}
 */
export async function launchBrowser(options = {}) {
  const {
    concurrency = DEFAULT_CONCURRENCY,
    pageTimeout = DEFAULT_PAGE_TIMEOUT,
    operationTimeout = DEFAULT_OPERATION_TIMEOUT,
    scanRoot = process.cwd()
  } = options;

  // Dynamic import to keep Playwright optional
  let playwright;
  try {
    playwright = await import('playwright');
  } catch (err) {
    throw new Error(
      `Playwright is not installed. Run "npx playwright install chromium" to enable browser-assisted analysis. Original error: ${err.message}`
    );
  }

  const operationController = new AbortController();
  const totalTimeout = setTimeout(() => {
    operationController.abort(new Error(`Operation timed out after ${operationTimeout}ms`));
  }, operationTimeout);

  const securityPolicy = createSecurityPolicy({ scanRoot: toFileUrl(scanRoot) });

  let browser;
  try {
    browser = await playwright.chromium.launch({
      headless: true,
      timeout: 30_000
    });
  } catch (err) {
    clearTimeout(totalTimeout);
    throw new Error(`Failed to launch Chromium: ${err.message}`);
  }

  const browserVersion = browser.version();

  const context = await browser.newContext({
    ignoreHTTPSErrors: false,
    bypassCSP: false,
    javaScriptEnabled: true,
    userAgent: 'DesignCanon/1.0'
  });

  // Block background service worker registration
  await context.addInitScript(() => {
    // Override service worker registration to no-op
    if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
      navigator.serviceWorker.register = () =>
        Promise.reject(new Error('Service workers are disabled by Design Canon security policy.'));
    }
  });

  // Apply security policy to all new pages
  context.on('page', async (page) => {
    // Route requests through security policy
    await page.route('**/*', async (route) => {
      const action = routeRequest(route.request().url(), securityPolicy);
      if (action === 'abort') {
        await route.abort('blockedbyclient');
      } else {
        await route.continue();
      }
    });

    // Block popups
    context.on('page', async (popupPage) => {
      if (securityPolicy.blockPopups) {
        await popupPage.close().catch(() => {});
      }
    });

    // Block downloads
    page.on('download', async (download) => {
      if (securityPolicy.blockDownloads) {
        await download.cancel().catch(() => {});
      }
    });

    // Block dialogs
    page.on('dialog', async (dialog) => {
      if (securityPolicy.dismissDialogs) {
        await dialog.dismiss().catch(() => {});
      }
    });

    // Block external navigation
    page.on('framenavigated', async (frame) => {
      if (frame === page.mainFrame()) {
        const url = frame.url();
        if (!isNavigationAllowed(url, securityPolicy)) {
          // Navigation was blocked — the page stays on the current URL
          // We don't navigate back as that could create a loop
        }
      }
    });
  });

  // Deny all permission requests at the context level
  await context.grantPermissions([]);

  clearTimeout(totalTimeout);

  return {
    browser,
    context,
    browserVersion,
    concurrency,
    activePages: new Set(),
    operationController
  };
}

/**
 * Create an isolated browser context for a single page analysis.
 *
 * @param {BrowserInstance} instance
 * @returns {Promise<import('playwright').Page>}
 */
export async function createAnalysisPage(instance) {
  await waitForConcurrencySlot(instance);

  const page = await instance.context.newPage();
  instance.activePages.add(page);

  // Set default timeout
  page.setDefaultTimeout(DEFAULT_PAGE_TIMEOUT);

  // Clean up on close
  page.on('close', () => {
    instance.activePages.delete(page);
  });

  return page;
}

/**
 * Wait until concurrency is available.
 *
 * @param {BrowserInstance} instance
 */
async function waitForConcurrencySlot(instance) {
  while (instance.activePages.size >= instance.concurrency) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

/**
 * Close a single analysis page.
 *
 * @param {import('playwright').Page} page
 */
export async function closeAnalysisPage(page) {
  try {
    await page.close();
  } catch {
    // Best-effort cleanup
  }
}

/**
 * Close the browser instance and release resources.
 *
 * @param {BrowserInstance} instance
 */
export async function closeBrowser(instance) {
  // Close all active pages
  for (const page of instance.activePages) {
    try {
      await page.close();
    } catch {
      // Best-effort cleanup
    }
  }
  instance.activePages.clear();

  // Close context
  try {
    await instance.context.close();
  } catch {
    // Best-effort cleanup
  }

  // Close browser
  try {
    await instance.browser.close();
  } catch {
    // Best-effort cleanup
  }
}

/**
 * Convert a file path to a file:// URL.
 *
 * @param {string} filePath
 * @returns {string}
 */
function toFileUrl(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  return `file://${normalized.startsWith('/') ? '' : '/'}${normalized}`;
}
