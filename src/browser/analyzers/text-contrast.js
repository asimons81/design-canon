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
 * Self-contained function that runs in the browser page context.
 * Collects all eligible text elements with computed styles,
 * selectors, ancestor backgrounds, and unsupported-effect detection.
 *
 * Must be entirely self-contained — no references to module-level
 * variables, since it is serialized and evaluated remotely.
 *
 * @returns {Array<{selector:string, text:string, style:object, effect:string|null}>}
 */
const COLLECT_TEXT_ELEMENTS_FN = (() => {
  // string content comes from the toString() of a self-contained function
  function collectTextElements() {
    var results = [];

    function generateSelector(el) {
      if (el.id) {
        return '#' + CSS.escape(el.id);
      }
      var parts = [];
      var current = el;
      while (current && current !== document.body && current !== document.documentElement) {
        var parent = current.parentElement;
        if (!parent) break;
        var tag = current.tagName.toLowerCase();
        var nth = 1;
        var siblings = parent.children;
        for (var i = 0; i < siblings.length; i++) {
          if (siblings[i] === current) break;
          if (siblings[i].tagName === current.tagName) nth++;
        }
        parts.unshift(tag + ':nth-of-type(' + nth + ')');
        current = parent;
      }
      return parts.join(' > ');
    }

    function collectAncestorBackgrounds(el) {
      var backgrounds = [];
      var current = el.parentElement;
      while (current) {
        var cs = getComputedStyle(current);
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

    function hasUnsupportedVisualEffect(el) {
      var cs = getComputedStyle(el);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') {
        if (cs.backgroundImage.toLowerCase().indexOf('gradient') !== -1) return 'gradient';
        return 'background-image';
      }
      var op = parseFloat(cs.opacity);
      if (!isNaN(op) && op < 1) return 'opacity';
      if (cs.mixBlendMode && cs.mixBlendMode !== 'normal') return 'mix-blend-mode';
      if (cs.backgroundBlendMode && cs.backgroundBlendMode !== 'normal') return 'background-blend-mode';
      if (cs.filter && cs.filter !== 'none') return 'filter';
      if (cs.backdropFilter && cs.backdropFilter !== 'none') return 'backdrop-filter';
      if (cs.maskImage && cs.maskImage !== 'none') return 'mask';
      if (cs.webkitMaskImage && cs.webkitMaskImage !== 'none') return 'mask';
      if (cs.backgroundClip === 'text') return 'background-clip-text';
      if (cs.textShadow && cs.textShadow !== 'none' && cs.textShadow !== '0px 0px 0px transparent') return 'text-shadow';
      var strokeVal = cs.webkitTextStroke || '0';
      if (strokeVal !== '0px' && strokeVal !== '0') return 'text-stroke';

      var parent = el.parentElement;
      while (parent) {
        var pcs = getComputedStyle(parent);
        var pop = parseFloat(pcs.opacity);
        if (!isNaN(pop) && pop < 1) return 'opacity';
        if (pcs.mixBlendMode && pcs.mixBlendMode !== 'normal') return 'mix-blend-mode';
        if (pcs.filter && pcs.filter !== 'none') return 'filter';
        parent = parent.parentElement;
      }
      return null;
    }

    var walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          var parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          var tag = parent.tagName.toLowerCase();
          if (tag === 'script' || tag === 'style' || tag === 'noscript' || tag === 'template') {
            return NodeFilter.FILTER_REJECT;
          }
          var svgCheck = parent;
          while (svgCheck) {
            if (svgCheck.tagName.toLowerCase() === 'svg') return NodeFilter.FILTER_REJECT;
            svgCheck = svgCheck.parentElement;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    var processedElements = new Set();
    var node;
    while ((node = walker.nextNode()) !== null) {
      var parent = node.parentElement;
      if (!parent) continue;
      if (processedElements.has(parent)) continue;

      var cs = getComputedStyle(parent);
      if (cs.display === 'none') continue;
      if (cs.visibility !== 'visible') continue;
      if (parent.disabled === true) continue;
      if (parent.getAttribute('aria-disabled') === 'true') continue;

      var range = document.createRange();
      range.selectNodeContents(parent);
      var rects = range.getClientRects();
      var hasPositiveArea = false;
      for (var ri = 0; ri < rects.length; ri++) {
        if (rects[ri].width > 0 && rects[ri].height > 0) {
          hasPositiveArea = true;
          break;
        }
      }
      if (!hasPositiveArea) continue;

      var text = parent.textContent || '';
      var collapsed = text.replace(/\s+/g, ' ').trim();
      if (!collapsed) continue;

      var effect = hasUnsupportedVisualEffect(parent);
      var ancestorBackgrounds = collectAncestorBackgrounds(parent);
      var selector = generateSelector(parent);

      processedElements.add(parent);
      results.push({
        selector: selector,
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
          maskImage: cs.maskImage || cs.webkitMaskImage || 'none',
          backgroundClip: cs.backgroundClip,
          textShadow: cs.textShadow,
          webkitTextStroke: cs.webkitTextStroke || '0',
          ancestorBackgrounds: ancestorBackgrounds
        },
        effect: effect
      });
    }
    return results;
  }
  return collectTextElements.toString();
})();

/**
 * The main analyzer function called by the browser analysis runner.
 *
 * @param {import('../analyzer.js').AnalyzerContext} context
 * @returns {Promise<object>} Analyzer result with status, measurements, samples, message, confidence
 */
export async function analyzeTextContrast(context) {
  const { evaluate } = context.pageAdapters || context;

  // Step 1: Gather all eligible text elements and their computed styles in one page pass
  const textElements = await evaluate(COLLECT_TEXT_ELEMENTS_FN);

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

  // Step 2: Process each element's computed styles into samples
  const samples = [];
  const viewport = context.viewport || 'desktop';

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
    const effect = el.effect;

    // Check indeterminate conditions
    const indeterminate = checkIndeterminate(style, effect);
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
      samples.push({
        status: 'indeterminate',
        selector,
        text: text.slice(0, 120),
        reason: isUnsupportedColorSpace(style.color) ? 'unsupported-color-space' : 'unresolved-color'
      });
      continue;
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
function checkIndeterminate(style, effect) {
  // Use the effect detected in the browser context first
  if (effect) {
    return { reason: effect };
  }

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

  // Check ancestor conditions
  if (style.ancestorBackgrounds) {
    for (const ancestor of style.ancestorBackgrounds) {
      if (ancestor.opacity !== undefined && ancestor.opacity !== null) {
        const op = parseFloat(ancestor.opacity);
        if (!Number.isNaN(op) && op < 1) return { reason: 'opacity' };
      }
      if (ancestor.mixBlendMode && ancestor.mixBlendMode !== 'normal' && ancestor.mixBlendMode !== '') {
        return { reason: 'mix-blend-mode' };
      }
      if (ancestor.backgroundBlendMode && ancestor.backgroundBlendMode !== 'normal' && ancestor.backgroundBlendMode !== '') {
        return { reason: 'background-blend-mode' };
      }
      if (ancestor.filter && ancestor.filter !== 'none') {
        return { reason: 'filter' };
      }
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
    for (let i = ancestorBackgrounds.length - 1; i >= 0; i--) {
      const ancestor = ancestorBackgrounds[i];
      if (ancestor.backgroundImage && ancestor.backgroundImage !== 'none') {
        continue;
      }
      const bg = parseComputedColor(ancestor.backgroundColor);
      if (bg && bg.a > 0) {
        resolved = alphaComposite(bg, resolved);
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
 */
function parseNumericWeight(weight) {
  if (!weight) return 400;
  const num = Number(weight);
  if (!Number.isNaN(num)) return Math.round(num);
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
 */
function formatColor(color) {
  return `rgb(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)})`;
}
