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
 * Prevents treating HTML-like markup inside them as real controls.
 */
function stripNonContent(text) {
  let result = text.replace(/<!--[\s\S]*?-->/g, '');
  // Strip <script>...</script> bodies (preserve line structure)
  result = result.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, (match) => {
    return match.replace(/[^\n]/g, ' ');
  });
  // Strip <style>...</style> bodies
  result = result.replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, (match) => {
    return match.replace(/[^\n]/g, ' ');
  });
  return result;
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
