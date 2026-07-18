# Anti-Slop Fixture Suite Manifest

This directory contains 15 synthetic, self-contained HTML fixtures. They are intentionally poor interfaces designed to exercise Design Canon's current mechanical detectors and to provide future samples for semantic or visual analysis.

## Reading the expectations

Two kinds of expectations are kept separate:

- **Deterministic findings:** exact output produced by the current dependency-free linter. These counts are enforced by `tests/fixtures.test.js`.
- **Future semantic target:** the policy issue the fixture is meant to represent once visual, structural, or browser-backed analysis exists. These are not counted as current lint findings.

A fixture may trigger additional deterministic rules beyond its headline anti-pattern. Those incidental findings are intentional and are recorded exactly.

## Current deterministic coverage

The current catalog contains eight rules with mechanical detector patterns. This suite exercises all eight:

- `typography.generic-primary-font`
- `color.purple-gradient-default`
- `layout.centered-everything`
- `depth.shadow-soup`
- `radius.everything-pill`
- `motion.transition-all`
- `a11y.visible-focus`
- `copy.generic-hero`

Five additional rules are represented as future semantic targets but do not currently have detector patterns:

- `direction.name-the-direction`
- `tokens.establish-system`
- `editorial.reading-measure`
- `product-app.density-by-task`
- `marketing.single-primary-action`

## Fixture catalog

### F001: Generic purple gradients

- **File:** `F001-index.html`
- **Profile:** `marketing`
- **Future semantic target:** decorative technology styling without a coherent visual direction or token system.
- **Deterministic findings:**
  - `typography.generic-primary-font`: 1
  - `color.purple-gradient-default`: 1
  - `radius.everything-pill`: 1
  - `motion.transition-all`: 1
  - `depth.shadow-soup`: 1
  - `copy.generic-hero`: 2

### F002: Centered everything

- **File:** `F002-index.html`
- **Profile:** `marketing`
- **Future semantic target:** a page with no deliberate reading path or compositional asymmetry.
- **Deterministic findings:**
  - `typography.generic-primary-font`: 1
- **Note:** the current centered-layout detector targets a specific utility-class sequence. This raw-CSS fixture is retained for future structural analysis rather than falsely claiming a present match.

### F003: Excessive pills

- **File:** `F003-index.html`
- **Profile:** `marketing`
- **Future semantic target:** indiscriminate shape language and hidden focus treatment.
- **Deterministic findings:**
  - `radius.everything-pill`: 1
  - `typography.generic-primary-font`: 1
  - `a11y.visible-focus`: 1

### F004: Giant rounded cards

- **File:** `F004-index.html`
- **Profile:** `marketing`
- **Future semantic target:** oversized card composition with excessive depth and weak page hierarchy.
- **Deterministic findings:**
  - `typography.generic-primary-font`: 1
  - `radius.everything-pill`: 8
  - `depth.shadow-soup`: 3

### F005: Shadow soup

- **File:** `F005-index.html`
- **Profile:** `marketing`
- **Future semantic target:** multiple unrelated elevation languages competing on one page.
- **Deterministic findings:**
  - `typography.generic-primary-font`: 1
  - `depth.shadow-soup`: 8

### F006: Generic hero copy

- **File:** `F006-index.html`
- **Profile:** `marketing`
- **Future semantic target:** interchangeable marketing language with no product specificity.
- **Deterministic findings:**
  - `copy.generic-hero`: 17
  - `typography.generic-primary-font`: 1

### F007: Hidden keyboard focus

- **File:** `F007-index.html`
- **Profile:** `marketing`
- **Future semantic target:** systemic removal of keyboard focus indicators.
- **Deterministic findings:**
  - `a11y.visible-focus`: 23
  - `typography.generic-primary-font`: 1
  - `motion.transition-all`: 1

### F008: Transition all

- **File:** `F008-index.html`
- **Profile:** `marketing`
- **Future semantic target:** broad animation declarations applied without property-level intent.
- **Deterministic findings:**
  - `motion.transition-all`: 30
  - `typography.generic-primary-font`: 1

### F009: Weak hierarchy

- **File:** `F009-index.html`
- **Profile:** `marketing`
- **Future semantic target:** `marketing.single-primary-action` and visual hierarchy review.
- **Deterministic findings:**
  - `typography.generic-primary-font`: 1

### F010: Unreadable editorial measure

- **File:** `F010-index.html`
- **Profile:** `editorial`
- **Future semantic target:** `editorial.reading-measure` browser-backed validation.
- **Deterministic findings:**
  - `typography.generic-primary-font`: 1

### F011: Poor dashboard density

- **File:** `F011-index.html`
- **Profile:** `product-app`
- **Future semantic target:** `product-app.density-by-task` and task-efficiency analysis.
- **Deterministic findings:**
  - `radius.everything-pill`: 3

### F012: Competing calls to action

- **File:** `F012-index.html`
- **Profile:** `marketing`
- **Future semantic target:** `marketing.single-primary-action` visual analysis.
- **Deterministic findings:**
  - `typography.generic-primary-font`: 1
  - `radius.everything-pill`: 1

### F013: Inconsistent spacing

- **File:** `F013-index.html`
- **Profile:** `marketing`
- **Future semantic target:** `tokens.establish-system` through repeated-value and token-use analysis.
- **Deterministic findings:**
  - `typography.generic-primary-font`: 1

### F014: Decorative animation overload

- **File:** `F014-index.html`
- **Profile:** `marketing`
- **Future semantic target:** browser-backed motion-purpose and reduced-motion review.
- **Deterministic findings:**
  - `typography.generic-primary-font`: 1
  - `motion.transition-all`: 5
  - `depth.shadow-soup`: 2

### F015: Weak mobile hierarchy

- **File:** `F015-index.html`
- **Profile:** `marketing`
- **Future semantic target:** viewport overflow, responsive hierarchy, and breakpoint evidence.
- **Deterministic findings:**
  - `typography.generic-primary-font`: 1
  - `radius.everything-pill`: 1
- **Note:** the current centered-layout detector does not infer raw-CSS centering or missing responsive breakpoints.

## Maintenance contract

When a detector changes intentionally:

1. Run `npm test`.
2. Review every count change in `tests/fixtures.test.js`.
3. Confirm the changed evidence is desirable rather than merely broader regex matching.
4. Update this manifest and the test in the same commit.
5. Keep semantic targets out of deterministic totals until an executable analyzer reports them.

These fixtures are regression inputs, not proof that Design Canon improves generated interfaces. Benchmark claims require controlled runs and blind evaluation.
