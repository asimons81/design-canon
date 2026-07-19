import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseComputedColor,
  isUnsupportedColorSpace,
  alphaComposite,
  linearizeChannel,
  relativeLuminance,
  contrastRatio,
  colorContrastRatio,
  formatDisplayRatio,
  classifyTextSize,
  compareRatio
} from '../src/browser/color-contrast.js';

// ── Color Parsing ──────────────────────────────────────────────────────────────────

test('parseComputedColor parses rgb(r, g, b)', () => {
  const result = parseComputedColor('rgb(119, 119, 119)');
  assert.deepEqual(result, { r: 119, g: 119, b: 119, a: 1 });
});

test('parseComputedColor parses rgba(r, g, b, a)', () => {
  const result = parseComputedColor('rgba(0, 0, 0, 0.8)');
  assert.deepEqual(result, { r: 0, g: 0, b: 0, a: 0.8 });
});

test('parseComputedColor parses rgb(r g b) space-separated', () => {
  const result = parseComputedColor('rgb(100 150 200)');
  assert.deepEqual(result, { r: 100, g: 150, b: 200, a: 1 });
});

test('parseComputedColor parses rgb(r g b / a) modern syntax', () => {
  const result = parseComputedColor('rgb(50 100 150 / 0.5)');
  assert.deepEqual(result, { r: 50, g: 100, b: 150, a: 0.5 });
});

test('parseComputedColor parses rgb(r g b / a%)', () => {
  const result = parseComputedColor('rgb(255 0 0 / 50%)');
  assert.deepEqual(result, { r: 255, g: 0, b: 0, a: 0.5 });
});

test('parseComputedColor parses percentage channels', () => {
  const result = parseComputedColor('rgb(50% 50% 50%)');
  assert.deepEqual(result, { r: 128, g: 128, b: 128, a: 1 });
});

test('parseComputedColor rejects malformed input', () => {
  assert.equal(parseComputedColor(''), null);
  assert.equal(parseComputedColor(null), null);
  assert.equal(parseComputedColor('not-a-color'), null);
  assert.equal(parseComputedColor('rgb()'), null);
  assert.equal(parseComputedColor('hsl(0, 0%, 0%)'), null);
});

test('parseComputedColor clamps out-of-range channels', () => {
  const result = parseComputedColor('rgb(300, -10, 128)');
  assert.deepEqual(result, { r: 255, g: 0, b: 128, a: 1 });
});

test('parseComputedColor validates alpha range', () => {
  const result = parseComputedColor('rgba(100, 100, 100, 1.5)');
  assert.deepEqual(result, { r: 100, g: 100, b: 100, a: 1 });
});

test('isUnsupportedColorSpace detects color() syntax', () => {
  assert.equal(isUnsupportedColorSpace('color(srgb 0.5 0.5 0.5)'), true);
  assert.equal(isUnsupportedColorSpace('color(display-p3 0.5 0.5 0.5)'), true);
  assert.equal(isUnsupportedColorSpace('rgb(100, 100, 100)'), false);
  assert.equal(isUnsupportedColorSpace(null), false);
});

// ── Luminance ──────────────────────────────────────────────────────────────────────

test('linearizeChannel handles dark channel', () => {
  // 0 → 0
  assert.equal(linearizeChannel(0), 0);
  // CsRGB = 0.02 (< 0.04045) → 0.02 / 12.92
  const c5 = 0.02 * 255;
  const expected = 0.02 / 12.92;
  assert(Math.abs(linearizeChannel(Math.round(c5)) - expected) < 0.0001);
});

test('linearizeChannel 0.04045 boundary', () => {
  // At exactly 0.04045, both formulas should be equivalent
  const c8 = 0.04045 * 255; // ≈ 10.31
  const linear = linearizeChannel(Math.round(c8));
  // CsRGB ≈ 0.04045, so CsRGB / 12.92 ≈ 0.00313
  assert(linear > 0);
  assert(linear < 0.004);
});

test('linearizeChannel handles light channel', () => {
  const l = linearizeChannel(255);
  assert.equal(l, 1);
});

test('linearizeChannel handles mid-range', () => {
  const l = linearizeChannel(128);
  // ((128/255 + 0.055) / 1.055) ^ 2.4
  assert(l > 0.2);
  assert(l < 0.25);
});

test('relativeLuminance: black is 0', () => {
  assert.equal(relativeLuminance({ r: 0, g: 0, b: 0 }), 0);
});

test('relativeLuminance: white is 1', () => {
  assert.equal(relativeLuminance({ r: 255, g: 255, b: 255 }), 1);
});

test('relativeLuminance: known color', () => {
  // #777 = rgb(119, 119, 119)
  const l = relativeLuminance({ r: 119, g: 119, b: 119 });
  assert(l > 0.15);
  assert(l < 0.22);
});

// ── Contrast Ratio ─────────────────────────────────────────────────────────────────

test('contrastRatio black vs white is 21', () => {
  assert.equal(contrastRatio(1, 0), 21);
});

test('contrastRatio same color is 1', () => {
  assert.equal(contrastRatio(0.5, 0.5), 1);
});

test('contrastRatio always >= 1', () => {
  assert(contrastRatio(0.1, 0.9) >= 1);
});

test('colorContrastRatio known pair', () => {
  // White on black should be 21:1
  const ratio = colorContrastRatio({ r: 255, g: 255, b: 255 }, { r: 0, g: 0, b: 0 });
  assert.equal(ratio, 21);
});

test('#777 on white ~= 4.48:1', () => {
  const ratio = colorContrastRatio({ r: 119, g: 119, b: 119 }, { r: 255, g: 255, b: 255 });
  assert(ratio > 4.45);
  assert(ratio < 4.5);
});

test('#aaa on white ~= 2.3:1', () => {
  const ratio = colorContrastRatio({ r: 170, g: 170, b: 170 }, { r: 255, g: 255, b: 255 });
  assert(ratio > 2.2);
  assert(ratio < 2.4);
});

// ── Alpha Composition ──────────────────────────────────────────────────────────────

test('alphaComposite opaque over transparent', () => {
  const fg = { r: 255, g: 0, b: 0, a: 1 };
  const bg = { r: 0, g: 0, b: 0, a: 0 };
  const result = alphaComposite(fg, bg);
  assert.deepEqual(result, { r: 255, g: 0, b: 0, a: 1 });
});

test('alphaComposite transparent over opaque', () => {
  const fg = { r: 255, g: 0, b: 0, a: 0 };
  const bg = { r: 0, g: 255, b: 0, a: 1 };
  const result = alphaComposite(fg, bg);
  assert.deepEqual(result, { r: 0, g: 255, b: 0, a: 1 });
});

test('alphaComposite 50% white over black', () => {
  const fg = { r: 255, g: 255, b: 255, a: 0.5 };
  const bg = { r: 0, g: 0, b: 0, a: 1 };
  const result = alphaComposite(fg, bg);
  assert.deepEqual(result, { r: 128, g: 128, b: 128, a: 1 });
});

test('alphaComposite multiple layers', () => {
  // Layer 1: 50% black over white → gray
  const layer1 = alphaComposite({ r: 0, g: 0, b: 0, a: 0.5 }, { r: 255, g: 255, b: 255, a: 1 });
  // Layer 2: 50% white over layer1
  const layer2 = alphaComposite({ r: 255, g: 255, b: 255, a: 0.5 }, layer1);
  assert.equal(layer2.r, layer2.g);
  assert.equal(layer2.b, layer2.r);
  assert(layer2.r > 128);
  assert(layer2.r < 220);
});

// ── Text Classification ───────────────────────────────────────────────────────────

test('classifyTextSize normal small text', () => {
  assert.deepEqual(classifyTextSize(16, 400), { largeText: false, requiredRatio: 4.5 });
});

test('classifyTextSize large regular at 24px', () => {
  assert.deepEqual(classifyTextSize(24, 400), { largeText: true, requiredRatio: 3.0 });
});

test('classifyTextSize large bold at 18.66px', () => {
  assert.deepEqual(classifyTextSize(18.66, 700), { largeText: true, requiredRatio: 3.0 });
});

test('classifyTextSize weight 699 at 20px is not large', () => {
  assert.deepEqual(classifyTextSize(20, 699), { largeText: false, requiredRatio: 4.5 });
});

test('classifyTextSize weight 700 at 18.65px is not large-bold', () => {
  assert.deepEqual(classifyTextSize(18.65, 700), { largeText: false, requiredRatio: 4.5 });
});

test('classifyTextSize weight 699 at 18.66px is not large-bold', () => {
  assert.deepEqual(classifyTextSize(18.66, 699), { largeText: false, requiredRatio: 4.5 });
});

test('classifyTextSize exactly 24px qualifies', () => {
  assert.deepEqual(classifyTextSize(24, 400), { largeText: true, requiredRatio: 3.0 });
});

test('classifyTextSize exactly 18.66px with 700 weight qualifies', () => {
  assert.deepEqual(classifyTextSize(18.66, 700), { largeText: true, requiredRatio: 3.0 });
});

// ── Ratio Comparison ──────────────────────────────────────────────────────────────

test('compareRatio round up vs unrounded', () => {
  // 4.48 is below 4.5 even though .toFixed(1) would show 4.5
  assert.equal(compareRatio(4.48, 4.5), 'violation');
  assert.equal(compareRatio(4.5, 4.5), 'pass');
  assert.equal(compareRatio(4.51, 4.5), 'pass');
});

test('compareRatio exactly at threshold passes', () => {
  assert.equal(compareRatio(3.0, 3.0), 'pass');
});

// ── Display Formatting ────────────────────────────────────────────────────────────

test('formatDisplayRatio formats with 3 decimals', () => {
  assert.equal(formatDisplayRatio(4.5), '4.500');
  assert.equal(formatDisplayRatio(3.0), '3.000');
  assert.equal(formatDisplayRatio(21), '21.000');
  assert.equal(formatDisplayRatio(4.478), '4.478');
});
