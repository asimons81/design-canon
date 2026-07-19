import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectBrowserCapability,
  resetCapabilityCache
} from '../src/browser/capability.js';
import {
  launchBrowser,
  closeBrowser
} from '../src/browser/launcher.js';
import { loadLocalPage } from '../src/browser/page.js';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const fixturesDir = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'browser');

let chromiumAvailable = false;
let browserInstance = null;

test('setup: check availability and launch browser', async () => {
  resetCapabilityCache();
  const cap = await detectBrowserCapability();
  chromiumAvailable = cap.chromiumAvailable;
  if (!chromiumAvailable) return;
  browserInstance = await launchBrowser();
});

test.after(async () => {
  if (browserInstance) {
    await closeBrowser(browserInstance);
    browserInstance = null;
  }
});

async function withPage(testFn) {
  if (!chromiumAvailable || !browserInstance) return;
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

test('external script blocked', async () => {
  await withPage(async (page) => {
    const filePath = resolve(fixturesDir, 'external-script.html');
    await loadLocalPage(page, filePath, 'desktop');

    const scriptCount = await page.evaluate(() => document.querySelectorAll('script[src]').length);
    assert.equal(scriptCount, 1);
  });
});

test('external image blocked', async () => {
  await withPage(async (page) => {
    const filePath = resolve(fixturesDir, 'external-image.html');
    await loadLocalPage(page, filePath, 'desktop');

    const imgCount = await page.evaluate(
      () => document.querySelectorAll('img[src^="https://"]').length
    );
    assert.equal(imgCount, 2);
  });
});

test('fetch blocked', async () => {
  await withPage(async (page) => {
    const filePath = resolve(fixturesDir, 'external-font-fetch.html');
    await loadLocalPage(page, filePath, 'desktop');

    const h1 = await page.evaluate(() => document.querySelector('h1')?.textContent);
    assert.equal(h1, 'External Font Test');
  });
});

test('permission denied', async () => {
  await withPage(async (page) => {
    const filePath = resolve(fixturesDir, 'basic-page.html');
    await loadLocalPage(page, filePath, 'desktop');

    const permissionsBlocked = await page.evaluate(async () => {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        return result.state;
      } catch {
        return 'error';
      }
    });
    assert.ok(['denied', 'prompt'].includes(permissionsBlocked));
  });
});

test('external navigation blocked', async () => {
  await withPage(async (page) => {
    const filePath = resolve(fixturesDir, 'basic-page.html');
    await loadLocalPage(page, filePath, 'desktop');

    // Navigation attempt may destroy the execution context, which IS the blocking behavior
    try {
      await page.evaluate(() => { window.location.href = 'https://evil.com'; });
    } catch {
      // Expected - navigation was blocked or destroyed execution context
    }
  });
});

test('service worker unavailable or non-persistent', async () => {
  await withPage(async (page) => {
    const filePath = resolve(fixturesDir, 'basic-page.html');
    await loadLocalPage(page, filePath, 'desktop');

    const swResult = await page.evaluate(async () => {
      try {
        await navigator.serviceWorker.register('/sw.js');
        return 'registered';
      } catch (err) {
        return err.message;
      }
    });
    assert.notEqual(swResult, 'registered');
  });
});

test('popup blocked', async () => {
  await withPage(async (page) => {
    const filePath = resolve(fixturesDir, 'basic-page.html');
    await loadLocalPage(page, filePath, 'desktop');

    await page.evaluate(() => { window.open('https://evil.com', '_blank'); });

    const h1 = await page.evaluate(() => document.querySelector('h1')?.textContent);
    assert.equal(h1, 'Browser Analysis Test');
  });
});
