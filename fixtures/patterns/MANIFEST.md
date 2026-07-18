# Anti-Slop Fixture Suite — MANIFEST

This manifest documents the 15 intentionally poor frontend fixtures in `fixtures/patterns/`.
Each fixture deliberately violates one or more Design Canon rules to create a deterministic test bed
for the linter.

All fixtures are **generated fixtures** — synthetic, self-contained HTML with embedded CSS and no
external dependencies.

---

## Catalog

### F001 — generic-purple-gradients

| Field | Value |
|---|---|
| Source | `F001-index.html` |
| Intended profile | `marketing` |
| Anti-pattern | Excessive purple/indigo gradients used as generic technological decoration |

**Expected findings:**

| Rule ID | Severity | Expected count | Notes |
|---|---|---|---|
| `color.purple-gradient-default` | warning | 5–9 | Every gradient background on this page uses purple/indigo/#7c3aed/#6366f1 combinations |
| `copy.generic-hero` | warning | 2 | "Unlock the Power of Next-Gen Intelligence", "Revolutionize your workflow" |
| `typography.generic-primary-font` | warning | 1 | Uses Inter as primary font without rationale |
| `direction.name-the-direction` | error | 1 | No visual direction is stated |
| `tokens.establish-system` | error | 1 | All spacing, radius, and depth values are ad-hoc |

**False-positive risks:**
- `color.purple-gradient-default` may flag legitimate brand colours — here they are purely decorative.
- `direction.name-the-direction` requires compile-time metadata; a lint-only pass may skip this.

---

### F002 — centered-everything

| Field | Value |
|---|---|
| Source | `F002-index.html` |
| Intended profile | `marketing` |
| Anti-pattern | Entire layout centered with no reading path, no asymmetry |

**Expected findings:**

| Rule ID | Severity | Expected count | Notes |
|---|---|---|---|
| `layout.centered-everything` | warning | 1–3 | Multiple centered containers with text-center + mx-auto + justify-center/items-center patterns |
| `typography.generic-primary-font` | warning | 1 | Uses Inter as primary font without rationale |
| `direction.name-the-direction` | error | 1 | No visual direction stated |
| `tokens.establish-system` | error | 1 | All spacing and layout values are one-offs |

**False-positive risks:**
- `layout.centered-everything` patterns may match a deliberately centered hero section even when asymmetry exists elsewhere. In this fixture the entire page is genuinely centered.

---

### F003 — excessive-pills

| Field | Value |
|---|---|
| Source | `F003-index.html` |
| Intended profile | `marketing` |
| Anti-pattern | Every surface has rounded-3xl or border-radius 30px+, collapsing shape variety |

**Expected findings:**

| Rule ID | Severity | Expected count | Notes |
|---|---|---|---|
| `radius.everything-pill` | warning | 12–20 | Every element uses border-radius: 9999px or 32px+; header, nav links, hero, cards, badges, inputs, buttons, progress bar, toggle, table cells, footer |
| `typography.generic-primary-font` | warning | 1 | Uses Inter as primary font without rationale |
| `direction.name-the-direction` | error | 1 | No visual direction stated |
| `tokens.establish-system` | error | 1 | All values ad-hoc |

**False-positive risks:**
- `radius.everything-pill` uses `multiple: true`, so each occurrence counts. A naive implementation may flag the universal CSS `box-sizing: border-box` or non-radius properties. Only border-radius declarations should match.

---

### F004 — giant-cards

| Field | Value |
|---|---|
| Source | `F004-index.html` |
| Intended profile | `marketing` |
| Anti-pattern | Massive rounded cards dominating the page with heavy shadows |

**Expected findings:**

| Rule ID | Severity | Expected count | Notes |
|---|---|---|---|
| `radius.everything-pill` | warning | 5–8 | All cards use border-radius 28–40px |
| `depth.shadow-soup` | warning | 5–7 | Each card has large box-shadows (0 24px 80px, 0 16px 48px, etc.), some with double shadows |
| `typography.generic-primary-font` | warning | 1 | Uses Inter as primary font |
| `direction.name-the-direction` | error | 1 | No visual direction stated |
| `tokens.establish-system` | error | 1 | No token system |

**False-positive risks:**
- `depth.shadow-soup` patterns match `0 20px 60px`, `0 24px 80px`, etc. Ensure the regex does not match zero-value shadows or shadows in non-visual contexts.

---

### F005 — shadow-soup

| Field | Value |
|---|---|
| Source | `F005-index.html` |
| Intended profile | `marketing` |
| Anti-pattern | Multiple large shadows, glows, glass effects combined with no depth hierarchy |

**Expected findings:**

| Rule ID | Severity | Expected count | Notes |
|---|---|---|---|
| `depth.shadow-soup` | warning | 7–9 | Seven cards each with different large shadows, including multi-layered shadows, glows, glass blur, and box-shadow cascades |
| `typography.generic-primary-font` | warning | 1 | Uses Inter as primary font |
| `direction.name-the-direction` | error | 1 | No visual direction stated |
| `tokens.establish-system` | error | 1 | No token system |

**False-positive risks:**
- Glass/blur elements (backdrop-filter) are not directly detected by `depth.shadow-soup` but contribute to the same anti-pattern. The rule relies on shadow-pattern matching only.

---

### F006 — generic-hero-copy

| Field | Value |
|---|---|
| Source | `F006-index.html` |
| Intended profile | `marketing` |
| Anti-pattern | "Unlock the power", "revolutionize your", and other interchangeable hero phrases |

**Expected findings:**

| Rule ID | Severity | Expected count | Notes |
|---|---|---|---|
| `copy.generic-hero` | warning | 6–10 | "Unlock the Power of Next-Generation Innovation", "Revolutionize your workflow", "elevate your business", "supercharge your team", "future of innovation", "next generation", "Elevate Your Operations", "Unlock unprecedented", "Revolutionize Your Analytics", "Supercharge Your Workflow", etc. |
| `layout.centered-everything` | warning | 1 | Centered page layout |
| `typography.generic-primary-font` | warning | 1 | Uses Inter as primary font |
| `direction.name-the-direction` | error | 1 | No visual direction stated |
| `tokens.establish-system` | error | 1 | No token system |

**False-positive risks:**
- `copy.generic-hero` matches substrings within larger phrases. A phrase like "next generation" may be a legitimate descriptor, not a placeholder — here all uses are intentional violations.

---

### F007 — hidden-keyboard-focus

| Field | Value |
|---|---|
| Source | `F007-index.html` |
| Intended profile | `marketing` |
| Anti-pattern | outline:none everywhere, no focus-visible replacement |

**Expected findings:**

| Rule ID | Severity | Expected count | Notes |
|---|---|---|---|
| `a11y.visible-focus` | error | 15–25 | Systemic outline:none on all interactive elements: universal selectors (`*`, `*:focus`, `*:active`), individual tags (`a`, `button`, `input`, `select`, `textarea`), `[tabindex]`, `.outline-none` class, and inline `outline="none"` attribute |
| `typography.generic-primary-font` | warning | 1 | Uses Inter as primary font |
| `direction.name-the-direction` | error | 1 | No visual direction stated |
| `tokens.establish-system` | error | 1 | No token system |

**False-positive risks:**
- `a11y.visible-focus` uses `multiple: true` with `outline:\s*(none|0)` and `outline-none`. The universal `* { outline: none }` will match once but already removes focus for every element. The multiple matches from per-element declarations are compounding the anti-pattern.

---

### F008 — transition-all

| Field | Value |
|---|---|
| Source | `F008-index.html` |
| Intended profile | `marketing` |
| Anti-pattern | Every element has transition:all, no property-specific animation |

**Expected findings:**

| Rule ID | Severity | Expected count | Notes |
|---|---|---|---|
| `motion.transition-all` | warning | 15–25 | Universal `* { transition: all 200ms }` plus per-element transition:all on header, logo, nav a, h1, p, .card, h3, button, .badge, .grid, .grid-item, .progress-bar, .progress-fill, footer — each hover style also has transition:all |
| `typography.generic-primary-font` | warning | 1 | Uses Inter as primary font |
| `direction.name-the-direction` | error | 1 | No visual direction stated |
| `tokens.establish-system` | error | 1 | No token system |

**False-positive risks:**
- The universal `* { transition: all }` rule will match once via a pattern search. Per-element overrides are separate matches. This fixture ensures the multiple-match detection path is exercised.

---

### F009 — weak-hierarchy

| Field | Value |
|---|---|
| Source | `F009-index.html` |
| Intended profile | `marketing` |
| Anti-pattern | Everything looks equally important — same size, weight, color |

**Expected findings:**

| Rule ID | Severity | Expected count | Notes |
|---|---|---|---|
| `marketing.single-primary-action` | error | 1–3 | No single primary action; all buttons look identical, pricing CTAs compete equally |
| `typography.generic-primary-font` | warning | 1 | Uses Inter as primary font |
| `direction.name-the-direction` | error | 1 | No visual direction stated |
| `tokens.establish-system` | error | 1 | No token system |

**False-positive risks:**
- `marketing.single-primary-action` has no detect pattern (it is a semantic rule). A lint-only pass may not catch it unless the rule operates on visual styling heuristics.

---

### F010 — unreadable-measure

| Field | Value |
|---|---|
| Source | `F010-index.html` |
| Intended profile | `editorial` |
| Anti-pattern | Body text spanning full viewport width with no reading-measure constraint |

**Expected findings:**

| Rule ID | Severity | Expected count | Notes |
|---|---|---|---|
| `editorial.reading-measure` | error | 1 | No max-width or ch-unit constraint on paragraphs; body text spans full viewport width |
| `typography.generic-primary-font` | warning | 1 | Uses Inter as primary font |
| `direction.name-the-direction` | error | 1 | No visual direction stated |
| `tokens.establish-system` | error | 1 | No token system |

**False-positive risks:**
- `editorial.reading-measure` has no detect pattern (text-analysis rule). The fixture exists to ensure the rule has a representative sample to analyse. A naive max-width check on the `<article>` container would miss that the *paragraphs* themselves have no measure constraint.

---

### F011 — poor-dashboard-density

| Field | Value |
|---|---|
| Source | `F011-index.html` |
| Intended profile | `product-app` |
| Anti-pattern | Marketing spacing on data interface, wasted space, low information density |

**Expected findings:**

| Rule ID | Severity | Expected count | Notes |
|---|---|---|---|
| `product-app.density-by-task` | error | 1 | Massive gaps (40–64px), oversized stat cards (48px padding), generous whitespace throughout — a data interface using marketing-level rhythm |
| `radius.everything-pill` | warning | 3–6 | border-radius: 24px on panels and sidebar, border-radius: 9999px on badges, avatar, and filter buttons |
| `direction.name-the-direction` | error | 1 | No visual direction stated |
| `tokens.establish-system` | error | 1 | No token system |

**False-positive risks:**
- `product-app.density-by-task` has no detect pattern (semantic rule). A linter must analyse spacing/whitespace ratios or be explicitly told the profile. This fixture verifies that reasonable density heuristics flag a marketing-spacing dashboard.
- `color.purple-gradient-default` should **not** fire — there are no purple gradients.

---

### F012 — competing-ctas

| Field | Value |
|---|---|
| Source | `F012-index.html` |
| Intended profile | `marketing` |
| Anti-pattern | Multiple primary-style buttons in the same section, no single obvious action |

**Expected findings:**

| Rule ID | Severity | Expected count | Notes |
|---|---|---|---|
| `marketing.single-primary-action` | error | 3–5 | Hero section has 4 identically styled primary buttons; feature cards each have a primary button; pricing cards all have primary CTAs; banner has 3 more primary buttons |
| `typography.generic-primary-font` | warning | 1 | Uses Inter as primary font |
| `direction.name-the-direction` | error | 1 | No visual direction stated |
| `tokens.establish-system` | error | 1 | No token system |

**False-positive risks:**
- `marketing.single-primary-action` (no detect regex) requires visual analysis — all buttons are solid dark with white text, no visual hierarchy assigns primary vs secondary roles.

---

### F013 — inconsistent-spacing

| Field | Value |
|---|---|
| Source | `F013-index.html` |
| Intended profile | `marketing` |
| Anti-pattern | Random margins/padding with no token system, inconsistent rhythm |

**Expected findings:**

| Rule ID | Severity | Expected count | Notes |
|---|---|---|---|
| `tokens.establish-system` | error | 1 | No repeated spacing values; 11+ unique padding and margin values (7px, 11px, 13px, 15px, 17px, 19px, 27px, 31px, 35px, 37px, 42px, 51px) |
| `typography.generic-primary-font` | warning | 1 | Uses Inter as primary font |
| `direction.name-the-direction` | error | 1 | No visual direction stated |

**False-positive risks:**
- `tokens.establish-system` has no detect pattern (compile-time / code-analysis rule). A token-analysis lint pass should detect the high ratio of unique spacing values to total declarations.

---

### F014 — decorative-animation-overload

| Field | Value |
|---|---|
| Source | `F014-index.html` |
| Intended profile | `marketing` |
| Anti-pattern | Animations everywhere with no purpose, no reduced-motion respect |

**Expected findings:**

| Rule ID | Severity | Expected count | Notes |
|---|---|---|---|
| `motion.transition-all` | warning | 3–5 | Universal `* { transition: all }` plus multiple per-element transition:all declarations |
| `typography.generic-primary-font` | warning | 1 | Uses Inter as primary font |
| `direction.name-the-direction` | error | 1 | No visual direction stated |
| `tokens.establish-system` | error | 1 | No token system |

**False-positive risks:**
- `motion.transition-all` catches only `transition: all` declarations, not the 8+ `@keyframes` animations. A complete motion analysis would need to detect decorative keyframe animations separately.

---

### F015 — weak-mobile-hierarchy

| Field | Value |
|---|---|
| Source | `F015-index.html` |
| Intended profile | `marketing` |
| Anti-pattern | Fixed-width desktop layout with no responsive consideration; breaks on mobile |

**Expected findings:**

| Rule ID | Severity | Expected count | Notes |
|---|---|---|---|
| `layout.centered-everything` | warning | 1 | `margin: 0 auto` centered layout with fixed width |
| `typography.generic-primary-font` | warning | 1 | Uses Inter as primary font |
| `direction.name-the-direction` | error | 1 | No visual direction stated |
| `tokens.establish-system` | error | 1 | No token system |

**False-positive risks:**
- There is no existing rule named `layout.responsive-breakpoints` or similar. The fixture currently relies on `layout.centered-everything` and profile-level rules to flag the fixed-width anti-pattern. A future `layout.no-breakpoints` rule would be appropriate here.
- `layout.centered-everything` pattern (text-center + mx-auto + justify-center/items-center) is designed for Tailwind classes; in raw CSS the `margin: 0 auto` centering may need a different detection path.

---

## Summary

| Fixture | Primary rule violation | Profile | Total expected findings |
|---|---|---|---|
| F001 | `color.purple-gradient-default` | marketing | 5–13 |
| F002 | `layout.centered-everything` | marketing | 4–6 |
| F003 | `radius.everything-pill` | marketing | 15–23 |
| F004 | `depth.shadow-soup` + `radius.everything-pill` | marketing | 9–18 |
| F005 | `depth.shadow-soup` | marketing | 10–12 |
| F006 | `copy.generic-hero` | marketing | 9–14 |
| F007 | `a11y.visible-focus` | marketing | 18–28 |
| F008 | `motion.transition-all` | marketing | 18–28 |
| F009 | `marketing.single-primary-action` | marketing | 4–6 |
| F010 | `editorial.reading-measure` | editorial | 4 |
| F011 | `product-app.density-by-task` | product-app | 6–9 |
| F012 | `marketing.single-primary-action` | marketing | 5–8 |
| F013 | `tokens.establish-system` | marketing | 3 |
| F014 | `motion.transition-all` | marketing | 6–8 |
| F015 | `layout.centered-everything` | marketing | 4 |

---

## Coverage

Rules exercised by this suite (13 of 13 core rules):

| Rule ID | Covered by |
|---|---|
| `direction.name-the-direction` | F001–F015 (all) |
| `tokens.establish-system` | F001–F015 (all) |
| `typography.generic-primary-font` | F001–F010, F012–F015 |
| `color.purple-gradient-default` | F001 |
| `layout.centered-everything` | F002, F006, F015 |
| `depth.shadow-soup` | F004, F005 |
| `radius.everything-pill` | F003, F004, F011 |
| `motion.transition-all` | F008, F014 |
| `a11y.visible-focus` | F007 |
| `copy.generic-hero` | F001, F006 |
| `editorial.reading-measure` | F010 |
| `product-app.density-by-task` | F011 |
| `marketing.single-primary-action` | F009, F012 |

All 13 core rules are exercised by at least one fixture. Rules without detect patterns (direction,
tokens, editorial, product-app, marketing) are exercised for semantic/compile-time analysis paths.
