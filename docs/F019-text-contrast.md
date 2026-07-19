# F019: Rendered Text Contrast Minimum

**Rule ID:** `accessibility.text-contrast-minimum`

## What F019 Measures

F019 measures the contrast ratio between rendered text and its resolved background in a Chromium browser environment. It uses the WCAG 2.x relative luminance formula (sRGB) and the WCAG 2.2 Success Criterion 1.4.3 thresholds.

The rule confirms only computed, solid-color text/background pairs in the configured viewport and color scheme.

## Browser Requirement

F019 requires the optional Chromium browser backend:

```bash
npx playwright install chromium
```

Without Chromium:
- `auto` mode: F019 records a machine-readable `skipped` analysis record
- `browser` mode: exits with code `3`

## Supported Files

- `.html` only (first tranche)

## Modes

- `static`: F019 never runs, never launches a browser, produces no findings
- `auto`: F019 runs when Chromium is available; otherwise reports `skipped`
- `browser`: F019 requires Chromium; exits `3` when unavailable

## Default Viewport and Color Scheme

- Default viewport: `desktop` (1440 × 900)
- Default color scheme: `light`
- Configure with `--viewport mobile` and `--colorScheme dark` (or config equivalents)

The first tranche does not automatically run a viewport/color-scheme matrix.

## Thresholds

| Category | Required Ratio | Condition |
|---|---|---|
| Normal text | 4.5:1 | Default classification |
| Large regular text | 3:1 | Computed font size ≥ 24 CSS px |
| Large bold text | 3:1 | Computed font size ≥ 18.66 CSS px AND weight ≥ 700 |

Thresholds use the unrounded ratio. A value below 4.5 fails even if a shorter display value would appear to round up.

## Large-Text Classification

- **Large regular:** `fontSizePx >= 24` (any weight)
- **Large bold:** `fontSizePx >= 18.66` AND `fontWeight >= 700`
- Weight `699` is not large-bold regardless of size
- Computed font weight is used; tag names (e.g. `<strong>`, `<b>`) are not treated as bold without computed evidence
- Equality at the boundary qualifies as large text

## Computed-Style Basis

F019 uses computed styles from the rendered Chromium page, not source CSS declarations. This means inherited values, cascade resolution, and runtime-applied classes are reflected in the measurement.

## Alpha Composition

Foreground and background colors are alpha-composited using standard source-over compositing.

- Transparent ancestors are skipped
- Alpha backgrounds composite over the canvas or ancestor background
- Alpha foreground text is composited over the resolved background before contrast calculation
- The initial canvas default is white (`rgb(255, 255, 255)`)

## White Canvas Fallback

When the entire ancestor chain has no background-color, the resolved background defaults to white. This follows WCAG guidance for unspecified backgrounds.

## Indeterminate Categories

F019 returns an `indeterminate` sample (not a pass or violation) when the text element or a relevant ancestor uses unsupported visual composition:

| Reason Code | Detection |
|---|---|
| `background-image` | Non-`none` computed background-image |
| `gradient` | Gradient in background-image |
| `image-background` | Image URL in background-image |
| `opacity` | Element or ancestor computed opacity < 1.0 |
| `mix-blend-mode` | Non-`normal` computed mix-blend-mode |
| `background-blend-mode` | Non-`normal` computed background-blend-mode |
| `filter` | Non-`none` computed filter |
| `backdrop-filter` | Non-`none` computed backdrop-filter |
| `mask` | Non-`none` mask-image or -webkit-mask-image |
| `background-clip-text` | background-clip: text |
| `text-shadow` | Non-`none` text-shadow |
| `text-stroke` | Non-zero text-stroke |
| `unsupported-color-space` | `color(srgb ...)` or other non-sRGB color function |
| `unresolved-color` | Computed color not parsable as sRGB |
| `ambiguous-overlap` | Deterministically detected overlay above the text |

## Exclusions

Elements excluded from F019 analysis:

- `display: none`
- `visibility: hidden`
- Hidden ancestors
- Zero-area text (positive width and height required)
- Whitespace-only text
- Native disabled components (`<button disabled>`, `<input disabled>`, etc.)
- `aria-disabled="true"` containers
- Content inside `<script>`, `<style>`, `<noscript>`, `<template>`
- SVG text elements
- Canvas text content
- Image alt text (not visually rendered as text)

## Semantic Exception Boundary

F019 automatically excludes only the deterministic inactive-component cases:

- Native disabled form controls
- `aria-disabled="true"` containers

It does **not** attempt to infer decorative text, incidental text, brand logotypes, or images of text. These semantic exceptions are why F019 remains a warning and supports justified suppression.

## Evidence Fields

Every confirmed violation includes:

| Field | Description |
|---|---|
| `selector` | Stable DOM path (unique id or `tag:nth-of-type` ancestry) |
| `text` | Collapsed text snippet (≤ 120 characters) |
| `foreground` | Computed foreground color (`rgb(r, g, b)`) |
| `background` | Resolved background color (`rgb(r, g, b)`) |
| `ratio` | Full machine contrast ratio |
| `displayRatio` | Deterministic human-readable ratio (≥ 3 decimals) |
| `requiredRatio` | Applicable threshold |
| `fontSizePx` | Computed font size in CSS pixels |
| `fontWeight` | Computed font weight |
| `largeText` | Whether classified as large-scale text |
| `viewport` | Analyzed viewport name |
| `colorScheme` | Analyzed color scheme |
| `browserVersion` | Chromium user-agent string |

## Suppression Example

```json
{
  "version": 1,
  "suppressions": [
    {
      "rule": "accessibility.text-contrast-minimum",
      "files": ["src/components/logo.html"],
      "reason": "Brand logotype used in header. Color is a design requirement.",
      "approvedBy": "design-lead",
      "expires": "2027-01-01"
    }
  ]
}
```

## Confidence Limitations

F019 can establish:
- Eligible text was rendered in the bounded initial Chromium state
- Its computed foreground resolved to supported sRGB
- Its background resolved through a solid-color ancestor stack
- Its computed font size and weight determine the configured threshold
- The unrounded computed contrast ratio is below that threshold

F019 cannot establish:
- Complete WCAG 2.2 conformance or failure
- Contrast in other browsers, operating systems, font environments, viewports, color schemes, or interaction states
- Semantic logo, decorative, or incidental-text exemptions
- Images of text, canvas text, SVG text, or pseudo-element text
- Accurate contrast through gradients, images, filters, blend modes, text shadows, strokes, masks, or unsupported compositing
- The effect of anti-aliasing or unusual thin font designs
- Every possible overlay or occlusion

## Examples

### Compliant Example

```html
<p style="color: #333; background: #fff;">This text has good contrast.</p>
```
Result: no finding (ratio ≈ 7.7:1, passes 4.5:1)

### Violation Example

```html
<p style="color: #777; background: #fff;">This text has low contrast.</p>
```
Result: warning finding (ratio ≈ 4.48:1, fails 4.5:1)

### Indeterminate Example

```html
<div style="background: linear-gradient(black, white);">
  <p style="color: #ccc;">Text over gradient.</p>
</div>
```
Result: indeterminate sample (no finding), reason: `gradient`

## Chromium Installation

```bash
npx playwright install chromium
```

The package does not bundle Chromium. Static users do not need it.
