# ADR-001: Candidate Production Architecture

**Status:** Accepted
**Date:** 2026-07-18
**Branch:** `decision/candidate-production-architecture`
**PR:** #14

## Context

The first clean-room anti-slop calibration batch produced 45 candidate rule proposals, 5 of which earned `review-ready` status after normalization. These five have complete research packets, source records, fixture plans, and candidate fixtures.

This record evaluates each candidate for production implementation under Design Canon's current architecture:

- **Local-first, zero-runtime-dependency** static linter
- **Regex-based mechanical detection** on source text
- **Profile-based rule selection** (marketing, product-app, editorial)
- **Rationale-required, scope-limited suppressions**
- **No browser runtime, no DOM rendering, no visual analysis**

## Decision-Making Framework

Each candidate is evaluated against five dimensions:

1. **Detector feasibility** under the current static-linter architecture
2. **Confidence boundary** — what a finding can and cannot prove
3. **False-positive risk** and control mechanisms
4. **Fixture coverage** and gaps
5. **Implementation sequencing** — urgency, impact, and dependency

---

## Architecture Authority

### Authorized Analysis Techniques

Design Canon's dependency-free static linter is authorized to implement lightweight structural analyzers for the following inputs, provided they require zero runtime dependencies and operate on source text alone:

- **HTML-like markup:** Tag matching, attribute extraction, element-type classification, `id`/`for` reference matching, hierarchical parent/child relationship detection within source files
- **CSS source text:** Declaration block extraction, `@media` query scope detection, property/value pair matching, `@keyframes` name resolution, selector-type classification
- **Component template syntax (JSX, Vue, Svelte):** Attribute extraction from template expressions (`aria-label`, `:label`, etc.), style scoping detection for SFC components

These analyzers must:
- Operate on source text without a DOM parser, CSS parser, or runtime environment
- Use deterministic string and regex operations only
- Respect existing file-size caps, directory exclusions, and source-extension allowlists
- Produce deterministic output identical across platforms and environments

### What Pattern Matching Cannot Do

The following are **not** achievable with source-text pattern matching alone under the current architecture:

| Capability | Why Pattern Matching Is Insufficient |
|---|---|
| **Label association** (matching `for` attribute to `id`) | Requires reference resolution: finding the element with the matching `id`, which may be in a different part of the file or a different file. Simple keyword matching cannot confirm the target exists or is an accessible label element. |
| **`aria-labelledby` resolution** | The attribute value is a space-separated list of one or more element IDs that collectively form the accessible name. Resolving this reference chain to compute the computed name string requires DOM-level traversal, not source-text scanning. |
| **Media-query scope analysis** (matching animation rules to their enclosing `@media` block) | Requires block-level structural understanding: matching `@media` open/close braces to determine which declarations fall inside which query. A simple regex scanning the whole file for `@media (prefers-reduced-motion)` cannot determine which specific `@keyframes` or `transition` declarations are enclosed by it. |
| **CSS cascade resolution** | Determining the computed style of an element requires combining declarations across selectors, specificity calculation, inheritance, and origin — beyond static pattern matching. |
| **Cross-file reference resolution** | Finding an element defined in one file that is referenced by an attribute in another file. |

### Non-Negotiable Architecture Boundaries

The following constraints are preserved for all Tranche 1 implementations. These are final:

- **Zero runtime dependencies:** No npm packages beyond the current zero dependencies. No DOM parser, CSS parser, browser, or rendering engine.
- **Local-only operation:** All file analysis must be local. No network requests, no API calls, no telemetry.
- **Deterministic output:** Identical source files must produce identical findings on any platform, any Node.js version, any locale.
- **File-size caps:** The existing `MAX_SOURCE_FILE_BYTES = 1024 * 1024` (1 MB) applies. Files exceeding this limit are skipped with a documented reason.
- **Source-extension allowlist:** Only files with extensions in the existing allowed set (`.css`, `.html`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.ts`, `.tsx`, `.vue`, `.svelte`) are scanned.
- **Current CLI contract:** No changes to `--profile`, `--format`, `--config`, `--output`, `profiles`, `--version` flags or their behavior.
- **Current suppression contract:** All findings remain suppressible per-rule + per-file-pattern with rationale requirement. No new suppression mechanisms are introduced.

These boundaries mean:
- A label-association detector can verify that a `<label for="X">` element exists AND that an element with `id="X"` exists in the same file. It cannot verify that the label:input relationship functions correctly in a browser.
- A reduced-motion detector can check whether `@media (prefers-reduced-motion)` wraps animation declarations. It can use brace-depth tracking to determine scope, but it cannot evaluate nested `@supports` or dynamic CSSOM injection.


## Candidate 1: `forms.input-labels-required`

### Disposition

**`accept-for-static-implementation`**

### Architecture

Static HTML/DOM analysis via source regex scanning.

The current linter operates on source text (`.html`, `.js`, `.jsx`, `.tsx`, `.vue`, `.svelte`). An accessible-name detector can work at this level by scanning for:

- `<label for="id">` elements with matching `id` on the input
- `<label>` elements wrapping the input
- `aria-label` attributes on inputs
- `aria-labelledby` attributes referencing visible elements

### Confidence Boundary

- **Can prove:** No supported accessible-name source was found in the analyzed source file for a given input element.
- **Cannot prove:** The absence of a static label means the control is inaccessible at runtime. Framework-generated labels, dynamically injected ARIA attributes, or programmatic focus-name mappings may create accessible names outside the source text.

### Detector Inputs

- HTML source text
- Input, textarea, select element declarations
- Label, aria-label, aria-labelledby attribute values
- Component template syntax (Vue `:label`, JSX `aria-label`)

### False-Positive Controls

| Exclusion | Rationale |
|---|---|
| `type="hidden"` | Hidden inputs do not need visible or accessible labels |
| `type="submit"`, `type="button"`, `type="reset"` | Button-type inputs get their accessible name from value text |
| Custom form controls (date pickers, rich text) | May manage accessibility internally via ARIA |
| Framework-generated DOM | Labels may be added at runtime by component logic |

### Fixture Assessment

| Fixture | Case | Usable | Demonstrates |
|---|---|---|---|
| `violation.signup-form` | Placeholder-only form | Yes | Absence of label, aria-label, aria-labelledby on two inputs |
| `control.signup-form-labeled` | Properly labeled form | Yes | for/id pair, visible label element for each input |
| `borderline.settings-form` | Section-headed form | Yes | Fields grouped under section headings without explicit label elements |

**Additional fixtures required before production:**
- JSX/TSX component with `aria-label` prop (framework template syntax)
- Vue SFC with `:label` binding
- Svelte component with label slot
- Form with dynamic labels added via JavaScript (should not trigger)

### Profile Recommendation

- `universal` (this is a baseline accessibility requirement)
- `product-app`
- `marketing`
- Future `anti-slop` profile
- Future accessibility-focused profile

### Severity Recommendation

`error` — WCAG 4.1.2 Name, Role, Value is a Level A success criterion. Missing accessible names prevent screen readers from identifying form controls. The mechanical detector can determine this with high confidence for static patterns.

### Implementation Readiness

**`ready for implementation`**

The detector pattern is well-bounded, the false-positive exclusions are clear, and the fixture coverage for the core HTML case is complete. Framework-specific template patterns (JSX, Vue, Svelte) will require incremental expansion but do not block the initial implementation.

---

## Candidate 2: `motion.respect-reduced-motion`

### Disposition

**`accept-for-static-implementation`**

### Architecture

Static CSS analysis via source regex scanning.

The current linter scans `.css`, `.html`, `.js`, `.ts`, `.vue`, `.svelte` files. A reduced-motion detector operates at the CSS level by checking for:

- `@keyframes` declarations or `animation`/`transition` CSS properties
- Presence of `@media (prefers-reduced-motion)` or `@media (prefers-reduced-motion: reduce)` wrapper
- Runtime injection detection (GSAP, Framer Motion) is **out of scope** for this architecture

### Confidence Boundary

- **Can prove:** CSS `@keyframes`, `animation`, or `transition` declarations exist in the scanned source without a corresponding `prefers-reduced-motion` media query wrapper.
- **Cannot prove:** The absence of a `prefers-reduced-motion` wrapper means motion is not handled. JavaScript animation libraries (GSAP, Framer Motion, anime.js), canvas/WebGL rendering, video autoplay, and runtime-injected styles are invisible to static CSS analysis.

### Detector Inputs

- CSS source text
- `@keyframes` declarations
- `animation`, `transition` property declarations
- `@media (prefers-reduced-motion)` queries
- Inline `style` attributes in HTML
- CSS-in-JS template literals in JS/TS source

### False-Positive Controls

| Exclusion | Rationale |
|---|---|
| Micro-interactions (hover scale, button press) | Essential for interaction feedback; duration under 300ms |
| Single-play load animations | Do not loop; lower vestibular risk |
| User-initiated video playback | Playback controlled by user action, not automatic |
| Progress indicators during file operations | Essential feedback; should be exempt from reduction |

### Fixture Assessment

| Fixture | Case | Usable | Demonstrates |
|---|---|---|---|
| `violation.no-preference` | Animations without `prefers-reduced-motion` | Yes | @keyframes and transition declarations with no media query wrapping |
| `control.with-preference` | Wrapped with `prefers-reduced-motion` | Yes | Identical animations wrapped in `no-preference` query, with `reduce` alternative |
| `borderline.essential-animation` | Micro-interactions only | Yes | Brief hover scale and non-looping spinner — should not trigger |

**Additional fixtures required before production:**
- CSS-in-JS template literal animation (styled-components, Emotion)
- Vue SFC with scoped animation styles
- Svelte component with CSS animation
- Animation on `::before`/`::after` pseudo-elements

### Profile Recommendation

- `universal` (accessibility applies everywhere)
- `marketing`
- `editorial`
- Future `anti-slop` profile

### Severity Recommendation

`warning` — WCAG 2.3.3 (Animation from Interactions) is Level AAA. A mechanical detector for `prefers-reduced-motion` absence is a strong signal but not definitive proof of WCAG failure. A warning triggers review without claiming automated conformance assessment.

### Implementation Readiness

**`ready for implementation`**

The CSS pattern is well-defined, the exclusion list is specific, and the core fixture coverage is sufficient. The detector scope must be explicitly narrowed to CSS-detectable animation. Documentation must state that JavaScript animation libraries are not covered.

---

## Candidate 3: `accessibility.text-contrast-minimum`

### Disposition

**`accept-for-partial-static-implementation`**

### Architecture

Partial static CSS analysis for resolvable solid-color foreground/background pairs.

The detector can parse CSS `color` and `background-color` declarations that are:
- Directly declared in the same rule
- Statically resolvable (not CSS custom properties, not `currentColor`, not `inherit` without chain resolution)
- Simple solid colors (not gradients, images, or multi-layer backgrounds)

What the static architecture **cannot** handle requires browser/rendered analysis:
- CSS cascade resolution
- Opacity composition (opacity on parent affecting computed text color)
- Background images with text overlays
- CSS gradients as backgrounds
- `::before`/`::after` pseudo-element text
- Runtime CSS custom property resolution
- `mix-blend-mode` text
- Inheritance chains spanning multiple selectors

### Confidence Boundary

- **Can prove:** A statically resolvable CSS `color`/`background-color` pair in the same rule falls below the WCAG AA threshold when computed against the standard WCAG relative-luminance formula.
- **Cannot prove:** The rendered text actually has that contrast ratio. Cascade, inheritance, opacity, images, gradients, pseudo-elements, and runtime values may produce different rendered contrast. **A finding from static analysis is not a WCAG conformance failure.**

### Detector Inputs

- CSS `color` declarations
- CSS `background-color` declarations
- Statically resolvable selector specificity chain (limited depth)
- Relative luminance computation per WCAG 1.4.3 formula

### False-Positive Controls

| Exclusion | Rationale |
|---|---|
| Declarations involving CSS custom properties | Computed value is not resolvable statically |
| Background images | Contrast cannot be computed without rendering |
| Gradient backgrounds | Multiple color stops create variable contrast |
| Opacity values below 1.0 | Effective color depends on compositing |
| `currentColor` references | Requires parent chain resolution |
| Disabled/readonly form controls | Reduced contrast communicates state intentionally |
| Placeholder text with visible label | Placeholder-only is caught by `forms.input-labels-required`; contrast check is secondary |
| Decorative text | Watermarks, background marks not intended to be read |

### Fixture Assessment

| Fixture | Case | Usable | Demonstrates |
|---|---|---|---|
| `violation.light-gray-text` | Body `#999` on white | Yes | Resolvable solid-color pair failing WCAG AA |
| `control.dark-text-white-bg` | Body `#333` on white | Yes | Resolvable solid-color pair passing WCAG AA |
| `borderline.gradient-overlay` | Text over gradient | Yes | Demonstrates the boundary case the static detector **cannot** handle — reinforces the partial-scope contract |

**Additional fixtures required before production:**
- CSS `opacity` cascade test (parent `opacity: 0.5` with child text)
- CSS custom property resolution test (the detector should flag `color: var(--text)` as unresolvable)
- Multiple selector specificity test
- `::before` content text with declared color
- Contrast on multi-layer background (gradient + image)

### Profile Recommendation

- `universal` (baseline accessibility)
- Future accessibility-focused profile

### Severity Recommendation

`warning` — A static-contrast finding is a strong heuristic but not definitive proof of WCAG failure. The warning must clearly scope the finding to "resolvable solid-color pair only."

### Implementation Readiness

**`ready after architecture support`**

The static analysis for simple pairs is straightforward, but the implementation must include explicit scope boundaries in the finding message. Every finding must state "this check covers only statically resolvable solid-color foreground/background pairs" to prevent false certainty.

---

## Candidate 4: `accessibility.skip-navigation-link`

### Disposition

**`accept-as-advisory-only`** with a carefully bounded static component.

### Architecture

Bounded static DOM analysis.

The detector can verify a specific mechanism: is there a visible-on-focus skip link targeting the main content region? This is one of several conforming techniques for WCAG 2.4.1 (Bypass Blocks).

**The detector cannot:**
- Prove WCAG 2.4.1 failure from skip-link absence alone
- Evaluate ARIA landmark structure as a bypass mechanism
- Verify runtime focus management in SPAs
- Confirm that the skip link's target actually exists or functions correctly

### Confidence Boundary

- **Can prove:** A recognized skip-link structure (anchor with `href="#..."` targeting a main-content element) exists and is positioned as the first focusable element.
- **Cannot prove:** Absence of a skip link means the page fails WCAG 2.4.1. Proper heading structure, ARIA landmarks, or programmatic focus management may satisfy the requirement.

### Detector Inputs

- HTML source text
- Anchor elements with `href` starting with `#`
- Elements with `id` matching the anchor target
- `role="main"` elements
- CSS visibility/position properties on skip link

### False-Positive Controls

| Exclusion | Rationale |
|---|---|
| Single-content landing pages | No repeated navigation to bypass |
| ARIA-managed SPAs | May use landmarks as bypass mechanism |
| Framework focus management | React, Vue, Svelte routers may manage focus programmatically |
| Screen-reader-only applications | Navigation order managed by ARIA landmarks |

### Fixture Assessment

| Fixture | Case | Usable | Demonstrates |
|---|---|---|---|
| `violation.no-skip` | 10 nav links, no skip link | Yes | Demonstrates the baseline pattern; absence triggers advisory note but cannot claim WCAG failure |
| `control.with-skip` | Skip link visible on focus | Yes | Demonstrates a functioning skip-link implementation |
| `borderline.spa-routing` | SPA with programmatic focus | Yes | Demonstrates alternative bypass mechanism — should not trigger |

**Additional fixtures required before production:**
- Page with ARIA landmarks but no skip link (should not trigger a WCAG failure claim)
- Page with proper heading structure serving as navigation bypass
- Multi-page application with skip link on interior pages only

### Profile Recommendation

- `universal`
- Future accessibility-focused profile

### Severity Recommendation

`warning` with explicitly scoped message: "A skip link was not detected. This is one of several techniques for WCAG 2.4.1 Bypass Blocks. ARIA landmarks or programmatic focus management may also satisfy this requirement."

### Implementation Readiness

**`ready after architecture support`**

The static detector component is straightforward, but the finding message must be carefully worded to avoid implying WCAG failure. The implementation should be paired with documentation about alternative bypass mechanisms and should not produce `error`-level findings under any configuration.

---

## Candidate 5: `mobile.touch-target-minimum`

### Disposition

**`accept-for-browser-assisted-implementation`**

### Architecture

Browser-rendered analysis — not suitable for the current local-first, zero-dependency static linter.

The rendered touch-target area cannot be determined from source CSS alone. What matters is:
- The **rendered box model** after CSS cascade, font-size inheritance, padding, border, box-sizing
- CSS `transform: scale()` applied to interactive elements
- Responsive size changes at different viewport widths
- Overlap between elements affecting effective hit area
- JavaScript-determined touch targets (custom gesture handlers)

### Confidence Boundary

- **Can prove (browser-assisted):** At viewport width X, interactive element Y has a rendered bounding box smaller than 44x44 CSS pixels.
- **Cannot prove (static only):** Anything about rendered touch targets. Static CSS width/height declarations may differ from rendered sizes due to cascade, content overflow, padding, border-box, transforms, and responsive rules.

### Detector Inputs (browser-assisted)

- Computed element bounding boxes (getBoundingClientRect)
- Viewport dimensions
- Interactive element classification (a, button, input, select, [role=button])
- Responsive breakpoint context
- Touch-action CSS property

### False-Positive Controls (browser-assisted)

| Exclusion | Rationale |
|---|---|
| Desktop-only interfaces at non-mobile viewports | Touch targets only matter on touch-capable viewports |
| Inline text links within paragraphs | 44px on every link in prose would break reading flow |
| Non-interactive elements | Static text, decorative elements, spacing |
| Parent-handled touch | Container may delegate touch to a parent |

### Fixture Assessment

| Fixture | Case | Usable | Demonstrates |
|---|---|---|---|
| `violation.small-buttons` | 32px submit, 28px icons | Static only | CSS declarations show undersized targets but cannot confirm rendered size |
| `control.adequate-sizing` | 48px submit, 44px icons via padding | Static only | CSS shows adequate declared size |
| `borderline.data-table` | 36px rows with 44px checkbox column | Static only | Demonstrates the table-density tradeoff |

**Additional fixtures required before production:**
- Browser-rendered fixture with `transform: scale()` on target
- Viewport-responsive fixture where button size changes at breakpoints
- Multi-layer overlapping touch targets
- Touch-target with `box-sizing: border-box` vs `content-box`

### Profile Recommendation

- `mobile` (primary — this is the only profile where touch targets are meaningful)
- Future `anti-slop` profile (when it includes mobile surfaces)

### Severity Recommendation

`warning` (in browser-assisted mode) — `advisory` (in static-only mode). The current architecture cannot support this rule at the `error` or `warning` level because static analysis cannot determine the rendered touch target size.

### Implementation Readiness

**`ready after architecture support`** — specifically, a browser-rendered analysis pipeline. The current static-linter architecture cannot implement this rule with useful confidence.

---

## First Production Implementation Tranche

### Tranche 1

| Order | Candidate | Architecture | Reason |
|---|---|---|---|
| 1 | `forms.input-labels-required` | Static DOM analysis | Cleanest detector path, definitive findings, WCAG Level A, highest user impact |
| 2 | `motion.respect-reduced-motion` | Static CSS analysis | Well-bounded pattern, low false-positive risk, existing fixture coverage |

### Deferred to Tranche 2

| Candidate | Architecture | Reason for deferral |
|---|---|---|
| `accessibility.text-contrast-minimum` | Partial static + browser | Needs careful scope messaging; partial findings risk overconfidence |
| `accessibility.skip-navigation-link` | Static + advisory | Finding message must be carefully bounded to avoid implying WCAG failure |
| `mobile.touch-target-minimum` | Browser-assisted | Cannot be meaningfully implemented under current architecture |



### Framework Scope Decision

**HTML and plain CSS in Tranche 1. JSX, Vue SFC, and Svelte staged in a follow-up.**

The first implementation PR for each Tranche 1 candidate must handle:
- **`forms.input-labels-required`:** `.html` files only. JSX `aria-label`, Vue `:label`, and Svelte label slots are staged for a follow-up PR.
- **`motion.respect-reduced-motion`:** `.html` (inline `<style>` and `<link>`) and `.css` files only. CSS-in-JS template literals (styled-components, Emotion), Vue scoped styles, and Svelte component styles are staged for a follow-up PR.

**Rationale:** The current fixture coverage provides violation, control, and borderline cases for core HTML and CSS. Framework-specific patterns require additional fixtures, detector patterns, and false-positive analysis that would delay the initial implementation. Staging them as follow-ups lets the core detector ship, gather feedback, and then expand incrementally — consistent with Design Canon's principle of progressive disclosure.

**Acceptance gates for framework expansion:**
1. Core HTML/CSS detector passes review and ships
2. Framework-specific fixtures exist (JSX component with `aria-label`, Vue SFC with `:label`, Svelte with label slot)
3. Framework pattern tests pass alongside the core HTML tests
4. Documentation updated for the new template syntax coverage

### Why Start with Input Labels

1. **Definitive detector:** The accessible-name check has the narrowest false-positive gap of any candidate.
2. **WCAG Level A:** Missing input labels are a demonstrated accessibility barrier with clear remediation.
3. **Low implementation risk:** The pattern is well-understood, and the false-positive exclusions are concrete.
4. **Fixture completeness:** The core HTML case has violation, control, and borderline fixtures.
5. **Framework extensibility:** JSX/Vue/Svelte variants can be added incrementally without changing the core detector logic.

### Why Add Reduced Motion Second

1. **Complementary coverage:** Together, input labels and reduced motion address both screen-reader accessibility and vestibular accessibility — two distinct user-impact categories.
2. **Clean CSS pattern:** The `@media (prefers-reduced-motion)` absence check is mechanically straightforward.
3. **Well-bounded exclusions:** Micro-interactions, single-play animations, and user-initiated playback are clearly definable exclusions.
4. **Documented scope:** The detector explicitly cannot claim visibility into JS animation libraries, preventing overreach.

---

## Profile Placement Recommendations

| Candidate | Primary Profile | Also In |
|---|---|---|
| `forms.input-labels-required` | `universal` | `marketing`, `product-app` |
| `motion.respect-reduced-motion` | `universal` | `marketing`, `editorial` |
| `accessibility.text-contrast-minimum` | `universal` | (accessibility-focused profile when it exists) |
| `accessibility.skip-navigation-link` | `universal` | (advisory/info severity) |
| `mobile.touch-target-minimum` | `mobile` | (browser-assisted only) |

### `anti-slop` Profile Design Note

The future `anti-slop` profile should include both the five review-ready candidates (at their assigned severities) and a subset of the existing 13 rules that address template-generated visual patterns. The `anti-slop` profile is not a replacement for `universal` accessibility rules — accessibility rules should live in `universal` AND `anti-slop` so they activate regardless of which profile a user selects.

---

## Deferred Work

### 39 Researched Proposals

The remaining 39 proposals (all `researched` or `draft`) require a disposition report before they can be acted on. The 13 copy proposals especially need a policy decision about whether Design Canon will eventually support contextual copy review or whether that remains a separate future profile.

**Recommendation:** Create a separate copy-quality profile as an optional adapter, not as a mechanical linter feature. Copy patterns require semantic understanding beyond what the current regex-based architecture can provide.

### Benchmark

The 180-run benchmark (15 briefs × 4 conditions × 3 runs) remains the largest strategic gap. Before running it, Design Canon needs:
- Deterministic C and D generation from the same catalog commit
- Scoring rubric and blinded evaluation procedure
- Artifact storage format and reproducibility commands
- This ADR's decisions should be reflected in the benchmark conditions

### Distribution

- Monolithic export mode
- Single-file agent drop-in
- Agent-specific adapters (Codex, Hermes, Claude Code, Cursor)
- Instruction-efficiency reporting
- Documentation for consuming Design Canon from supported agents

---

## Rejected Alternatives

| Alternative | Rejected because |
|---|---|
| Force all five candidates into the static linter | Touch-target analysis cannot determine rendered sizes without browser; skip-link absence cannot prove WCAG failure |
| Create a single "accessibility" meta-rule | Each candidate has a distinct detector architecture; conflating them would reduce clarity |
| Implement contrast with full CSS cascade resolution | Would require a CSS parser and value resolver — beyond the current architecture's scope and dependencies |
| Make touch targets a simple CSS width/height check | Would produce misleading findings; rendered touch area differs from declared CSS values due to cascade, padding, border-box, transforms, and responsive rules |

---

## Consequences

### Positive

- Tranche 1 addresses two distinct accessibility categories (screen-reader and vestibular) with high-confidence detectors
- The architectural split prevents the linter from making unsupported claims it cannot back up
- `advisory` disposition for skip-link and `partial` for contrast establish honest boundaries without blocking future expansion
- Machine-readable decision matrix enables automated verification of the decision structure

### Negative

- Touch-target enforcement is gated on browser-assisted architecture that does not yet exist
- Text-contrast findings must be carefully communicated to prevent users from treating partial signals as full WCAG conformance
- The 39 remaining proposals lack a disposition path until a follow-up report is created
- Copy proposals have no mechanical home under the current architecture

---

## Unresolved Maintainer Decisions

1. Does the `universal` profile concept (a profile that loads rules applying to all surfaces) need to be created, or should accessibility rules be included in every existing profile?
2. Should the `anti-slop` profile include the five candidates at different severities than their `universal` assignment?
3. Are the 13 copy proposals best handled as a separate `copy-quality` profile, or should they be integrated into `marketing` and `editorial` profiles as advisory rules?
4. What is the policy for converting `research-backed` candidate proposals into accepted rule IDs (stable ID naming convention, changelog procedure)?
5. Should the 5 review-ready proposals share a single stable prefix (e.g., `a11y.*`) or keep their research-derived category prefixes (`forms.*`, `motion.*`, etc.)?

---

## Future PR Boundaries

| PR | Scope | When |
|---|---|---|
| **Decision PR** (this PR) | Architecture acceptance, detector assignment, sequencing | Now |
| **Tranche 1 — Input labels** | Catalog entry, detector, tests, fixtures, documentation | After this PR merges |
| **Tranche 1 — Reduced motion** | Catalog entry, detector, tests, fixtures, documentation | After input labels |
| **Tranche 2 — Contrast** | Partial static detector + scope documentation | After Tranche 1 evaluation |
| **Tranche 2 — Skip link** | Bounded static detector + advisory message | After Tranche 1 evaluation |
| **Browser adapter** | Rendered analysis infrastructure for touch targets | Parallel track |
| **`anti-slop` profile** | Profile definition with selected rules | After first detectors exist |
| **Copy-quality profile** | Optional adapter for contextual copy review | After `anti-slop` profile |
| **39-proposal disposition** | Grouped disposition report | After Tranche 1 |
| **Benchmark** | Runner, rubric, reproducibility | Parallel track |
