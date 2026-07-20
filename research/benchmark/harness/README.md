# Benchmark Harness

This directory contains the dependency-free orchestration layer for protocol v1. It prepares and validates benchmark artifacts without adding runtime dependencies to the published Design Canon package.

## Commands

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

### Initialize one immutable run

```bash
node scripts/benchmark-init-run.js \
  --plan .benchmark/run-plan.json \
  --run-id B001-D-r1 \
  --guidance-bundle .benchmark/guidance/marketing \
  --output-root .benchmark/runs
```

The initializer copies the fixed brief and condition guidance, assembles the prompt, creates the artifact directory structure, hashes the inputs, and writes a planned run manifest. It refuses to overwrite an existing run directory.

The agent-execution layer must update the manifest rather than replacing it. Failed, partial, and invalid runs remain in the dataset.

### Capture and finalize one generated run

After an execution adapter has written a runnable static page to `source/index.html`:

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
- finalizes the existing run manifest as complete.

The built-in DOM audit is supplementary calibration evidence. It does not make a WCAG conformance claim and does not replace the official accessibility scanner that must be pinned before admitted runs.

### Create blind assignments

After completed runs exist:

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

## B000 calibration boundary

Before any B001-B015 output is generated, the provider execution layer is calibrated with B000.

- Brief: `research/benchmarks/B000-calibration-shakedown.md`
- Frozen settings: `research/benchmark/calibration/b000-codex-sol-standard-v1.json`
- Runner contract: `research/benchmark/calibration/B000-RUNNER-CONTRACT.md`

B000 executes A, B, D, and C once in the frozen order. It is nonofficial, claim-ineligible, excluded from the protocol-v1 plan, and may be inspected freely to tune the runner and propose official budgets. Its artifacts must never be pooled with the 180 protocol-v1 runs.

## Provider boundary

The core harness deliberately contains no provider credentials. Provider adapters consume initialized runs, operate within pinned limits, store raw transcripts and source trees, preserve failures, and then call the capture command.

The B000 contract selects Codex CLI with GPT-5.6 Sol at medium reasoning only for calibration. Protocol-v1 remains execution-pending until a separate admission commit freezes the official runtime after B000 is audited.

## Human boundary

The repository can blind, assign, validate, and analyze evaluations. Independent preference votes must come from actual evaluators who did not conduct the runs they review.
