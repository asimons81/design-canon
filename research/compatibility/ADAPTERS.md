# Adapter Recommendations

> **Status:** Maintainer-reviewed proposal. No adapter described here is implemented unless the current CLI already exposes the corresponding compilation target.

## Core rules for every adapter

1. **Never overwrite a user-owned instruction file by default.**
2. **Preview before writing.** Show target path, generated content, and whether the operation creates or updates a managed block.
3. **Use stable markers.** Managed sections must be replaceable without touching surrounding user content.
4. **Support uninstall.** Removing an adapter must remove only Design Canon-owned content.
5. **Stay local-first.** No accounts, hosted registry requirement, telemetry, or cloud state.
6. **Report scope.** Tell the user whether the generated policy applies globally, at repository root, or to selected subdirectories.
7. **Fail closed on ambiguity.** If an existing file contains conflicting or malformed managed markers, stop instead of guessing.

Suggested managed block:

```markdown
<!-- design-canon:start profile=marketing generated-by=design-canon@<version> -->
[compiled policy]
<!-- design-canon:end -->
```

Generated standalone files should begin with the same provenance metadata in a format the target treats as a comment.

## 1. Portable AGENTS.md adapter

### Target

`AGENTS.md` at repository root, with optional package-level files selected explicitly by the user.

### Supported consumers

Codex, Hermes Agent, Cursor, Windsurf, and other AGENTS.md-aware tools. Semantics vary by consumer, so the installer must display target-specific scope notes.

### Write behavior

- If no `AGENTS.md` exists, create one containing a Design Canon managed block.
- If one exists without Design Canon markers, append a managed block after preview.
- If one contains a valid Design Canon block, replace only that block.
- If multiple or malformed Design Canon blocks exist, stop with an actionable error.

### Recommended first implementation

This should be the first adapter built because it delivers the broadest utility with the smallest surface area.

## 2. Hermes Agent adapter

### Always-on policy

Use the portable `AGENTS.md` adapter unless the user explicitly requests a Hermes-native `.hermes.md` file.

Hermes chooses only one top-level project-context type by priority. Generating `.hermes.md` alongside `AGENTS.md` would cause Hermes to ignore the lower-priority file, so the installer must not create both silently.

### On-demand workflow

Generate or install a profile-specific `SKILL.md` for users who want an explicit design workflow rather than always-loaded project policy.

The skill should invoke the current command:

```bash
design-canon lint <path> --profile <profile>
```

Do not reference a nonexistent `design-canon check` command.

## 3. OpenAI Codex adapter

Codex uses `AGENTS.md`. No separate Codex-specific file is required for the first release.

For monorepos, offer nested `AGENTS.md` generation only through explicit package selection. More deeply nested files can override root instructions for their subtree, so accidental generation could change behavior substantially.

## 4. Claude Code adapter

### Target

`CLAUDE.md` or `.claude/CLAUDE.md`.

### Preferred strategy

Generate a standalone policy file such as:

```text
.design-canon/claude.md
```

Then add a managed import to `CLAUDE.md`:

```markdown
<!-- design-canon:start -->
@.design-canon/claude.md
<!-- design-canon:end -->
```

This keeps the generated policy replaceable and avoids turning a user-maintained `CLAUDE.md` into a generated artifact.

### Alternative

Insert the compiled policy directly into a managed block when the user chooses a single-file setup.

### Important limitation

Claude Code does not automatically read `AGENTS.md`. Cross-tool projects can create a `CLAUDE.md` that imports `@AGENTS.md`, but Design Canon must not assume that arrangement already exists.

## 5. Cursor adapter

### Native target

`.cursor/rules/design-canon.mdc`

The adapter should support two modes:

- **Always active:** policy applies to the whole project.
- **Path-scoped:** user supplies file patterns or selects common frontend paths.

Exact MDC metadata must be generated from the currently documented Cursor rule format and validated in an integration test. Do not hard-code speculative precedence or reload behavior.

### Portable alternative

Use root `AGENTS.md` for simple global policy.

## 6. Windsurf adapter

### Native target

`.windsurf/rules/design-canon.md`

Support documented activation modes only after an integration fixture confirms the frontmatter shape accepted by the current Windsurf release.

### Portable alternative

Use `AGENTS.md`:

- root file for always-on policy,
- nested file for automatic directory scope.

Do not generate speculative `.devin/rules/` paths.

## 7. Google DESIGN.md adapter

This is a **future adapter**, not a wrapper around the current `design` target.

A conforming Google DESIGN.md requires concrete visual identity data such as colors, typography, spacing, rounded values, and component tokens. The current Design Canon rule catalog expresses policy and rationale, not a complete token system.

Implementation prerequisites:

1. Define an explicit source of concrete project tokens.
2. Generate optional YAML frontmatter and ordered markdown sections.
3. Validate output with the upstream `@google/design.md` CLI.
4. Add round-trip or snapshot fixtures.
5. Name the existing policy output clearly enough that users do not confuse it with spec conformance.

Until those prerequisites are met, documentation may say Design Canon can produce a policy file named `DESIGN.md`, but not that it produces Google-spec-compliant DESIGN.md.

## 8. Agent Skills adapter

### Target

A profile-specific `SKILL.md` with valid frontmatter and an explicit procedure.

### Use case

Use a skill when the user wants Design Canon invoked during planning, implementation, or review rather than injected into every session.

### Required behavior

- Generate a unique skill name per profile.
- Keep descriptions concise enough for skill indexes.
- Reference only existing CLI commands.
- Include verification and exception-handling steps.
- Avoid embedding huge rule catalogs when the skill can call the compiler or linter locally.

## Proposed CLI surface

The first implementation should remain small:

```bash
design-canon init [path] --profile <profile> --target agents|claude|cursor|windsurf|hermes-skill --dry-run
design-canon init [path] --profile <profile> --target <target> --write
design-canon uninstall [path] --target <target> --dry-run
design-canon uninstall [path] --target <target> --write
```

Design requirements:

- `--dry-run` is the default behavior.
- `--write` is required for mutation.
- Existing files are preserved outside managed blocks.
- Every write is atomic.
- The command reports created, updated, unchanged, and conflicted files.
- Re-running the command is idempotent.

## Recommended implementation order

1. Portable `AGENTS.md`
2. Claude Code import adapter
3. Hermes profile skill
4. Cursor rule adapter
5. Windsurf rule adapter
6. Google DESIGN.md adapter after token-source design is approved

## Required integration tests

Every adapter must test:

- fresh install,
- update of an existing managed block,
- preservation of surrounding user content,
- malformed marker rejection,
- dry-run with zero filesystem changes,
- idempotent second run,
- uninstall preserving user content,
- paths containing spaces,
- Windows and POSIX line endings,
- target-specific scope behavior.
