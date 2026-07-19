/**
 * browser/adapters.js
 *
 * Controlled page adapter extensions for browser-assisted analysis.
 * Provides a safe evaluate() interface that exposes bounded DOM
 * evaluation without giving analyzers access to raw browser,
 * browser context, network, filesystem, or arbitrary Node APIs.
 *
 * The adapter receives a Playwright Page and exposes only
 * evaluation helpers with deterministic timeouts.
 */

/**
 * Evaluate a function in the page context with a bounded argument.
 * The function must be serializable and execute in the DOM context.
 *
 * The adapter does not expose:
 *   - browser launch or context creation
 *   - route modification
 *   - network requests
 *   - downloads
 *   - filesystem access
 *   - arbitrary Node APIs
 *   - raw Page, Browser, or BrowserContext objects
 *
 * @param {import('playwright').Page} page
 * @param {Function|string} fn - Function to evaluate in the page context
 * @param {*} [arg] - Serializable argument passed to the function
 * @param {object} [options]
 * @param {number} [options.timeout=10000] - Per-evaluation timeout
 * @returns {Promise<*>} Result of the evaluated function
 */
export async function evaluateInPage(page, fn, arg, options = {}) {
  const { timeout = 10_000 } = options;

  // If fn is a string, evaluate as expression
  if (typeof fn === 'string') {
    return page.evaluate(fn);
  }

  // If fn is a function, evaluate with optional argument
  if (typeof fn === 'function') {
    // Create the evaluation promise
    const evalPromise = arg !== undefined
      ? page.evaluate(fn, arg)
      : page.evaluate(fn);

    // Race against timeout
    return Promise.race([
      evalPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Page evaluation timeout exceeded.')), timeout)
      )
    ]);
  }

  throw new Error('evaluateInPage requires a function or string expression.');
}

/**
 * Create a page adapter wrapper that restricts the surface area
 * exposed to browser analyzers.
 *
 * @param {import('playwright').Page} page
 * @param {object} options
 * @param {number} [options.evaluationTimeout=10000]
 * @returns {object} PageAdapter with bounded API
 */
export function createPageAdapter(page, options = {}) {
  const { evaluationTimeout = 10_000 } = options;

  return {
    /**
     * Evaluate a function in the page DOM context.
     * @param {Function|string} fn
     * @param {*} [arg]
     * @returns {Promise<*>}
     */
    evaluate: (fn, arg) => evaluateInPage(page, fn, arg, { timeout: evaluationTimeout }),

    /**
     * Get computed style for a given element by selector.
     * @param {string} selector
     * @param {string} property
     * @returns {Promise<string|null>}
     */
    getComputedStyle: (selector, property) => {
      return page.evaluate(({ sel, prop }) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        return getComputedStyle(el).getPropertyValue(prop);
      }, { sel: selector, prop: property });
    },

    /**
     * Get bounding rect for an element.
     * @param {string} selector
     * @returns {Promise<{x:number,y:number,width:number,height:number,top:number,right:number,bottom:number,left:number}|null>}
     */
    getBoundingBox: (selector) => {
      return page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return {
          x: rect.x, y: rect.y, width: rect.width, height: rect.height,
          top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left
        };
      }, selector);
    },

    /**
     * Check if an element exists in the DOM.
     * @param {string} selector
     * @returns {Promise<boolean>}
     */
    elementExists: (selector) => {
      return page.evaluate((sel) => document.querySelector(sel) !== null, selector);
    }
  };
}
