# Hermes Clean-Room Research Work Order

## Preconditions

Read and obey:

- `docs/CLEAN_ROOM_RESEARCH.md`
- `schema/research-source.schema.json`
- `schema/rule-proposal.schema.json`
- `schema/candidate-fixture.schema.json`
- `research/benchmark/MONOLITH_VS_COMPILED.md`

Do not begin bulk generation until all output validates against the contract.

## Track A: Public anti-pattern research

Produce source-backed candidate proposals across color, typography, spacing, layout, hierarchy, radii, borders, shadows, motion, responsive behavior, navigation, forms, tables, dashboards, marketing, editorial, mobile, states, badges, data integrity, and accessibility.

Initial batch limit: 40 proposals.

The first batch is a calibration batch. Do not generate hundreds of proposals until maintainers review its quality and duplication rate.

## Track B: Contextual AI-copy research

Produce contextual copy proposals rather than a universal banned-word list.

Initial batch limit: 60 proposals.

Each proposal must contain legitimate controls, exceptions, replacement strategy, and false-positive mitigation. A single word without sentence role or surface context is insufficient.

## Track C: Component audits

Audit recurring patterns in heroes, pricing, feature grids, dashboards, sidebars, authentication, settings, forms, tables, testimonials, footers, navigation, empty states, loading states, and errors.

Record independent pattern summaries. Do not copy interfaces or proprietary prompt text.

Initial batch limit: 25 component audit records and no more than 30 resulting proposals.

## Track D: Candidate fixtures

For every review-ready proposal, create at least:

- one clear violation;
- one legitimate control;
- one borderline case.

Fixtures must be synthetic, self-contained, deterministic, network-free, and dependency-free. Do not claim current deterministic findings for unimplemented detectors.

## Track E: Source registry and overlap report

Every research-backed claim requires a source record. Every batch must include an overlap report against accepted rules and all proposals in the batch.

Classify overlap as:

- exact duplicate;
- narrower variant;
- broader variant;
- implementation duplicate;
- complementary;
- unrelated.

## Hard boundaries

Do not:

- seek leaked or private `epstein.md` content;
- reconstruct that corpus from fragments or screenshots;
- bypass authentication, subscriptions, paywalls, or access controls;
- submit executable regular expressions;
- assign final stable rule IDs or severities;
- modify core schemas, CLI behavior, profiles, suppressions, package exports, release automation, or `main`;
- publish superiority claims;
- optimize for character count.

## Git workflow

Use separate draft branches:

- `research/anti-slop-calibration`
- `research/copy-calibration`
- `research/component-audits`
- `fixtures/candidate-controls`

Open draft pull requests only. Do not merge.

## Required batch summary

For each draft PR, report:

- number of sources;
- number of proposals;
- number of violation, control, and borderline fixtures;
- category distribution;
- detector-feasibility distribution;
- false-positive-risk distribution;
- duplicate and overlap counts;
- proposals missing primary sources;
- unresolved questions;
- exact branch and draft PR link.
