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
 * Given a string key-value like ` type="text" ` or ` id=foo `, extract the value.
 * Returns null if no value found.
 */
function extractAttributeValue(tagText, attributeName) {
  const lower = attributeName.toLowerCase();
  // Match attribute=value patterns: ="val", ='val', =val
  const patterns = [
    new RegExp(`${lower}\\s*=\\s*"([^"]*)"`, 'i'),
    new RegExp(`${lower}\\s*=\\s*'([^']*)'`, 'i'),
    new RegExp(`${lower}\\s*=\\s*([^\\s>"']+)`, 'i')
  ];
  for (const pattern of patterns) {
    const match = tagText.match(pattern);
    if (match && match[1] !== undefined) {
      return match[1].trim();
    }
  }
  // Check for boolean attribute presence (attribute exists without value)
  const boolPattern = new RegExp(`\\b${lower}\\b`, 'i');
  if (boolPattern.test(tagText)) {
    return ''; // attribute is present but empty-valued
  }
  return null;
}

/**
 * Check if an attribute is present (even without a value).
 */
function hasAttribute(tagText, attributeName) {
  const pattern = new RegExp(`\\b${attributeName.toLowerCase()}\\b`, 'i');
  return pattern.test(tagText);
}

/**
 * Remove HTML comments and script/style block bodies from text.
 * This prevents treating HTML-like markup inside them as real controls.
 */
function stripNonContent(text) {
  // Remove HTML comments
  let result = text.replace(/<!--[\s\S]*?-->/g, '');
  // Strip <script>...</script> bodies (but keep the tags so line numbers don't shift too much)
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
 * Scan source text to collect all <label for="id"> associations.
 * Returns a Map of targetId -> { text: string, line: number }
 */
function collectLabelForAssociations(text) {
  const labels = new Map();
  const labelPattern = /<label\s[^>]*?\bfor\s*=\s*("[^"]*"|'[^']*'|\S+)[^>]*>/gi;
  let match;
  while ((match = labelPattern.exec(text)) !== null) {
    const forValue = trimQuotes(match[1]);
    if (!forValue) continue;
    const line = text.slice(0, match.index).split('\n').length;
    // Extract visible text inside the label element (simple approximation)
    // Find the closing </label> tag
    const rest = text.slice(match.index + match[0].length);
    const closeMatch = rest.match(/<\/label\s*>/i);
    let labelText = '';
    if (closeMatch) {
      const content = rest.slice(0, closeMatch.index);
      // Strip inner HTML tags to get approximate text
      labelText = content.replace(/<[^>]*>/g, '').trim();
    }
    labels.set(forValue, { text: labelText || '', line });
  }
  return labels;
}

/**
 * Scan source text to collect all elements with IDs.
 * Returns a Map of id -> { text: string, line: number, tagText: string }
 */
function collectElementIds(text) {
  const ids = new Map();
  // Match opening tags that have an id attribute
  const idPattern = /\b(id)\s*=\s*("[^"]*"|'[^']*'|\S+)/gi;
  const tagPattern = /<(\w+)([^>]*?)>/gi;
  let match;
  while ((match = tagPattern.exec(text)) !== null) {
    const tagName = match[1].toLowerCase();
    const attrs = match[2];
    const idMatch = attrs.match(/\bid\s*=\s*("[^"]*"|'[^']*'|\S+)/i);
    if (idMatch) {
      const idValue = trimQuotes(idMatch[1]);
      if (idValue) {
        const line = text.slice(0, match.index).split('\n').length;
        // Extract the element's text content approximately
        let elementText = '';
        if (!VOID_ELEMENTS.has(tagName)) {
          const rest = text.slice(match.index + match[0].length);
          const closeTag = new RegExp(`</${tagName}\\s*>`, 'i');
          const closeMatch2 = rest.match(closeTag);
          if (closeMatch2) {
            const content = rest.slice(0, closeMatch2.index);
            elementText = content.replace(/<[^>]*>/g, '').trim();
          }
        }
        if (!ids.has(idValue)) {
          ids.set(idValue, { tagName, text: elementText, line, attrs });
        }
      }
    }
  }
  return ids;
}

/**
 * Find all form controls and determine if they have a supported accessible-name source.
 *
 * @param {string} htmlSource - The HTML source text.
 * @returns {Array<{element: string, type: string|null, id: string|null, line: number, tagText: string, hasNameSource: boolean, nameSourceType: string|null}>}
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
    const tagText = fullTag;

    // Determine type for input elements
    let type = null;
    if (element === 'input') {
      type = extractAttributeValue(attrs, 'type');
      if (!type) type = 'text'; // default type
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
        tagText: tagText.slice(0, 120),
        hasNameSource: true, // exempt
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
    if (!hasNameSource) {
      // Scan backwards to find an opening <label> before the input
      const beforeInput = text.slice(0, match.index);
      const lastLabelOpen = beforeInput.lastIndexOf('<label');
      const lastLabelClose = beforeInput.lastIndexOf('</label>');
      if (lastLabelOpen > lastLabelClose) {
        // Input is inside an open <label> (implicit label association)
        hasNameSource = true;
        nameSourceType = 'wrapping-label';
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
          // Check if the referenced element has non-empty text
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
      tagText: tagText.slice(0, 120),
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

    let message;
    if (control.hasPlaceholder) {
      message = `Form control has no accessible name. Placeholder text is not an accessible-name source. Use <label>, aria-label, or aria-labelledby.`;
    } else {
      message = `Form control has no accessible name. Add a <label> element, aria-label, or aria-labelledby.`;
    }

    findings.push({
      file: filePath,
      line: control.line,
      rule: ruleId,
      severity,
      message,
      evidence: elementDescription.slice(0, 160)
    });
  }

  return findings;
}
