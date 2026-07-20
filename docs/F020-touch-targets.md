# F020: Rendered Touch-Target Minimum

F020 is a browser-only warning rule that measures rendered interactive target sizes against WCAG 2.2 SC 2.5.8 (Target Size Minimum): 24 by 24 CSS pixels.

## WCAG Baseline

F020 follows WCAG 2.2 Success Criterion 2.5.8, which requires pointer targets to be at least 24 by 24 CSS pixels. This is **not** the WCAG 2.5.5 enhanced 44 by 44 requirement.

## Eligible Targets

The analyzer collects deterministic interactive targets from the rendered DOM:

**Native targets:**
- `a[href]`
- `button`
- `input:not([type="hidden"])`
- `select`
- `textarea`
- `summary`

**Explicit ARIA roles:**
- `button`, `link`, `checkbox`, `radio`, `switch`, `tab`
- `menuitem`, `menuitemcheckbox`, `menuitemradio`, `option`
- `slider`, `spinbutton`, `textbox`, `combobox`, `searchbox`

**Scripted targets:**
- Elements with `tabindex >= 0` and a deterministic activation signal

Readonly controls remain eligible. Disabled, inert, hidden, zero-area, and wholly off-viewport targets are excluded.

## 24 by 24 Rule

A supported rectangular target passes when both dimensions are >= 24 CSS pixels:

```
width >= 24 AND height >= 24
```

Full floating-point precision is used. `24.0` passes; `23.999` fails.

## Spacing-Circle Exception

For every undersized target, a radius-12 CSS-pixel circle is centered on its bounding box. The spacing exception passes only when that circle intersects **neither**:

1. The radius-12 circle of any other undersized target (center-to-center distance < 24)
2. The bounding rectangle of any other supported target (minimum distance < 12)

Exact tangency (distance = 24 or distance = 12) does **not** intersect. Coincident centers fail.

The spacing exception uses spatial bucketing for bounded neighborhood queries, avoiding an unbounded all-pairs scan.

## Inline Exception

A narrow automatic inline exception applies when **all** of the following are true:

- Inline formatting context (not `display: inline-block`)
- Sentence or text-block context
- Adjacent non-target text before or after the target
- Size constrained by surrounding non-target text line height
- Not a standalone navigation, toolbar, menu, tab, chip, badge, or button-like control

`display: inline` alone is insufficient.

## Equivalent and Essential Boundaries

F020 does **not** automatically infer equivalent functionality or essentiality. Authors may use justified suppression for these cases.

## User-Agent-Control Boundary

Only a demonstrably unmodified native Chromium control may receive the user-agent exception. Any authored styling, sizing, padding, border, transform, zoom, or hit-area modification removes automatic confidence.

## Transforms

Supported: axis-aligned translation and axis-aligned scale. Rendered geometry after these transforms is used.

Indeterminate: rotation, skew, perspective, and non-axis-aligned transform matrices. The rule does not use a large axis-aligned bounding box around a rotated shape as proof of compliance.

## Clipping

Wholly off-viewport targets are excluded. Partially visible targets use the visible viewport intersection only when the resulting effective area is rectangular and deterministic.

## Fragmentation

Uses `getClientRects()`. The inline exception is applied first where appropriate. Non-inline fragmented targets are indeterminate unless every actionable fragment independently satisfies the contract.

## Overlap

Bounded hit testing with `elementsFromPoint()` may inspect center and inset points. Deterministic obstruction makes a sample indeterminate. The rule does not implement a complete paint-order engine.

## Indeterminate Taxonomy

| Reason | Description |
|--------|-------------|
| `non-axis-aligned-transform` | Rotation, skew, or non-axis-aligned matrix |
| `perspective-transform` | 3D perspective transform |
| `ambiguous-fragmentation` | Multi-fragment non-inline target |
| `ambiguous-overlap` | Overlapping overlay or opacity |
| `partially-obscured` | Partial obstruction |
| `unsupported-hit-area` | Non-rectangular hit area |
| `unsupported-native-control` | Modified native control geometry |
| `unresolved-target-geometry` | Unresolved geometry |
| `dynamic-target-state` | Post-initial-state target |
| `nested-interactive-target` | Nested interactive elements |
| `clipped-nonrectangular-target` | Non-rectangular clipping |

## Evidence

Every confirmed sample records:

- Selector, target type, role, label snippet
- Width, height, visible width, visible height
- Center X and Y
- Required width and height (24×24)
- Outcome and exception status
- Spacing proof (when applicable)
- Viewport name and dimensions, color scheme, Chromium version

## Suppression

Use the existing suppression system. Example:

```json
{
  "suppressions": [
    {
      "rule": "mobile.touch-target-minimum",
      "files": ["**/legacy-toolbar.html"],
      "rationale": "Legacy toolbar will be redesigned in Q3.",
      "expires": "2026-12-31"
    }
  ]
}
```

## Browser Setup

F020 requires Chromium (Playwright). Install with:

```bash
npx playwright install chromium
```

## Viewport Limitation

F020 analyzes one configured viewport and color scheme per run. Multi-viewport execution is outside the current scope.

## Confidence Boundary

F020 produces conservative, reproducible warning findings for supported rendered targets smaller than 24×24 CSS pixels that fail the spacing exception. Indeterminate cases are preserved rather than manufactured into certainty. The rule reports what it can prove, not what it suspects.