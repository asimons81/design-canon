# B000 Runner Contract Amendment 1

## Status and scope

This amendment applies only to the nonofficial, claim-ineligible B000 calibration. It does not alter protocol v1, admit B001-B015 execution, change the 180-run plan, or authorize a superiority claim.

## Original assumption

The Phase-1 contract presented `--ask-for-approval never` after the `exec` subcommand and therefore implicitly treated approval policy as an exec-scoped option.

## Correction

That assumption was incorrect. Codex CLI capability scope must be derived independently from complete `codex --help` and `codex exec --help` output. In the pinned Codex CLI, approval policy is a global option. A global option must precede `exec`; exec-scoped options must follow it.

No model call occurred under the incorrect command assumption. The Phase-2 runner stopped before launch when its original capability model rejected the installed CLI.

The corrected command model is:

```text
codex <verified global options> exec <verified exec options> -
```

The exact effective argument vector must be derived from Codex CLI `0.144.4`, preserved with secrets omitted, and tested for scope and ordering. Equivalent configuration overrides are permitted only when the installed CLI accepts them under strict configuration and the runner records the evidence.

## Amended admission requirement

B000 may launch only when all of the following are true:

1. Codex CLI is exactly `0.144.4`.
2. Complete top-level and exec help outputs and their SHA-256 hashes are preserved.
3. Required capabilities are classified as global, exec-scoped, or strict configuration keys.
4. The final argument order is `codex <global options> exec <exec options> -`.
5. The effective configuration verifies model `gpt-5.6`, medium reasoning, Standard tier, fast and max modes off, approval policy never, workspace-write sandboxing, workspace-command network disabled, web search disabled, ephemeral execution, ignored user configuration and execution-policy rules where supported, no MCP servers, no skills, no plugins, and JSONL output.
6. The measured child receives no repository, benchmark-evidence, condition, or sibling-workspace path through arguments, environment, working directory, or writable mounts.
7. Attempt-bound machine-generated filesystem, workspace-network, and browser-network evidence passes immediately before launch.

Any missing or unverifiable capability retains `STOP`. Protocol v1 remains unmodified.
