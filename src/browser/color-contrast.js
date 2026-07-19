/**
 * browser/color-contrast.js
 *
 * Dependency-free pure color utilities for sRGB contrast analysis.
 * Parses computed color strings, alpha-composites, calculates
 * relative luminance (WCAG 2.x), contrast ratios, and large-text
 * classification.
 *
 * All functions are pure — no I/O, no browser APIs, no side effects.
 */

/**
 * Parse a Chromium-computed sRGB color string into {r, g, b, a}.
 * Supports:
 *   rgb(r, g, b)
 *   rgba(r, g, b, a)
 *   rgb(r g b)
 *   rgb(r g b / a)
 *   rgba(r g b / a)
 *
 * Channels may be numeric (0-255) or percentage strings.
 *
 * @param {string} value - Computed color string from Chromium.
 * @returns {{r: number, g: number, b: number, a: number}|null}
 *   Normalised {r,g,b} 0..255, a 0..1, or null on malformed input.
 */
export function parseComputedColor(value) {
  if (!value || typeof value !== 'string') return null;
  const s = value.trim().toLowerCase();

  // Match rgb/rgba with modern space-separated or legacy comma syntax
  const legacyRe = /^rgba?\s*\(\s*(\d+%?)\s*[,]\s*(\d+%?)\s*[,]\s*(\d+%?)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/;
  const modernRe = /^rgba?\s*\(\s*(\d+%?)\s+(\d+%?)\s+(\d+%?)(?:\s*/\s*([\d.]+%?))?\s*\)$/;

  let m = s.match(legacyRe);
  if (!m) m = s.match(modernRe);
  if (!m) return null;

  const rawR = m[1];
  const rawG = m[2];
  const rawB = m[3];
  const rawA = m[4] !== undefined ? m[4] : null;

  const r = parseChannel(rawR);
  const g = parseChannel(rawG);
  const b = parseChannel(rawB);
  if (r === null || g === null || b === null) return null;

  let alpha = 1;
  if (rawA !== null) {
    const parsed = parseAlpha(rawA);
    if (parsed === null) return null;
    alpha = parsed;
  }

  return { r: clampByte(r), g: clampByte(g), b: clampByte(b), a: clampAlpha(alpha) };
}

/**
 * Parse a single sRGB channel value which may be numeric or percentage.
 * @param {string} raw
 * @returns {number|null} 0..255 value, or null on failure
 */
function parseChannel(raw) {
  if (!raw) return null;
  const s = raw.trim();
  if (s.endsWith('%')) {
    const num = parseFloat(s);
    if (Number.isNaN(num)) return null;
    return Math.round((num / 100) * 255);
  }
  const num = Number(s);
  if (Number.isNaN(num)) return null;
  return num;
}

/**
 * Parse an alpha value which may be numeric or percentage.
 * @param {string} raw
 * @returns {number|null} 0..1
 */
function parseAlpha(raw) {
  const s = raw.trim();
  if (s.endsWith('%')) {
    const num = parseFloat(s);
    if (Number.isNaN(num)) return null;
    return num / 100;
  }
  const num = Number(s);
  if (Number.isNaN(num)) return null;
  return num;
}

function clampByte(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function clampAlpha(v) {
  return Math.max(0, Math.min(1, v));
}

/**
 * Check if we parsed a named unsupported color space.
 * Returns true for strings containing 'color(srgb' or 'color('
 * (Chromium serialisation for unsupported color spaces).
 *
 * @param {string} value
 * @returns {boolean}
 */
export function isUnsupportedColorSpace(value) {
  if (!value || typeof value !== 'string') return false;
  const s = value.trim().toLowerCase();
  return s.startsWith('color(');
}

/**
 * Alpha-composite a foreground color over a background color
 * using standard source-over compositing.
 *
 * @param {{r:number,g:number,b:number,a:number}} fg - Foreground (0..255, a 0..1)
 * @param {{r:number,g:number,b:number,a:number}} bg - Background (0..255, a 0..1)
 * @returns {{r:number,g:number,b:number,a:number}} Composite sRGB with a=1
 */
export function alphaComposite(fg, bg) {
  const fa = fg.a;
  const ba = bg.a;
  const outA = fa + ba * (1 - fa);

  if (outA === 0) return { r: 0, g: 0, b: 0, a: 0 };

  const r = (fg.r * fa + bg.r * ba * (1 - fa)) / outA;
  const g = (fg.g * fa + bg.g * ba * (1 - fa)) / outA;
  const b = (fg.b * fa + bg.b * ba * (1 - fa)) / outA;

  return {
    r: Math.round(clampByte(r)),
    g: Math.round(clampByte(g)),
    b: Math.round(clampByte(b)),
    a: clampAlpha(outA)
  };
}

/**
 * Linearize a single sRGB channel value (0..255) per WCAG 2.x.
 * @param {number} c8 - 0..255 integer
 * @returns {number} Linearised channel value
 */
export function linearizeChannel(c8) {
  const csrgb = c8 / 255;
  if (csrgb <= 0.04045) {
    return csrgb / 12.92;
  }
  return Math.pow((csrgb + 0.055) / 1.055, 2.4);
}

/**
 * Calculate WCAG 2.x relative luminance from sRGB {r,g,b} (0..255).
 * @param {{r:number,g:number,b:number}} color
 * @returns {number} Relative luminance
 */
export function relativeLuminance(color) {
  const R = linearizeChannel(color.r);
  const G = linearizeChannel(color.g);
  const B = linearizeChannel(color.b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Calculate WCAG 2.x contrast ratio between two relative luminances.
 * Ratio = (L1 + 0.05) / (L2 + 0.05) where L1 > L2.
 *
 * @param {number} l1 - Relative luminance of lighter color
 * @param {number} l2 - Relative luminance of darker color
 * @returns {number} Contrast ratio (≥ 1)
 */
export function contrastRatio(l1, l2) {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Calculate contrast ratio between two sRGB colors.
 *
 * @param {{r:number,g:number,b:number}} fg - Foreground sRGB
 * @param {{r:number,g:number,b:number}} bg - Background sRGB
 * @returns {number} Contrast ratio
 */
export function colorContrastRatio(fg, bg) {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  return contrastRatio(l1, l2);
}

/**
 * Format a ratio for human-readable display with at least 3 decimals.
 * @param {number} ratio
 * @returns {string}
 */
export function formatDisplayRatio(ratio) {
  return ratio.toFixed(3);
}

/**
 * Determine whether text qualifies as large-scale text.
 *
 * @param {number} fontSizePx - Computed font size in CSS pixels
 * @param {number} fontWeight - Computed font weight (numeric, e.g. 400, 700)
 * @returns {{largeText: boolean, requiredRatio: number}}
 */
export function classifyTextSize(fontSizePx, fontWeight) {
  // Large bold: >= 18.66px and >= 700
  if (fontSizePx >= 18.66 && fontWeight >= 700) {
    return { largeText: true, requiredRatio: 3.0 };
  }
  // Large regular: >= 24px
  if (fontSizePx >= 24) {
    return { largeText: true, requiredRatio: 3.0 };
  }
  // Normal
  return { largeText: false, requiredRatio: 4.5 };
}

/**
 * Compare an unrounded ratio to a threshold.
 * @param {number} ratio
 * @param {number} threshold
 * @returns {'pass'|'violation'}
 */
export function compareRatio(ratio, threshold) {
  return ratio >= threshold ? 'pass' : 'violation';
}

/**
 * Generate a deterministic display ratio string.
 * @param {number} ratio
 * @returns {string}
 */
export function displayRatio(ratio) {
  return ratio.toFixed(3);
}
