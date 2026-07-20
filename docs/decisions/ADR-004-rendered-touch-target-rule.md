# ADR-004: Rendered Touch-Target Rule

**Status:** Accepted
**Date:** 2026-07-19
**Branch:** `decision/F020-rendered-touch-targets`
**PR:** #22
**Depends on:** ADR-002
**Candidate:** `proposal.mobile.touch-target-minimum`
**Production identity:** F020, `mobile.touch-target-minimum`

## Context

ADR-001 deferred touch-target analysis because static CSS cannot prove rendered hit areas, responsive geometry, spacing, transforms, fragmentation, or overlap. ADR-002 supplies bounded Chromium analysis, and F019 proves the browser-rule pipeline.

The previous candidate used 44 by 44 CSS pixels. F020 follows WCAG 2.2 Success Criterion 2.5.8, Target Size (Minimum): 24 by 24 CSS pixels. WCAG 2.5.5's enhanced 44 by 44 requirement is outside this rule.

## Decision

Accept F020 as a browser-only warning rule for local `.html` documents in `marketing`, `editorial`, and `product-app`.

- Rule: `mobile.touch-target-minimum`
- Analyzer: `rendered.touch-target-size`
- Static analysis emits no F020 findings.
- One configured Chromium viewport and color scheme are analyzed.
- Full floating-point precision is used.

## Normative Geometry

A supported rectangular target passes when `width >= 24` and `height >= 24` CSS pixels without rounding. `getBoundingClientRect()` provides the primary box; `getClientRects()` detects fragmentation.

For every undersized target, center a radius-12 CSS-pixel circle on its bounding box. The spacing exception is confirmed only when that circle intersects neither:
1. any other rendered target area; nor
2. the radius-12 circle of any other undersized target.

Circle-to-circle intersection is `centerDistance < 24`; exact tangency passes. Circle-to-supported-rectangle intersection is `minimumDistance < 12`; exact tangency passes. Comparisons use full precision. Use spatial bucketing or bounded neighborhood filtering rather than an unbounded all-pairs scan.

Wholly off-viewport targets are excluded. Partially clipped targets use the visible viewport intersection only when it remains rectangular and deterministic.

Axis-aligned translation and scale are supported. Rotation, skew, perspective, uncertain clipping, non-rectangular hit areas, ambiguous fragmentation, nested interactive targets, and uncertain overlap are indeterminate.

## Eligible Targets

Eligible targets are actionable `a[href]`, enabled `button`, enabled non-hidden `input`, enabled `select`, enabled `textarea`, `summary`, supported interactive ARIA roles, and elements with non-negative `tabindex` plus a deterministic activation signal.

Supported roles: `button`, `link`, `checkbox`, `radio`, `switch`, `tab`, `menuitem`, `menuitemcheckbox`, `menuitemradio`, `option`, `slider`, `spinbutton`, `textbox`, `combobox`, `searchbox`.

Exclude hidden, inert, disabled, `aria-disabled=true`, zero-area, collapsed, wholly off-viewport, or absent-in-initial-state targets. Readonly controls remain eligible.

## Exceptions

### Inline
Automatic inline exemption is narrow: inline formatting context, sentence/text-block context, adjacent non-target text, line-height constrained by surrounding text, and not a standalone navigation/menu/toolbar/tab/chip/button-like control. `display:inline` alone is insufficient.

### Equivalent
No automatic equivalent-target exemption. Functional equivalence is semantic; authors may use justified suppression.

### User-agent control
Only a demonstrably unmodified native control may receive this exemption. Any authored appearance, dimensions, padding, border, transform, zoom, or hit-area change removes automatic confidence.

### Essential
Essential or legally required presentation is not inferred. Use justified suppression.

## Overlap and Obscuration

Bounded `elementsFromPoint()` checks may inspect center and inset points. Deterministic obstruction makes a sample indeterminate. The rule does not implement a complete paint-order engine.

## Result and Finding Contract

Run statuses: `confirmed`, `indeterminate`, `skipped`, `failed`.

Outcomes: `pass`, `spacing-exception`, `inline-exception`, `user-agent-exception`, `violation`, `excluded`.

Only `status=confirmed` plus `outcome=violation` becomes a normal suppressible warning finding. Emit at most one finding per target, viewport, and color scheme.

Measurements include checked, passing, spacing-exception, inline-exception, user-agent-exception, violating, indeterminate, and excluded target counts.

Evidence records selector, target type, role, label, width, height, visible intersection, center, required dimensions, exception/spacing proof, viewport, color scheme, and Chromium version. Runtime DOM identity is authoritative; use line 1 when source attribution is not provable.

Finding wording: `Rendered interactive target measured below the configured minimum in the analyzed Chromium state.`

## Indeterminate Reasons

`non-axis-aligned-transform`, `perspective-transform`, `ambiguous-fragmentation`, `ambiguous-overlap`, `partially-obscured`, `unsupported-hit-area`, `unsupported-native-control`, `unresolved-target-geometry`, `dynamic-target-state`, `nested-interactive-target`, `clipped-nonrectangular-target`.

## Performance and Security

Reuse one Chromium process, isolate contexts per page, collect geometry in bounded evaluations, avoid per-pair browser round trips, respect deadlines and finding caps, and add no runtime dependency.

ADR-002 remains unchanged: local HTML and scan-root assets only, blocked external network, no arbitrary server, authentication, filesystem/shell access, screenshots, downloads, or raw browser lifecycle control.

## Implementation Boundary

A later PR may add the F020 catalog binding and analyzer. This PR does not modify `rules/core.json`, profiles, `src/lint.js`, analyzer registration, browser security, dependencies, or production behavior. Production rule count remains 17.

## Required Implementation Fixtures

Controls: exact 24x24, larger, fractional-above, native control, padding-enlarged target, inline prose, valid spacing, disabled exclusion, readonly control, mobile viewport.

Violations: width-only, height-only, both-dimension, fractional-below, intersecting circles, dense cluster, runtime undersizing, supported axis-aligned transform, deterministic clipping.

Indeterminate: rotation, skew, perspective, fragmentation, overlay obstruction, unsupported hit area/native control, nested targets, dynamic state.

## Outcome

F020 is implementation-ready after this decision merges. Runtime implementation follows separately.
