# ADR-003: Rendered Text Contrast Rule

**Status:** Accepted
**Date:** 2026-07-19
**Branch:** `decision/F019-rendered-text-contrast`
**PR:** #20
**Depends on:** ADR-002
**Candidate:** `proposal.accessibility.text-contrast-minimum`
**Production identity:** F019, `accessibility.text-contrast-minimum`

## Context

ADR-001 accepted text contrast only after architecture support because source-level CSS matching cannot resolve the cascade, inheritance, runtime classes, alpha composition, or the actual background behind rendered text.

ADR-002 and PR #19 now provide optional Chromium analysis with isolated page contexts, configured viewports and color schemes, hard deadlines, blocked external network, and a registered-analyzer contract.

F019 is the first production rule to consume that browser foundation.

## Normative Basis

F019 is based on WCAG 2.2 Success Criterion 1.4.3, Contrast (Minimum), and the W3C G18 and G145 techniques.

The rule uses these thresholds:

- normal text: at least `4.5:1`
- large-scale text: at least `3:1`
- large-scale regular text: computed font size at least `24 CSS px`
- large-scale bold text: computed font size at least `18.66 CSS px` and computed font weight at least `700`

The analyzer compares the unrounded ratio. A calculated ratio below the threshold fails even if a two-decimal display value would round up.

The W3C sRGB relative-luminance threshold `0.04045` is authoritative for the calculation.

## Decision

Implement F019 as a **browser-only warning rule** for local `.html` documents.

It is enabled in:

- `marketing`
- `editorial`
- `product-app`

Static source matching must not emit F019 findings.

The rule confirms only computed, solid-color text/background pairs in the configured Chromium viewport and color scheme. Unsupported visual composition becomes `indeterminate`, not a pass or violation.

## Catalog and Analyzer Binding

The rule schema must support a browser analyzer binding without breaking existing pattern rules.

The intended catalog shape is:

```json
{
  "id": "accessibility.text-contrast-minimum",
  "severity": "warning",
  "appliesTo": ["marketing", "editorial", "product-app"],
  "detect": {
    "message": "Rendered text contrast is below the configured WCAG 2.2 minimum.",
    "browserAnalyzer": {
      "id": "rendered.text-contrast",
      "extensions": [".html"]
    }
  }
}
```

`detect` must accept exactly one detector family:

- `patterns`
- `browserAnalyzer`

Browser analyzers run only for selected profile rules. The linter must not execute every registered analyzer independently of catalog and profile selection.

The selected rule metadata is passed into the analyzer context.

## Analyzer Result Contract

A browser analyzer may inspect many rendered text samples in one page. Its result therefore contains run-level metadata plus sample-level results.

```json
{
  "status": "confirmed",
  "message": "Rendered text contrast analysis completed.",
  "confidence": "high",
  "measurements": {
    "checkedElements": 12,
    "passingElements": 10,
    "violatingElements": 1,
    "indeterminateElements": 1
  },
  "samples": [
    {
      "status": "confirmed",
      "outcome": "violation",
      "selector": "main > p:nth-of-type(1)",
      "text": "Muted introductory text",
      "foreground": "rgb(119, 119, 119)",
      "background": "rgb(255, 255, 255)",
      "ratio": 4.478,
      "requiredRatio": 4.5,
      "fontSizePx": 16,
      "fontWeight": 400,
      "largeText": false
    },
    {
      "status": "indeterminate",
      "selector": ".hero-title",
      "text": "Gradient title",
      "reason": "background-image"
    }
  ]
}
```

Only samples with:

```text
status = confirmed
outcome = violation
```

become normal suppressible findings.

Passing samples are summarized but do not become findings. Indeterminate samples remain analysis evidence and do not become findings.

## Text Selection

The analyzer walks rendered text nodes and groups them by their nearest element container.

A sample is eligible when:

- text content is non-empty after whitespace collapse
- the container participates in layout
- `display` is not `none`
- `visibility` is `visible`
- the rendered client rect has positive width and height
- the element is not inside `script`, `style`, `noscript`, or `template`
- the text is not inside a native disabled control
- the text is not inside an element with `aria-disabled="true"`

`aria-hidden="true"` does not exclude visually rendered text from contrast analysis.

Whitespace-only nodes, hidden nodes, zero-area nodes, canvas text, SVG text, images of text, and pseudo-element generated text are outside the first tranche.

Readonly controls are not automatically exempt.

## Element Aggregation

Emit at most one F019 finding per rendered element, viewport, and color scheme.

When multiple eligible text nodes share one element and the same computed contrast inputs, aggregate them into one sample.

When descendants introduce different computed foregrounds or backgrounds, analyze them separately at their own nearest styled element.

A deterministic DOM path is the primary location evidence:

1. unique `id`, when available
2. otherwise a stable `tag:nth-of-type(...)` ancestry path

Browser DOM inspection does not provide trustworthy source lines after runtime mutation. Until source mapping exists, F019 findings use line `1` and treat the DOM path as authoritative location evidence.

## Color Parsing

First-tranche supported computed colors:

- `rgb(r, g, b)`
- `rgba(r, g, b, a)`
- equivalent modern space-separated Chromium serialization when values resolve to sRGB

Unsupported color spaces or unresolved serialization become `indeterminate`.

Do not infer colors from source declarations. Use computed styles from the analyzed page.

## Relative Luminance and Contrast

For each sRGB channel value `C8`:

```text
CsRGB = C8 / 255
C = CsRGB / 12.92                         when CsRGB <= 0.04045
C = ((CsRGB + 0.055) / 1.055) ^ 2.4     otherwise
```

Relative luminance:

```text
L = 0.2126R + 0.7152G + 0.0722B
```

Contrast ratio:

```text
(Llighter + 0.05) / (Ldarker + 0.05)
```

Use full precision for comparison. Round only for human-readable evidence.

## Solid Background Resolution

Resolve the background behind text by walking from the canvas through the element ancestry and alpha-compositing computed `background-color` values in paint order.

First-tranche rules:

- start with a white canvas when the full ancestor chain is transparent
- support transparent and alpha solid colors
- composite the foreground alpha over the resolved background
- use the configured initial Chromium state only
- treat any non-`none` background image on the relevant element or ancestor as `indeterminate`
- do not sample pixels from screenshots

The white fallback follows WCAG guidance for unspecified backgrounds, while findings remain bounded to the analyzed Chromium state.

## Indeterminate Conditions

A sample is `indeterminate` when any relevant element or ancestor uses an unsupported condition, including:

- `background-image` other than `none`
- gradients
- image backgrounds
- element or ancestor `opacity` below `1`
- `mix-blend-mode` other than `normal`
- `background-blend-mode` other than `normal`
- `filter` other than `none`
- `backdrop-filter` other than `none`
- CSS masks
- text clipping through a background
- non-`none` text shadow
- non-zero text stroke
- unsupported color spaces
- unresolved computed colors
- ambiguous runtime overlap when deterministically detected

Indeterminate samples must include a stable reason code.

Unsupported effects must never be silently treated as solid colors.

## Incidental and Logo Exceptions

WCAG excludes inactive components, decorative text, incidental text, and logotypes.

F019 can deterministically exclude native disabled controls and `aria-disabled="true"` containers. It cannot reliably infer whether arbitrary visible text is decorative, incidental, or a brand logotype.

Because of that semantic boundary:

- F019 severity is `warning`
- findings use bounded language
- existing justified suppressions remain available
- the rule does not claim a conformance failure

No new element-level exemption attribute is introduced in the first tranche.

## Finding Contract

One confirmed violating element produces one finding:

- rule: `accessibility.text-contrast-minimum`
- severity: `warning`
- file: analyzed HTML file
- line: `1`
- message: bounded rendered-contrast warning
- evidence: concise deterministic summary

Evidence must include:

- DOM selector
- collapsed text snippet
- computed foreground
- resolved background
- unrounded machine ratio
- displayed ratio
- required ratio
- font size
- font weight
- large-text classification
- viewport
- color scheme
- Chromium version

Example human evidence:

```text
selector="main > p:nth-of-type(1)"; text="Muted introductory text"; foreground=rgb(119,119,119); background=rgb(255,255,255); ratio=4.478:1; required=4.5:1; font=16px/400; viewport=desktop; scheme=light
```

## Execution Semantics

F019 uses the single configured viewport and color scheme for each lint operation.

- default viewport: `desktop`
- default color scheme: `light`
- mobile or dark analysis requires the corresponding browser configuration
- the first tranche does not automatically run a viewport/theme matrix

Mode behavior:

- `static`: no F019 finding and no browser launch
- `auto` without browser capability: F019 analysis record is `skipped`
- `browser` without capability: operation exits with code `3`
- browser page or analyzer failure: `failed` analysis record, never a finding

## Confidence Boundary

F019 can establish:

- eligible text was rendered in the bounded initial Chromium state
- its computed foreground resolved to supported sRGB
- its background resolved through a solid-color ancestor stack
- its computed font size and weight determine the configured threshold
- the unrounded computed contrast ratio is below that threshold

F019 cannot establish:

- complete WCAG 2.2 conformance or failure
- contrast in other browsers, operating systems, installed-font environments, zoom levels, viewports, themes, or later interaction states
- semantic logo, decorative, or incidental-text exemptions
- images of text, canvas text, SVG text, or pseudo-element text
- accurate contrast through gradients, images, filters, blend modes, text shadows, strokes, masks, or unsupported compositing
- the effect of anti-aliasing or unusual thin font designs
- every possible overlay or occlusion

## Required Fixture Matrix

Controls:

- normal text exactly at or above `4.5:1`
- large regular text exactly at or above `3:1`
- large bold text exactly at or above `3:1`
- inherited foreground and solid background
- transparent ancestor backgrounds
- alpha foreground composited over a solid background
- runtime-applied class
- light color scheme
- dark color scheme

Violations:

- normal text below `4.5:1`
- large regular text below `3:1`
- bold text below the size threshold requiring `4.5:1`
- weight `699` requiring `4.5:1`
- ratio that displays as `4.50` after rounding but is below `4.5`
- nested descendant with a different foreground
- multiple violations aggregated one per element

Indeterminate:

- gradient background
- image background
- ancestor opacity
- mix blend mode
- filter or backdrop filter
- text shadow
- text stroke
- background-clipped text
- unsupported color space

Excluded:

- `display:none`
- `visibility:hidden`
- zero-area text
- whitespace-only text
- native disabled control
- `aria-disabled="true"`
- script, style, noscript, and template content

Regression:

- static mode unchanged
- all 16 existing rules unchanged
- existing suppressions unchanged
- browser unavailable behavior unchanged
- page isolation and network security unchanged
- analyzer deadline remains a hard bound
- finding order remains deterministic

## Acceptance Gates

F019 is accepted only when:

1. F019 is the next available production number
2. the catalog schema supports browser analyzer bindings without breaking pattern rules
3. browser analyzers execute only for selected profile rules
4. the text-contrast analyzer is registered through the production browser registry
5. only confirmed violating samples become findings
6. indeterminate, skipped, and failed samples never become findings
7. thresholds and unrounded comparisons match this ADR
8. solid alpha compositing has focused unit tests
9. fixture coverage matches the required matrix
10. one finding is emitted per violating element
11. evidence includes all required measurements
12. static behavior remains unchanged
13. suppressions work on confirmed F019 findings
14. static and browser CI are green
15. CodeQL, dependency review, audit, package dry-run, and repository verification pass
16. no touch-target rule, framework support, remote URL support, or autofix is added

## Non-Goals

The first F019 implementation does not include:

- screenshot pixel sampling
- APCA or WCAG 3 contrast models
- enhanced `7:1` contrast
- automatic light-and-dark matrix execution
- automatic desktop-and-mobile matrix execution
- remote pages
- framework build orchestration
- semantic logo detection
- image-of-text analysis
- SVG or canvas text analysis
- pseudo-element text
- element-level autofixes

## Outcome

F019 will provide conservative, measurement-backed warnings for rendered solid-color text contrast without turning unsupported visual composition into fabricated certainty.
