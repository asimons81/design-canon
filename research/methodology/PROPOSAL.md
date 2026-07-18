> **Maintainer-reviewed proposal.** This defines a reproducible benchmark protocol, not a finalized scoring policy or a claim that Design Canon currently wins.

# Benchmark Methodology Proposal

## 1. Research question

> Does compiled, context-specific Design Canon policy improve frontend output relative to no design guidance and a fixed generic guidance baseline, and what are the tradeoffs in quality, accessibility, context usage, runtime, and implementation complexity?

The protocol compares three conditions:

| Condition | Label | Instruction set |
|---|---|---|
| A | No design guidance | Benchmark brief only |
| B | Generic guidance | Benchmark brief plus one pinned, model-neutral generic design-guidance artifact |
| C | Design Canon | Benchmark brief plus policy compiled from a fixed Design Canon commit and the benchmark's declared profile |

Condition B must **not** be defined by an arbitrary length such as “4,000–8,000 tokens.” The baseline must be a committed file with a version, license/provenance record, byte count, and SHA-256 hash. Changing it creates a new benchmark protocol version.

## 2. Benchmark suite

The suite contains 15 fixed briefs:

| Profile | Benchmarks |
|---|---|
| `marketing` | B001, B007, B008, B009 |
| `product-app` | B002, B005, B006, B010, B012, B013, B014, B015 |
| `editorial` | B003, B004, B011 |

Each brief defines supplied content, required behavior, interaction states, target viewports, accessibility expectations, prohibited shortcuts, deliverables, and known ambiguity risks.

B015 uses `product-app` as its executable profile. Marketing considerations may be discussed during qualitative review but must not silently add a second compiler profile.

## 3. Protocol versioning and preregistration

Before official runs begin, commit a protocol manifest containing:

- methodology version,
- benchmark brief hashes,
- generic guidance baseline hash,
- Design Canon commit,
- model and agent versions,
- run count per condition,
- capture and accessibility tooling versions,
- exclusion rules,
- planned metrics,
- planned statistical tests,
- evaluator instructions,
- scoring policy status.

The protocol manifest must be committed before results are inspected. Any post-hoc change creates a new protocol version and must be reported separately.

## 4. Run unit and repetition

A **comparison cell** is one benchmark, model version, agent framework, and environment combination.

Within each cell:

- run all three conditions,
- use the same functional brief,
- use the same model and agent version,
- use the same time and tool budget,
- execute at least three independent repetitions per condition,
- randomize condition execution order,
- preserve every run, including failures.

A minimal single-model study therefore contains:

```text
15 benchmarks × 3 conditions × 3 repetitions = 135 runs
```

One run per condition is suitable only for pipeline calibration, not for superiority claims.

## 5. Environment controls

Record and hold constant within a comparison cell:

- model identifier and immutable version when available,
- agent framework and version,
- system/developer instructions outside the benchmark condition,
- sampling controls supported by the provider,
- operating system and architecture,
- browser engine and version,
- Node.js version,
- available tools and permissions,
- wall-clock budget,
- iteration or action limit,
- network policy,
- starting repository state.

When a provider does not expose a setting such as temperature, seed, time-to-first-output, or detailed usage, record `null` and an explanatory availability field. Do not fabricate equivalent values.

## 6. Tooling boundary

Design Canon's runtime remains dependency-free. Benchmark capture is separate research tooling.

The benchmark harness may use pinned development or container dependencies such as a browser automation library and an accessibility engine. Those dependencies must:

- live outside the published runtime package,
- be lockfile-pinned,
- record exact versions,
- run from a reproducible script or container,
- emit structured artifacts,
- never become required for `design-canon compile` or `design-canon lint`.

The final capture stack will be selected in a separate implementation decision.

## 7. Per-run procedure

1. Verify a clean starting worktree or create a fresh isolated workspace.
2. Load the benchmark brief and condition-specific guidance.
3. Record the assembled instruction bytes and SHA-256 hash.
4. Start runtime measurement immediately before agent execution.
5. Allow the agent the fixed tool, time, and iteration budget.
6. Save the complete source tree and agent transcript.
7. Record completion status: `complete`, `partial`, `failed`, or `invalid`.
8. Install or start the generated project using the benchmark's standardized harness.
9. Capture each declared viewport:
   - a viewport crop at the exact width and height,
   - a full-page screenshot,
   - required interaction-state screenshots.
10. Run Design Canon lint using the benchmark's profile.
11. Run the pinned accessibility scanner against rendered states.
12. Record provider-reported usage when available.
13. Hash every material artifact.
14. Store the run in an immutable directory.

## 8. Artifact layout

```text
research/runs/<protocol-version>/<run-id>/
├── manifest.json
├── brief.md
├── assembled-instructions.md
├── instructions/
│   ├── generic-guidance.md        # condition B only
│   └── compiled-policy.md         # condition C only
├── transcript/
├── source/
├── screenshots/
│   ├── desktop-viewport.png
│   ├── desktop-full-page.png
│   ├── mobile-viewport.png
│   ├── mobile-full-page.png
│   └── <state>-<viewport>.png
├── lint-report.json
├── accessibility-report.json
├── render-metadata.json
└── artifact-hashes.json
```

## 9. Run manifest

Required fields unless marked optional:

| Field | Type | Purpose |
|---|---|---|
| `protocol_version` | string | Identifies the preregistered procedure |
| `benchmark_id` | string | B001–B015 |
| `run_id` | string | Globally unique identifier |
| `condition` | enum | `none`, `generic`, `design-canon` |
| `repetition` | integer | Repetition number within the cell |
| `execution_order` | integer | Randomized position within the cell |
| `started_at` | ISO 8601 | UTC start time |
| `completed_at` | ISO 8601 | UTC end time |
| `status` | enum | `complete`, `partial`, `failed`, `invalid` |
| `model` | string | Provider model identifier |
| `model_version` | string or null | Immutable checkpoint when available |
| `agent_framework` | string | Framework and version |
| `sampling` | object | Provider-supported controls, with unavailable fields set to null |
| `design_canon_commit` | string or null | Required for condition C |
| `profile` | string or null | Required for condition C |
| `brief_hash` | string | SHA-256 |
| `guidance_hash` | string or null | Generic or compiled guidance SHA-256 |
| `assembled_instruction_hash` | string | SHA-256 |
| `instruction_bytes` | integer | Provider-independent context-size measure |
| `usage` | object or null | Provider-reported input/output usage |
| `estimated_cost` | object or null | Derived only when pricing and usage are known |
| `runtime_ms` | integer | End-to-end agent runtime |
| `environment` | object | OS, architecture, Node, browser, tool versions |
| `limits` | object | Time, iterations, tools, and network policy |
| `viewport_results` | array | Dimensions, overflow, screenshot paths |
| `lint_report_path` | string | Structured lint output |
| `accessibility_report_path` | string | Structured scanner output |
| `artifact_hashes_path` | string | Hash manifest |
| `invalid_reason` | string or null | Required for invalid runs |

Human evaluation data belongs in a separate blinded-evaluation dataset. It must not be written back into the immutable generation manifest.

## 10. Objective measurements

### Instruction and runtime efficiency

- instruction bytes,
- provider-reported input and output usage when available,
- wall-clock runtime,
- iteration/action count,
- failed or partial run rate,
- estimated cost only when calculation inputs are known and versioned.

### Mechanical quality

- Design Canon errors, warnings, and suppressed findings,
- distinct rules triggered,
- accessibility violations by severity,
- horizontal overflow at each viewport,
- missing required components or states,
- invalid HTML or runtime console errors,
- prohibited-shortcut violations.

### Source characteristics

- source file count and bytes,
- external dependency count,
- generated build success,
- repeated literal-value indicators where deterministically measurable.

Objective metrics do not become a single score until the weighting policy is approved.

## 11. Blind human evaluation

### Presentation

- Evaluators see outputs under randomized neutral labels.
- Condition, model metadata, source paths, and generation logs remain hidden.
- Desktop and mobile outputs are shown together for each candidate.
- Pairwise comparison is preferred over showing all three at once because it reduces ranking complexity and position bias.
- Pair order and left/right position are randomized.

### Questions

Evaluators answer focused questions such as:

- Which output communicates purpose more clearly?
- Which has stronger hierarchy and scanability?
- Which typography better fits the content?
- Which uses color more intentionally?
- Which appears more usable for the stated task?
- Which feels less template-derived?
- No preference.

Absolute 1–5 ratings may be collected as secondary data, but pairwise preference is the primary subjective outcome.

### Evaluators

- Use at least five independent evaluators per comparison for an official pilot.
- Include design, engineering, accessibility, and target-user perspectives when possible.
- Evaluators must not have conducted the runs they score.
- Store anonymous evaluator IDs. Do not collect unnecessary personal data.

## 12. Exclusions and invalid runs

A run is marked `invalid`, not silently discarded, when it:

- fails to render,
- violates the fixed time or action limit,
- uses a prohibited framework or external asset,
- omits required functionality,
- receives the wrong condition instructions,
- starts from a dirty or inconsistent workspace,
- cannot produce required artifacts.

Invalid-run rates are reported by condition. A replacement run may be added only under the preregistered replacement policy.

## 13. Analysis plan

For each objective metric:

- report every run,
- summarize median and distribution by condition,
- use paired comparisons within benchmark/model/framework cells,
- report effect sizes and confidence intervals,
- use bootstrap or an appropriate paired non-parametric test,
- correct for multiple comparisons when many metrics are tested.

For blind preferences:

- report pairwise win, loss, and no-preference rates,
- estimate confidence intervals,
- report inter-rater agreement using an appropriate multi-rater statistic,
- segment by benchmark profile only when sample sizes remain adequate.

Do not rely on a single aggregate score or p-value. Publish raw anonymized results and the analysis script.

## 14. Threats to validity

| Threat | Mitigation |
|---|---|
| Model nondeterminism | Multiple repetitions and randomized order |
| Baseline prompt cherry-picking | Pinned baseline artifact and preregistration |
| Unequal execution budgets | Identical limits within each comparison cell |
| Evaluator position bias | Randomized labels and presentation order |
| Self-grading bias | Blind evaluators who did not conduct runs |
| Linter favoring its own policy | Report lint separately from accessibility and blind preference |
| Tooling drift | Lockfiles, version recording, and protocol versions |
| Provider usage gaps | Nullable fields and provider-independent byte counts |
| Screenshot cherry-picking | Automated viewport and full-page capture |
| Failed-run suppression | Preserve and report all failures and invalid runs |

## 15. Decisions still required

1. Exact generic guidance baseline and provenance.
2. Capture and accessibility toolchain.
3. Time, action, and iteration budgets.
4. Pairwise evaluation assignment design.
5. Official evaluator minimum and recruitment method.
6. Prohibited-shortcut invalidation policy.
7. Whether source maintainability receives separate expert review.
8. Final metric weighting, if any.

## 16. Pilot sequence

1. Commit the generic baseline and protocol manifest.
2. Build the isolated local harness.
3. Run B001 with one model and one framework using three repetitions per condition.
4. Validate artifacts, blinding, and failure handling.
5. Run a small evaluator pilot.
6. Revise the protocol under a new version if needed.
7. Freeze the official protocol before expanding to the complete suite.

No public superiority claim should be made until the complete protocol, raw artifacts, and analysis are available for reproduction.
