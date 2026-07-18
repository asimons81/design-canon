# Design Canon Agent Compatibility Matrix

> **Status:** Maintainer-reviewed research, 2026-07-18
> **Scope:** Persistent project instructions and portable design-policy delivery.
> **Evidence rule:** Claims marked **verified** are supported by the linked primary documentation. Claims marked **proposal** describe a Design Canon integration decision that has not been implemented.

## Important distinction

Design Canon currently has a `design` compilation target that conventionally writes `DESIGN.md`. That output is a markdown policy document. It is **not yet guaranteed to conform to Google Labs' structured DESIGN.md specification**, whose optional YAML frontmatter carries machine-readable design tokens.

Until a dedicated Google DESIGN.md adapter exists and passes the upstream validator, documentation must describe these as separate formats:

- **Design Canon policy document:** compiled contextual rules and verification guidance.
- **Google DESIGN.md:** an open visual-identity format with an optional token-bearing YAML frontmatter and ordered markdown sections.

## Compatibility summary

| Target | Native project instruction format | Nested or scoped behavior | Recommended Design Canon delivery | Confidence |
|---|---|---|---|---|
| Hermes Agent | `.hermes.md` / `HERMES.md`, `AGENTS.md`, `CLAUDE.md`, `.cursorrules`, `.cursor/rules/*.mdc` | `.hermes.md` can be found up to the git root; nested context can be discovered progressively. Only one top-level project-context type wins by priority. | Root `AGENTS.md` managed block for portable always-on policy; optional `SKILL.md` for on-demand workflow | verified |
| OpenAI Codex | `AGENTS.md` | Directory-scoped; deeper files apply to their subtree and take precedence for conflicting instructions | Root or package-level `AGENTS.md` managed block | verified |
| Claude Code | `CLAUDE.md`, `.claude/CLAUDE.md`, `CLAUDE.local.md`, `.claude/rules/*.md` | Parent files load at launch; subdirectory files load when Claude works there; instruction layers are additive | Root `CLAUDE.md` managed block or a generated file imported from `CLAUDE.md` | verified |
| Cursor | `.cursor/rules/*.mdc`, root `AGENTS.md`, legacy `.cursorrules`; Cursor CLI also reads root `CLAUDE.md` | Project rules can be scoped by rule type and path patterns; current documented `AGENTS.md` support is root-level | `.cursor/rules/design-canon.mdc`, with `AGENTS.md` as the simple portable alternative | verified |
| Windsurf | `.windsurf/rules/*.md`, `AGENTS.md`, legacy workspace rules | Root `AGENTS.md` is always on; nested `AGENTS.md` is automatically scoped to its directory; workspace rules support explicit activation modes | `.windsurf/rules/design-canon.md` or `AGENTS.md` | verified |
| Generic AGENTS.md consumers | `AGENTS.md` | Scope and precedence vary by consumer | Root `AGENTS.md`; package-level files only when the target tool's behavior is known | verified convention, tool-dependent behavior |
| Google DESIGN.md consumers | `DESIGN.md` | The specification defines file structure, not universal auto-discovery behavior | Dedicated future adapter validated with `@google/design.md`; do not claim current compiler output conforms | verified format, proposal adapter |
| Agent Skills consumers | `SKILL.md` plus optional supporting files | Loaded according to the host tool's skill system, not repository directory inheritance | Existing Design Canon skill or generated profile-specific skill | verified format, tool-dependent placement |

## 1. Hermes Agent

### Verified behavior

- Startup project-context priority is `.hermes.md` / `HERMES.md`, then `AGENTS.md`, then `CLAUDE.md`, then Cursor-compatible rules. The first matching project-context type is used.
- `SOUL.md` is separate global identity, not a project policy file.
- The default automatic context-file limit is 20,000 characters with head/tail truncation.
- Nested project context may be discovered progressively as files and directories are accessed.
- `SKILL.md` is suitable for an on-demand Design Canon procedure.

### Design Canon implication

Use `AGENTS.md` when portability matters. Use `.hermes.md` only for Hermes-specific behavior. Avoid generating both at the same level because Hermes will select the higher-priority file rather than merge both.

### Primary sources

- https://hermes-agent.nousresearch.com/docs/user-guide/features/context-files/
- https://hermes-agent.nousresearch.com/docs/developer-guide/prompt-assembly/
- https://hermes-agent.nousresearch.com/docs/user-guide/features/skills

## 2. OpenAI Codex

### Verified behavior

- Codex uses `AGENTS.md` for repository instructions.
- An `AGENTS.md` applies to the directory tree rooted where the file lives.
- More deeply nested `AGENTS.md` files take precedence when instructions conflict.
- Direct system, developer, and user instructions outrank `AGENTS.md`.
- Project document loading is bounded and configurable. Adapter output should remain concise and must not assume the model's full context window is available for project instructions.

### Corrections to the original draft

Codex should **not** be documented as automatically reading `CLAUDE.md` or `.cursorrules`. Those are not Codex-native project instruction files.

### Design Canon implication

Generate or update a managed section in `AGENTS.md`. A monorepo adapter may generate nested files only when the maintainer explicitly selects package scopes.

### Primary sources

- https://github.com/openai/codex/blob/main/docs/agents_md.md
- https://github.com/openai/codex/blob/main/codex-rs/protocol/src/prompts/base_instructions/default.md

## 3. Claude Code

### Verified behavior

- Claude Code reads `CLAUDE.md`, `.claude/CLAUDE.md`, and `CLAUDE.local.md`.
- Claude Code does **not** automatically read `AGENTS.md`. A `CLAUDE.md` can import it using `@AGENTS.md`, or a symlink can be used where practical.
- Instruction files are concatenated into context. They are not a hard override chain.
- Parent files load at session start. Subdirectory files load when Claude reads files in those directories.
- Project rules live under `.claude/rules/*.md` and may be path-scoped.
- Claude recommends concise instruction files, generally under about 200 lines.

### Design Canon implication

The safest portable strategy is:

```markdown
@.design-canon/claude.md
```

inside an existing root `CLAUDE.md`, or a marker-managed Design Canon section when imports are not desired. Do not overwrite the user's existing file.

### Primary sources

- https://code.claude.com/docs/en/memory
- https://code.claude.com/docs/en/claude-directory

## 4. Cursor

### Verified behavior

- Project Rules live in `.cursor/rules` as `.mdc` files.
- Rules can be always included, auto-attached by path pattern, requested by the agent, or manually invoked.
- Cursor supports a root-level plain-markdown `AGENTS.md` as a simpler alternative.
- `.cursorrules` remains supported but is legacy.
- Cursor CLI reads root `AGENTS.md` and `CLAUDE.md` alongside `.cursor/rules`.

### Design Canon implication

Prefer `.cursor/rules/design-canon.mdc` for Cursor-specific scoping. Prefer root `AGENTS.md` when one portable file is more valuable than Cursor-specific activation controls.

The original draft's claims about a mandatory IDE reload and a fixed precedence order were not sufficiently supported and have been removed.

### Primary sources

- https://docs.cursor.com/context/rules-for-ai
- https://docs.cursor.com/en/cli/using

## 5. Windsurf

### Verified behavior

- Workspace rules live in `.windsurf/rules/*.md` and use frontmatter to select activation behavior.
- Workspace rule files are limited to 12,000 characters each.
- Windsurf automatically discovers `AGENTS.md` or `agents.md` in any workspace directory.
- Root `AGENTS.md` is treated as always active.
- Nested `AGENTS.md` files are automatically scoped to their directory tree.
- Global rules use `~/.codeium/windsurf/memories/global_rules.md` and have a 6,000-character limit.

### Corrections to the original draft

The speculative `.devin/rules/` migration and "Devin Desktop" replacement path have been removed. Current primary Windsurf documentation describes `.windsurf/rules/` and directory-scoped `AGENTS.md`.

### Design Canon implication

Use `.windsurf/rules/design-canon.md` for explicit activation controls, or `AGENTS.md` for simple directory-based behavior.

### Primary sources

- https://docs.windsurf.com/windsurf/cascade/memories
- https://docs.windsurf.com/windsurf/cascade/agents-md

## 6. Generic AGENTS.md

`AGENTS.md` is plain markdown with no required frontmatter. It is the best default when the target is unknown, but consumers differ in discovery, inheritance, merging, size limits, and refresh behavior.

Design Canon must not promise identical semantics across agents. The adapter should report the selected target and its known scope rules.

Primary source: https://agents.md/

## 7. Google DESIGN.md

### Verified behavior

- A Google DESIGN.md file has a markdown body and may include YAML frontmatter containing machine-readable design tokens.
- If frontmatter is present, it must be fenced with `---` and conform to the upstream schema.
- The specification defines token groups such as colors, typography, spacing, rounded values, and components.
- The format is currently alpha and evolving.
- The format itself does not guarantee that every coding agent automatically discovers or injects the file.

### Design Canon implication

A conforming adapter cannot be produced from the current rule catalog alone because many profiles do not contain concrete color, typography, spacing, radius, and component token values. A future adapter needs one of:

1. project token extraction,
2. explicit token input in configuration, or
3. a validated token profile format.

Until then, keep the current Design Canon policy document distinct from Google DESIGN.md compatibility claims.

### Primary sources

- https://github.com/google-labs-code/design.md/blob/main/docs/spec.md
- https://github.com/google-labs-code/design.md
- https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-design-md/

## 8. Agent Skills

`SKILL.md` is an open, progressively disclosed capability format. Required frontmatter and installation paths depend on the host implementation. The existing Design Canon skill is appropriate for procedural use, while project instruction files are better for policy that should always be present.

Primary sources:

- https://agentskills.io/specification
- https://hermes-agent.nousresearch.com/docs/user-guide/features/skills

## Maintainer decisions produced by this review

1. `AGENTS.md` is the default portable adapter target.
2. Native adapters must be non-destructive and preview changes before writing.
3. Claude Code support must use `CLAUDE.md` or an import from it, not an unsupported direct `AGENTS.md` claim.
4. Google DESIGN.md conformance is a separate future adapter, not a property of the current `design` target.
5. Tool-specific behavior must be verified with primary documentation and integration tests before the adapter is marked stable.
