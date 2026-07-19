/**
 * browser/launcher.js
 *
 * Browser lifecycle management.
 * One Chromium process per lint operation.
 * Fresh browser context per page (no state leakage).
 */

import { createSecurityPolicy, routeRequest, isNavigationAllowed } from './security.js';

const DEFAULT_CONCURRENCY = 2;
const DEFAULT_PAGE_TIMEOUT = 10_000;
const DEFAULT_OPERATION_TIMEOUT = 60_000;

/**
 * @typedef {object} BrowserInstance
 * @property {import('playwright').Browser} browser
 * @property {string} browserVersion
 * @property {number} concurrency
 * @property {number} pageTimeout
 * @property {boolean} javaScriptEnabled
 * @property {'light'|'dark'} colorScheme
 * @property {AbortController} operationController
 * @property {number} deadline
 * @property {Set<import('playwright').Page>} activePages
 * @property {object} securityPolicy
 */

/**
 * Launch a Chromium browser instance for analysis.
 *
 * @param {object} [options]
 * @param {number} [options.concurrency=2] - max concurrent pages
 * @param {number} [options.pageTimeout=10000] - per-page timeout in ms
 * @param {number} [options.operationTimeout=60000] - total operation timeout in ms
 * @param {boolean} [options.javaScriptEnabled=true] - enable JS execution
 * @param {'light'|'dark'} [options.colorScheme='light'] - preferred color scheme
 * @param {string} [options.scanRoot] - normalized scan root
 * @returns {Promise<BrowserInstance>}
 */
export async function launchBrowser(options = {}) {
  const {
    concurrency = DEFAULT_CONCURRENCY,
    pageTimeout = DEFAULT_PAGE_TIMEOUT,
    operationTimeout = DEFAULT_OPERATION_TIMEOUT,
    javaScriptEnabled = true,
    colorScheme = 'light',
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

  const deadline = Date.now() + operationTimeout;
  const operationController = new AbortController();

  let browser;
  try {
    browser = await playwright.chromium.launch({
      headless: true,
      timeout: Math.min(30_000, operationTimeout)
    });
  } catch (err) {
    throw new Error(`Failed to launch Chromium: ${err.message}`);
  }

  const browserVersion = browser.version();
  const securityPolicy = createSecurityPolicy({ scanRoot: toFileUrl(scanRoot) });

  // Register a single context-level service-worker blocker.
  // Per-page contexts get their own isolation.
  browser.on('disconnected', () => {
    operationController.abort(new Error('Browser disconnected.'));
  });

  return {
    browser,
    browserVersion,
    concurrency,
    pageTimeout,
    javaScriptEnabled,
    colorScheme,
    operationController,
    deadline,
    activePages: new Set(),
    securityPolicy
  };
}

/**
 * Create an isolated browser context and page for a single analysis.
 * Fresh context per call — no cookies, storage, or permissions leak.
 *
 * @param {BrowserInstance} instance
 * @returns {Promise<import('playwright').Page>}
 */
export async function createAnalysisPage(instance) {
  if (instance.operationController.signal.aborted) {
    throw new Error('Operation was cancelled before page could be created.');
  }

  // Check deadline
  if (Date.now() > instance.deadline) {
    throw new Error('Operation deadline exceeded before page could be created.');
  }

  await waitForConcurrencySlot(instance);

  // Fresh isolated context per page
  const context = await instance.browser.newContext({
    ignoreHTTPSErrors: false,
    bypassCSP: false,
    javaScriptEnabled: instance.javaScriptEnabled,
    colorScheme: instance.colorScheme,
    userAgent: 'DesignCanon/1.0'
  });

  // Apply security policy at the context level (not per-page event)
  await context.route('**/*', async (route) => {
    const requestUrl = route.request().url();
    const isNavigation = route.request().isNavigationRequest();

    // Block external navigations
    if (isNavigation && !isNavigationAllowed(requestUrl, instance.securityPolicy)) {
      await route.abort('blockedbyclient');
      return;
    }

    const action = routeRequest(requestUrl, instance.securityPolicy);
    if (action === 'abort') {
      await route.abort('blockedbyclient');
    } else {
      await route.continue();
    }
  });

  // Deny all permission requests
  await context.grantPermissions([]);

  // Block service worker registration
  await context.addInitScript(() => {
    if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
      navigator.serviceWorker.register = () =>
        Promise.reject(new Error('Service workers are disabled by Design Canon security policy.'));
    }
  });

  const page = await context.newPage();

  // Block popups at the context level.
  // Registered AFTER newPage() so the primary analysis page is NOT
  // closed by the handler — only subsequent popup pages are caught.
  context.on('page', async (popupPage) => {
    await popupPage.close().catch(() => {});
  });
  page.setDefaultTimeout(instance.pageTimeout);
  instance.activePages.add(page);

  // Block downloads
  page.on('download', async (download) => {
    await download.cancel().catch(() => {});
  });

  // Auto-dismiss dialogs
  page.on('dialog', async (dialog) => {
    await dialog.dismiss().catch(() => {});
  });

  // Clean up tracking on close
  page.on('close', () => {
    instance.activePages.delete(page);
  });

  return page;
}

/**
 * Wait until concurrency is available.
 * Checks both page count and operation deadline.
 *
 * @param {BrowserInstance} instance
 */
async function waitForConcurrencySlot(instance) {
  while (instance.activePages.size >= instance.concurrency) {
    if (instance.operationController.signal.aborted) {
      throw new Error('Operation was cancelled while waiting for a concurrency slot.');
    }
    if (Date.now() > instance.deadline) {
      throw new Error('Operation deadline exceeded while waiting for a concurrency slot.');
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

/**
 * Close a single analysis page and its context.
 *
 * @param {import('playwright').Page} page
 */
export async function closeAnalysisPage(page) {
  try {
    const context = page.context();
    // Close the context which closes the page and all its children
    await context.close();
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
  instance.operationController.abort(new Error('Browser closing.'));

  // Close all active pages
  for (const page of instance.activePages) {
    try {
      await page.context().close();
    } catch {
      // Best-effort cleanup
    }
  }
  instance.activePages.clear();

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
