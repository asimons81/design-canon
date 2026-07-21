# B000 Phase-2 runner

This is a nonofficial, claim-ineligible calibration surface. It cannot initialize or execute B001-B015 and does not modify protocol v1.

The Phase-1 command assumption is corrected transparently by [B000-RUNNER-CONTRACT-AMENDMENT-1.md](./B000-RUNNER-CONTRACT-AMENDMENT-1.md): approval policy is a global Codex option, while execution controls remain `exec` options. [B000-RUNNER-CONTRACT-AMENDMENT-2.md](./B000-RUNNER-CONTRACT-AMENDMENT-2.md) replaces the rejected `gpt-5.6` alias with the accepted canonical `gpt-5.6-sol` identifier and requires provider-free proof that runtime-created skill caches remain absent from model-visible instructions and capabilities. [B000-RUNNER-CONTRACT-AMENDMENT-3.md](./B000-RUNNER-CONTRACT-AMENDMENT-3.md) preserves the failed r1 series and limits r2 changes to capture, hashing, diff, and stop-on-first-failure infrastructure.

## Authoritative environment

Run Phase 2 only in the dedicated Ubuntu WSL2 installation bootstrapped by `scripts/bootstrap-b000-wsl.sh`. The script pins Node.js 24.13.0, Codex CLI 0.144.4, Playwright 1.61.1, and its associated Chromium; creates `dcbench-runner` and `dcbench-agent`; clones the branch into the Linux filesystem; and preserves version/help hashes without credentials.

The runner owns the checkout and evidence. The agent has a clean mode-0700 HOME and `CODEX_HOME`, no sudo, and temporary group access only to the current opaque workspace. The execution CLI generates fresh filesystem and Codex-sandbox network probes immediately before every attempt and binds them to the run, workspace inode, identities, binary, command hash, and timestamp.

## Non-paid gates

```bash
node scripts/benchmark-codex-preflight.js --output .benchmark/calibration/b000/preflight --codex /usr/local/bin/codex
node scripts/benchmark-auth-model-preflight.js --output .benchmark/calibration/b000/auth-model-preflight --workspace-root /var/lib/dcbench/workspaces --codex /usr/local/bin/codex
node scripts/benchmark-browser-preflight.js \
  --output .benchmark/calibration/b000-r2/browser-preflight \
  --browser-executable /opt/dcbench/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell
npm test
node scripts/verify-repository.js
node scripts/verify-fixture-integrity.js
node scripts/validate-research.js
node scripts/validate-research.js --examples
npm audit --omit=dev --audit-level=high
npm pack --dry-run
```

The Codex capability preflight records complete top-level and `exec` help independently and requires exactly 0.144.4. The successful canonical authentication/model preflight is historical admission evidence and must not be repeated. The browser preflight requires an explicit executable, resolves its real path, requires a regular readable executable beneath `/opt/dcbench/ms-playwright`, hashes it, launches it with Playwright's `executablePath`, and records Playwright and Chromium versions. It also records viewport and full-page screenshots, attempted HTTP/HTTPS assets, zero accepted external responses, browser lint, the calibration accessibility audit, artifact hashes, and a self-hash. `PLAYWRIGHT_BROWSERS_PATH`, runner HOME, and Playwright's default cache are not browser identity controls.

## Initialize and execute

The repair phase does not initialize r2. A future authorization must identify the reviewed repair head, retain the r1 inventory lock, and explicitly open the initializer:

```bash
DESIGN_CANON_B000_R2_INIT=1 node scripts/benchmark-calibration-b000-init.js \
  --output .benchmark/calibration/b000-r2 \
  --live-r2-authorization true \
  --reviewed-repair-head <reviewed-repair-head> \
  --r1-lock-inventory /var/lib/dcbench/evidence/b000-r1-immutability-lock-r1/r1-inventory.json
```

After every gate passes and the dedicated agent login is verified, execute the frozen order once:

```bash
DESIGN_CANON_B000_LIVE=1 node scripts/benchmark-batch-b000.js \
  --root .benchmark/calibration/b000-r2 \
  --workspace-root /var/lib/dcbench/workspaces \
  --codex /usr/local/bin/codex \
  --browser-executable /opt/dcbench/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell \
  --browser-preflight .benchmark/calibration/b000-r2/browser-preflight/browser-preflight.json \
  --live true
```

The effective form is `codex --ask-for-approval never exec ...`. It requests canonical model ID `gpt-5.6-sol`, medium reasoning, the Standard/default tier, workspace-write, disabled workspace-command network, disabled web search, ephemeral state, ignored user config and execution rules, disabled skill instructions and optional integration features, and JSONL. It never passes an evidence or repository path to the measured child.

Before A can launch, the batch verifies the frozen browser-preflight hash and executable identity, then repeats local page load, viewport/full-page screenshots, HTTP/HTTPS aborts with zero accepted responses, lint, accessibility calibration, metadata, and artifact hashing with the same binary. The batch stops at the first terminal failure and never retries. It requires both child exit zero and a complete manifest with complete capture, null invalid reason, and required artifacts. Every launch and flushed terminal decision is preserved in `batch-state.jsonl`. Raw stdout/stderr are written losslessly and flushed before normalization. Spawn, timeout, budget, JSONL, source, Git-diff, capture, and artifact-hash failures remain terminal evidence; a later attempt requires a newly initialized immutable attempt ID.

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
