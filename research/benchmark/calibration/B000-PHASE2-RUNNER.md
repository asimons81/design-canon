# B000 Phase-2 runner

This is a nonofficial, claim-ineligible calibration surface. It cannot initialize or execute B001-B015 and does not modify protocol v1.

The Phase-1 command assumption is corrected transparently by [B000-RUNNER-CONTRACT-AMENDMENT-1.md](./B000-RUNNER-CONTRACT-AMENDMENT-1.md): approval policy is a global Codex option, while execution controls remain `exec` options. No model call was made under the incorrect form.

## Authoritative environment

Run Phase 2 only in the dedicated Ubuntu WSL2 installation bootstrapped by `scripts/bootstrap-b000-wsl.sh`. The script pins Node.js 24.13.0, Codex CLI 0.144.4, Playwright 1.61.1, and its associated Chromium; creates `dcbench-runner` and `dcbench-agent`; clones the branch into the Linux filesystem; and preserves version/help hashes without credentials.

The runner owns the checkout and evidence. The agent has a clean mode-0700 HOME and `CODEX_HOME`, no sudo, and temporary group access only to the current opaque workspace. The execution CLI generates fresh filesystem and Codex-sandbox network probes immediately before every attempt and binds them to the run, workspace inode, identities, binary, command hash, and timestamp.

## Non-paid gates

```bash
node scripts/benchmark-codex-preflight.js --output .benchmark/calibration/b000/preflight --codex /usr/local/bin/codex
node scripts/benchmark-auth-model-preflight.js --output .benchmark/calibration/b000/auth-model-preflight --workspace-root /var/lib/dcbench/workspaces --codex /usr/local/bin/codex
node scripts/benchmark-browser-preflight.js --output .benchmark/calibration/b000/browser-preflight
npm test
node scripts/verify-repository.js
node scripts/verify-fixture-integrity.js
node scripts/validate-research.js
node scripts/validate-research.js --examples
npm audit --omit=dev --audit-level=high
npm pack --dry-run
```

The Codex capability preflight records complete top-level and `exec` help independently and requires exactly 0.144.4. The separately classified authentication/model preflight makes one minimal non-measured request with the frozen runtime, a zero-action budget, no benchmark brief or guidance, and separately recorded usage. The browser preflight records Chromium, viewport and full-page screenshots, attempted HTTP/HTTPS assets, zero accepted external responses, browser lint, the calibration accessibility audit, and artifact hashes. The capability and browser preflights do not make model calls.

## Initialize and execute

Initialize exactly four immutable attempts:

```bash
node scripts/benchmark-calibration-b000-init.js --output .benchmark/calibration/b000
```

After every gate passes and the dedicated agent login is verified, execute the frozen order once:

```bash
DESIGN_CANON_B000_LIVE=1 node scripts/benchmark-batch-b000.js \
  --root .benchmark/calibration/b000 \
  --workspace-root /var/lib/dcbench/workspaces \
  --codex /usr/local/bin/codex \
  --live true
```

The effective form is `codex --ask-for-approval never exec ...`. It requests model alias `gpt-5.6`, medium reasoning, the Standard/default tier, workspace-write, disabled workspace-command network, disabled web search, ephemeral state, ignored user config and execution rules, disabled optional integration features, and JSONL. It never passes an evidence or repository path to the measured child.

The batch stops at the first terminal failure and never retries. Raw stdout/stderr are written losslessly and flushed before normalization. Spawn, timeout, budget, JSONL, source, and capture failures remain terminal evidence; a later attempt requires a newly initialized immutable attempt ID.

## Reports

```bash
node scripts/benchmark-report-b000.js \
  --runs .benchmark/calibration/b000/runs \
  --repository-commit <commit> \
  --codex-version 0.144.4 \
  --preflight .benchmark/calibration/b000/preflight/codex-preflight.json \
  --output .benchmark/calibration/b000/report.md \
  --json-output .benchmark/calibration/b000/report.json
```

Provider usage stays null when absent. Estimates are separately labeled. The report does not select a winner.
