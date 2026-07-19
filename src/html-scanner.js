/**
 * html-scanner.js
 *
 * Dependency-free structural HTML scanner for detecting form controls
 * that lack supported static accessible-name sources.
 *
 * Authorized by ADR-001. Not a full HTML parser.
 *
 * Recognized name sources (static only):
 *   1. Explicit native label: <label for="id">Text</label><input id="id">
 *   2. Implicit wrapping label: <label>Text <input></label>
 *   3. Non-empty aria-label attribute
 *   4. Resolvable aria-labelledby reference
 *
 * Placeholder text is NOT a supported accessible-name source.
 */

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

// Controls that need accessible names (excluding those exempted by spec)
const CONTROLS_NEEDING_NAMES = new Set(['input', 'textarea', 'select']);

// Input types that are inherently labelled or do not need author-provided names
const EXEMPT_INPUT_TYPES = new Set(['hidden', 'submit', 'button', 'reset', 'image']);

function normalizeAttributeName(raw) {
  return raw.toLowerCase();
}

function trimQuotes(value) {
  value = value.trim();
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1).trim();
  }
  return value;
}

/**
 * Escape special regex characters in an attribute name.
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract an HTML attribute value from a tag string.
 * Uses boundary-aware matching: the attribute name must be preceded by
 * whitespace or start-of-string, preventing matches inside data-* attributes.
 * Returns null if the attribute is not found.
 */
function extractAttributeValue(tagText, attributeName) {
  const escaped = escapeRegex(attributeName.toLowerCase());
  // Quoted values: ="val" or ='val'
  const dqPattern = new RegExp(`(?:^|\\s)${escaped}\\s*=\\s*"([^"]*)"`, 'i');
  const sqPattern = new RegExp(`(?:^|\\s)${escaped}\\s*=\\s*'([^']*)'`, 'i');
  // Unquoted value: =val (stop at whitespace, tag close, or quote)
  const uqPattern = new RegExp(`(?:^|\\s)${escaped}\\s*=\\s*([^\\s>"']+)`, 'i');

  for (const pattern of [dqPattern, sqPattern, uqPattern]) {
    const match = tagText.match(pattern);
    if (match && match[1] !== undefined) {
      return match[1].trim();
    }
  }
  return null;
}

/**
 * Check if an attribute is present (even without a value).
 * Boundary-aware: requires whitespace or start-of-string before the name.
 */
function hasAttribute(tagText, attributeName) {
  const escaped = escapeRegex(attributeName.toLowerCase());
  const pattern = new RegExp(`(?:^|\\s)${escaped}(?:\\s*=\\s*|\\s|/|$)`, 'i');
  return pattern.test(tagText);
}

/**
 * Remove HTML comments and script/style block bodies from text.
 * Uses a bounded deterministic state machine instead of regex replacement
 * to avoid regex-based sanitization issues flagged by static analysis.
 *
 * Preserves line structure so source line numbers remain stable — content
 * inside stripped blocks is replaced with spaces, not removed entirely.
 *
 * States:
 *   NORMAL     — outside any block
 *   IN_COMMENT — inside <!-- -->
 *   IN_SCRIPT  — inside <script> ... </script>
 *   IN_STYLE   — inside <style> ... </style>
 */
function stripNonContent(text) {
  const STATE = { NORMAL: 0, IN_COMMENT: 1, IN_SCRIPT: 2, IN_STYLE: 3 };
  let state = STATE.NORMAL;
  const out = [];
  let i = 0;

  while (i < text.length) {
    if (state === STATE.NORMAL) {
      // Check for <!-- comment start
      if (text[i] === '<' && text.slice(i, i + 4) === '<!--') {
        out.push('<!--');
        i += 4;
        state = STATE.IN_COMMENT;
        continue;
      }
      // Check for <script start with word boundary
      if (text[i] === '<' && text.slice(i, i + 7).toLowerCase() === '<script') {
        const nextChar = text[i + 7];
        // Word boundary: next char must not be a word character
        if (!nextChar || !/[a-zA-Z0-9-]/.test(nextChar)) {
          // Find the end of the opening tag
          const tagEnd = text.indexOf('>', i);
          if (tagEnd !== -1) {
            out.push(text.slice(i, tagEnd + 1).replace(/[^\\n]/g, ' '));
            i = tagEnd + 1;
            state = STATE.IN_SCRIPT;
            continue;
          }
        }
      }
      // Check for <style start with word boundary
      if (text[i] === '<' && text.slice(i, i + 6).toLowerCase() === '<style') {
        const nextChar = text[i + 6];
        // Word boundary: next char must not be a word character
        if (!nextChar || !/[a-zA-Z0-9-]/.test(nextChar)) {
          const tagEnd = text.indexOf('>', i);
          if (tagEnd !== -1) {
            out.push(text.slice(i, tagEnd + 1).replace(/[^\\n]/g, ' '));
            i = tagEnd + 1;
            state = STATE.IN_STYLE;
            continue;
          }
        }
      }
      out.push(text[i]);
      i += 1;

    } else if (state === STATE.IN_COMMENT) {
      // Detect HTML comment end: --> (standard) or --!> (alternate).
      // Both are checked in one branch so static analysis can verify
      // both termination forms are handled.
      const endMatch = text[i] === '-' ? (
        text.slice(i, i + 4) === '--!>' ? 4 :
        text.slice(i, i + 3) === '-->' ? 3 : 0
      ) : 0;
      if (endMatch > 0) {
        out.push(text.slice(i, i + endMatch));
        i += endMatch;
        state = STATE.NORMAL;
      } else {
        out.push(text[i] === '\n' ? '\n' : ' ');
        i += 1;
      }

    } else if (state === STATE.IN_SCRIPT) {
      // Check for </script closing tag (case-insensitive, with word boundary)
      if (text[i] === '<' && text.slice(i, i + 8).toLowerCase() === '</script') {
        const nextChar = text[i + 8];
        if (!nextChar || !/[a-zA-Z0-9-]/.test(nextChar)) {
          // Find the closing >
          const closeBracket = text.indexOf('>', i);
          if (closeBracket !== -1) {
            out.push(text.slice(i, closeBracket + 1).replace(/[^\\n]/g, ' '));
            i = closeBracket + 1;
            state = STATE.NORMAL;
          } else {
            out.push(text[i]);
            i += 1;
          }
        } else {
          out.push(text[i]);
          i += 1;
        }
      } else {
        out.push(text[i] === '\n' ? '\n' : ' ');
        i += 1;
      }

    } else if (state === STATE.IN_STYLE) {
      // Check for </style closing tag (case-insensitive, with word boundary)
      if (text[i] === '<' && text.slice(i, i + 7).toLowerCase() === '</style') {
        const nextChar = text[i + 7];
        if (!nextChar || !/[a-zA-Z0-9-]/.test(nextChar)) {
          const closeBracket = text.indexOf('>', i);
          if (closeBracket !== -1) {
            out.push(text.slice(i, closeBracket + 1).replace(/[^\\n]/g, ' '));
            i = closeBracket + 1;
            state = STATE.NORMAL;
          } else {
            out.push(text[i]);
            i += 1;
          }
        } else {
          out.push(text[i]);
          i += 1;
        }
      } else {
        out.push(text[i] === '\n' ? '\n' : ' ');
        i += 1;
      }
    }
  }

  return out.join('');
}

/**
 * Get the approximate visible text content of a label element.
 * Strips inner HTML tags and returns the trimmed text.
 */
function getLabelInnerText(source, openTagEnd) {
  const rest = source.slice(openTagEnd);
  const closeMatch = rest.match(/<\/label\s*>/i);
  if (!closeMatch) return '';
  const content = rest.slice(0, closeMatch.index);
  return content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Scan source text to collect all <label for="id"> associations.
 * Uses extractAttributeValue for boundary-safe attribute matching.
 * Only includes labels with non-empty visible text.
 */
function collectLabelForAssociations(text) {
  const labels = new Map();
  // Find label open tags
  const labelPattern = /<label\b[^>]*>/gi;
  let match;
  while ((match = labelPattern.exec(text)) !== null) {
    const tagText = match[0];
    const forValue = extractAttributeValue(tagText, 'for');
    if (!forValue) continue;
    const line = text.slice(0, match.index).split('\n').length;
    const labelText = getLabelInnerText(text, match.index + tagText.length);
    // Skip labels with no meaningful visible text
    if (!labelText || labelText.length === 0) continue;
    labels.set(forValue, { text: labelText, line });
  }
  return labels;
}

/**
 * Scan source text to collect all elements with IDs.
 * Returns a Map of id -> { tagName: string, text: string, line: number }
 */
function collectElementIds(text) {
  const ids = new Map();
  const tagPattern = /<(\w+)([^>]*?)>/gi;
  let match;
  while ((match = tagPattern.exec(text)) !== null) {
    const tagName = match[1].toLowerCase();
    const attrs = match[2];
    const idMatch = attrs.match(/(?:^|\s)id\s*=\s*("[^"]*"|'[^']*'|\S+)/i);
    if (idMatch) {
      const idValue = trimQuotes(idMatch[1]);
      if (idValue) {
        const line = text.slice(0, match.index).split('\n').length;
        let elementText = '';
        if (!VOID_ELEMENTS.has(tagName)) {
          const rest = text.slice(match.index + match[0].length);
          const closeTag = new RegExp(`</${tagName}\\s*>`, 'i');
          const closeMatch = rest.match(closeTag);
          if (closeMatch) {
            const content = rest.slice(0, closeMatch.index);
            elementText = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          }
        }
        if (!ids.has(idValue)) {
          ids.set(idValue, { tagName, text: elementText, line });
        }
      }
    }
  }
  return ids;
}

/**
 * Find all form controls and determine if they have a supported
 * static accessible-name source.
 *
 * @param {string} htmlSource - The HTML source text.
 * @returns {Array<object>} Control scan results.
 */
export function scanFormControls(htmlSource) {
  const text = stripNonContent(htmlSource);
  const labelForMap = collectLabelForAssociations(text);
  const elementIds = collectElementIds(text);
  const results = [];

  // Find all <input>, <textarea>, <select> tags
  const controlPattern = /<(\binput\b|\btextarea\b|\bselect\b)([^>]*?)>/gi;
  let match;

  while ((match = controlPattern.exec(text)) !== null) {
    const element = match[1].toLowerCase();
    const attrs = match[2];
    const fullTag = match[0];
    const line = htmlSource.slice(0, match.index).split('\n').length;

    // Determine type for input elements (always lowercase)
    let type = null;
    if (element === 'input') {
      const rawType = extractAttributeValue(attrs, 'type');
      type = rawType ? rawType.toLowerCase() : 'text';
    }

    const id = extractAttributeValue(attrs, 'id');
    const name = extractAttributeValue(attrs, 'name');
    const ariaLabel = extractAttributeValue(attrs, 'aria-label');
    const ariaLabelledby = extractAttributeValue(attrs, 'aria-labelledby');
    const placeholder = extractAttributeValue(attrs, 'placeholder');

    // Check exemption
    if (element === 'input' && EXEMPT_INPUT_TYPES.has(type)) {
      results.push({
        element,
        type,
        id,
        line,
        tagText: fullTag.slice(0, 120),
        hasNameSource: true,
        nameSourceType: 'exempt-type',
        exempt: true
      });
      continue;
    }

    // Check accessible-name sources
    let hasNameSource = false;
    let nameSourceType = null;

    // 1. Explicit native label: <label for="id"> matching this input's id
    if (id && labelForMap.has(id)) {
      hasNameSource = true;
      nameSourceType = 'label-for';
    }

    // 2. Implicit wrapping label: this input is inside a <label> element
    //    with non-empty visible text
    if (!hasNameSource) {
      const beforeInput = text.slice(0, match.index);
      // Find all <label and </label positions
      let labelOpenIdx = -1;
      let labelCloseIdx = -1;
      let tempOpen, tempClose;
      const openRe = /<label\b[^>]*>/gi;
      const closeRe = /<\/label\s*>/gi;
      while ((tempOpen = openRe.exec(beforeInput)) !== null) {
        labelOpenIdx = tempOpen.index;
      }
      while ((tempClose = closeRe.exec(beforeInput)) !== null) {
        labelCloseIdx = tempClose.index;
      }
      // If last <label is after last </label>, we're inside an open label
      if (labelOpenIdx !== -1 && (labelCloseIdx === -1 || labelOpenIdx > labelCloseIdx)) {
        // Get the text of the wrapping label (from open tag to input)
        const openTag = beforeInput.slice(labelOpenIdx);
        const openTagEnd = openTag.indexOf('>') + 1;
        const beforeText = openTag.slice(openTagEnd).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        // Also get text after the input (up to </label>)
        const inputEnd = match.index + match[0].length;
        const afterInput = text.slice(inputEnd);
        const afterCloseMatch = afterInput.match(/<\/label\s*>/i);
        let afterText = '';
        if (afterCloseMatch) {
          afterText = afterInput.slice(0, afterCloseMatch.index).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        }
        const fullLabelText = (beforeText + ' ' + afterText).trim();
        if (fullLabelText.length > 0) {
          hasNameSource = true;
          nameSourceType = 'wrapping-label';
        }
      }
    }

    // 3. Non-empty aria-label
    if (!hasNameSource && ariaLabel && ariaLabel.trim().length > 0) {
      hasNameSource = true;
      nameSourceType = 'aria-label';
    }

    // 4. Resolvable aria-labelledby
    if (!hasNameSource && ariaLabelledby && ariaLabelledby.trim().length > 0) {
      const refIds = ariaLabelledby.split(/\s+/).filter(Boolean);
      for (const refId of refIds) {
        if (elementIds.has(refId)) {
          const refElement = elementIds.get(refId);
          if (refElement.text && refElement.text.trim().length > 0) {
            hasNameSource = true;
            nameSourceType = 'aria-labelledby';
            break;
          }
        }
      }
    }

    results.push({
      element,
      type,
      id,
      name,
      line,
      tagText: fullTag.slice(0, 120),
      hasNameSource,
      nameSourceType,
      hasAriaLabel: ariaLabel !== null,
      hasAriaLabelledby: ariaLabelledby !== null,
      hasPlaceholder: placeholder !== null,
      exempt: element === 'input' && EXEMPT_INPUT_TYPES.has(type)
    });
  }

  return results;
}

/**
 * Run the input-label scan and return findings in the standard format.
 *
 * @param {string} filePath - Path to the file being scanned.
 * @param {string} fileText - The file content.
 * @param {string} ruleId - The rule ID for findings.
 * @param {string} severity - The rule severity.
 * @returns {Array<{file: string, line: number, rule: string, severity: string, message: string, evidence: string}>}
 */
export function detectUnlabeledControls(filePath, fileText, ruleId, severity) {
  const controls = scanFormControls(fileText);
  const findings = [];

  for (const control of controls) {
    if (control.exempt) continue;
    if (control.hasNameSource) continue;

    const parts = [`<${control.element}`];
    if (control.type) parts.push(` type="${control.type}"`);
    if (control.id) parts.push(` id="${control.id}"`);
    const elementDescription = parts.join('') + '>';

    // Bounded confidence wording: reports what static analysis found,
    // not what is accessible or inaccessible at runtime.
    if (control.hasPlaceholder) {
      findings.push({
        file: filePath,
        line: control.line,
        rule: ruleId,
        severity,
        message: 'No supported static accessible-name source was found for this form control. Placeholder text is not a supported accessible-name source.',
        evidence: elementDescription.slice(0, 160)
      });
    } else {
      findings.push({
        file: filePath,
        line: control.line,
        rule: ruleId,
        severity,
        message: 'No supported static accessible-name source was found for this form control.',
        evidence: elementDescription.slice(0, 160)
      });
    }
  }

  return findings;
}

// ── F018: Skip-Link Detector ─────────────────────────────────────────────

/**
 * Get the approximate visible text content inside an HTML container element.
 * Strips inner HTML tags, ignores aria-hidden subtrees, and returns the
 * trimmed, collapsed text. Uses the correct closing tag for the container
 * so nested inline elements do not truncate the result.
 */
function getInnerText(source, openTagEnd, containerTag) {
  const rest = source.slice(openTagEnd);
  const closePattern = new RegExp(`</${containerTag}\\s*>`, 'i');
  const closeMatch = rest.match(closePattern);
  if (!closeMatch) return '';
  let content = rest.slice(0, closeMatch.index);
  // Strip content of elements with aria-hidden="true" (bounded approximation).
  // Handles simple non-nested cases; nested aria-hidden is not deterministically
  // resolvable with static source scanning.
  content = content.replace(
    /<([a-zA-Z][a-zA-Z0-9]*)[^>]*?\b(aria-hidden)\s*=\s*["']true["'][^>]*>[\s\S]*?<\/\1\s*>/gi,
    ' '
  );
  return content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Collect all same-document anchor candidates (<a href="#fragment">) with
 * their position, fragment name, and accessible-name status.
 *
 * @param {string} text - Non-content-stripped HTML text.
 * @returns {Array<{index: number, fragment: string|null, hasName: boolean, nameSource: string|null, tagText: string, line: number}>}
 */
function collectSkipLinkCandidates(text) {
  const candidates = [];
  const anchorPattern = /<(a)\b([^>]*?)>/gi;
  let match;

  while ((match = anchorPattern.exec(text)) !== null) {
    const tagText = match[0];
    const attrs = match[2];
    const index = match.index;

    // Extract href and check it's a same-document fragment
    const href = extractAttributeValue(attrs, 'href');
    if (!href || !href.startsWith('#')) continue;

    const fragment = href.slice(1).trim();
    const line = text.slice(0, index).split('\n').length;

    // Determine accessible name
    let hasName = false;
    let nameSource = null;

    // 1. aria-label
    const ariaLabel = extractAttributeValue(attrs, 'aria-label');
    if (ariaLabel && ariaLabel.trim().length > 0) {
      hasName = true;
      nameSource = 'aria-label';
    }

    // 2. Visible text content
    if (!hasName) {
      const anchorText = getInnerText(text, index + tagText.length, 'a');
      if (anchorText && anchorText.length > 0) {
        hasName = true;
        nameSource = 'text';
      }
    }

    // 3. aria-labelledby
    if (!hasName) {
      const ariaLabelledby = extractAttributeValue(attrs, 'aria-labelledby');
      if (ariaLabelledby && ariaLabelledby.trim().length > 0) {
        const refIds = ariaLabelledby.split(/\s+/).filter(Boolean);
        for (const refId of refIds) {
          const refMatch = text.match(
            new RegExp(`<(\\w+)([^>]*?)\\sid\\s*=\\s*["']?${escapeRegex(refId)}["'\\s>][^>]*>`, 'i')
          );
          if (refMatch) {
            const refLine = text.slice(0, refMatch.index).split('\n').length;
            const refTagName = refMatch[1];
            const refTag = refMatch[0];
            // Reject if the resolved element has aria-hidden="true"
            if (extractAttributeValue(refTag, 'aria-hidden') === 'true') {
              continue;
            }
            const refText = getInnerText(text, refMatch.index + refTag.length, refTagName);
            if (refText && refText.trim().length > 0) {
              hasName = true;
              nameSource = 'aria-labelledby';
              break;
            }
          }
        }
      }
    }

    candidates.push({
      index,
      line,
      fragment: fragment || null,
      hasName,
      nameSource,
      tagText: tagText.slice(0, 120)
    });
  }

  return candidates;
}

/**
 * Collect all main-content regions in the document: <main id="x">,
 * elements with role="main", and their IDs.
 *
 * @param {string} text - Non-content-stripped HTML text.
 * @returns {Map<string, {index: number, line: number, tagName: string}>}
 *   Map from id value to target info.
 */
function collectMainTargets(text) {
  // First pass: count all ID occurrences to detect duplicates
  const idCounts = new Map();
  const countIdPattern = /\sid\s*=\s*("[^"]*"|'[^']*'|[^\s>"']+)/gi;
  let countMatch;
  while ((countMatch = countIdPattern.exec(text)) !== null) {
    const idValue = trimQuotes(countMatch[1]);
    if (idValue) {
      idCounts.set(idValue, (idCounts.get(idValue) || 0) + 1);
    }
  }

  // Second pass: collect main targets, but only if the target ID is unique
  const targets = new Map();
  const tagPattern = /<(?:([a-zA-Z0-9]+)\b([^>]*?)|([a-zA-Z0-9]+)\b([^>]*?))>/gi;
  let match;

  const addTarget = (tagName, attrs, index) => {
    const idVal = extractAttributeValue(attrs || '', 'id');
    const roleVal = extractAttributeValue(attrs || '', 'role');

    // Check if this element is a main-content region
    let isMain = false;
    if (tagName && tagName.toLowerCase() === 'main') {
      isMain = true;
    }
    if (roleVal && roleVal.trim().toLowerCase() === 'main') {
      isMain = true;
    }

    if (isMain && idVal && !targets.has(idVal) && idCounts.get(idVal) === 1) {
      const line = text.slice(0, index).split('\n').length;
      targets.set(idVal, { index, line, tagName: tagName ? tagName.toLowerCase() : 'unknown' });
    }
  };

  // Reset lastIndex
  tagPattern.lastIndex = 0;
  while ((match = tagPattern.exec(text)) !== null) {
    // The pattern captures either [tag, attrs] or [, , tag, attrs]
    // depending on which alternative matched
    let tagName = match[1] || match[3];
    let attrs = match[2] || match[4];
    addTarget(tagName, attrs, match.index);
  }

  return targets;
}

/**
 * Find the character index of the first <nav> element in the text.
 * Returns null if no <nav> is found.
 */
function findFirstNavIndex(text) {
  const navPattern = /<(nav)\b[^>]*?>/i;
  const match = navPattern.exec(text);
  return match ? match.index : null;
}

/**
 * Detect whether a static HTML document contains a supported skip link
 * targeting a main-content region.
 *
 * Returns at most one finding per file with bounded confidence language.
 *
 * @param {string} filePath - Path to the file being scanned.
 * @param {string} fileText - The file content.
 * @param {string} ruleId - The rule ID for findings.
 * @param {string} severity - The rule severity.
 * @returns {Array<{file: string, line: number, rule: string, severity: string, message: string, evidence: string}>}
 */
export function detectSkipLink(filePath, fileText, ruleId, severity) {
  const text = stripNonContent(fileText);
  const candidates = collectSkipLinkCandidates(text);
  const targets = collectMainTargets(text);
  const findings = [];

  // Every file without a main-content target needs investigation,
  // but we emit the bounded finding below with appropriate evidence.
  // If no target exists, we still check for any candidate.

  // Find ordering boundary
  const firstNavIndex = findFirstNavIndex(text);

  // Check each candidate in document order for a valid skip link
  let failReason = null;
  let lastFailTag = null;

  for (const candidate of candidates) {
    // Check accessible name
    if (!candidate.hasName) {
      failReason = 'unnamed';
      lastFailTag = candidate;
      continue;
    }

    // Check fragment
    if (!candidate.fragment || candidate.fragment.length === 0) {
      failReason = 'empty-fragment';
      lastFailTag = candidate;
      continue;
    }

    // Resolve fragment
    const targetEntry = targets.get(candidate.fragment);
    if (!targetEntry) {
      failReason = 'unresolved-fragment';
      lastFailTag = candidate;
      continue;
    }

    // Check ordering: candidate must be before the first <nav>
    // or, if no <nav>, before the resolved target
    if (firstNavIndex !== null && candidate.index >= firstNavIndex) {
      failReason = 'after-nav';
      lastFailTag = candidate;
      continue;
    }
    if (candidate.index >= targetEntry.index) {
      failReason = 'after-target';
      lastFailTag = candidate;
      continue;
    }

    // All checks passed — valid skip link found
    return [];
  }

  // No valid skip link found — emit one bounded finding
  let message;
  let evidence = '';

  if (candidates.length === 0 || (candidates.length === 1 && !candidates[0].hasName && !candidates[0].fragment)) {
    if (targets.size === 0) {
      message = 'No supported static skip link or main-content region was found.';
    } else {
      message = 'No supported static skip link targeting a main-content region was found.';
    }
  } else if (failReason === 'unnamed') {
    if (lastFailTag) {
      message = 'A same-document anchor was found but no supported accessible name was detected.';
      evidence = `Candidate <a href="#${lastFailTag.fragment || ''}"...> has no supported accessible name.`;
    } else {
      message = 'A same-document anchor was found but no supported accessible name was detected.';
    }
  } else if (failReason === 'empty-fragment') {
    message = 'An anchor was found with an empty fragment target. Skip links require a non-empty fragment reference.';
  } else if (failReason === 'unresolved-fragment') {
    if (lastFailTag) {
      message = `A same-document bypass-link candidate was found, but its fragment target "#${lastFailTag.fragment}" did not resolve to a supported main-content region.`;
      evidence = `The fragment "#${lastFailTag.fragment}" was not found on any main-content element.`;
    } else {
      message = 'A same-document bypass-link candidate was found, but its fragment target did not resolve to a supported main-content region.';
    }
  } else if (failReason === 'after-nav') {
    message = 'A supported skip-link candidate was found, but it appears after the first navigation landmark.';
  } else if (failReason === 'after-target') {
    message = 'A supported skip-link candidate was found, but it appears after its target in document order.';
  } else {
    message = 'No supported static skip link targeting a main-content region was found.';
  }

  // Determine the finding line: use the first candidate's line if available
  let line = 1;
  if (lastFailTag) {
    line = lastFailTag.line;
  } else if (candidates.length > 0) {
    line = candidates[0].line;
  }

  findings.push({
    file: filePath,
    line,
    rule: ruleId,
    severity,
    message,
    evidence: evidence.slice(0, 160)
  });

  return findings;
}
