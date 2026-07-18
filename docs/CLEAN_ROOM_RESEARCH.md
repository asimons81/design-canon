# Design Canon Clean-Room Research Contract

## Purpose

This contract defines how candidate anti-slop rules, copy patterns, fixtures, and evidence enter Design Canon. It exists to maximize breadth without turning the catalog into an unverifiable prompt dump.

Design Canon is independently researched. The private `epstein.md` corpus is not a source, dependency, benchmark artifact, or reconstruction target.

## Contribution boundary

Research agents may create:

- candidate rule proposals
- source records
- synthetic fixtures
- component-pattern audits
- benchmark preparation artifacts
- deduplication and overlap reports

Research agents may not directly change:

- stable rule IDs
- accepted rule severity
- core schemas
- profile membership
- detector implementation
- suppression semantics
- public CLI behavior
- benchmark scoring
- release claims
- package publication
- `main`

A proposal is evidence for a maintainer decision. It is not an accepted rule.

## Clean-room requirements

Every proposal and source record must attest that it:

1. uses publicly accessible material or an independently documented observation;
2. does not bypass authentication, subscriptions, paywalls, or technical access controls;
3. does not use leaked, private, or confidential material;
4. is not copied from, reconstructed from, or optimized against private `epstein.md` content;
5. summarizes ideas in original language;
6. records provenance for each research-backed claim;
7. keeps optional evidence excerpts under 25 words;
8. avoids copying complete interfaces, prompts, articles, or proprietary design systems.

Public marketing claims about a private corpus may motivate a benchmark question. They do not establish the contents of that corpus and must not be treated as a rule source.

## Required files

Candidate work uses these locations:

```text
research/candidates/
  sources/
    source.<type>.<slug>.json
  proposals/
    proposal.<category>.<slug>.json
fixtures/candidates/
  <proposal-id>/
    manifest.json
    violation/
    control/
    borderline/
```

Each JSON document must validate against:

- `schema/research-source.schema.json`
- `schema/rule-proposal.schema.json`
- `schema/candidate-fixture.schema.json`

## Proposal quality threshold

A proposal is eligible for maintainer review only when it contains:

- a narrow, falsifiable instruction;
- a rationale longer than the instruction itself;
- at least two clear violations;
- at least two legitimate controls;
- at least one borderline example;
- documented contextual exceptions, unless a universal ban is strongly justified;
- a detector-feasibility classification;
- explicit false-positive scenarios and mitigations;
- at least three fixture plans covering violation, control, and borderline behavior;
- complete clean-room attestations;
- one or more source records for research-backed or hybrid claims.

## Detector proposal rules

Research agents describe detection intent. They do not submit executable regular expressions.

Allowed matcher proposal kinds:

- exact word
- phrase
- token sequence
- CSS property
- DOM structure
- heuristic

Maintainers decide whether a proposed matcher becomes:

- a deterministic source detector;
- a semantic review rule;
- a visual review rule;
- a manual-only policy;
- rejected because reliable detection is not possible.

## Copy-pattern rules

A word is not automatically an anti-pattern.

Copy proposals must distinguish:

- the surface and sentence role;
- the claim being made;
- whether the language is supported by nearby evidence;
- legitimate domain-specific use;
- brand voice;
- quotations and user-provided content;
- product states where a term is literal.

For example, `live` is legitimate for an active broadcast, production status, or real-time data feed. A decorative green `LIVE` badge on static marketing copy is a different pattern.

The catalog should prefer contextual patterns over universal word bans.

## Fixture rules

Candidate fixtures must be:

- synthetic;
- deterministic;
- self-contained;
- free of network access;
- free of external dependencies;
- small enough for fast CI execution;
- paired with legitimate controls;
- explicit about current deterministic findings versus future semantic expectations.

A fixture manifest must never claim a current linter finding for a rule that has no implemented detector.

## Deduplication policy

Before review, compare every proposal against:

- accepted rules;
- open proposals;
- rejected proposals;
- adjacent categories;
- broader rules that already cover the same behavior.

Prefer one strong rule with contextual exceptions over several phrase-level duplicates.

Overlap reports must identify whether proposals are:

- exact duplicates;
- narrower variants;
- broader variants;
- implementation duplicates with different rationale;
- complementary and independently useful.

## Acceptance lifecycle

```text
draft
  -> researched
  -> review-ready
  -> accepted | rejected | parked | merged-with-other
```

Only maintainers may move a proposal beyond `review-ready`.

Accepted proposals receive:

- a stable rule ID;
- final severity;
- profile membership;
- implemented detector classification;
- regression fixtures;
- documentation;
- a protected pull request.

## Research priorities

Prioritize evidence and control cases over raw proposal count.

A smaller set of contextual, testable rules is more valuable than hundreds of universal bans that generate false positives. Character count is an output metric, not a quality goal.
