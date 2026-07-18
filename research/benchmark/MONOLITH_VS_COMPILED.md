# Clean-Room Monolith vs. Compiled Benchmark

## Research question

Does profile-aware compilation from a structured anti-slop catalog produce equal or better frontend results than injecting the entire independently researched catalog into every task?

This benchmark does not use, reconstruct, or claim access to private `epstein.md` content. It evaluates the public architectural claim behind giant anti-slop instruction files.

## Conditions

| Condition | Guidance |
|---|---|
| A | Benchmark brief only |
| B | Versioned generic frontend best-practices prompt |
| C | Full monolithic export of the accepted clean-room anti-slop catalog |
| D | Design Canon compilation from the same catalog, selected by profile and task metadata |

Conditions C and D must be generated from the same catalog commit. Neither artifact may be manually edited after generation.

## Fairness controls

Within one comparison set, all four conditions use the same:

- benchmark brief;
- model and exact model version;
- agent framework and version;
- system prompt;
- tool access;
- time and iteration budget;
- sampling configuration or deterministic seed when supported;
- supplied assets and content;
- viewport requirements;
- execution environment;
- source commit;
- screenshot and accessibility tooling.

The only intended variable is the design-guidance condition.

## Admission rules

1. Condition B is a committed, versioned artifact with a SHA-256 hash.
2. Condition C is generated deterministically from every accepted anti-slop rule in canonical order.
3. Condition D is generated deterministically from the same rule wording using documented profile and task selectors.
4. C and D record catalog commit, selected rule IDs, character count, byte count, and tokenizer-specific token count.
5. A model comparison set is admitted only when all four guidance artifacts fit in the model context window without silent truncation.
6. Context-overflow behavior is measured separately as a stress test, not hidden inside the primary benchmark.
7. Failed or incomplete agent runs remain in the dataset with a documented status.

## Minimum run count

For 15 briefs, 4 conditions, and 3 repetitions:

```text
15 x 4 x 3 = 180 runs minimum
```

Additional model families form separate comparison sets. Results must not be pooled across model versions without preserving the underlying strata.

## Required artifacts

Every run stores:

- full assembled prompt;
- guidance artifact and hash;
- catalog commit;
- selected rule IDs;
- generated source tree;
- desktop viewport screenshot;
- mobile viewport screenshot;
- full-page screenshots;
- interaction-state captures required by the brief;
- Design Canon lint report;
- accessibility report;
- environment metadata;
- token and runtime metadata when available;
- completion status and failure reason.

## Primary metrics

### Instruction efficiency

- characters and UTF-8 bytes;
- tokenizer-specific instruction tokens;
- percentage of model context consumed;
- selected rule count;
- total catalog rule count;
- task-relevance ratio;
- duplicated instruction count;
- cost attributable to guidance tokens when provider pricing is available.

### Output quality

- deterministic Design Canon findings;
- accessibility violations by impact;
- horizontal overflow;
- required-state completion;
- functional requirement completion;
- blind preference votes;
- evaluator confidence;
- repeated-run variance.

### Catalog behavior

- rules selected by D but absent from the task requirements;
- relevant rules omitted by D;
- monolith rules demonstrably irrelevant to the task;
- false-positive and false-negative review notes;
- instruction adherence per rule where measurable.

## Blind review

Reviewers receive randomized run labels and do not see condition names, prompts, token counts, or source filenames before voting.

Review questions cover:

- clarity at first glance;
- hierarchy and scanability;
- typography appropriateness;
- color discipline;
- interaction feedback;
- task suitability;
- perceived template or AI-default quality;
- overall preference.

Objective reports are analyzed separately from blind preference to avoid anchoring reviewers.

## Claims policy

The benchmark may support claims such as:

- compiled guidance used fewer instruction tokens;
- one condition produced fewer detectable violations;
- one condition received more blind preferences;
- results were consistent or inconsistent across profiles and models.

It may not support claims that Design Canon beat a private corpus that was not tested.

Public reporting must state:

- that the corpus was independently researched;
- the exact catalog version and commit;
- the number of runs and evaluators;
- excluded and failed runs;
- model and agent versions;
- confidence intervals or uncertainty summaries;
- known benchmark limitations.
