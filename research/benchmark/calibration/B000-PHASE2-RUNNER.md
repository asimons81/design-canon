# B000 Phase-2 runner

This is a nonofficial calibration surface. It cannot initialize or execute B001-B015 and does not modify protocol-v1 admission.

## Commands

Initialize the four immutable run directories and regenerate guidance from the frozen protocol-v1 catalog:

```bash
node scripts/benchmark-calibration-b000-init.js --output .benchmark/calibration/b000
```

Record the installed CLI version, complete `codex exec --help`, its SHA-256 hash, and the required-option check:

```bash
node scripts/benchmark-codex-preflight.js --output .benchmark/calibration/b000/preflight
```

The preflight exits nonzero when Codex is older than 0.144.0 or a frozen option is unavailable. It does not make a model call.

One run can be executed only with both opt-ins and independently produced network evidence:

```bash
DESIGN_CANON_B000_LIVE=1 node scripts/benchmark-execute-b000.js \
  --run .benchmark/calibration/b000/runs/B000-A-r1 \
  --workspace-root <isolated-opaque-root> \
  --network-evidence <verified-network-evidence.json> \
  --live true
```

The network evidence must separately establish Codex service transport, blocked workspace-command egress, and blocked browser/page egress, and name the independent enforcement methods. A prompt statement is not evidence.

The ordered batch command independently regenerates the frozen A, B, D, C order and launches each run once:

```bash
DESIGN_CANON_B000_LIVE=1 node scripts/benchmark-batch-b000.js \
  --root .benchmark/calibration/b000 \
  --workspace-root <isolated-opaque-root> \
  --network-evidence <verified-network-evidence.json> \
  --live true
```

Generate JSON and Markdown calibration reports:

```bash
node scripts/benchmark-report-b000.js \
  --runs .benchmark/calibration/b000/runs \
  --repository-commit <commit> \
  --codex-version <version> \
  --preflight .benchmark/calibration/b000/preflight/codex-preflight.json \
  --output .benchmark/calibration/b000/report.md \
  --json-output .benchmark/calibration/b000/report.json
```

## Evidence boundary

Raw stdout is stored unchanged as `transcript/raw.jsonl`; stderr and the final assistant message are separate. Normalized events, action accounting, usage, effective arguments, source, Git diff, captures, lint, accessibility calibration, render metadata, and hashes remain under ignored `.benchmark/` output. Provider usage stays null when absent. The aggregate report labels estimates separately and never selects a subjective winner.

No automatic retry exists. Existing run directories are rejected. Timeout and action-budget termination preserve partial evidence and terminate the child process tree.
