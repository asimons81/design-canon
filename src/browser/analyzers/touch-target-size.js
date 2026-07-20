/**
 * browser/analyzers/touch-target-size.js
 *
 * Production analyzer for F020: Rendered touch-target minimum.
 *
 * Measures rendered interactive target sizes in the loaded Chromium page
 * against WCAG 2.2 SC 2.5.8 (24 × 24 CSS pixels). Applies the spacing-circle
 * exception, inline exception, and user-agent-control exception according
 * to ADR-004.
 *
 * The analyzer receives a controlled page adapter with evaluate() and
 * getComputedStyle(). It never uses raw browser lifecycle access, network
 * requests, screenshots, or filesystem access.
 */

import {
  MIN_TARGET_WIDTH,
  MIN_TARGET_HEIGHT,
  SPACING_RADIUS,
  CIRCLE_TANGENCY,
  viewportIntersection,
  rectCenter,
  euclideanDistance,
  pointToRectDistance,
  circlesIntersect,
  circleIntersectsRect,
  meetsMinimumSize,
  classifySize,
  classifyTransform,
  SpatialIndex,
  formatEvidence
} from '../touch-target-geometry.js';

// ── Constants ─────────────────────────────────────────────────────────

const SUPPORTED_NATIVE = new Set([
  'a', 'button', 'input', 'select', 'textarea', 'summary'
]);

const SUPPORTED_ROLES = new Set([
  'button', 'link', 'checkbox', 'radio', 'switch', 'tab',
  'menuitem', 'menuitemcheckbox', 'menuitemradio', 'option',
  'slider', 'spinbutton', 'textbox', 'combobox', 'searchbox'
]);

const STANDALONE_CONTROL_LOOKALIKES = new Set([
  'nav', 'header', 'footer', 'toolbar', 'menu', 'menubar'
]);

const VALID_OUTCOMES = new Set([
  'pass', 'spacing-exception', 'inline-exception', 'user-agent-exception',
  'violation', 'excluded'
]);

const VALID_INDETERMINATE_REASONS = new Set([
  'non-axis-aligned-transform',
  'perspective-transform',
  'ambiguous-fragmentation',
  'ambiguous-overlap',
  'partially-obscured',
  'unsupported-hit-area',
  'unsupported-native-control',
  'unresolved-target-geometry',
  'dynamic-target-state',
  'nested-interactive-target',
  'clipped-nonrectangular-target'
]);

// ── Self-contained browser collection function ────────────────────────

/**
 * Self-contained function that runs in the browser page context.
 * Collects all eligible interactive targets with computed geometry,
 * transforms, disabled/inert state, and context for inline detection.
 *
 * Must be entirely self-contained — no references to module-level variables.
 *
 * @returns {Array<object>}
 */
const COLLECT_TARGETS_FN = function collectTouchTargets() {
  var results = [];

  // ── Helpers ──────────────────────────────────────────────────────

  function generateSelector(el) {
    if (el.id) {
      try { return '#' + CSS.escape(el.id); } catch (e) { /* fallthrough */ }
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

  function getVisibleLabel(el) {
    var text = (el.textContent || '').trim();
    if (text.length > 60) text = text.substring(0, 57) + '...';
    return text;
  }

  function isDisplayNone(el) {
    try { return getComputedStyle(el).display === 'none'; } catch (e) { return false; }
  }

  function isVisibilityHidden(el) {
    try { return getComputedStyle(el).visibility === 'hidden'; } catch (e) { return false; }
  }

  function hasHiddenAttribute(el) {
    return el.hasAttribute('hidden');
  }

  function isInert(el) {
    var current = el;
    while (current) {
      if (current.inert) return true;
      current = current.parentElement;
    }
    return false;
  }

  function isAriaDisabled(el) {
    var current = el;
    while (current) {
      if (current.getAttribute && current.getAttribute('aria-disabled') === 'true') return true;
      current = current.parentElement;
    }
    return false;
  }

  function isNativeDisabled(el) {
    var tag = el.tagName.toLowerCase();
    if (tag === 'button' || tag === 'input' || tag === 'select' || tag === 'textarea') {
      return el.disabled === true;
    }
    return false;
  }

  function isHidden(el) {
    return isDisplayNone(el) || isVisibilityHidden(el) || hasHiddenAttribute(el);
  }

  function getEffectiveRole(el) {
    var role = el.getAttribute('role');
    if (role) return role.trim().toLowerCase();
    var tag = el.tagName.toLowerCase();
    if (tag === 'a') return 'link';
    if (tag === 'button') return 'button';
    if (tag === 'input') {
      var type = (el.getAttribute('type') || 'text').toLowerCase();
      var explicitRoles = { checkbox: 'checkbox', radio: 'radio', submit: 'button', reset: 'button' };
      return explicitRoles[type] || 'textbox';
    }
    if (tag === 'select') return 'combobox';
    if (tag === 'textarea') return 'textbox';
    if (tag === 'summary') return 'button';
    return null;
  }

  function hasActivationSignal(el) {
    // Check for deterministic activation signals
    var tag = el.tagName.toLowerCase();
    if (tag === 'a' || tag === 'button' || tag === 'summary') return true;
    if (tag === 'input' || tag === 'select' || tag === 'textarea') return true;
    if (el.getAttribute('onclick') || el.getAttribute('onkeydown')) return true;
    if (el.getAttribute('role')) {
      var r = el.getAttribute('role').trim().toLowerCase();
      var supportedRoles = ['button','link','checkbox','radio','switch','tab','menuitem','menuitemcheckbox','menuitemradio','option','slider','spinbutton','textbox','combobox','searchbox'];
      if (supportedRoles.indexOf(r) !== -1) return true;
    }
    if (el.getAttribute('tabindex') !== null) {
      var ti = parseInt(el.getAttribute('tabindex'), 10);
      if (!isNaN(ti) && ti >= 0) return true;
    }
    return false;
  }

  function isInInlineContext(el) {
    var cs;
    try { cs = getComputedStyle(el); } catch (e) { return false; }
    if (cs.display === 'inline') return true;
    if (cs.display.startsWith('inline-')) return true;
    return false;
  }

  function hasAdjacentNonTargetText(el) {
    // Check for text nodes before or after the element
    var prev = el.previousSibling;
    while (prev) {
      if (prev.nodeType === 3 && (prev.textContent || '').trim().length > 0) return true;
      if (prev.nodeType === 1) {
        var tag = prev.tagName.toLowerCase();
        // Skip non-text elements like <br>, <wbr>
        if (tag === 'br' || tag === 'wbr') { prev = prev.previousSibling; continue; }
        break;
      }
      prev = prev.previousSibling;
    }
    var next = el.nextSibling;
    while (next) {
      if (next.nodeType === 3 && (next.textContent || '').trim().length > 0) return true;
      if (next.nodeType === 1) {
        var tag2 = next.tagName.toLowerCase();
        if (tag2 === 'br' || tag2 === 'wbr') { next = next.nextSibling; continue; }
        break;
      }
      next = next.nextSibling;
    }
    return false;
  }

  function isConstrainedByLineHeight(el) {
    try {
      var cs = getComputedStyle(el);
      var parent = el.parentElement;
      if (!parent) return false;
      var pcs = getComputedStyle(parent);
      var parentLH = parseFloat(pcs.lineHeight);
      var elH = parseFloat(cs.height);
      if (isNaN(parentLH) || isNaN(elH)) return false;
      return elH <= parentLH * 1.5;
    } catch (e) { return false; }
  }

  function isStandaloneControlContext(el) {
    var lookalikes = ['nav','header','footer','toolbar','menu','menubar'];
    function isLookalike(s) { return lookalikes.indexOf(s) !== -1; }
    var parent = el.parentElement;
    while (parent) {
      var tag = parent.tagName.toLowerCase();
      var role = parent.getAttribute('role');
      if (isLookalike(tag)) return true;
      if (role && isLookalike(role.trim().toLowerCase())) return true;
      // Check for list-based controls (menus, tab lists)
      if (tag === 'ul' || tag === 'ol') {
        var parentRole = role ? role.trim().toLowerCase() : null;
        if (parentRole === 'menu' || parentRole === 'tablist' || parentRole === 'toolbar') return true;
      }
      parent = parent.parentElement;
    }
    return false;
  }

  function isInteractiveElement(el) {
    var tag = el.tagName.toLowerCase();
    if (tag === 'a' || tag === 'button' || tag === 'input' || tag === 'select' || tag === 'textarea' || tag === 'summary') return true;
    if (el.getAttribute('onclick') || el.getAttribute('onkeydown')) return true;
    var role = el.getAttribute('role');
    if (role) {
      var r = role.trim().toLowerCase();
      var supportedInteractive = ['button','link','checkbox','radio','switch','tab','menuitem','menuitemcheckbox','menuitemradio','option','slider','spinbutton','textbox','combobox','searchbox'];
      if (supportedInteractive.indexOf(r) !== -1) return true;
    }
    var ti = parseInt(el.getAttribute('tabindex'), 10);
    if (!isNaN(ti) && ti >= 0) return true;
    return false;
  }

  function classifyTopmost(topmost, target) {
    // Determine relationship of topmost painted element to the target.
    // Walks the full ancestor chain from topmost to target, checking
    // every intermediate for interactivity.
    if (topmost === target) return 'self';
    var check = topmost;
    var isDescendant = false;
    while (check) {
      if (check === target) { isDescendant = true; break; }
      check = check.parentElement;
    }
    if (!isDescendant) return 'foreign';

    // Walk from topmost up to (but not including) target.
    // If any intermediate ancestor is interactive, the target has
    // an interactive descendant on top — nested-interactive-target.
    var walk = topmost;
    while (walk && walk !== target) {
      if (isInteractiveElement(walk)) return 'interactive-descendant';
      walk = walk.parentElement;
    }
    return 'noninteractive-descendant';
  }

  function clampToViewport(x, y) {
    return {
      x: Math.max(0, Math.min(x, window.innerWidth - 1)),
      y: Math.max(0, Math.min(y, window.innerHeight - 1))
    };
  }

  function getHitTestData(el, rect) {
    var vpW = window.innerWidth;
    var vpH = window.innerHeight;

    // Clamp center to viewport
    var rawCx = rect.x + rect.width / 2;
    var rawCy = rect.y + rect.height / 2;
    var cp = clampToViewport(rawCx, rawCy);

    var centerHit = document.elementsFromPoint(cp.x, cp.y);
    var centerTopmost = centerHit && centerHit.length > 0 ? centerHit[0] : null;
    var centerClass = centerTopmost ? classifyTopmost(centerTopmost, el) : 'none';

    var centerHitsTarget = centerClass === 'self' || centerClass === 'noninteractive-descendant';
    var isNestedInteractive = centerClass === 'interactive-descendant';
    var blockedBy = centerClass === 'foreign'
      ? (centerTopmost.tagName ? centerTopmost.tagName.toLowerCase() : 'unknown')
      : null;

    // Bounded inset corners — clamp each to viewport
    var inset = Math.min(3, rect.width / 4, rect.height / 4);
    var corners = [
      { x: rect.x + inset, y: rect.y + inset },
      { x: rect.x + rect.width - inset, y: rect.y + inset },
      { x: rect.x + inset, y: rect.y + rect.height - inset },
      { x: rect.x + rect.width - inset, y: rect.y + rect.height - inset }
    ];

    var consistentHit = true;
    for (var ci = 0; ci < corners.length; ci++) {
      var corner = clampToViewport(corners[ci].x, corners[ci].y);
      var ch = document.elementsFromPoint(corner.x, corner.y);
      var cornerTopmost = ch && ch.length > 0 ? ch[0] : null;
      var cornerClass = cornerTopmost ? classifyTopmost(cornerTopmost, el) : 'none';

      if (cornerClass === 'foreign') {
        consistentHit = false;
        if (!blockedBy) {
          blockedBy = cornerTopmost.tagName ? cornerTopmost.tagName.toLowerCase() : 'unknown';
        }
      } else if (cornerClass === 'interactive-descendant') {
        consistentHit = false;
        isNestedInteractive = true;
      }
      // 'self', 'noninteractive-descendant', 'none' — corner is reachable
    }

    return {
      centerHitsTarget: centerHitsTarget,
      consistentHit: consistentHit,
      blockedBy: blockedBy,
      isObscured: !centerHitsTarget || !consistentHit,
      isNestedInteractive: isNestedInteractive
    };
  }

  function isViewportClipped(rect) {
    return rect.x < 0 || rect.y < 0 ||
      (rect.x + rect.width) > window.innerWidth ||
      (rect.y + rect.height) > window.innerHeight;
  }

  function isNonRectangularClipPath(el) {
    // Check the element and all its ancestors for non-rectangular clip-path
    var current = el;
    while (current && current !== document.documentElement) {
      var cs;
      try { cs = getComputedStyle(current); } catch (e) { break; }
      var cp = cs.clipPath;
      if (cp && cp !== 'none') {
        var trimmed = cp.trim();
        // Rectangular forms: inset(), rect(), xywh(), polygon(4 rect pts)
        if (trimmed.indexOf('inset(') === 0) { current = current.parentElement; continue; }
        if (trimmed.indexOf('rect(') === 0) { current = current.parentElement; continue; }
        if (trimmed.indexOf('xywh(') === 0) { current = current.parentElement; continue; }
        if (trimmed.indexOf('margin-box') !== -1 ||
            trimmed.indexOf('border-box') !== -1 ||
            trimmed.indexOf('padding-box') !== -1 ||
            trimmed.indexOf('content-box') !== -1 ||
            trimmed.indexOf('fill-box') !== -1 ||
            trimmed.indexOf('stroke-box') !== -1 ||
            trimmed.indexOf('view-box') !== -1) {
          current = current.parentElement; continue;
        }
        // circle(), ellipse(), path(), url(), polygon(>4 pts) → non-rectangular
        if (trimmed.indexOf('circle(') === 0) return true;
        if (trimmed.indexOf('ellipse(') === 0) return true;
        if (trimmed.indexOf('path(') === 0) return true;
        if (trimmed.indexOf('url(') === 0) return true;
        if (trimmed.indexOf('polygon(') === 0) return true;
        // Any other non-none value: treat as non-rectangular
        return true;
      }
      current = current.parentElement;
    }
    return false;
  }

  function isUnmodifiedNativeControl(el) {
    var tag = el.tagName.toLowerCase();
    var cs;
    try { cs = getComputedStyle(el); } catch (e) { return false; }

    // Check appearance — if the author modified appearance, it's not unmodified
    if (cs.appearance && cs.appearance !== 'auto') return false;

    // Check for any inline styles on the element
    if (el.getAttribute('style') && el.getAttribute('style').trim().length > 0) return false;

    // Check for CSS classes or IDs that could be targeted by author stylesheets
    if (el.getAttribute('class') || el.getAttribute('id')) return false;

    // Check that computed dimensions are consistent with native defaults.
    // If the author applied a tag-selector stylesheet rule that modifies
    // padding/border/width/height, the computed values will differ from
    // what a native unstyled control would have.
    var padTop = parseFloat(cs.paddingTop) || 0;
    var padRight = parseFloat(cs.paddingRight) || 0;
    var padBottom = parseFloat(cs.paddingBottom) || 0;
    var padLeft = parseFloat(cs.paddingLeft) || 0;
    var borderTop = parseFloat(cs.borderTopWidth) || 0;
    var borderRight = parseFloat(cs.borderRightWidth) || 0;
    var borderBottom = parseFloat(cs.borderBottomWidth) || 0;
    var borderLeft = parseFloat(cs.borderLeftWidth) || 0;

    // Native controls always have at least 1px border and 1px padding.
    // If any is zero, the author has modified the control.
    if (borderTop < 1 || borderRight < 1 || borderBottom < 1 || borderLeft < 1) return false;
    if (padTop < 1 || padBottom < 1 || padLeft < 1 || padRight < 1) return false;

    // Check for explicit sizing via inline styles
    var explicitWidth = el.style.width || '';
    var explicitHeight = el.style.height || '';
    var explicitMinWidth = el.style.minWidth || '';
    var explicitMinHeight = el.style.minHeight || '';
    var explicitMaxWidth = el.style.maxWidth || '';
    var explicitMaxHeight = el.style.maxHeight || '';
    if (explicitWidth || explicitHeight || explicitMinWidth || explicitMinHeight ||
        explicitMaxWidth || explicitMaxHeight) return false;

    // Check padding modifications via inline styles
    if (el.style.padding || el.style.paddingTop || el.style.paddingRight ||
        el.style.paddingBottom || el.style.paddingLeft) return false;

    // Check border modifications via inline styles
    if (el.style.border || el.style.borderTop || el.style.borderRight ||
        el.style.borderBottom || el.style.borderLeft ||
        el.style.borderWidth || el.style.borderTopWidth || el.style.borderRightWidth ||
        el.style.borderBottomWidth || el.style.borderLeftWidth) return false;

    // Check transform
    if (cs.transform && cs.transform !== 'none') return false;

    return true;
  }

  // ── Main collection ──────────────────────────────────────────────

  // Query native targets
  var nativeSelector = 'a[href], button, input:not([type="hidden"]), select, textarea, summary';
  var nativeEls = document.querySelectorAll(nativeSelector);

  var seen = new Set();

  for (var i = 0; i < nativeEls.length; i++) {
    var el = nativeEls[i];
    if (seen.has(el)) continue;
    seen.add(el);

    if (isNativeDisabled(el)) continue;
    if (isAriaDisabled(el)) continue;
    if (isInert(el)) continue;
    if (isHidden(el)) continue;

    var rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;

    var selector = generateSelector(el);
    var cs;
    try { cs = getComputedStyle(el); } catch (e) { continue; }

    var clientRects = Array.from(el.getClientRects());

    results.push({
      selector: selector,
      targetType: el.tagName.toLowerCase(),
      role: getEffectiveRole(el),
      label: getVisibleLabel(el),
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      clientRects: clientRects.map(function(r) {
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      }),
      display: cs.display,
      visibility: cs.visibility,
      transform: cs.transform,
      zoom: cs.zoom,
      overflow: cs.overflow,
      opacity: cs.opacity,
      isNative: true,
      isReadonly: el.readOnly === true,
      isInline: isInInlineContext(el),
      hasAdjacentText: hasAdjacentNonTargetText(el),
      lineHeightConstrained: isConstrainedByLineHeight(el),
      isStandaloneControl: isStandaloneControlContext(el),
      isUnmodifiedNative: isUnmodifiedNativeControl(el),
      clipPathClass: isNonRectangularClipPath(el) ? 'nonrectangular' : 'rectangular',
      viewportClipped: isViewportClipped(rect),
      tabindex: el.getAttribute('tabindex'),
      ariaDisabled: el.getAttribute('aria-disabled'),
      inert: el.inert === true,
      hitTest: getHitTestData(el, rect)
    });
  }

  // Query role-based targets
  var roleSelector = '[role]';
  var roleEls = document.querySelectorAll(roleSelector);

  for (var j = 0; j < roleEls.length; j++) {
    var rel = roleEls[j];
    if (seen.has(rel)) continue;
    var role = rel.getAttribute('role');
    if (!role) continue;
    var normalizedRole = role.trim().toLowerCase();
    var supportedRoles = ['button','link','checkbox','radio','switch','tab','menuitem','menuitemcheckbox','menuitemradio','option','slider','spinbutton','textbox','combobox','searchbox'];
    if (supportedRoles.indexOf(normalizedRole) === -1) continue;

    if (isNativeDisabled(rel)) continue;
    if (isAriaDisabled(rel)) continue;
    if (isInert(rel)) continue;
    if (isHidden(rel)) continue;

    var rrect = rel.getBoundingClientRect();
    if (rrect.width === 0 || rrect.height === 0) continue;

    seen.add(rel);

    var rselector = generateSelector(rel);
    var rcs;
    try { rcs = getComputedStyle(rel); } catch (e) { continue; }

    var rclientRects = Array.from(rel.getClientRects());

    results.push({
      selector: rselector,
      targetType: rel.tagName.toLowerCase(),
      role: normalizedRole,
      label: getVisibleLabel(rel),
      rect: { x: rrect.x, y: rrect.y, width: rrect.width, height: rrect.height },
      clientRects: rclientRects.map(function(r) {
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      }),
      display: rcs.display,
      visibility: rcs.visibility,
      transform: rcs.transform,
      zoom: rcs.zoom,
      overflow: rcs.overflow,
      opacity: rcs.opacity,
      isNative: false,
      isReadonly: rel.readOnly === true,
      isInline: isInInlineContext(rel),
      hasAdjacentText: hasAdjacentNonTargetText(rel),
      lineHeightConstrained: isConstrainedByLineHeight(rel),
      isStandaloneControl: isStandaloneControlContext(rel),
      isUnmodifiedNative: isUnmodifiedNativeControl(rel),
      clipPathClass: isNonRectangularClipPath(rel) ? 'nonrectangular' : 'rectangular',
      viewportClipped: isViewportClipped(rrect),
      tabindex: rel.getAttribute('tabindex'),
      ariaDisabled: rel.getAttribute('aria-disabled'),
      inert: rel.inert === true,
      hitTest: getHitTestData(rel, rrect)
    });
  }

  // Query tabindex >= 0 targets with activation signals
  var tabindexEls = document.querySelectorAll('[tabindex]');
  for (var k = 0; k < tabindexEls.length; k++) {
    var tel = tabindexEls[k];
    if (seen.has(tel)) continue;
    var ti = parseInt(tel.getAttribute('tabindex'), 10);
    if (isNaN(ti) || ti < 0) continue;
    if (!hasActivationSignal(tel)) continue;

    if (isNativeDisabled(tel)) continue;
    if (isAriaDisabled(tel)) continue;
    if (isInert(tel)) continue;
    if (isHidden(tel)) continue;

    var trect = tel.getBoundingClientRect();
    if (trect.width === 0 || trect.height === 0) continue;

    seen.add(tel);

    var tselector = generateSelector(tel);
    var tcs;
    try { tcs = getComputedStyle(tel); } catch (e) { continue; }

    var tclientRects = Array.from(tel.getClientRects());

    results.push({
      selector: tselector,
      targetType: tel.tagName.toLowerCase(),
      role: getEffectiveRole(tel),
      label: getVisibleLabel(tel),
      rect: { x: trect.x, y: trect.y, width: trect.width, height: trect.height },
      clientRects: tclientRects.map(function(r) {
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      }),
      display: tcs.display,
      visibility: tcs.visibility,
      transform: tcs.transform,
      zoom: tcs.zoom,
      overflow: tcs.overflow,
      opacity: tcs.opacity,
      isNative: false,
      isReadonly: tel.readOnly === true,
      isInline: isInInlineContext(tel),
      hasAdjacentText: hasAdjacentNonTargetText(tel),
      lineHeightConstrained: isConstrainedByLineHeight(tel),
      isStandaloneControl: isStandaloneControlContext(tel),
      isUnmodifiedNative: isUnmodifiedNativeControl(tel),
      clipPathClass: isNonRectangularClipPath(tel) ? 'nonrectangular' : 'rectangular',
      viewportClipped: isViewportClipped(trect),
      tabindex: tel.getAttribute('tabindex'),
      ariaDisabled: tel.getAttribute('aria-disabled'),
      inert: tel.inert === true,
      hitTest: getHitTestData(tel, trect)
    });
  }

  return results;
};

// ── Analyzer ──────────────────────────────────────────────────────────

/**
 * Main analyzer function for F020: Rendered touch-target minimum.
 *
 * @param {object} context - analyzer context from runAnalyzer
 * @param {object} context.pageAdapters - page adapters { evaluate, getComputedStyle }
 * @param {string} context.viewport - viewport preset name
 * @param {string} context.colorScheme - color scheme
 * @param {string} context.browserVersion - Chromium version
 * @param {number} context.deadline - operation deadline
 * @param {object} context.rule - rule metadata
 * @returns {Promise<{status:string, measurements:object, message:string, confidence:string, samples:Array}>}
 */
export async function analyzeTouchTargetSize(context) {
  const { pageAdapters, viewport, colorScheme, browserVersion, deadline } = context;

  if (!pageAdapters || !pageAdapters.evaluate) {
    return {
      status: 'failed',
      measurements: {},
      message: 'No page adapter available for touch-target analysis.',
      confidence: 'low',
      samples: []
    };
  }

  try {
    // Check deadline
    if (Date.now() >= deadline) {
      return {
        status: 'failed',
        measurements: {},
        message: 'Operation deadline exceeded before touch-target analysis could run.',
        confidence: 'low',
        samples: []
      };
    }

    // Collect all eligible targets in one browser evaluation
    const rawTargets = await pageAdapters.evaluate(COLLECT_TARGETS_FN);

    if (!Array.isArray(rawTargets)) {
      return {
        status: 'failed',
        measurements: {},
        message: 'Target collection returned unexpected data.',
        confidence: 'low',
        samples: []
      };
    }

    // Get viewport dimensions
    const viewportDims = await pageAdapters.evaluate(function() {
      return { width: window.innerWidth, height: window.innerHeight };
    });

    // Process targets
    const samples = processTargets(rawTargets, viewportDims, viewport, colorScheme, browserVersion);

    // Compute measurements
    const measurements = {
      checkedTargets: samples.length,
      passingTargets: samples.filter(s => s.outcome === 'pass').length,
      spacingExceptionTargets: samples.filter(s => s.outcome === 'spacing-exception').length,
      inlineExceptionTargets: samples.filter(s => s.outcome === 'inline-exception').length,
      userAgentExceptionTargets: samples.filter(s => s.outcome === 'user-agent-exception').length,
      violatingTargets: samples.filter(s => s.outcome === 'violation').length,
      indeterminateTargets: samples.filter(s => s.status === 'indeterminate').length,
      excludedTargets: samples.filter(s => s.outcome === 'excluded').length
    };

    // Determine run status
    const confirmedCount = samples.filter(s => s.status === 'confirmed').length;
    const indeterminateCount = samples.filter(s => s.status === 'indeterminate').length;

    let runStatus = 'confirmed';
    if (confirmedCount === 0 && indeterminateCount > 0) {
      runStatus = 'indeterminate';
    }

    return {
      status: runStatus,
      measurements,
      message: 'Rendered touch-target analysis completed.',
      confidence: 'high',
      samples
    };

  } catch (err) {
    return {
      status: 'failed',
      measurements: {},
      message: `Touch-target analysis error: ${err.message}`,
      confidence: 'low',
      samples: []
    };
  }
}

// ── Target processing ─────────────────────────────────────────────────

/**
 * Process raw target data into classified samples.
 *
 * @param {Array<object>} rawTargets - targets from browser collection
 * @param {{width:number, height:number}} viewportDims
 * @param {string} viewportName
 * @param {string} colorScheme
 * @param {string} browserVersion
 * @returns {Array<object>} samples
 */
function processTargets(rawTargets, viewportDims, viewportName, colorScheme, browserVersion) {
  // Phase 1: Exclude wholly off-viewport targets
  const visibleTargets = [];
  for (const t of rawTargets) {
    const intersection = viewportIntersection(t.rect, viewportDims);
    if (!intersection) {
      // Wholly off-viewport — excluded
      visibleTargets.push({
        ...t,
        status: 'confirmed',
        outcome: 'excluded',
        reason: 'wholly-off-viewport',
        visibleRect: null
      });
      continue;
    }
    visibleTargets.push({
      ...t,
      intersection,
      visibleRect: (intersection.width === t.rect.width && intersection.height === t.rect.height)
        ? t.rect : intersection
    });
  }

  // Phase 2: Transform classification
  const classified = [];
  for (const t of visibleTargets) {
    if (t.outcome === 'excluded') {
      classified.push(t);
      continue;
    }

    if (t.intersection && (t.intersection.width !== t.rect.width || t.intersection.height !== t.rect.height)) {
      // Partially clipped — check if still rectangular
      classified.push({
        ...t,
        transformClass: classifyTransform(t.transform),
        effectiveRect: t.intersection
      });
    } else {
      classified.push({
        ...t,
        transformClass: classifyTransform(t.transform),
        effectiveRect: t.rect
      });
    }
  }

  // Phase 3: Classify each target
  for (const t of classified) {
    if (t.outcome === 'excluded') continue;

    const effectiveRect = t.effectiveRect;

    // Check for indeterminate transforms
    if (t.transformClass === 'indeterminate') {
      t.status = 'indeterminate';
      t.indeterminateReason = t.transform && /\bperspective\b/.test(t.transform)
        ? 'perspective-transform'
        : 'non-axis-aligned-transform';
      continue;
    }

    // Check fragmentation
    if (t.clientRects && t.clientRects.length > 1) {
      // Apply inline exception first
      if (isInlineException(t)) {
        t.status = 'confirmed';
        t.outcome = 'inline-exception';
        continue;
      }
      // Non-inline fragmentation — indeterminate unless each fragment passes
      t.status = 'indeterminate';
      t.indeterminateReason = 'ambiguous-fragmentation';
      continue;
    }

    // Check for non-rectangular clip-path on target or ancestors
    if (t.clipPathClass === 'nonrectangular') {
      t.status = 'indeterminate';
      t.indeterminateReason = 'clipped-nonrectangular-target';
      continue;
    }

    // Check for nested interactive targets (from hit testing)
    if (t.hitTest && t.hitTest.isNestedInteractive) {
      t.status = 'indeterminate';
      t.indeterminateReason = 'nested-interactive-target';
      continue;
    }

    // Check overlap/obscuration via hit testing
    if (t.hitTest && t.hitTest.isObscured) {
      // Check overlap/obscuration via hit testing (standard path)
      t.status = 'indeterminate';
      if (t.hitTest.blockedBy) {
        t.indeterminateReason = 'ambiguous-overlap';
      } else if (!t.hitTest.centerHitsTarget) {
        t.indeterminateReason = 'partially-obscured';
      } else {
        t.indeterminateReason = 'ambiguous-overlap';
      }
      continue;
    }

    // Check inline exception
    if (isInlineException(t)) {
      t.status = 'confirmed';
      t.outcome = 'inline-exception';
      continue;
    }

    // Check user-agent-control exception
    if (t.isUnmodifiedNative && t.isNative) {
      t.status = 'confirmed';
      t.outcome = 'user-agent-exception';
      continue;
    }

    // Primary size check
    if (meetsMinimumSize(effectiveRect)) {
      t.status = 'confirmed';
      t.outcome = 'pass';
    } else {
      // Undersized — flag for spacing check in phase 4
      t.status = 'confirmed';
      t.outcome = 'undersized';
      t.sizeClass = classifySize(effectiveRect.width, effectiveRect.height);
    }
  }

  // Phase 4: Spacing exception for undersized targets
  applySpacingException(classified, viewportDims);

  // Phase 5: Convert undersized without spacing to violations, finalize
  for (const t of classified) {
    if (t.outcome === 'excluded' || t.outcome === 'pass' ||
        t.outcome === 'inline-exception' || t.outcome === 'user-agent-exception' ||
        t.outcome === 'spacing-exception' || t.outcome === 'violation' ||
        t.status === 'indeterminate') continue;

    if (t.outcome === 'undersized') {
      t.outcome = 'violation';
    }
  }

  // Phase 6: Build final sample objects
  return classified.map(t => buildSample(t, viewportDims, viewportName, colorScheme, browserVersion));
}

// ── Inline exception ─────────────────────────────────────────────────

/**
 * Determine if a target qualifies for the narrow automatic inline exception.
 *
 * All conditions must be met:
 * - inline formatting context
 * - sentence or text-block context
 * - adjacent non-target text before or after
 * - size constrained by surrounding non-target text line height
 * - not a standalone navigation, toolbar, menu, tab, chip, badge, or button-like control
 *
 * @param {object} t - target data
 * @returns {boolean}
 */
function isInlineException(t) {
  if (!t.isInline) return false;
  if (!t.hasAdjacentText) return false;
  if (!t.lineHeightConstrained) return false;
  if (t.isStandaloneControl) return false;
  return true;
}

// ── Spacing exception ─────────────────────────────────────────────────

/**
 * Apply the spacing-circle exception to all undersized targets.
 * Uses spatial bucketing for bounded neighborhood queries.
 *
 * @param {Array<object>} targets - all classified targets (mutated in place)
 * @param {{width:number, height:number}} viewportDims
 */
function applySpacingException(targets, viewportDims) {
  // Build spatial index of all targets
  const index = new SpatialIndex(48);
  const undersizedTargets = [];

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    if (t.outcome === 'excluded' || t.status === 'indeterminate') continue;
    t._index = i;
    index.insert(String(i), t.effectiveRect || t.rect);
    if (t.outcome === 'undersized') {
      undersizedTargets.push(t);
    }
  }

  if (undersizedTargets.length === 0) return;

  for (const ut of undersizedTargets) {
    const center = rectCenter(ut.effectiveRect || ut.rect);
    const spacingProof = {
      center: { x: center.x, y: center.y },
      radius: SPACING_RADIUS,
      passed: true,
      nearest: null,
      nearestDistance: null,
      nearestUndersizedCircle: null,
      nearestUndersizedCircleDistance: null,
      reason: null
    };

    // Find neighbors within search radius
    const neighbors = index.findNeighbors(center, SPACING_RADIUS + 24, String(ut._index));

    // First check: circle-to-circle with other undersized targets
    for (const neighbor of neighbors) {
      const neighborTarget = targets[parseInt(neighbor.id, 10)];
      if (!neighborTarget || neighborTarget.outcome === 'excluded') continue;
      if (neighborTarget.status === 'indeterminate') continue;

      if (neighborTarget.outcome === 'undersized') {
        const neighborCenter = rectCenter(neighborTarget.effectiveRect || neighborTarget.rect);
        const dist = euclideanDistance(center, neighborCenter);

        if (dist < CIRCLE_TANGENCY) {
          spacingProof.passed = false;
          spacingProof.nearest = neighborTarget.selector;
          spacingProof.nearestUndersizedCircleDistance = dist;
          spacingProof.reason = 'circle-intersects-undersized-circle';
          break;
        }

        // Track nearest undersized circle for evidence
        if (spacingProof.nearestUndersizedCircleDistance === null ||
            dist < spacingProof.nearestUndersizedCircleDistance) {
          spacingProof.nearestUndersizedCircle = neighborTarget.selector;
          spacingProof.nearestUndersizedCircleDistance = dist;
        }
      }
    }

    // Second check: circle-to-rectangle with all other targets
    if (spacingProof.passed) {
      for (const neighbor of neighbors) {
        const neighborTarget = targets[parseInt(neighbor.id, 10)];
        if (!neighborTarget || neighborTarget.outcome === 'excluded') continue;
        if (neighborTarget.status === 'indeterminate') continue;
        if (neighborTarget._index === ut._index) continue;

        const neighborRect = neighborTarget.effectiveRect || neighborTarget.rect;
        const dist = pointToRectDistance(center, neighborRect);

        if (dist < SPACING_RADIUS) {
          spacingProof.passed = false;
          spacingProof.nearest = neighborTarget.selector;
          spacingProof.nearestDistance = dist;
          spacingProof.reason = 'circle-intersects-target-area';
          break;
        }

        // Track nearest for evidence
        if (spacingProof.nearestDistance === null || dist < spacingProof.nearestDistance) {
          spacingProof.nearest = neighborTarget.selector;
          spacingProof.nearestDistance = dist;
        }
      }
    }

    // Check coincident centers with other undersized targets
    if (spacingProof.passed) {
      for (const neighbor of neighbors) {
        const neighborTarget = targets[parseInt(neighbor.id, 10)];
        if (!neighborTarget || neighborTarget.outcome === 'excluded') continue;
        if (neighborTarget._index === ut._index) continue;

        const neighborCenter = rectCenter(neighborTarget.effectiveRect || neighborTarget.rect);
        if (center.x === neighborCenter.x && center.y === neighborCenter.y) {
          spacingProof.passed = false;
          spacingProof.nearest = neighborTarget.selector;
          spacingProof.reason = 'coincident-centers';
          break;
        }
      }
    }

    ut.spacingProof = spacingProof;

    if (spacingProof.passed) {
      ut.outcome = 'spacing-exception';
    }
  }
}

// ── Sample builder ────────────────────────────────────────────────────

/**
 * Build a deterministic sample object from a classified target.
 *
 * @param {object} t - classified target
 * @param {{width:number, height:number}} viewportDims
 * @param {string} viewportName
 * @param {string} colorScheme
 * @param {string} browserVersion
 * @returns {object}
 */
function buildSample(t, viewportDims, viewportName, colorScheme, browserVersion) {
  const effectiveRect = t.effectiveRect || t.rect;
  const center = rectCenter(effectiveRect);

  const sample = {
    selector: t.selector,
    targetType: t.targetType,
    role: t.role,
    label: t.label,
    width: t.rect.width,
    height: t.rect.height,
    visibleWidth: effectiveRect.width,
    visibleHeight: effectiveRect.height,
    centerX: center.x,
    centerY: center.y,
    requiredWidth: MIN_TARGET_WIDTH,
    requiredHeight: MIN_TARGET_HEIGHT,
    status: t.status || 'confirmed',
    outcome: t.status === 'indeterminate' ? undefined : (t.outcome || 'violation'),
    exception: null,
    indeterminateReason: t.indeterminateReason || undefined,
    spacingProof: t.spacingProof || null,
    viewport: viewportName,
    viewportWidth: viewportDims.width,
    viewportHeight: viewportDims.height,
    colorScheme: colorScheme,
    browserVersion: browserVersion
  };

  // Set exception field
  if (t.outcome === 'spacing-exception') sample.exception = 'spacing-exception';
  if (t.outcome === 'inline-exception') sample.exception = 'inline-exception';
  if (t.outcome === 'user-agent-exception') sample.exception = 'user-agent-exception';

  return sample;
}