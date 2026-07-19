/**
 * browser/page.js
 *
 * Controlled page adapter for browser-assisted analysis.
 * Wraps a Playwright page with security policy, timeouts,
 * evidence helpers, and readiness detection.
 */

import { VIEWPORT_PRESETS } from './schema.js';
import { isWithinScanRoot, hasPathTraversal } from './security.js';
import { resolve } from 'node:path';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';

const DEFAULT_PAGE_TIMEOUT = 10_000;

/**
 * @typedef {object} PageAdapter
 * @property {import('playwright').Page} page
 * @property {string} viewportName
 * @property {string} browserVersion
 * @property {number} pageTimeout
 * @property {string} scanRoot
 * @property {AbortSignal} operationSignal
 */

/**
 * Apply viewport settings to a page.
 *
 * @param {import('playwright').Page} page
 * @param {string} viewportName - 'desktop' or 'mobile'
 */
export async function setViewport(page, viewportName) {
  const preset = VIEWPORT_PRESETS[viewportName];
  if (!preset) {
    throw new Error(
      `Unknown viewport '${viewportName}'. Use 'desktop' (1440x900) or 'mobile' (390x844).`
    );
  }
  await page.setViewportSize({
    width: preset.width,
    height: preset.height
  });
  // Device scale factor is set via browser context, not per-page
}

/**
 * Navigate to a local HTML file and wait for readiness.
 *
 * Readiness sequence:
 * 1. Navigation completes
 * 2. DOMContentLoaded fires
 * 3. One requestAnimationFrame callback executes (or equivalent style/layout flush)
 *
 * Does NOT use networkidle.
 *
 * @param {import('playwright').Page} page
 * @param {string} fileUrl - file:// URL to navigate to
 * @param {number} [timeout=10000] - timeout in milliseconds
 */
export async function navigateAndWait(page, fileUrl, timeout = DEFAULT_PAGE_TIMEOUT) {
  await page.goto(fileUrl, {
    waitUntil: 'domcontentloaded',
    timeout
  });

  // Wait for one animation frame to ensure style/layout has been computed
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
}

/**
 * Wait for a local file ready for analysis.
 * This ensures the DOM is fully parsed, styles are applied,
 * and the page has rendered at least one frame.
 *
 * @param {import('playwright').Page} page
 * @param {string} filePath - absolute path to local file
 * @param {string} viewportName
 * @param {number} [timeout=10000]
 */
export async function loadLocalPage(page, filePath, viewportName, timeout = DEFAULT_PAGE_TIMEOUT) {
  await setViewport(page, viewportName);

  const fileUrl = pathToFileUrl(filePath);
  await navigateAndWait(page, fileUrl, timeout);
}

/**
 * Convert an absolute file path to a file:// URL.
 *
 * @param {string} filePath
 * @returns {string}
 */
function pathToFileUrl(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  // Ensure the path starts with /
  const withLeadingSlash = normalized.startsWith('/') ? normalized : `/${normalized}`;
  return `file://${withLeadingSlash}`;
}

/**
 * Resolve a relative asset path against a file's directory,
 * verify it's within the scan root, and return the absolute path.
 *
 * @param {string} filePath - absolute path to the HTML file
 * @param {string} relativePath - relative asset reference (e.g. './style.css')
 * @param {string} scanRoot - absolute scan root path
 * @returns {{ path: string, url: string }|null} resolved path and file URL, or null if rejected
 */
export function resolveLocalAsset(filePath, relativePath, scanRoot) {
  if (hasPathTraversal(relativePath)) {
    return null;
  }

  const dir = filePath.substring(0, filePath.lastIndexOf('/'));
  const resolved = resolve(dir, relativePath).replace(/\\/g, '/');

  if (!isWithinScanRoot(resolved, scanRoot)) {
    return null;
  }

  return {
    path: resolved,
    url: pathToFileUrl(resolved)
  };
}

/**
 * Get the computed style of an element.
 * Helps analyzers extract rendered CSS values.
 *
 * @param {import('playwright').Page} page
 * @param {string} selector - CSS selector
 * @param {string} property - CSS property name
 * @returns {Promise<string|null>}
 */
export async function getComputedStyle(page, selector, property) {
  try {
    return await page.evaluate(
      ({ sel, prop }) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        return getComputedStyle(el).getPropertyValue(prop);
      },
      { sel: selector, prop: property }
    );
  } catch {
    return null;
  }
}

/**
 * Get the bounding box of an element.
 * Helps analyzers measure touch targets and layout.
 *
 * @param {import('playwright').Page} page
 * @param {string} selector - CSS selector
 * @returns {Promise<{x:number,y:number,width:number,height:number,top:number,right:number,bottom:number,left:number}|null>}
 */
export async function getBoundingBox(page, selector) {
  try {
    return await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left
      };
    }, selector);
  } catch {
    return null;
  }
}

/**
 * Get rendered text content of an element.
 *
 * @param {import('playwright').Page} page
 * @param {string} selector - CSS selector
 * @returns {Promise<string|null>}
 */
export async function getTextContent(page, selector) {
  try {
    return await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return el ? el.textContent : null;
    }, selector);
  } catch {
    return null;
  }
}

/**
 * Take a screenshot of the current page (for evidence, not analysis).
 *
 * @param {import('playwright').Page} page
 * @returns {Promise<Buffer|null>} PNG buffer
 */
export async function captureScreenshot(page) {
  try {
    return await page.screenshot({ type: 'png' });
  } catch {
    return null;
  }
}

/**
 * Check if a CSS selector exists in the page.
 *
 * @param {import('playwright').Page} page
 * @param {string} selector
 * @returns {Promise<boolean>}
 */
export async function elementExists(page, selector) {
  try {
    return await page.evaluate((sel) => document.querySelector(sel) !== null, selector);
  } catch {
    return false;
  }
}
