# Agent Adapters

Design Canon can install compiled profile guidance into supported project instruction formats without overwriting user-owned content.

## Command context

From a source checkout, use the repository CLI explicitly:

```bash
node ./bin/design-canon.js init . \
  --profile product-app \
  --target agents
```

After a public npm version is independently verified, the installed `design-canon` command or an exact-version `npx design-canon@<version>` invocation can be used instead. Do not assume the npm package exists because a source tag exists. Check [`RELEASE_STATUS.md`](RELEASE_STATUS.md).

The examples below use the source-checkout command so they work in the current repository state.

## Safety contract

- `init` and `uninstall` are dry-run previews by default.
- Files change only when `--write` is supplied.
- Existing instruction files are preserved outside a marker-managed block.
- Malformed or duplicated markers fail closed.
- Standalone generated files include an ownership marker.
- Uninstall deletes a standalone file only when it is marked as Design Canon-owned.
- Writes use a temporary file in the destination directory followed by an atomic rename.
- Re-running the same command is idempotent.
- The adapter does not contact a model provider or install third-party agent software.

## Commands

Preview an installation:

```bash
node ./bin/design-canon.js init [path] \
  --profile marketing|product-app|editorial \
  --target agents|codex|hermes|claude|cursor|windsurf
```

Add `--write` only after reviewing the output:

```bash
node ./bin/design-canon.js init . \
  --profile product-app \
  --target agents \
  --write
```

Preview removal of only Design Canon-managed content:

```bash
node ./bin/design-canon.js uninstall . --target agents
```

Apply the reviewed removal:

```bash
node ./bin/design-canon.js uninstall . --target agents --write
```

## Targets

### `agents`

Writes a managed block to root `AGENTS.md`.

Use this portable target when one file should serve multiple AGENTS.md-aware tools.

### `codex`

Writes the same managed `AGENTS.md` format with target-specific provenance. Codex applies `AGENTS.md` by directory scope, with deeper files taking precedence for their subtrees.

Official references:

- https://openai.com/index/introducing-codex/
- https://openai.com/index/unrolling-the-codex-agent-loop/

### `hermes`

Writes root `AGENTS.md`. Hermes loads it as project context when no higher-priority `.hermes.md` or `HERMES.md` exists. Hermes uses one project-context type by priority rather than concatenating every supported root format, so Design Canon does not silently create competing `.hermes.md` and `AGENTS.md` files.

Official reference: https://hermes-agent.nousresearch.com/docs/user-guide/features/context-files/

### `claude`

Creates:

- `.design-canon/claude.md`, a Design Canon-owned compiled policy file;
- a managed import block in root `CLAUDE.md` containing `@.design-canon/claude.md`.

User-authored Claude instructions remain outside the managed block. Claude Code supports `@path` imports and resolves relative imports from the file containing the import.

Official reference: https://docs.anthropic.com/en/docs/claude-code/memory

### `cursor`

Creates `.cursor/rules/design-canon.mdc` with project-rule frontmatter:

```yaml
---
description: Enforce the selected Design Canon profile.
globs:
alwaysApply: true
---
```

Official reference: https://docs.cursor.com/context/rules

### `windsurf`

Creates `.windsurf/rules/design-canon.md` with an always-on workspace-rule trigger:

```yaml
---
trigger: always_on
---
```

Windsurf workspace rules are limited to 12,000 characters. The adapter checks the generated size and directs users to the portable `agents` target when the compiled rule would exceed that limit.

Official references:

- https://docs.windsurf.com/windsurf/cascade/memories
- https://docs.windsurf.com/windsurf/cascade/agents-md

## Managed blocks

A managed section looks like:

```markdown
<!-- design-canon:start profile=marketing target=agents -->
[compiled policy]
<!-- design-canon:end -->
```

Design Canon replaces only that block. Multiple blocks, a missing end marker, or an end marker before the start marker are treated as conflicts.

## Monorepos

The initial adapter writes only at the explicitly selected project root. It does not invent nested scopes. Run `init` against a selected package directory when you intentionally want a package-level `AGENTS.md` or tool-specific rule.

## Google DESIGN.md

The existing `compile --target design` output is a Design Canon policy document named `DESIGN.md`. It is not claimed to conform to Google Labs' token-bearing DESIGN.md specification. A conforming adapter requires explicit project token input or approved local token extraction and upstream validation.
