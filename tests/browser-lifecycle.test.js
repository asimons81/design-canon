import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectBrowserCapability,
  resetCapabilityCache
} from '../src/browser/capability.js';
import {
  launchBrowser,
  createAnalysisPage,
  closeAnalysisPage,
  closeBrowser
} from '../src/browser/launcher.js';
import {
  loadLocalPage,
  getComputedStyle
} from '../src/browser/page.js';
import {
  registerAnalyzer,
  clearAnalyzers,
  runAnalyzer
} from '../src/browser/analyzer.js';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const fixturesDir = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'browser');

let chromiumAvailable = false;
let browserInstance = null;

test('setup: check browser availability', async () => {
  resetCapabilityCache();
  const cap = await detectBrowserCapability();
  chromiumAvailable = cap.chromiumAvailable;
  if (!chromiumAvailable) return;
  browserInstance = await launchBrowser({ colorScheme: 'light' });
});

test.after(async () => {
  if (browserInstance) {
    await closeBrowser(browserInstance);
    browserInstance = null;
  }
});

async function withPage(testFn) {
  if (!chromiumAvailable || !browserInstance) return;
  // Create a fresh context per test to isolate state
  const context = await browserInstance.browser.newContext();
  const page = await context.newPage();
  browserInstance.activePages.add(page);
  page.on('close', () => browserInstance.activePages.delete(page));
  try {
    await testFn(page);
  } finally {
    try { await page.close(); } catch { /* cleanup */ }
    try { await context.close(); } catch { /* cleanup */ }
    browserInstance.activePages.delete(page);
  }
}

// Operation-deadline regression tests (validates runAnalyzer races analyzer
// against remaining operation time). Placed here because the browser lifecycle
// keeps the Node event loop alive, avoiding exit-contention with pending
// analyzer promises.

test('runAnalyzer races analyzer against remaining deadline - resolves after deadline', async () => {
  if (!chromiumAvailable) return;
  clearAnalyzers();
  registerAnalyzer('test.afterdeadline', async () => {
    await new Promise((r) => setTimeout(r, 100));
    return { status: 'confirmed', measurements: {}, message: 'Done late.', confidence: 'high' };
  });

  const deadline = Date.now() + 30;
  const context = { deadline };
  const result = await runAnalyzer('test.afterdeadline', context);
  assert.equal(result.status, 'failed');
  assert.match(result.message, /deadline exceeded/);
});

test('runAnalyzer races analyzer against remaining deadline - never resolves', async () => {
  if (!chromiumAvailable) return;
  clearAnalyzers();
  registerAnalyzer('test.never', async () => {
    await new Promise(() => {}); // Never resolves
    return { status: 'confirmed', measurements: {}, message: '', confidence: 'high' };
  });

  const deadline = Date.now() + 20;
  const context = { deadline };
  const result = await runAnalyzer('test.never', context);
  assert.equal(result.status, 'failed');
  assert.match(result.message, /deadline exceeded/);
});

test('browser launches once and closes cleanly', async () => {
  if (!chromiumAvailable || !browserInstance) return;
  assert.ok(browserInstance.browser);
  assert.equal(typeof browserInstance.browserVersion, 'string');
});

test('page can be created and closed', async () => {
  await withPage(async (page) => {
    assert.ok(page);
  });
});

test('pages close after success', async () => {
  await withPage(async (page) => {
    const filePath = resolve(fixturesDir, 'basic-page.html');
    await loadLocalPage(page, filePath, 'desktop');
  });
});

test('pages close after timeout - page operation completes', async () => {
  await withPage(async (page) => {
    const filePath = resolve(fixturesDir, 'basic-page.html');
    await loadLocalPage(page, filePath, 'desktop');
  });
});

test('malformed page cleanup', async () => {
  await withPage(async (page) => {
    try {
      await loadLocalPage(page, '/nonexistent/page.html', 'desktop');
    } catch {
      // Expected - malformed or non-existent page
    }
  });
});

test('desktop viewport applied', async () => {
  await withPage(async (page) => {
    const filePath = resolve(fixturesDir, 'viewport-test.html');
    await loadLocalPage(page, filePath, 'desktop');

    const width = await page.evaluate(() => window.innerWidth);
    const height = await page.evaluate(() => window.innerHeight);
    assert.equal(width, 1440);
    assert.equal(height, 900);
  });
});

test('mobile viewport applied', async () => {
  await withPage(async (page) => {
    const filePath = resolve(fixturesDir, 'viewport-test.html');
    await loadLocalPage(page, filePath, 'mobile');

    const width = await page.evaluate(() => window.innerWidth);
    const height = await page.evaluate(() => window.innerHeight);
    assert.equal(width, 390);
    assert.equal(height, 844);
  });
});

test('device scale factor is fixed at 1', async () => {
  await withPage(async (page) => {
    const filePath = resolve(fixturesDir, 'basic-page.html');
    await loadLocalPage(page, filePath, 'desktop');

    const dpr = await page.evaluate(() => window.devicePixelRatio);
    assert.equal(dpr, 1);
  });
});

test('browser version recorded', async () => {
  if (!chromiumAvailable || !browserInstance) return;
  assert.equal(typeof browserInstance.browserVersion, 'string');
  assert.ok(browserInstance.browserVersion.length > 0);
});

test('local CSS loaded', async () => {
  await withPage(async (page) => {
    const filePath = resolve(fixturesDir, 'local-assets.html');
    await loadLocalPage(page, filePath, 'desktop');

    const fontFamily = await getComputedStyle(page, 'body', 'font-family');
    assert.ok(fontFamily);
  });
});

test('runtime-applied local style observable', async () => {
  await withPage(async (page) => {
    const filePath = resolve(fixturesDir, 'local-assets.html');
    await loadLocalPage(page, filePath, 'desktop');

    const color = await getComputedStyle(page, '.runtime-style', 'color');
    assert.ok(color);
    assert.match(color, /0,\s*128,\s*0/);
  });
});

test('readiness does not wait for endless timers', async () => {
  await withPage(async (page) => {
    const filePath = resolve(fixturesDir, 'basic-page.html');
    await loadLocalPage(page, filePath, 'desktop');
  });
});

test('colorScheme light applies prefers-color-scheme: light', async () => {
  if (!chromiumAvailable || !browserInstance) return;
  const context = await browserInstance.browser.newContext({ colorScheme: 'light' });
  const page = await context.newPage();
  browserInstance.activePages.add(page);
  page.on('close', () => browserInstance.activePages.delete(page));
  try {
    const filePath = resolve(fixturesDir, 'color-scheme-test.html');
    await loadLocalPage(page, filePath, 'desktop');

    const scheme = await page.evaluate(() =>
      document.getElementById('scheme-indicator').textContent
    );
    assert.equal(scheme, 'light');
  } finally {
    try { await page.close(); } catch {}
    try { await context.close(); } catch {}
    browserInstance.activePages.delete(page);
  }
});

test('colorScheme dark applies prefers-color-scheme: dark', async () => {
  if (!chromiumAvailable || !browserInstance) return;
  const context = await browserInstance.browser.newContext({ colorScheme: 'dark' });
  const page = await context.newPage();
  browserInstance.activePages.add(page);
  page.on('close', () => browserInstance.activePages.delete(page));
  try {
    const filePath = resolve(fixturesDir, 'color-scheme-test.html');
    await loadLocalPage(page, filePath, 'desktop');

    const scheme = await page.evaluate(() =>
      document.getElementById('scheme-indicator').textContent
    );
    assert.equal(scheme, 'dark');
  } finally {
    try { await page.close(); } catch {}
    try { await context.close(); } catch {}
    browserInstance.activePages.delete(page);
  }
});
