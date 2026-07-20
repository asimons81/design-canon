# B000 Codex Runner Contract

## Scope

This contract governs the nonofficial B000 calibration only. It authorizes implementation of a Codex CLI execution adapter and four calibration attempts. It does not admit official protocol-v1 runs, authorize B001-B015 execution, or support any superiority claim.

The frozen settings are stored in `b000-codex-sol-standard-v1.json`.

## Objective

Prove that one initialized benchmark run can travel through the complete execution pipeline without hidden condition drift:

1. assemble the brief and condition guidance;
2. create a fresh isolated workspace;
3. execute one fresh Codex CLI session;
4. preserve the raw transcript and process evidence;
5. copy the generated source into the run directory;
6. capture and lint the result;
7. hash every artifact;
8. finalize the manifest without erasing failures or unknown values.

## Fixed calibration model settings

- Framework: Codex CLI
- Minimum CLI version: `0.144.0`
- Requested model: `gpt-5.6`, the GPT-5.6 Sol alias
- Reasoning effort: `medium`, labeled Standard
- Fast mode: off
- Max mode: off
- Web search: disabled
- Sandbox: `workspace-write`
- Approval policy: `never`
- User configuration: ignored
- User and project exec-policy rules: ignored
- Session persistence: ephemeral

The runner must capture the exact installed Codex version and any resolved/provider-reported model identifier. It must not claim an immutable model snapshot when Codex does not expose one.

## Required command shape

The implementation must derive its final invocation from the installed `codex exec --help` output and fail if required stable flags are unavailable. The intended shape is:

```text
codex exec \
  --cd <isolated-workspace> \
  --model gpt-5.6 \
  --sandbox workspace-write \
  --ask-for-approval never \
  --ignore-user-config \
  --ignore-rules \
  --ephemeral \
  --strict-config \
  --json \
  --output-last-message <run>/transcript/final-message.txt \
  --config model_reasoning_effort="medium" \
  --config web_search="disabled" \
  -
```

The assembled instructions are provided on stdin. Standard output is preserved byte-for-byte as JSONL. Standard error is preserved separately. Secrets and authentication material must never be copied into the run directory or logged in the effective-command record.

Do not use `--dangerously-bypass-approvals-and-sandbox`, `--yolo`, live search, resume, fork, or a persisted prior session.

## Isolation requirements

Each condition gets a new workspace outside the Design Canon repository and outside every other run workspace.

Before invocation, the runner must verify:

- the workspace contains only the fixed starter files and a fresh `.git` directory;
- no `AGENTS.md`, `CLAUDE.md`, `.cursor`, `.windsurf`, `DESIGN.md`, skill bundle, MCP configuration, plugin configuration, or benchmark result is present in the workspace or any workspace parent;
- the workspace cannot read the Design Canon checkout except for the already assembled prompt supplied by the parent runner;
- no prior condition output is present;
- no model-readable condition label is included in filenames, prompt text, Git metadata, or environment variables;
- external network access is blocked by an independently enforced mechanism, not merely by a sentence in the prompt.

`--ignore-user-config` and `--ignore-rules` are mandatory but are not, by themselves, sufficient evidence of isolation. The runner must also record its workspace inspection and network-block verification.

## Workspace contract

The model receives the contents of `research/benchmarks/B000-calibration-shakedown.md`, followed by the guidance for its condition when guidance exists.

The starter workspace contains exactly:

```text
index.html
styles.css
script.js
```

All three files begin empty. The model may modify only those files. Package installation, new files, external assets, and network requests are forbidden.

The runner must reject a result that adds files, deletes required files, creates symlinks, or writes outside the workspace. Git metadata is runner-owned and excluded from the allowed-project-file check.

## Condition generation

- A: brief only
- B: the frozen generic-guidance artifact
- C: the frozen full-monolith artifact
- D: the frozen marketing-strict compiled artifact

B, C, and D must be produced by the existing protocol-v1 guidance generator from the frozen catalog snapshot. No generated guidance may be edited manually.

Execute one attempt per condition in this frozen order:

```text
A, B, D, C
```

The seed and expected order are recorded in the calibration manifest. The runner must independently regenerate and verify the order before execution.

## Budgets

Candidate calibration budgets are intentionally generous enough to measure normal behavior:

- wall-clock limit: 1,200 seconds per model attempt;
- hard process termination after a 30-second grace period;
- maximum recorded tool actions: 80;
- automatic retries: zero;
- package installations: zero;
- external network requests: zero.

Exceeding a budget marks the attempt partial or failed. It does not authorize truncating the transcript, deleting the workspace, or rerunning the same ID.

## Evidence and manifests

Each run must retain:

- the original run manifest;
- exact assembled instructions and hashes;
- redacted effective command arguments;
- `codex --version` output;
- `codex exec --help` output and hash;
- raw JSONL stdout;
- raw stderr;
- final assistant message;
- exit code, start time, end time, duration, timeout state, and termination signal;
- normalized event summary;
- provider-reported token usage when present;
- action count with the exact event types counted;
- generated source files and Git diff;
- capture, lint, accessibility-calibration, and artifact-hash outputs.

Raw JSONL is authoritative. Normalization may add fields but must not rewrite or discard raw events.

Unknown token counts remain `null`. The runner must not estimate provider usage from characters or local tokenizer approximations. A separate clearly labeled estimate may appear only in the aggregate calibration report.

## Failure preservation

The runner is fail-closed.

- Never overwrite an existing run directory.
- Never convert a failed attempt into a completed attempt by editing its status manually.
- Never automatically retry.
- Preserve startup failures, authentication failures, model-selection failures, timeouts, malformed JSONL, budget overruns, capture failures, and invalid workspaces.
- A later attempt must use a new immutable attempt identifier and retain the prior attempt.

The first Phase-2 execution is limited to `B000-A-r1`, `B000-B-r1`, `B000-D-r1`, and `B000-C-r1`.

## Required implementation surface

Phase 2 should add, at minimum:

- a provider-neutral execution-state and manifest-finalization module;
- a Codex CLI adapter;
- a B000 calibration initializer or plan command that cannot masquerade as an official protocol-v1 plan;
- an execution CLI that supports one run at a time and an explicit B000 ordered batch;
- deterministic workspace creation and validation;
- JSONL preservation and normalization;
- timeout and process-tree termination;
- usage, action, and runtime accounting;
- source-copy and allowed-file validation;
- aggregate B000 calibration reporting;
- unit and integration tests that do not make paid model calls;
- an opt-in live test path for the four real Sol calls.

Do not add provider credentials, authentication files, generated `.benchmark/` outputs, raw calibration artifacts, or confidential data to Git.

## Acceptance tests before live calls

The non-paid test suite must prove:

1. B000 is absent from protocol v1 and from the 180-run plan.
2. The calibration order deterministically resolves to A, B, D, C.
3. The initializer marks every B000 run as nonofficial and claim-ineligible.
4. The command builder pins model, effort, sandbox, approval, ignored config/rules, ephemeral mode, JSONL, and disabled search.
5. Unsupported or missing Codex flags fail closed.
6. Existing directories are never overwritten.
7. Parent instructions and forbidden workspace files are rejected.
8. Symlinks and path traversal are rejected.
9. Unknown usage remains null.
10. Raw JSONL remains unchanged.
11. Timeouts preserve partial evidence and terminate the child process tree.
12. Automatic retries cannot occur.
13. Added or missing project files invalidate the result.
14. Network-block verification is required before launch.
15. A fake Codex executable can simulate complete, failed, malformed, and timed-out runs.
16. Capture is invoked only after source validation and does not erase an execution failure.
17. Aggregate reporting includes every attempt and separates measured usage from estimates.

## Phase-2 completion report

After the four live calls, produce a report containing:

- exact Codex, Node, npm, Git, OS, kernel/WSL, and Chromium versions;
- requested and resolved model identity;
- reasoning effort evidence;
- execution order;
- per-run input, cached-input, output, and reasoning tokens when reported;
- per-run runtime, tool actions, exit status, and completion class;
- observed cost or credit consumption when available;
- guidance bytes and token counts;
- capture and validation status;
- isolation exceptions or unknowns;
- recommended official B001 budgets;
- a clear go, revise, or stop recommendation.

Do not edit protocol-v1 admission fields during Phase 2.
