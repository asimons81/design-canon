# Benchmark Harness

This directory contains the dependency-free orchestration layer for protocol v1. It prepares and validates benchmark artifacts without adding runtime dependencies to the published Design Canon package.

## Status

- The nonofficial B000 r2 calibration completed with a `GO` recommendation for the runner and evidence pipeline.
- B000 is claim-ineligible and did not select a winner.
- B001-B015 remain unexecuted and unauthorized.
- Protocol v1 remains execution-pending until a separate admission change freezes the official runtime and budgets.
- Live provider calls require an exact attempt count, reviewed spend estimate, and explicit authorization.

The consumed attempt IDs `B000-A-r2`, `B000-B-r2`, `B000-D-r2`, and `B000-C-r2` must never be initialized or executed again.

## Provider-free commands

### Prepare guidance

```bash
node scripts/benchmark-prepare.js \
  --profile marketing \
  --output .benchmark/guidance/marketing
```

This writes:

- the pinned generic baseline;
- the full frozen monolith;
- the frozen profile-compiled Design Canon artifact;
- a manifest containing rule IDs, hashes, character counts, byte counts, and optional tokenizer counts.

An official token-count input has this shape:

```json
{
  "tokenizer": "provider/model-tokenizer-version",
  "counts": {
    "B": 1000,
    "C": 2000,
    "D": 1200
  }
}
```

### Validate guidance

```bash
node scripts/benchmark-validate.js \
  --bundle .benchmark/guidance/marketing \
  --official false
```

Nonofficial validation checks frozen hashes, rule membership, catalog commit, and compiled-size reduction. Official validation intentionally fails until model, agent, tokenizer, context-window, capture, accessibility, and execution-budget fields are pinned.

### Generate the run plan

```bash
node scripts/benchmark-plan.js \
  --output .benchmark/run-plan.json
```

The plan contains 180 runs: 15 briefs × 4 conditions × 3 repetitions. Condition order is deterministically randomized inside each benchmark repetition.

Generating a plan does not authorize its execution.

### Initialize one immutable run

```bash
node scripts/benchmark-init-run.js \
  --plan .benchmark/run-plan.json \
  --run-id B001-D-r1 \
  --guidance-bundle .benchmark/guidance/marketing \
  --output-root .benchmark/runs
```

The initializer copies the fixed brief and condition guidance, assembles the prompt, creates the artifact directory structure, hashes the inputs, and writes a planned run manifest. It refuses to overwrite an existing run directory.

The agent-execution layer must update the manifest rather than replacing it. Failed, partial, and invalid runs remain in the dataset. Do not initialize an official run until its execution is separately authorized.

### Capture and finalize one generated run

After an authorized execution adapter has written a runnable static page to `source/index.html`:

```bash
node scripts/benchmark-capture.js \
  --run .benchmark/runs/B001-D-r1
```

A different entry file may be supplied with `--entry`, but it must remain under the run's `source/` directory.

The capture command:

- launches explicitly installed Playwright Chromium;
- blocks external network requests;
- captures desktop 1440×900 and mobile 390×844 screenshots at DPR 1;
- writes viewport and full-page screenshots;
- records horizontal overflow, console warnings, and page errors;
- runs a deterministic DOM accessibility calibration audit;
- runs Design Canon in browser mode against the generated source;
- writes render metadata, lint and accessibility reports, and artifact hashes;
- finalizes the existing run manifest according to execution state.

The built-in DOM audit is supplementary calibration evidence. It does not make a WCAG conformance claim and does not replace the official accessibility scanner that must be pinned before admitted runs.

Capture cannot convert a failed execution into a complete run.

### Create blind assignments

After completed, admitted runs exist:

```bash
node scripts/benchmark-blind-plan.js \
  --runs .benchmark/runs \
  --output .benchmark/evaluation/blind-public.json \
  --key-output .benchmark/evaluation/blind-key.json
```

Keep the key private from evaluators. The public assignment file contains opaque candidate IDs, randomized left/right placement, and standardized questions.

### Analyze votes

```bash
node scripts/benchmark-analyze-votes.js \
  --assignments .benchmark/evaluation/blind-public.json \
  --key .benchmark/evaluation/blind-key.json \
  --responses .benchmark/evaluation/responses.json \
  --output .benchmark/evaluation/results.json
```

### Generate the objective report

```bash
node scripts/benchmark-report.js \
  --runs .benchmark/runs \
  --output .benchmark/report.md \
  --json-output .benchmark/report.json
```

Missing artifacts remain missing. The report does not impute results or convert incomplete calibration data into a superiority claim.

## B000 calibration record

Authoritative sources:

- Brief: `research/benchmark/calibration/B000-calibration-shakedown.md`
- Frozen r2 settings: `research/benchmark/calibration/b000-codex-sol-standard-v1-r2.json`
- Original contract: `research/benchmark/calibration/B000-RUNNER-CONTRACT.md`
- Completed record: `research/benchmark/calibration/B000-PHASE2-RUNNER.md`
- Amendments: `research/benchmark/calibration/B000-RUNNER-CONTRACT-AMENDMENT-1.md` through `B000-RUNNER-CONTRACT-AMENDMENT-3.md`

B000 executed A, B, D, and C once in the frozen r2 order with zero retries. It is nonofficial, claim-ineligible, excluded from the protocol-v1 plan, and useful only for validating the runner and proposing official budgets. Its artifacts must never be pooled with the 180 protocol-v1 runs.

The failed r1 tree remains immutable diagnostic evidence and is excluded from valid r2 totals.

## Provider boundary

The core harness deliberately contains no provider credentials. Provider adapters consume initialized runs, operate within pinned limits, store raw transcripts and source trees, preserve failures, and then call the capture command.

The B000 contract selected Codex CLI with GPT-5.6 Sol at medium reasoning only for calibration. Protocol v1 remains execution-pending until a separate admission change freezes the official runtime after reviewing B000 recommendations.

Normal repository tests, guidance preparation, validation, planning, and fake-adapter tests must remain provider-free.

## Human boundary

The repository can blind, assign, validate, and analyze evaluations. Independent preference votes must come from actual evaluators who did not conduct the runs they review.
