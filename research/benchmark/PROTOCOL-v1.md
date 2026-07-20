# Design Canon Monolith vs. Compiled Protocol v1

## Status

This is the canonical benchmark protocol for the first clean-room monolith-versus-compiled study.

The protocol structure, generic baseline, catalog freeze, benchmark briefs, profiles, conditions, repetition count, and randomization seed are committed before official results are inspected. Official runs remain blocked until the exact model, agent, tokenizer, context window, capture stack, accessibility stack, and execution budgets are pinned in a new protocol-manifest commit.

The older three-condition methodology proposal is historical design material. It is not the execution contract for this study.

## Claim boundary

This study does not use, reconstruct, or claim access to private `epstein.md` content. It tests the public architectural claim that a giant all-purpose anti-slop prompt is preferable to profile-aware compilation from the same clean-room catalog.

A valid public claim may compare:

- full accepted clean-room catalog injection; and
- profile-aware Design Canon compilation from that same catalog commit.

It may not claim that Design Canon beat a private corpus that was not tested.

## Research question

Does profile-aware compilation from the same accepted Design Canon catalog produce equal or better frontend results than injecting the full catalog into every task while using materially less instruction context?

## Frozen inputs

- Protocol manifest: `research/benchmark/protocol-v1/protocol.json`
- Catalog freeze: `research/benchmark/protocol-v1/catalog-freeze.json`
- Generic baseline: `research/benchmark/baselines/generic-guidance-v1.md`
- Strict benchmark profiles: `research/benchmark/protocol-v1/profiles/`
- Benchmark briefs: B001 through B015
- Repetitions: three per condition
- Minimum run count: 180
- Condition-order seed: `design-canon-monolith-vs-compiled-v1`

Changing any frozen input creates a new protocol version. Existing results remain attached to the version under which they were generated.

## Conditions

| ID | Condition | Guidance |
|---|---|---|
| A | Brief only | The benchmark brief with no additional design guidance |
| B | Generic guidance | The committed model-neutral generic guidance baseline |
| C | Full monolith | Every accepted rule in the frozen catalog, rendered in canonical order |
| D | Compiled Design Canon | Only rules selected by the benchmark's frozen strict profile |

Conditions C and D use the same renderer and exact rule wording. Their intended difference is rule selection, profile intent, and resulting context size.

## Admission rules

An official comparison set is admitted only when:

1. The generic baseline hash matches the protocol manifest.
2. C and D are generated from the frozen catalog commit and rule IDs.
3. The exact model and model version are recorded.
4. The exact agent framework and version are recorded.
5. A tokenizer is pinned and counts are stored for all guidance artifacts.
6. All assembled conditions fit the model context window without truncation.
7. Time, action, tool, network, and sampling budgets are identical within each comparison cell.
8. Capture, browser, accessibility, Node.js, and operating-system versions are recorded.
9. Failed, partial, and invalid runs remain in the dataset.
10. No generated guidance artifact is manually edited.

The validation command must reject an official manifest when any admission field is missing.

## Run matrix

The study contains 15 briefs, four conditions, and three independent repetitions:

```text
15 × 4 × 3 = 180 runs
```

Condition order is randomized deterministically within each benchmark repetition. Additional model families create separate strata and are not silently pooled.

## Required run artifacts

Each run directory stores:

- immutable run manifest;
- benchmark brief and hash;
- assembled instructions and hash;
- condition guidance and hash where applicable;
- agent transcript;
- generated source tree;
- desktop and mobile viewport screenshots;
- desktop and mobile full-page screenshots;
- required interaction-state captures;
- Design Canon JSON lint report;
- accessibility report;
- browser and environment metadata;
- token, runtime, action, and completion metadata;
- artifact hash manifest;
- explicit failure or invalidation reason when incomplete.

## Metrics

### Instruction efficiency

- characters and UTF-8 bytes;
- tokenizer-specific instruction tokens;
- percentage of context consumed;
- selected rule count and total accepted rule count;
- task-relevance ratio;
- duplicated instruction count;
- guidance-token cost when pricing data is available.

### Mechanical quality

- Design Canon errors and warnings;
- distinct rules triggered;
- accessibility violations by impact;
- horizontal overflow by viewport;
- runtime console errors;
- missing required components and interaction states;
- prohibited-shortcut failures;
- complete, partial, failed, and invalid run rates.

### Human preference

Blind evaluators compare randomized outputs without condition labels, prompts, source paths, or token metadata. Primary results are pairwise win, loss, and no-preference rates. Objective reports remain separate from subjective voting.

## Analysis

- Preserve and report every run.
- Use paired comparisons inside benchmark, model, agent, and environment cells.
- Report medians, distributions, effect sizes, and uncertainty intervals.
- Correct for multiple comparisons where appropriate.
- Report evaluator agreement.
- Publish raw anonymized results and the analysis script.
- Do not collapse the study into one unsupported magic score.

## Tonight's boundary

This repository can freeze the protocol, generate deterministic artifacts, create the 180-run plan, initialize run directories, validate manifests, create blinded assignments, and generate reports without spending model tokens.

Actual model execution and independent human votes are intentionally deferred until their providers, costs, versions, and recruitment plan are chosen explicitly.
