# B000 Runner Contract Amendment 3

## Status and scope

This amendment applies only to a future nonofficial, claim-ineligible B000 r2 calibration. It does not modify protocol v1, authorize B001-B015, or make any benchmark output claim-eligible.

## Immutable r1 STOP

At repository head `3e4bc44888efcc42a716a74f88e1f9112b856fa7`, all four r1 model executions completed, but required browser capture failed because the runner relied on Playwright's user-specific default browser cache instead of the pinned Chromium installation. The frozen batch then violated its stop-on-first-terminal-failure contract by launching B, D, and C after A's terminal capture failure.

The persisted r1 isolation evidence hashes also cannot be independently reproduced from the stored JSON because creation used insertion-order serialization while persistence used recursively stable key ordering. Required workspace Git diff evidence was absent.

The complete r1 tree is immutable and inadmissible:

- `B000-A-r1`: invalid due to infrastructure capture failure.
- `B000-B-r1`: invalid due to capture failure and launch after the first terminal failure.
- `B000-D-r1`: invalid due to capture failure and launch after the first terminal failure.
- `B000-C-r1`: invalid due to capture failure and launch after the first terminal failure.

Provider usage from r1 may be retained only as nonofficial diagnostic and planning evidence. It cannot admit B001, support condition comparison or winner selection, enter r2 measured totals, or be relabeled as successful B000 calibration.

## Limited infrastructure repair

The repair is limited to evidence and orchestration infrastructure:

- require, verify, hash, and record an explicit Chromium executable beneath `/opt/dcbench/ms-playwright`;
- run a capture-readiness gate with that exact identity before any measured child;
- make every terminal per-run manifest state return nonzero;
- require both a zero child exit and a complete valid manifest before admitting the next condition;
- persist and flush batch terminal decisions;
- hash isolation evidence with the same recursively stable canonical serializer used for independent validation;
- generate binary-safe workspace Git diff evidence before capture;
- preserve a structured capture-failure report without publishing an incomplete artifact-hash claim.

Prompts, guidance, requested model, reasoning effort, service tier, isolation policy, execution order, wall-clock budget, termination grace, action budget, network policy, integration disables, and retry policy are unchanged. No repair decision is adapted from output quality.

## r2 identity and admission

A valid rerun requires the new immutable IDs `B000-A-r2`, `B000-B-r2`, `B000-D-r2`, and `B000-C-r2`, in that order. The r2 initializer must refuse r1 IDs and existing paths, verify the locked r1 evidence tree and unchanged protocol-v1 Git tree, and require a separate future authorization naming the reviewed repair head. This repair work does not initialize any real r2 attempt.

Protocol v1 remains unchanged. B001-B015 remain unauthorized.
