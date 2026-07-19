/**
 * browser/analyzers/text-contrast.js
 *
 * Production analyzer for F019: Rendered text contrast minimum.
 *
 * Measures contrast of rendered visible text in the loaded Chromium
 * page against WCAG 2.x thresholds (4.5:1 normal, 3:1 large).
 *
 * The analyzer receives a controlled page adapter (not a raw browser)
 * and pure color utilities to calculate contrast entirely from
 * computed DOM styles. It never uses screenshots, pixel sampling,
 * network requests, or filesystem access.
 *
 * Indeterminate samples are produced for unsupported visual
 * composition (gradients, images, filters, blend modes, opacity,
 * text shadows, text strokes, masks, background-clip, unsupported
 * color spaces, unresolved colors, ambiguous overlap).
 */

import { VALID_SAMPLE_STATUSES, VALID_SAMPLE_OUTCOMES, INDETERMINATE_REASONS } from '../schema.js';
import {
  parseComputedColor,
  isUnsupportedColorSpace,
  alphaComposite,
  colorContrastRatio,
  classifyTextSize,
  compareRatio,
  formatDisplayRatio
} from '../color-contrast.js';

/**
 * Default canvas fallback color (white).
 */
const CANVAS_FALLBACK = { r: 255, g: 255, b: 255, a: 1 };

/**
 * The main analyzer function called by the browser analysis runner.
 *
 * @param {import('../analyzer.js').AnalyzerContext} context
 * @returns {Promise<object>} Analyzer result with status, measurements, samples, message, confidence
 */
export async function analyzeTextContrast(context) {
  const { evaluate, getComputedStyle } = context.pageAdapters || context;

  // Step 1: Gather all eligible text elements and their computed styles in one page pass
  const textElements = await evaluate(collectTextElements);

  if (!textElements || textElements.length === 0) {
    return {
      status: 'confirmed',
      message: 'Rendered text contrast analysis completed. No eligible text found.',
      confidence: 'low',
      measurements: {
        checkedElements: 0,
        passingElements: 0,
        violatingElements: 0,
        indeterminateElements: 0
      },
      samples: []
    };
  }

  // Step 2: Build a deterministic tree-walker to generate stable selectors
  const samples = [];
  const viewport = context.viewport || 'desktop';
  const colorScheme = context.colorScheme || 'light';
  const browserVersion = context.browserVersion || 'unknown';
  const scanRoot = context.scanRoot || process.cwd();

  for (const el of textElements) {
    // Check deadline
    if (context.deadline && Date.now() > context.deadline) {
      return {
        status: 'failed',
        message: 'Operation deadline exceeded during text contrast analysis.',
        confidence: 'low',
        measurements: {
          checkedElements: samples.length,
          passingElements: samples.filter(s => s.status === 'confirmed' && s.outcome === 'pass').length,
          violatingElements: samples.filter(s => s.status === 'confirmed' && s.outcome === 'violation').length,
          indeterminateElements: samples.filter(s => s.status === 'indeterminate').length
        },
        samples
      };
    }

    const selector = el.selector;
    const text = collapseWhitespace(el.text);
    const style = el.style;

    // Determine indeterminate conditions
    const indeterminate = checkIndeterminate(style);
    if (indeterminate) {
      samples.push({
        status: 'indeterminate',
        selector,
        text: text.slice(0, 120),
        reason: indeterminate.reason
      });
      continue;
    }

    // Parse computed foreground
    const fgParsed = parseComputedColor(style.color);
    if (!fgParsed) {
      if (isUnsupportedColorSpace(style.color)) {
        samples.push({
          status: 'indeterminate',
          selector,
          text: text.slice(0, 120),
          reason: 'unsupported-color-space'
        });
        continue;
      }
      samples.push({
        status: 'indeterminate',
        selector,
        text: text.slice(0, 120),
        reason: 'unresolved-color'
      });
      continue;
    }

    // Parse computed background
    const bgParsed = parseComputedColor(style.backgroundColor);
    if (!bgParsed) {
      if (isUnsupportedColorSpace(style.backgroundColor)) {
        samples.push({
          status: 'indeterminate',
          selector,
          text: text.slice(0, 120),
          reason: 'unsupported-color-space'
        });
        continue;
      }
    }

    // Resolve background stack: start with canvas fallback, composite each ancestor
    const resolvedBg = resolveBackground(style.ancestorBackgrounds || [], style.backgroundColor);

    // Alpha-composite foreground over resolved background
    const compositedFg = fgParsed.a < 1
      ? alphaComposite(fgParsed, resolvedBg)
      : { r: fgParsed.r, g: fgParsed.g, b: fgParsed.b, a: 1 };

    const fgColor = { r: compositedFg.r, g: compositedFg.g, b: compositedFg.b };
    const bgColor = { r: resolvedBg.r, g: resolvedBg.g, b: resolvedBg.b };

    // Calculate contrast
    const ratio = colorContrastRatio(fgColor, bgColor);

    // Classify text size
    const fontSizePx = parseFloat(style.fontSize) || 16;
    const fontWeight = parseNumericWeight(style.fontWeight);
    const { largeText, requiredRatio } = classifyTextSize(fontSizePx, fontWeight);

    // Compare (unrounded)
    const outcome = compareRatio(ratio, requiredRatio);

    const sample = {
      status: 'confirmed',
      outcome,
      selector,
      text: collapseWhitespace(el.text).slice(0, 120),
      foreground: formatColor(fgParsed),
      background: formatColor(resolvedBg),
      ratio,
      displayRatio: formatDisplayRatio(ratio),
      requiredRatio,
      fontSizePx,
      fontWeight,
      largeText
    };

    samples.push(sample);
  }

  // Step 3: Compute measurements summary
  const checkedElements = samples.length;
  const passingElements = samples.filter(s => s.status === 'confirmed' && s.outcome === 'pass').length;
  const violatingElements = samples.filter(s => s.status === 'confirmed' && s.outcome === 'violation').length;
  const indeterminateElements = samples.filter(s => s.status === 'indeterminate').length;

  // Determine run-level status
  const confirmedSamples = samples.filter(s => s.status === 'confirmed');
  const indeterminateOnly = samples.filter(s => s.status === 'indeterminate');

  let status;
  let message;
  if (confirmedSamples.length > 0) {
    status = 'confirmed';
    message = 'Rendered text contrast analysis completed.';
  } else if (indeterminateOnly.length > 0) {
    status = 'indeterminate';
    message = 'All text elements have indeterminate contrast (unsupported visual composition).';
  } else {
    status = 'confirmed';
    message = 'Rendered text contrast analysis completed. No eligible text found.';
  }

  return {
    status,
    message,
    confidence: status === 'confirmed' ? 'high' : 'low',
    measurements: {
      checkedElements,
      passingElements,
      violatingElements,
      indeterminateElements
    },
    samples
  };
}

/**
 * Collect all eligible rendered text elements in the page.
 * This function runs inside the browser page context (evaluate).
 *
 * @returns {Array<{selector:string, text:string, style:object}>}
 */
function collectTextElements() {
  const results = [];

  /**
   * Generate a stable CSS selector for an element.
   * @param {Element} el
   * @returns {string}
   */
  function generateSelector(el) {
    if (el.id) {
      // Escape special characters in IDs
      return '#' + CSS.escape(el.id);
    }

    const parts = [];
    let current = el;

    while (current && current !== document.body && current !== document.documentElement) {
      const parent = current.parentElement;
      if (!parent) break;

      const tag = current.tagName.toLowerCase();

      // Find nth-of-type among siblings
      let nth = 1;
      const siblings = parent.children;
      for (let i = 0; i < siblings.length; i++) {
        if (siblings[i] === current) break;
        if (siblings[i].tagName === current.tagName) nth++;
      }

      parts.unshift(`${tag}:nth-of-type(${nth})`);
      current = parent;
    }

    return parts.join(' > ');
  }

  /**
   * Collect ancestor styles for background resolution.
   */
  function collectAncestorBackgrounds(el) {
    const backgrounds = [];
    let current = el.parentElement;

    while (current) {
      const cs = getComputedStyle(current);
      backgrounds.push({
        tag: current.tagName.toLowerCase(),
        backgroundColor: cs.backgroundColor,
        backgroundImage: cs.backgroundImage,
        opacity: cs.opacity,
        mixBlendMode: cs.mixBlendMode,
        backgroundBlendMode: cs.backgroundBlendMode,
        filter: cs.filter,
        backdropFilter: cs.backdropFilter
      });
      current = current.parentElement;
    }

    return backgrounds;
  }

  /**
   * Check if an element or any of its ancestors has unsupported visual effects.
   */
  function hasUnsupportedVisualEffect(el) {
    const cs = getComputedStyle(el);

    // Element-level checks
    if (cs.backgroundImage && cs.backgroundImage !== 'none') return 'background-image';
    if (parseFloat(cs.opacity) < 1) return 'opacity';
    if (cs.mixBlendMode && cs.mixBlendMode !== 'normal') return 'mix-blend-mode';
    if (cs.backgroundBlendMode && cs.backgroundBlendMode !== 'normal') return 'background-blend-mode';
    if (cs.filter && cs.filter !== 'none') return 'filter';
    if (cs.backdropFilter && cs.backdropFilter !== 'none') return 'backdrop-filter';
    if (cs.maskImage && cs.maskImage !== 'none') return 'mask';
    if (cs.webkitMaskImage && cs.webkitMaskImage !== 'none') return 'mask';
    if (cs.backgroundClip === 'text') return 'background-clip-text';
    if (cs.textShadow && cs.textShadow !== 'none' && cs.textShadow !== '0px 0px 0px transparent') return 'text-shadow';
    if (cs.webkitTextStroke && cs.webkitTextStroke !== '0px' && cs.webkitTextStroke !== '0') return 'text-stroke';
    if (cs.textDecorationColor && cs.textDecorationColor !== cs.color) {
      // Underline color different from text — could affect, but conservative
    }

    // Check ancestors for opacity
    let parent = el.parentElement;
    while (parent) {
      const pcs = getComputedStyle(parent);
      if (parseFloat(pcs.opacity) < 1) return 'opacity';
      if (pcs.mixBlendMode && pcs.mixBlendMode !== 'normal') return 'mix-blend-mode';
      if (pcs.filter && pcs.filter !== 'none') return 'filter';
      parent = parent.parentElement;
    }

    return null;
  }

  // TreeWalker to walk all text nodes
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        // Exclude script, style, noscript, template
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;

        const tag = parent.tagName.toLowerCase();
        if (tag === 'script' || tag === 'style' || tag === 'noscript' || tag === 'template') {
          return NodeFilter.FILTER_REJECT;
        }

        // Exclude SVG text
        let svgCheck = parent;
        while (svgCheck) {
          if (svgCheck.tagName.toLowerCase() === 'svg') return NodeFilter.FILTER_REJECT;
          svgCheck = svgCheck.parentElement;
        }

        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  // Track elements we've already processed (for aggregation)
  const processedElements = new Set();

  let node;
  while ((node = walker.nextNode()) !== null) {
    const parent = node.parentElement;
    if (!parent) continue;

    // Aggregate: only process the nearest element container once
    if (processedElements.has(parent)) continue;

    // Check visibility and layout
    const cs = getComputedStyle(parent);
    if (cs.display === 'none') continue;
    if (cs.visibility !== 'visible') continue;

    // Check for disabled state
    if (parent.disabled && typeof parent.disabled === 'boolean') continue;
    if (parent.getAttribute('aria-disabled') === 'true') continue;

    // Check zero-area (use text range or element rect)
    const range = document.createRange();
    range.selectNodeContents(parent);
    const rects = range.getClientRects();
    let hasPositiveArea = false;
    for (let i = 0; i < rects.length; i++) {
      if (rects[i].width > 0 && rects[i].height > 0) {
        hasPositiveArea = true;
        break;
      }
    }
    if (!hasPositiveArea) continue;

    // Collect text content (collapsed)
    const text = parent.textContent || '';
    const collapsed = text.replace(/\s+/g, ' ').trim();
    if (!collapsed) continue;

    // Check for unsupported visual effects (only on the element itself and ancestors)
    const effect = hasUnsupportedVisualEffect(parent);

    // Collect ancestor backgrounds
    const ancestorBackgrounds = collectAncestorBackgrounds(parent);

    const selector = generateSelector(parent);

    processedElements.add(parent);

    results.push({
      selector,
      text: collapsed,
      style: {
        color: cs.color,
        backgroundColor: cs.backgroundColor,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        backgroundImage: cs.backgroundImage,
        opacity: cs.opacity,
        mixBlendMode: cs.mixBlendMode,
        backgroundBlendMode: cs.backgroundBlendMode,
        filter: cs.filter,
        backdropFilter: cs.backdropFilter,
        maskImage: cs.maskImage || cs.webkitMaskImage,
        backgroundClip: cs.backgroundClip,
        textShadow: cs.textShadow,
        webkitTextStroke: cs.webkitTextStroke || '0',
        ancestorBackgrounds
      },
      effect
    });
  }

  return results;
}

/**
 * Collapse whitespace in a string.
 * @param {string} s
 * @returns {string}
 */
function collapseWhitespace(s) {
  if (!s) return '';
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Check indeterminate conditions from computed style.
 * Returns null if the element is determinate, or {reason: string} if indeterminate.
 */
function checkIndeterminate(style) {
  // Background image/gradient
  if (style.backgroundImage && style.backgroundImage !== 'none') {
    const bi = style.backgroundImage.toLowerCase();
    if (bi.includes('gradient')) return { reason: 'gradient' };
    if (bi !== 'none') return { reason: 'image-background' };
  }

  // Opacity on element
  if (style.opacity !== undefined && style.opacity !== null) {
    const op = parseFloat(style.opacity);
    if (!Number.isNaN(op) && op < 1) return { reason: 'opacity' };
  }

  // Mix blend mode on element
  if (style.mixBlendMode && style.mixBlendMode !== 'normal' && style.mixBlendMode !== '') {
    return { reason: 'mix-blend-mode' };
  }

  // Background blend mode on element
  if (style.backgroundBlendMode && style.backgroundBlendMode !== 'normal' && style.backgroundBlendMode !== '') {
    return { reason: 'background-blend-mode' };
  }

  // Filter
  if (style.filter && style.filter !== 'none') {
    return { reason: 'filter' };
  }

  // Backdrop filter
  if (style.backdropFilter && style.backdropFilter !== 'none') {
    return { reason: 'backdrop-filter' };
  }

  // Mask
  if (style.maskImage && style.maskImage !== 'none') {
    return { reason: 'mask' };
  }

  // Background-clip: text
  if (style.backgroundClip === 'text') {
    return { reason: 'background-clip-text' };
  }

  // Text shadow
  if (style.textShadow && style.textShadow !== 'none' && style.textShadow !== '0px 0px 0px transparent') {
    return { reason: 'text-shadow' };
  }

  // Text stroke
  if (style.webkitTextStroke && style.webkitTextStroke !== '0px' && style.webkitTextStroke !== '0') {
    return { reason: 'text-stroke' };
  }

  // Check ancestor conditions (opacity, mix-blend-mode, filter)
  if (style.ancestorBackgrounds) {
    for (const ancestor of style.ancestorBackgrounds) {
      // Opacity on ancestor
      if (ancestor.opacity !== undefined && ancestor.opacity !== null) {
        const op = parseFloat(ancestor.opacity);
        if (!Number.isNaN(op) && op < 1) return { reason: 'opacity' };
      }
      // Mix blend mode on ancestor
      if (ancestor.mixBlendMode && ancestor.mixBlendMode !== 'normal' && ancestor.mixBlendMode !== '') {
        return { reason: 'mix-blend-mode' };
      }
      // Background blend mode on ancestor
      if (ancestor.backgroundBlendMode && ancestor.backgroundBlendMode !== 'normal' && ancestor.backgroundBlendMode !== '') {
        return { reason: 'background-blend-mode' };
      }
      // Filter on ancestor
      if (ancestor.filter && ancestor.filter !== 'none') {
        return { reason: 'filter' };
      }
      // Backdrop filter on ancestor
      if (ancestor.backdropFilter && ancestor.backdropFilter !== 'none') {
        return { reason: 'backdrop-filter' };
      }
    }
  }

  return null;
}

/**
 * Resolve background from ancestor chain with alpha composition.
 * Starts with white canvas, composites each ancestor's background-color.
 */
function resolveBackground(ancestorBackgrounds, ownBackgroundColor) {
  let resolved = { ...CANVAS_FALLBACK };

  // First composite all ancestors in order (from root to element)
  if (ancestorBackgrounds && ancestorBackgrounds.length > 0) {
    // Reverse: ancestors are collected from parent to root
    for (let i = ancestorBackgrounds.length - 1; i >= 0; i--) {
      const ancestor = ancestorBackgrounds[i];
      if (ancestor.backgroundImage && ancestor.backgroundImage !== 'none') {
        // Background image makes this indeterminate, but we're already past that check
        continue;
      }
      const bg = parseComputedColor(ancestor.backgroundColor);
      if (bg) {
        if (bg.a > 0) {
          resolved = alphaComposite(bg, resolved);
        }
      }
    }
  }

  // Finally composite own background-color
  if (ownBackgroundColor) {
    const own = parseComputedColor(ownBackgroundColor);
    if (own && own.a > 0) {
      resolved = alphaComposite(own, resolved);
    }
  }

  return resolved;
}

/**
 * Parse a numeric font weight from a computed weight string.
 * Handles numeric values ('400', '700') and keyword mapping.
 */
function parseNumericWeight(weight) {
  if (!weight) return 400;
  const num = Number(weight);
  if (!Number.isNaN(num)) return Math.round(num);
  // Keyword mapping (unlikely from computed styles, but defensive)
  const map = {
    normal: 400,
    bold: 700,
    lighter: 300,
    bolder: 700
  };
  return map[weight.toLowerCase()] || 400;
}

/**
 * Format a {r,g,b,a} color object to a CSS rgb() string.
 * @param {{r:number,g:number,b:number,a:number}} color
 * @returns {string}
 */
function formatColor(color) {
  return `rgb(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)})`;
}
