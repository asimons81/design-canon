/**
 * css-reduced-motion.js
 *
 * Dependency-free CSS structural scanner and reduced-motion detector.
 * Authorized by ADR-001. Not a full CSS parser.
 *
 * Scans .css source text and <style> blocks extracted from .html files.
 * Uses bounded deterministic state machine — no regex-based sanitization.
 *
 * Correctness properties:
 * - Selector-list splitting creates per-selector declaration records
 * - Override tracking is per-motion-family (animation vs transition) and
 *   only counts disabling values
 * - Duration threshold <= 0.01ms (0.01s = 10ms, not accepted)
 * - Non-motion longhands require pairing: animation-name needs
 *   animation-duration to trigger, transition-property needs
 *   transition-duration to trigger
 * - Inline <style> line offsets are zero-indexed (number of lines before content)
 * - HTML tag matching uses \b boundaries to avoid matching subtype tags
 */

// Motion properties
const MOTION_PROPERTIES = new Set([
  'animation', 'animation-name', 'animation-duration', 'animation-delay',
  'animation-iteration-count', 'animation-direction', 'animation-fill-mode',
  'animation-play-state', 'animation-timing-function',
  'transition', 'transition-property', 'transition-duration',
  'transition-delay', 'transition-timing-function'
]);

// Values that disable motion
function isDisabledValue(property, value) {
  const v = value.trim().toLowerCase();
  const p = property.toLowerCase();

  if ((p === 'animation' || p === 'animation-name') && v === 'none') return true;
  if (p === 'transition' && v === 'none') return true;
  if (p === 'transition-property' && v === 'none') return true;
  if ((p === 'animation-duration' || p === 'transition-duration') &&
      (v === '0s' || v === '0ms' || v === '0.01ms')) return true;
  if (p === 'animation' && v === 'none') return true;

  return false;
}

// Check if a duration value is effectively zero (<= 0.01ms)
function isEffectivelyZero(value) {
  const v = value.trim().toLowerCase();
  return v === '0s' || v === '0ms' || v === '0.01ms';
}

// Determine the motion family of a property
function motionFamily(property) {
  const p = property.toLowerCase();
  if (p.startsWith('animation')) return 'animation';
  if (p.startsWith('transition')) return 'transition';
  return null;
}

/**
 * Scan CSS text for motion-bearing declarations without reduced-motion overrides.
 */
export function scanCssMotion(cssText) {
  const declarations = [];       // Per-selector declaration records
  const reducedMotionBlocks = []; // Override declarations inside reduce blocks
  let currentSelectors = [];     // Array of split selectors for the current block
  let inMedia = false;
  let mediaIsReducedMotion = false;
  let blockDepth = 0;
  let selectorBuffer = '';
  let inComment = false;
  let inString = null;

  // Accumulate declarations for the current set of selectors
  const currentDecls = []; // { property, value, family }

  function flushDeclarations() {
    if (currentDecls.length === 0 || currentSelectors.length === 0) return;

    // Per-selector motion state tracking
    for (const sel of currentSelectors) {
      let hasAnimName = false, hasAnimDuration = false, hasAnimShorthand = false;
      let hasTransProp = false, hasTransDuration = false, hasTransShorthand = false;

      for (const d of currentDecls) {
        const p = d.property;
        if (p === 'animation') hasAnimShorthand = true;
        else if (p === 'animation-name' && !isDisabledValue(p, d.value)) hasAnimName = true;
        else if (p === 'animation-duration' && !isDisabledValue(p, d.value)) hasAnimDuration = true;
        else if (p === 'transition') hasTransShorthand = true;
        else if (p === 'transition-property' && !isDisabledValue(p, d.value)) hasTransProp = true;
        else if (p === 'transition-duration' && !isDisabledValue(p, d.value)) hasTransDuration = true;
      }

      // Animation: requires shorthand OR (name + duration)
      const animationActive = hasAnimShorthand || (hasAnimName && hasAnimDuration);
      // Transition: requires shorthand OR (property + duration)
      const transitionActive = hasTransShorthand || (hasTransProp && hasTransDuration);

      if (inMedia && mediaIsReducedMotion) {
        // Track what was overridden
        for (const d of currentDecls) {
          if (d.family === 'animation' || d.property === 'animation' || d.property === 'animation-name' || d.property === 'animation-duration') {
            reducedMotionBlocks.push({ selector: sel, family: 'animation' });
          }
          if (d.family === 'transition' || d.property === 'transition' || d.property === 'transition-property' || d.property === 'transition-duration') {
            reducedMotionBlocks.push({ selector: sel, family: 'transition' });
          }
        }
      } else if (!inMedia) {
        const rec = {
          selector: sel,
          line: currentSelectors[0].line,
          animationActive,
          transitionActive,
          hasAnimShorthand,
          hasAnimName,
          hasAnimDuration,
          hasTransShorthand,
          hasTransProp,
          hasTransDuration,
          animationOverridden: false,
          transitionOverridden: false
        };
        // Store the specific declarations as evidence
        rec.decls = currentDecls.filter(d => {
          const p = d.property;
          if (p === 'animation' || p === 'animation-name' || p === 'animation-duration' ||
              p === 'transition' || p === 'transition-property' || p === 'transition-duration') {
            return !isDisabledValue(p, d.value);
          }
          return false;
        });
        declarations.push(rec);
      }
    }
    currentDecls.length = 0;
  }

  function processSelector(selector, line) {
    const s = selector.trim();
    if (!s) return;
    // Flush any pending declarations for the previous set of selectors
    flushDeclarations();
    // Split selector list and store
    const parts = splitSelectorList(s);
    currentSelectors = parts.map(p => ({ text: p.trim(), line }));
    currentSelectors = currentSelectors.filter(s => s.text.length > 0);
  }

  // Main scan loop
  let i = 0;
  const text = cssText;

  while (i < text.length) {
    const c = text[i];

    if (inComment) {
      if (c === '*' && text[i + 1] === '/') { i += 2; inComment = false; }
      else { i += 1; }
      continue;
    }

    if (inString !== null) {
      if (c === '\\') { i += 2; continue; }
      if (c === inString) inString = null;
      i += 1;
      continue;
    }

    if (c === '/' && text[i + 1] === '*') { inComment = true; i += 2; continue; }
    if (c === '"' || c === "'") { inString = c; i += 1; continue; }

    if (c === '{') {
      blockDepth += 1;
      if (blockDepth === 1 || (blockDepth === 2 && inMedia)) {
        processSelector(selectorBuffer, lineNumber(text, i));
        selectorBuffer = '';
      }
      i += 1;
      continue;
    }

    if (c === '}') {
      if (blockDepth === 1 && inMedia) {
        flushDeclarations();
        inMedia = false;
        mediaIsReducedMotion = false;
      } else if (blockDepth === 1 && !inMedia) {
        flushDeclarations();
      }
      blockDepth = Math.max(0, blockDepth - 1);
      currentSelectors = [];
      i += 1;
      continue;
    }

    // @media detection
    if (c === '@' && blockDepth === 0) {
      const rest = text.slice(i);
      const mediaMatch = rest.match(/@media\s*\(/i);
      if (mediaMatch) {
        inMedia = true;
        const mediaContent = rest.slice(mediaMatch.index + mediaMatch[0].length);
        const closeParen = findMatchingParen(mediaContent);
        if (closeParen !== -1) {
          const condition = mediaContent.slice(0, closeParen).toLowerCase();
          mediaIsReducedMotion = condition.includes('prefers-reduced-motion') &&
                                 /\breduce\b/.test(condition);
          i += mediaMatch.index + mediaMatch[0].length + closeParen + 1;
          continue;
        }
      }
    }

    // Collect selector text when at the right depth
    if ((blockDepth === 0 && !inMedia) || (blockDepth === 1 && inMedia)) {
      // Skip @ rules other than @media at depth 0
      if (c === '@' && blockDepth === 0) {
        while (i < text.length && text[i] !== '{' && text[i] !== ';') i += 1;
        if (text[i] === '{') blockDepth += 1;
        i += 1;
        continue;
      }
      selectorBuffer += c;
      i += 1;
      continue;
    }

    // Extract declarations
    if ((blockDepth === 2 && inMedia) || (blockDepth === 1 && !inMedia)) {
      if (currentSelectors.length > 0) {
        const decl = extractDeclaration(text, i);
        if (decl) {
          const p = decl.property.trim().toLowerCase();
          if (MOTION_PROPERTIES.has(p)) {
            // Check if inside reduced-motion override block
            if (inMedia && mediaIsReducedMotion) {
              // In reduced-motion block: only disabling values count as overrides
              if (isDisabledValue(p, decl.value)) {
                const f = motionFamily(p);
                if (f) {
                  for (const sel of currentSelectors) {
                    reducedMotionBlocks.push({ selector: sel.text, family: f });
                  }
                }
              }
            } else if (!isDisabledValue(p, decl.value)) {
              // Only track non-disabled motion declarations
              currentDecls.push({ property: p, value: decl.value, family: motionFamily(p) });
            }
          }
          i = decl.endIndex;
          continue;
        }
      }
    }

    i += 1;
  }

  // Flush remaining declarations
  flushDeclarations();

  // Apply reduced-motion block overrides
  for (const d of declarations) {
    for (const rm of reducedMotionBlocks) {
      if (d.selector.text === rm.selector) {
        if (rm.family === 'animation') d.animationOverridden = true;
        if (rm.family === 'transition') d.transitionOverridden = true;
      }
    }
  }

  // Build findings
  const findings = [];
  for (const d of declarations) {
    if (d.animationActive && !d.animationOverridden) {
      findings.push({
        selector: d.selector.text,
        line: d.line,
        property: 'animation',
        value: d.decls.find(dd => dd.property === 'animation' || dd.property === 'animation-name')?.value || '',
        hasOverride: false
      });
    }
    if (d.transitionActive && !d.transitionOverridden) {
      findings.push({
        selector: d.selector.text,
        line: d.line,
        property: 'transition',
        value: d.decls.find(dd => dd.property === 'transition' || dd.property === 'transition-property')?.value || '',
        hasOverride: false
      });
    }
  }

  return findings;
}

function extractDeclaration(text, start) {
  let i = start;
  while (i < text.length && (text[i] === ' ' || text[i] === '\t' || text[i] === '\n' || text[i] === '\r' || text[i] === ';')) i += 1;
  if (i >= text.length || text[i] === '}' || text[i] === '{') return null;

  let prop = '';
  while (i < text.length && text[i] !== ':' && text[i] !== '}' && text[i] !== '{' && text[i] !== ';') {
    if (text[i] !== '\n' && text[i] !== '\r') prop += text[i];
    i += 1;
  }
  if (i >= text.length || text[i] !== ':') return null;
  i += 1;

  let val = '';
  let inStr = null;
  while (i < text.length && text[i] !== ';' && text[i] !== '}') {
    const c = text[i];
    if (inStr) {
      if (c === '\\') { val += text[i] + (text[i + 1] || ''); i += 2; continue; }
      if (c === inStr) inStr = null;
      val += c; i += 1; continue;
    }
    if (c === '"' || c === "'") { inStr = c; val += c; i += 1; continue; }
    val += c; i += 1;
  }
  if (i >= text.length) return null;

  return {
    property: prop.trim(),
    value: val.trim(),
    startLine: 0,
    endIndex: text[i] === ';' ? i + 1 : i
  };
}

function findMatchingParen(text) {
  let depth = 1;
  let inStr = null;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (inStr) { if (c === '\\') { i += 1; continue; } if (c === inStr) inStr = null; continue; }
    if (c === '"' || c === "'") { inStr = c; continue; }
    if (c === '(') { depth += 1; continue; }
    if (c === ')') { depth -= 1; if (depth === 0) return i; }
  }
  return -1;
}

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
      current += c; continue;
    }
    if (c === '"' || c === "'") { inStr = c; current += c; continue; }
    if (c === '(') { depth += 1; current += c; continue; }
    if (c === ')') { depth -= 1; current += c; continue; }
    if (c === ',' && depth === 0) { parts.push(current.trim()); current = ''; continue; }
    current += c;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function lineNumber(text, index) {
  return text.slice(0, Math.min(index, text.length)).split('\n').length;
}

/**
 * Extract <style> block content from HTML text.
 * Uses a bounded approach aware of comments and script tags.
 * Uses \b boundaries for tag matching to avoid matching subtype tags.
 * Both --> and --!> are recognized as comment ends.
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
    if (inComment && htmlText[i] === '-' && htmlText.slice(i, i + 4) === '--!>') {
      inComment = false;
      i += 4;
      continue;
    }
    if (inComment && htmlText[i] === '-' && htmlText.slice(i, i + 3) === '-->') {
      inComment = false;
      i += 3;
      continue;
    }
    if (inComment) { i += 1; continue; }

    // Handle <script> blocks (with \b boundary to avoid matching e.g. <scripture>)
    if (htmlText[i] === '<' && /<script\b/i.test(htmlText.slice(i, i + 8))) {
      inScript = true;
      const close = htmlText.indexOf('>', i);
      i = close !== -1 ? close + 1 : i + 1;
      continue;
    }
    if (inScript) {
      if (htmlText[i] === '<' && /<\/script\b/i.test(htmlText.slice(i, i + 9))) {
        inScript = false;
        const close = htmlText.indexOf('>', i);
        i = close !== -1 ? close + 1 : i + 1;
        continue;
      }
      i += 1;
      continue;
    }

    // Find <style> tags (with \b boundary to avoid matching e.g. <stylesheet>)
    if (htmlText[i] === '<' && /<style\b/i.test(htmlText.slice(i, i + 7))) {
      const openEnd = htmlText.indexOf('>', i);
      if (openEnd === -1) { i += 1; continue; }
      const contentStart = openEnd + 1;
      const closeTag = htmlText.slice(contentStart).match(/<\/style\s*>/i);
      if (!closeTag) { i += 1; continue; }
      const content = htmlText.slice(contentStart, contentStart + closeTag.index);
      // lineOffset = number of newlines before contentStart (0-indexed)
      const linesBefore = htmlText.slice(0, contentStart).split('\n').length - 1;
      blocks.push({ content, lineOffset: linesBefore });
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
 * @param {number} lineOffset - Line offset (0 = no offset, 1 = content starts on line 2, etc.)
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
