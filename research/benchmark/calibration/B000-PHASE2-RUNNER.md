# B000 Phase-2 runner and r2 calibration record

## Status

B000 r2 completed successfully at measured execution head `9dcb12d831d0583f6f5e6ce974525be0b22c95e9` with a final recommendation of **GO**.

This remains a nonofficial, claim-ineligible calibration surface. It validates the runner and evidence pipeline only. It does not establish that one guidance condition is superior, authorize a public benchmark claim, modify protocol v1, or authorize B001-B015.

The immutable attempt IDs `B000-A-r2`, `B000-B-r2`, `B000-D-r2`, and `B000-C-r2` have been consumed. Do not initialize or execute them again. Any new measured work requires a new contract amendment, new immutable attempt IDs, explicit provider-spend authorization, and a separately reviewed budget.

## Final r2 results

| Run | Condition | Status | Runtime | Actions | Input | Cached input | Output |
|---|---|---:|---:|---:|---:|---:|---:|
| `B000-A-r2` | brief only | complete | 259.9s | 5 | 93,239 | 67,328 | 13,743 |
| `B000-B-r2` | generic guidance | complete | 266.7s | 6 | 120,853 | 92,672 | 13,986 |
| `B000-D-r2` | compiled marketing guidance | complete | 265.5s | 6 | 130,338 | 84,480 | 13,612 |
| `B000-C-r2` | full monolith | complete | 252.4s | 6 | 134,745 | 108,800 | 12,829 |

Measured r2 usage was 479,175 input tokens and 54,170 output tokens. Provider cost and reasoning-token counts were not exposed. r1 usage remains separate, nonofficial diagnostic evidence and is excluded from r2 totals.

All four r2 attempts completed with:

- zero retries;
- attempt-bound filesystem and command-network isolation;
- zero accepted external browser responses;
- exact three-file source output;
- binary-safe Git diff evidence;
- desktop and mobile viewport and full-page captures;
- browser-assisted lint and accessibility reports;
- independently verifiable isolation and artifact hashes.

The complete `.benchmark` evidence remains local, ignored, and outside the published package. Authentication material is never part of benchmark evidence.

## Contract history

The runner contract evolved through three transparent amendments:

1. [Amendment 1](./B000-RUNNER-CONTRACT-AMENDMENT-1.md) corrected Codex global-versus-`exec` option ordering.
2. [Amendment 2](./B000-RUNNER-CONTRACT-AMENDMENT-2.md) replaced the rejected `gpt-5.6` alias with `gpt-5.6-sol` and required provider-free proof of zero model-visible skill content.
3. [Amendment 3](./B000-RUNNER-CONTRACT-AMENDMENT-3.md) preserved the failed r1 series and limited r2 repairs to capture identity, canonical hashing, Git diff evidence, and stop-on-first-failure orchestration.

The frozen committed r2 JSON is the pre-execution contract, not the result artifact. The result is bound to the measured execution head and the local immutable evidence tree.

## Authoritative measured environment

- Ubuntu WSL2 with dedicated `dcbench-runner` and `dcbench-agent` users
- Node.js `24.13.0`
- npm `11.6.2`
- Codex CLI `0.144.4`
- requested model `gpt-5.6-sol`
- reasoning `medium`
- service tier `default`
- Playwright `1.61.1`
- Chromium `149.0.7827.55`
- Chromium SHA-256 `670ba079b75107746ba41abad131180a31a7c7219aa1bd4061fb471f4535d541`

The measured child used an isolated mode-0700 HOME and `CODEX_HOME`, disabled skill instructions and optional integrations, no MCP servers, no plugins, workspace-write sandboxing, disabled workspace-command network access, ephemeral state, and a sanitized environment.

## Safe verification

These checks do not contact a model provider:

```bash
npm test
node scripts/verify-repository.js
node scripts/verify-fixture-integrity.js
node scripts/validate-research.js
node scripts/validate-research.js --examples
npm audit --omit=dev --audit-level=high
npm pack --dry-run
```

The explicit-browser preflight is also provider-free when run with the pinned executable:

```bash
node scripts/benchmark-browser-preflight.js \
  --output .benchmark/calibration/b000-r2/browser-preflight-audit \
  --browser-executable /opt/dcbench/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell
```

Do not repeat `scripts/benchmark-auth-model-preflight.js`. Its one successful canonical request is historical admission evidence, not a routine verification step.

## Research-only bootstrap warning

`scripts/bootstrap-b000-wsl.sh` is privileged research infrastructure, not a normal product installer. It updates Ubuntu packages, installs pinned tools beneath `/opt/dcbench`, creates dedicated users and directories, and installs a narrowly purposed runner-to-agent sudo rule.

Run it only inside a dedicated Ubuntu WSL2 environment after inspecting the script. Do not run it on a shared Linux host or a production server. It now verifies the measured handoff head, parses multi-word Chromium version output safely, and fails closed unless the exact Chromium SHA-256 matches.

Normal Design Canon users do not need this bootstrap, Codex authentication, or any benchmark command. The public CLI quick start remains dependency-light and local-first.

## Operator and agent boundaries

- Default to `STOP` when an identity, hash, manifest, isolation, or capture check does not match.
- Never copy or inspect authentication-file contents; authenticate interactively in the isolated agent account.
- Never commit `.benchmark`, transcripts, screenshots, generated run source, credentials, or machine-local evidence.
- Never rerun immutable attempt IDs.
- Never launch B001-B015 without explicit user authorization, an exact call count, and a reviewed spend estimate.
- Do not infer a subjective winner from B000. It was calibration, not comparative evaluation.

## Recommended future budgets

The r2 calibration supports a provisional B001 ceiling of 420 seconds and 8 tool actions per run. A 12-run B001 plan was estimated at roughly 1.44 million input tokens and 163,000 output tokens.

Those numbers are planning estimates, not authorization. B001 and all later benchmarks remain optional and unexecuted.
