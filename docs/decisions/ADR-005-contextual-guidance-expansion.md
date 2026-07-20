# ADR-005: Contextual Guidance Expansion After Benchmark v1 Freeze

- Status: Accepted
- Date: 2026-07-20
- Scope: production guidance catalog and profile compilation

## Context

The first clean-room benchmark protocol freezes the 18-rule catalog merged at commit `5caa9e0315a1f10f0e5f70e6218d4fc9049d2530`. That freeze must remain reproducible while the live product continues to improve.

The research intake contains additional proposals covering focal hierarchy, action levels, empty states, error recovery, mobile safe areas, responsive media, spacing scales, metric overload, and social proof. Most proposals were normalized to `researched` or `draft` because their proposed detectors were too subjective, under-specified, or weakly sourced.

A rule can still be useful as compiled guidance without pretending that Design Canon can mechanically prove it. Detector feasibility and guidance value are separate decisions.

## Decision

Add a second validated rule pack, `rules/guidance.json`, and merge it with `rules/core.json` through `loadCatalog()` in a deterministic fixed order.

The first guidance pack accepts five contextual rules without automatic detectors:

| Rule | Disposition | Profiles | Boundary |
|---|---|---|---|
| `layout.visual-focal-point` | Accept with revised wording | marketing, product-app | Review guidance only. Equal-weight grids remain valid for browsing, comparison, and index tasks. |
| `hierarchy.button-visual-levels` | Accept with revised wording | marketing, product-app | Review guidance only. Equal-weight toolbars and choice sets remain valid. |
| `states.empty-state-guidance` | Accept with revised wording | product-app | Review guidance only. Distinguishes first-use, filtered, disabled, permission, and error states. |
| `states.specific-error-messages` | Accept with revised wording | product-app | Review guidance only. Specificity is bounded by privacy and security requirements. |
| `mobile.safe-area-viewport` | Accept with revised wording | marketing, product-app | Review guidance only. Applies to edge-to-edge and fixed/sticky edge controls, not ordinary flow layouts. |

The accepted wording removes arbitrary visual thresholds and universal requirements that the source material cannot support.

## Parked proposals

The following remain outside production:

### `dashboards.metric-overload`

Park. The proposed seven-metric ceiling is not sufficiently grounded, and decision-criticality cannot be inferred mechanically. The stronger existing `product-app.density-by-task` rule already captures the durable principle without inventing a universal number.

### `spacing.rhythmic-scale`

Revise before acceptance. The proposal assumes a six-to-eight-step scale and a proximity detector without resolving mixed units, responsive scales, component-local scales, or project-defined tokens. Additional public design-system sources and a configuration contract are required.

### `responsive.image-overflow`

Revise before acceptance. Preventing rendered overflow is valuable, but requiring `max-width: 100%` and `height: auto` on every media element is overbroad. A browser-level horizontal-overflow rule should evaluate the rendered result rather than mandate one CSS implementation.

### `marketing.verifiable-social-proof`

Keep draft. It is useful editorial review guidance, but the current wording can conflict with customer permission, anonymity, NDA, and brand-recognition contexts. Stronger provenance and a more careful authenticity contract are required.

## Architecture

`loadCatalog()` reads a fixed list of validated packs:

1. `rules/core.json`
2. `rules/guidance.json`

Each pack is validated independently. The merged catalog is validated again, which preserves duplicate-ID rejection and schema guarantees across pack boundaries.

The public `./rules` export remains the original core pack for compatibility. The new pack is exported separately as `./rule-packs/guidance`. Programmatic consumers that need the effective merged catalog should use the package API rather than assuming one JSON file contains every rule.

## Benchmark interaction

Protocol v1 does not absorb these rules. Its committed guidance snapshot remains exactly 18 rules. Any future benchmark using this guidance pack must create a new catalog freeze and protocol version. This prevents post-hoc expansion from changing an existing experiment.

## Consequences

### Positive

- The live product can improve without invalidating benchmark v1.
- Guidance value is no longer blocked on unreliable detector proposals.
- Subjective guidance remains explicitly non-mechanical.
- Pack boundaries create a controlled path toward the future open rule ecosystem.

### Negative

- The effective production catalog spans more than one JSON file.
- Consumers reading only `rules/core.json` do not see optional guidance-pack additions.
- Guidance-only rules cannot produce lint findings until a separate detector decision is accepted.

## Rejected alternatives

### Add all researched proposals

Rejected. Research status is not production acceptance, and catchy heuristics are not evidence.

### Add detectors for the five accepted rules

Rejected. Their current signals require semantic or visual judgment and would create misleading certainty.

### Modify the benchmark-v1 snapshot

Rejected. Changing a frozen comparison corpus after protocol creation would invalidate reproducibility.
