/**
 * css-reduced-motion.js
 *
 * Dependency-free CSS structural scanner and reduced-motion detector.
 * Authorized by ADR-001. Not a full CSS parser.
 *
 * Scans .css source text and <style> blocks extracted from .html files.
 * Uses bounded deterministic state machine — no regex-based sanitization.
 */

// Motion properties that indicate active animation or transition values.
// Declarations that disable motion (none, 0s, 0ms) are excluded.
const MOTION_PROPERTIES = new Set([
  'animation', 'animation-name', 'animation-duration', 'animation-delay',
  'animation-iteration-count', 'animation-direction', 'animation-fill-mode',
  'animation-play-state', 'animation-timing-function',
  'transition', 'transition-property', 'transition-duration',
  'transition-delay', 'transition-timing-function'
]);

// Properties that when set to non-zero values indicate motion is active.
// Excludes properties that are inherently non-motion (e.g. animation-fill-mode values).
const MOTION_TRIGGER_PROPERTIES = new Set([
  'animation', 'animation-name', 'animation-duration',
  'animation-iteration-count',
  'transition', 'transition-property', 'transition-duration'
]);

// Values that disable motion for their respective properties.
function isDisabledValue(property, value) {
  const v = value.trim().toLowerCase();
  const p = property.toLowerCase();

  // animation: none
  if ((p === 'animation' || p === 'animation-name') && v === 'none') return true;
  // transition: none
  if ((p === 'transition') && v === 'none') return true;
  // animation-duration: 0s, 0ms
  if ((p === 'animation-duration' || p === 'transition-duration') &&
      (v === '0s' || v === '0ms' || v === '0.01ms' || v === '0.01s')) return true;
  // For shorthands, check if ALL values are disabled
  if ((p === 'animation' || p === 'transition') && v === 'none') return true;

  return false;
}

// Check if a value is effectively zero duration (<= 0.01ms)
function isEffectivelyZero(value) {
  const v = value.trim().toLowerCase();
  return v === '0s' || v === '0ms' || v === '0.01ms' || v === '0.01s';
}

/**
 * Scan CSS text for motion-bearing declarations and their reduced-motion overrides.
 *
 * Uses a bounded state machine that tracks:
 *   NORMAL  — scanning for selectors, @media rules, declarations
 *   COMMENT — inside /* * /
 *   STRING  — inside " " or ' '
 *   MEDIA   — inside @media (determine if reduced-motion)
 *   BLOCK   — inside selector or @media block
 *
 * Block depth is tracked with a simple counter.
 * Braces inside strings and comments are not counted.
 */
export function scanCssMotion(cssText) {
  const state = { i: 0, text: cssText, ch: () => cssText[state.i] || '' };
  const declarations = [];       // All declarations found
  const reducedMotionBlocks = []; // Declaration sets inside prefers-reduced-motion blocks
  let reducedMotionActive = false;
  let currentSelector = '';
  let currentSelectorLine = 0;
  let inMedia = false;
  let mediaIsReducedMotion = false;
  let blockDepth = 0;
  let selectorBuffer = '';
  let inComment = false;
  let inString = null; // null, "'", or '"'

  function processSelector(selector, line) {
    const s = selector.trim();
    if (!s) return;
    // Split selector list
    const parts = splitSelectorList(s);
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      // Check if this is inside @media (prefers-reduced-motion: reduce)
      if (inMedia && mediaIsReducedMotion) {
        reducedMotionBlocks.push({ selector: trimmed, line });
      } else if (!inMedia) {
        declarations.push({ selector: trimmed, line, hasOverride: false });
      }
    }
  }

  function processDeclaration(prop, value, line) {
    const p = prop.trim().toLowerCase();
    const v = value.trim();

    if (!MOTION_PROPERTIES.has(p)) return;

    // Check if we're inside a reduced-motion block
    if (inMedia && mediaIsReducedMotion) {
      // This is an override — mark matching declarations even if value is disabled
      markOverrides(p, v);
      return;
    }

    // Skip disabled values outside reduced-motion blocks
    if (isDisabledValue(p, v)) return;

    // This is an unprotected motion declaration
    if (inMedia || !currentSelector) return;

    // Find which declarations this applies to
    for (const d of declarations) {
      if (d.selector === currentSelector) {
        if (!d.motionProps) d.motionProps = [];
        d.motionProps.push({ property: p, value: v, line });
      }
    }
  }

  function markOverrides(property, value) {
    // Mark any existing declarations with matching selector as having override
    for (const d of declarations) {
      if (d.selector === currentSelector) {
        d.hasOverride = true;
      }
    }
  }

  // Main scan loop
  while (state.i < cssText.length) {
    const c = state.ch();

    if (inComment) {
      if (c === '*' && cssText[state.i + 1] === '/') {
        state.i += 2;
        inComment = false;
      } else {
        state.i += 1;
      }
      continue;
    }

    if (inString !== null) {
      if (c === '\\') {
        state.i += 2; // skip escaped character
        continue;
      }
      if (c === inString) {
        inString = null;
      }
      state.i += 1;
      continue;
    }

    // Start comment
    if (c === '/' && cssText[state.i + 1] === '*') {
      inComment = true;
      state.i += 2;
      continue;
    }

    // Start string
    if (c === '"' || c === "'") {
      inString = c;
      state.i += 1;
      continue;
    }

    // Track braces for block depth (only when not in string/comment)
    if (c === '{') {
      blockDepth += 1;
      // Process selectors at depth 1 (top-level) and depth 2 (inside @media)
      if (blockDepth === 1 || (blockDepth === 2 && inMedia)) {
        currentSelector = selectorBuffer.trim();
        currentSelectorLine = lineNumber(cssText, state.i);
        processSelector(currentSelector, currentSelectorLine);
        selectorBuffer = '';
      }
      state.i += 1;
      continue;
    }

    if (c === '}') {
      if (blockDepth === 1 && inMedia) {
        // Exiting @media block
        inMedia = false;
        mediaIsReducedMotion = false;
      }
      blockDepth = Math.max(0, blockDepth - 1);
      currentSelector = '';
      state.i += 1;
      continue;
    }

    // Track @media
    if (c === '@' && blockDepth === 0) {
      const rest = cssText.slice(state.i);
      const mediaMatch = rest.match(/@media\s*\(/i);
      if (mediaMatch) {
        inMedia = true;
        // Check if this is prefers-reduced-motion: reduce
        const mediaContent = rest.slice(mediaMatch.index + mediaMatch[0].length);
        const closeParen = findMatchingParen(mediaContent);
        if (closeParen !== -1) {
          const condition = mediaContent.slice(0, closeParen).toLowerCase();
          mediaIsReducedMotion = condition.includes('prefers-reduced-motion') &&
                                 /\breduce\b/.test(condition);
          state.i += mediaMatch.index + mediaMatch[0].length + closeParen + 1;
          continue;
        }
      }
    }

    // If we're at block level 0 and not in @media, collect selector text
    if (blockDepth === 0 && !inMedia) {
      // Skip @ rules other than @media
      if (c === '@') {
        // Skip until { or ;
        while (state.i < cssText.length && cssText[state.i] !== '{' && cssText[state.i] !== ';') {
          state.i += 1;
        }
        if (cssText[state.i] === '{') {
          blockDepth += 1;
        }
        state.i += 1;
        continue;
      }
      selectorBuffer += c;
    }

    // Also collect selector text when inside @media at depth 1
    if (blockDepth === 1 && inMedia) {
      selectorBuffer += c;
    }

    // If we're inside a selector block (depth >= 1), extract declarations
    // Process declarations at depth 2 inside @media, or depth 1 outside @media
    if ((blockDepth === 2 && inMedia) || (blockDepth === 1 && !inMedia)) {
      if (currentSelector) {
        const decl = extractDeclaration(cssText, state.i);
        if (decl) {
          processDeclaration(decl.property, decl.value, lineNumber(cssText, decl.startLine));
          state.i = decl.endIndex;
          continue;
        }
      }
    }

    state.i += 1;
  }

  // Build findings for unprotected motion declarations
  const findings = [];
  for (const d of declarations) {
    if (d.motionProps && d.motionProps.length > 0 && !d.hasOverride) {
      for (const mp of d.motionProps) {
        findings.push({
          selector: d.selector,
          line: d.line,
          property: mp.property,
          value: mp.value,
          hasOverride: false,
          valueLine: mp.line
        });
      }
    }
  }

  return findings;
}

/**
 * Extract a CSS declaration (property: value) starting from position i.
 * Returns { property, value, startLine, endIndex } or null.
 */
function extractDeclaration(text, start) {
  let i = start;
  // Skip whitespace and semicolons
  while (i < text.length && (text[i] === ' ' || text[i] === '\t' || text[i] === '\n' || text[i] === '\r' || text[i] === ';')) {
    i += 1;
  }
  if (i >= text.length || text[i] === '}' || text[i] === '{') return null;

  const startLine = i;
  // Read property name (up to :)
  let prop = '';
  while (i < text.length && text[i] !== ':' && text[i] !== '}' && text[i] !== '{' && text[i] !== ';') {
    if (text[i] !== '\n' && text[i] !== '\r') prop += text[i];
    i += 1;
  }
  if (i >= text.length || text[i] !== ':') return null;
  i += 1; // skip ':'

  // Read value (up to ; or })
  let val = '';
  let inStr = null;
  while (i < text.length && text[i] !== ';' && text[i] !== '}') {
    const c = text[i];
    if (inStr) {
      if (c === '\\') {
        val += text[i] + (text[i + 1] || '');
        i += 2;
        continue;
      }
      if (c === inStr) {
        inStr = null;
      }
      val += c;
      i += 1;
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = c;
      val += c;
      i += 1;
      continue;
    }
    val += c;
    i += 1;
  }

  if (i >= text.length) return null;

  const endIndex = text[i] === ';' ? i + 1 : i;
  return {
    property: prop.trim(),
    value: val.trim(),
    startLine,
    endIndex
  };
}

/**
 * Find matching closing parenthesis, accounting for nesting and strings.
 */
function findMatchingParen(text) {
  let depth = 1;
  let inStr = null;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (inStr) {
      if (c === '\\') { i += 1; continue; }
      if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'") { inStr = c; continue; }
    if (c === '(') { depth += 1; continue; }
    if (c === ')') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Split a comma-separated selector list into individual selectors.
 */
function splitSelectorList(text) {
  const parts = [];
  let current = '';
  let depth = 0;
  let inStr = null;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (inStr) {
      if (c === '\\') { current += text[i] + (text[i + 1] || ''); i += 1; continue; }
      if (c === inStr) inStr = null;
      current += c;
      continue;
    }
    if (c === '"' || c === "'") { inStr = c; current += c; continue; }
    if (c === '(') { depth += 1; current += c; continue; }
    if (c === ')') { depth -= 1; current += c; continue; }
    if (c === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += c;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/**
 * Compute line number for a position in text (1-indexed).
 */
function lineNumber(text, index) {
  return text.slice(0, Math.min(index, text.length)).split('\n').length;
}

/**
 * Extract <style> block content from HTML text.
 * Uses a bounded approach aware of comments and script tags.
 * Returns an array of { content: string, lineOffset: number }.
 */
export function extractStyleBlocks(htmlText) {
  const blocks = [];
  let i = 0;
  let inComment = false;
  let inScript = false;

  while (i < htmlText.length) {
    // Handle HTML comments
    if (htmlText[i] === '<' && htmlText.slice(i, i + 4) === '<!--') {
      inComment = true;
      i += 4;
      continue;
    }
    if (inComment && htmlText[i] === '-' && htmlText.slice(i, i + 3) === '-->') {
      inComment = false;
      i += 3;
      continue;
    }
    if (inComment) { i += 1; continue; }

    // Handle <script> blocks
    if (htmlText[i] === '<' && htmlText.slice(i, i + 7).toLowerCase() === '<script') {
      inScript = true;
      const close = htmlText.indexOf('>', i);
      i = close !== -1 ? close + 1 : i + 1;
      continue;
    }
    if (inScript) {
      if (htmlText[i] === '<' && htmlText.slice(i, i + 8).toLowerCase() === '</script') {
        inScript = false;
        const close = htmlText.indexOf('>', i);
        i = close !== -1 ? close + 1 : i + 1;
        continue;
      }
      i += 1;
      continue;
    }

    // Find <style> tags
    if (htmlText[i] === '<' && htmlText.slice(i, i + 6).toLowerCase() === '<style') {
      const openEnd = htmlText.indexOf('>', i);
      if (openEnd === -1) { i += 1; continue; }
      const contentStart = openEnd + 1;
      const closeTag = htmlText.slice(contentStart).match(/<\/style\s*>/i);
      if (!closeTag) { i += 1; continue; }
      const content = htmlText.slice(contentStart, contentStart + closeTag.index);
      const lineOffset = lineNumber(htmlText, contentStart);
      blocks.push({ content, lineOffset });
      i = contentStart + closeTag.index + closeTag[0].length;
      continue;
    }

    i += 1;
  }

  return blocks;
}

/**
 * Main detector: find motion-bearing CSS without reduced-motion overrides.
 *
 * @param {string} cssText - CSS source text
 * @param {number} lineOffset - Line offset for inline <style> blocks (0 for .css files)
 * @returns {Array<{line: number, selector: string, property: string, message: string, evidence: string}>}
 */
export function detectUnprotectedMotion(cssText, lineOffset = 0) {
  const findings = scanCssMotion(cssText);
  return findings.map(f => ({
    line: f.line + lineOffset,
    selector: f.selector,
    property: f.property,
    value: f.value,
    message: `Motion-bearing CSS declaration was found without a supported static reduced-motion override. Add @media (prefers-reduced-motion: reduce) for selector "${f.selector}" with a disabling override.`,
    evidence: `${f.selector} { ${f.property}: ${f.value}; }`.slice(0, 160)
  }));
}

/**
 * Detect unprotected motion in a .html file by extracting <style> blocks.
 *
 * @param {string} htmlText - HTML source text
 * @param {string} filePath - File path for findings
 * @param {string} ruleId - Rule ID
 * @param {string} severity - Rule severity
 * @returns {Array<object>} Findings
 */
export function detectUnprotectedMotionInHtml(htmlText, filePath, ruleId, severity) {
  const blocks = extractStyleBlocks(htmlText);
  const findings = [];

  for (const block of blocks) {
    const blockFindings = detectUnprotectedMotion(block.content, block.lineOffset);
    for (const f of blockFindings) {
      findings.push({
        file: filePath,
        line: f.line,
        rule: ruleId,
        severity,
        message: f.message,
        evidence: f.evidence
      });
    }
  }

  return findings;
}
