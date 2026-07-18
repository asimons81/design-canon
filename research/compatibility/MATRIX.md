# Design Canon — Agent Compatibility Matrix

> **Research date:** 2026-07-18
> Every claim tagged with one of: `verified fact`, `research finding`, `assumption`, `proposal`.
> Conflicting or undocumented behavior is flagged explicitly. Where documentation was unavailable or ambiguous, the limitation is stated rather than guessed.

---

## How to Read This Matrix

Each tool is evaluated across 12 attributes. After the tool table, a **cross-cutting comparison** summarizes key differences, and a **conflicts & unknowns** section flags behaviors that are contradictory or undocumented.

---

## 1. Hermes Agent

| Attribute | Detail | Confidence |
|-----------|--------|------------|
| **Supported instruction filenames** | `.hermes.md` / `HERMES.md` (highest priority project context), `AGENTS.md` (primary), `CLAUDE.md` (cross-tool), `.cursorrules` (legacy Cursor compat), `.cursor/rules/*.mdc` (Cursor rule modules), `SOUL.md` (global identity, loaded from `HERMES_HOME` only). Skills use `SKILL.md` with YAML frontmatter via the skill system. | `verified fact` |
| **Expected file locations** | Project context files: CWD at startup, walks to git root. `SOUL.md`: `~/.hermes/SOUL.md` or `$HERMES_HOME/SOUL.md` only. Skills: `~/.hermes/skills/<category>/<name>/SKILL.md` or external skill dirs via `skills.external_dirs` config. | `verified fact` |
| **Frontmatter requirements** | Project context files (`.hermes.md`, `AGENTS.md`, `CLAUDE.md`, `.cursorrules`): **none**. Skills (`SKILL.md`): requires YAML frontmatter with at least `name` and `description`. `.mdc` files: requires YAML frontmatter with `description` and optional `globs`. | `verified fact` |
| **Precedence rules** | Project context priority (first match wins): `.hermes.md` → `AGENTS.md` → `CLAUDE.md` → `.cursorrules`. Skills are on-demand (loaded via `/skill` command or `skill_view` tool). `SOUL.md` is always loaded independently as slot #1 in the system prompt. If the working directory changes mid-session, progressive discovery loads context from subdirectories on access. | `verified fact` |
| **Directory inheritance** | **Yes — progressive subdirectory discovery.** At startup, Hermes loads `AGENTS.md` from CWD (or git root). As the agent navigates into subdirectories (via `read_file`, `terminal`, `search_files`), it discovers `AGENTS.md`/`CLAUDE.md`/`.cursorrules` in those directories and injects them into context. Also walks **up to 5 parent directories** from any file path the agent touches. Each directory checked at most once per session. | `verified fact` |
| **Size / context limitations** | Default `context_file_max_chars` = **20,000 chars** (~7,000 tokens). Truncation: 70% head / 20% tail / 10% marker. Progressive discovery files capped at **8,000 chars** each. | `verified fact` |
| **Installation procedure** | Context files: create file at project root or target directory. Skills: `skill_manage(action='create', name='...')` tool call, or `/learn` command, or place manually in `~/.hermes/skills/`. | `verified fact` |
| **Uninstall procedure** | Context files: delete the file. Skills: `skill_manage(action='delete', name='...')`. | `verified fact` |
| **Refresh / reload behavior** | Context files are read at **session start** and during **progressive subdirectory discovery** (live). Change a project-root `AGENTS.md` mid-session? It is **not re-read** unless the user triggers a new session. Skills load on-demand per invocation. After `/compact`, project-root context files survive and are re-read from disk; nested ones reload lazily when files in that subdirectory are accessed. | `verified fact` |
| **Known limitations** | Only **one** project context file type loads per session (the first found in priority order). Progressive discovery only checks subdirectories the agent actually visits. YAML frontmatter in context files is **not parsed** — it's treated as plain markdown (only `.mdc` files get frontmatter parsing). Prompt injection scanner can falsely block benign content. | `verified fact` |
| **Official source links** | [Context Files docs](https://hermes-agent.nousresearch.com/docs/user-guide/features/context-files/), [Skills docs](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills), [Personality/SOUL.md](https://hermes-agent.nousresearch.com/docs/user-guide/features/personality/), [Config reference](https://hermes-agent.nousresearch.com/docs/user-guide/configuration) | `verified fact` |

---

## 2. OpenAI Codex (CLI)

| Attribute | Detail | Confidence |
|-----------|--------|------------|
| **Supported instruction filenames** | `AGENTS.md` (primary), `CLAUDE.md` (cross-compat), `.cursorrules` (cross-compat). Also reads `AGENTS.override.md` from global scope. | `research finding` |
| **Expected file locations** | **Multiple search locations in order:** (1) global: `~/.codex/AGENTS.override.md` (if exists) or `~/.codex/AGENTS.md`, (2) repo root `AGENTS.md`, (3) CWD `AGENTS.md`, (4) subdirectory `AGENTS.md` (nested, closest to edited file wins). | `research finding` |
| **Frontmatter requirements** | **None.** Plain markdown. Standard `AGENTS.md` convention (no YAML frontmatter). | `verified fact` |
| **Precedence rules** | **Closest `AGENTS.md` to the edited file wins.** Explicit user chat prompts override everything. If a monorepo has 88 `AGENTS.md` files (as the main OpenAI repo does), the one nearest the current file takes precedence for conflicting instructions. Global (`~/.codex/`) files are lowest priority. | `verified fact` |
| **Directory inheritance** | **Yes — nested `AGENTS.md` support.** More-deeply-nested files take precedence for conflicting instructions. Different tools implement this differently: Codex reads the nearest `AGENTS.md` to the file being edited. | `research finding` |
| **Size / context limitations** | Not explicitly documented by OpenAI. `project_doc_max_bytes` config setting controls AGENTS.md reading. Setting `project_doc_max_bytes=0` suppresses AGENTS.md loading entirely. Practical limit derived from context window (~100K-200K tokens depending on model). | `research finding` |
| **Installation procedure** | Create `AGENTS.md` at project root (or desired scope). Codex CLI auto-discovers it. No registration needed. | `verified fact` |
| **Uninstall procedure** | Delete the `AGENTS.md` file. | `verified fact` |
| **Refresh / reload behavior** | Codex reads `AGENTS.md` at **session start**. Changes mid-session are **not re-read** unless a new session starts. After context compaction, AGENTS.md content may be lost or partially re-injected (observed in bug reports: issue #25792). | `research finding` |
| **Known limitations** | Documentation for AGENTS.md behavior is sparse (the official docs/agents_md.md simply redirects to `developers.openai.com/codex/guides/agents-md`). Exact merging behavior when multiple AGENTS.md files exist is documented at the agents.md ecosystem level but not in OpenAI's own docs. `AGENTS.override.md` global file behavior partially documented on learn.chatgpt.com but not in primary docs. | `research finding` |
| **Official source links** | [Codex GitHub — AGENTS.md redirect](https://github.com/openai/codex/blob/main/docs/agents_md.md), [Introducing Codex](https://openai.com/index/introducing-codex/), [Codex CLI Guide](https://openaicli.com/docs), [AGENTS.md standard](https://agents.md/) | `verified fact` |

---

## 3. Claude Code (CLI)

| Attribute | Detail | Confidence |
|-----------|--------|------------|
| **Supported instruction filenames** | `CLAUDE.md` (primary), `CLAUDE.local.md` (user-local overrides, gitignored), `AGENTS.md` (cross-compat). Also reads `.claude/rules/*.md` (path-scoped modular rules), `.claude/commands/*.md` (custom slash commands), `.claude/settings.json` / `.claude/settings.local.json` (config). Auto memory: `MEMORY.md` + topic files under `~/.claude/projects/<project>/memory/`. | `verified fact` |
| **Expected file locations** | `CLAUDE.md`: any directory in project tree (including root, subdirectories). `CLAUDE.local.md`: same directories as CLAUDE.md. `.claude/rules/`: project root or any subdirectory. Managed CLAUDE.md (organization): deployed via settings policy. Settings files: in `.claude/` directory at any scope. Global scope: `~/.claude/`. | `verified fact` |
| **Frontmatter requirements** | `CLAUDE.md`: **none** (plain markdown). `.claude/rules/*.md`: **YAML frontmatter** with required `paths` (glob patterns that determine when the rule activates). `CLAUDE.local.md`: plain markdown, no frontmatter needed. `settings.json`: JSON format. | `verified fact` |
| **Precedence rules** | **Layered hierarchy:** Global (~/.claude/) → Project root → Subdirectory → `.claude/rules/*.md` (path-scoped) → Managed policy (organization-level, cannot be excluded). Later/more specific locations override broader ones. File scope precedence: `CLAUDE.local.md` > `CLAUDE.md` at the same level. Settings layers: user → project → local → policy → command-line (`--settings`). Managed CLAUDE.md is the highest priority and cannot be excluded. | `verified fact` |
| **Directory inheritance** | **Yes — walks up the directory tree** from CWD toward repo root, collecting every `CLAUDE.md` it encounters. Files higher in the tree load first; more specific (deeper) files take precedence for conflicting instructions. Subdirectory `CLAUDE.md` files are loaded **lazily** — when Claude reads a file in that subdirectory. Use `claudeMdExcludes` in settings to skip specific `CLAUDE.md` files by path or glob pattern. | `verified fact` |
| **Size / context limitations** | `CLAUDE.md`: loaded **in full** regardless of length, but shorter files produce better adherence. Docs recommend keeping under ~200 lines. Auto memory: `MEMORY.md` capped at first **200 lines or 25 KB** (whichever comes first). YAML frontmatter and HTML comments are stripped before counting. Topic files loaded on demand — no startup cap. | `verified fact` |
| **Installation procedure** | Create `CLAUDE.md` at desired location in project tree. Claude Code auto-discovers it. `/memory` command lets you view/edit files. `InstructionsLoaded` hook logs which files loaded. Managed CLAUDE.md deployed by org admins via settings. | `verified fact` |
| **Uninstall procedure** | Delete the `CLAUDE.md` file. Remove via `/memory` UI. Managed files cannot be excluded by users. | `verified fact` |
| **Refresh / reload behavior** | `CLAUDE.md` is read **at session start**. Project-root `CLAUDE.md` **survives `/compact`** — Claude re-reads it from disk and re-injects. Nested `CLAUDE.md` files are **not re-injected automatically** after compaction; they reload the next time Claude reads a file in that subdirectory. After editing a settings file, run `/status` to confirm it was loaded. Auto memory is read/written throughout the session. | `verified fact` |
| **Known limitations** | `CLAUDE.md` content is delivered as a **user message** after the system prompt, not as part of the system prompt itself — Claude tries to follow it but there's no hard enforcement. Vague or conflicting instructions across multiple `CLAUDE.md` files may cause arbitrary selection. The `--bare` flag explicitly skips `CLAUDE.md`. Auto memory is machine-local and not shared across machines. | `verified fact` |
| **Official source links** | [Claude Code Memory docs](https://code.claude.com/docs/en/memory), [CLAUDE.md hierarchy guide](https://agentfactory.panaversity.org/docs/General-Agents-Foundations/claude-code-teams-cicd/claude-md-configuration-hierarchy), [.claude directory docs](https://code.claude.com/docs/en/claude-directory), [Claude Code Settings](https://code.claude.com/docs/en/settings) | `verified fact` |

---

## 4. Cursor IDE

| Attribute | Detail | Confidence |
|-----------|--------|------------|
| **Supported instruction filenames** | **Current:** `.cursor/rules/*.mdc` (modular rule files with YAML frontmatter), `AGENTS.md` (cross-IDE standard, project root). **Global:** User Rules (in Cursor settings). **Automated:** Memories (automatically generated rules from chat). **Legacy (still supported, deprecated):** `.cursorrules`. | `verified fact` |
| **Expected file locations** | `.cursor/rules/`: project root. `AGENTS.md`: project root. `.cursorrules`: project root (legacy). User Rules: Cursor settings UI (global). | `verified fact` |
| **Frontmatter requirements** | `.mdc` files: yes — YAML frontmatter with `description` (required) and `globs` (optional, determines which files the rule applies to). `AGENTS.md`: **none**. `.cursorrules`: **none** (plain text). | `verified fact` |
| **Precedence rules** | Priority: **User Rules** (global, always apply) → **Project Rules** (`.cursor/rules/*.mdc`) → **AGENTS.md** → **Memories** (auto-generated). Within `.cursor/rules/`: all `.mdc` files loaded, with `globs` field determining applicability to specific files. `.cursorrules` (legacy) treated as a single monolithic rule file. | `research finding` |
| **Directory inheritance** | **Yes — glob-scoped rules.** `.mdc` files can have a `globs` field that restricts them to specific file patterns. Rules apply when files matching the glob are accessed. Without a `globs` field, the rule applies globally. `AGENTS.md` at project root applies globally. | `research finding` |
| **Size / context limitations** | Not explicitly documented. Context window dependent. Practical guidance: keep rules focused and modular. `.mdc` modular approach naturally limits per-file size. | `assumption` |
| **Installation procedure** | Create `.cursor/rules/design-canon.mdc` with required frontmatter and rule content. Or create `AGENTS.md` at project root. Or use legacy `.cursorrules`. Rules can also be added through Cursor's UI. | `verified fact` |
| **Uninstall procedure** | Delete the rule file(s). Remove from Cursor's UI if added there. | `verified fact` |
| **Refresh / reload behavior** | Requires **IDE reload** (`Developer: Reload Window`) for changes to take effect. No hot-reload. AGENTS.md changes may take effect on new Cursor chat/session without full reload (undocumented — behavior varies). | `research finding` |
| **Known limitations** | `.cursorrules` is deprecated but still functional. `.mdc` rules require specific YAML frontmatter format. All project rules in `.cursor/rules/` are loaded at startup — no lazy loading per subdirectory. AGENTS.md support is a later addition and may not be as deeply integrated as `.mdc`. | `verified fact` |
| **Official source links** | [Cursor Rules docs](https://docs.cursor.com/context/rules), [Cursor Docs](https://cursor.com/docs/rules) | `verified fact` |

---

## 5. Windsurf IDE (now Devin Desktop)

| Attribute | Detail | Confidence |
|-----------|--------|------------|
| **Supported instruction filenames** | **Current:** `.devin/rules/*.md` (post-June 2026 rebrand to Devin Desktop). **Legacy:** `.windsurf/rules/*.md` (kept as fallback), `.windsurfrules` (legacy single file, still read). Also: `AGENTS.md` (cross-IDE recognition), `prompts.md` (for named prompt shortcuts, accessed via `/` in Cascade). | `research finding` |
| **Expected file locations** | `.devin/rules/` or `.windsurf/rules/`: project root. `.windsurfrules`: project root (legacy). `AGENTS.md`: project root. | `research finding` |
| **Frontmatter requirements** | Not publicly documented for `.devin/rules/*.md` files. Likely follows similar pattern to Cursor's `.mdc`. `AGENTS.md`: none. `.windsurfrules`: none (plain markdown). | `assumption` |
| **Precedence rules** | Priority order: **Global Rules** (user settings) → **`.windsurfrules` or `.devin/rules/`** → **Memories** (auto-accumulated from chat) → **User prompt**. Exact precedence between `.windsurfrules` and `.devin/rules/*.md` when both exist is undocumented. | `research finding` |
| **Directory inheritance** | Not documented. Based on industry patterns, likely root-level rules apply globally. The directory-based approach (`.windsurf/rules/`) suggests potential for glob-scoped rules similar to Cursor, but unconfirmed. | `assumption` |
| **Size / context limitations** | Not documented. Context window dependent. | `assumption` |
| **Installation procedure** | Create `.windsurfrules` at project root, or create rule files under `.windsurf/rules/` or `.devin/rules/`. | `research finding` |
| **Uninstall procedure** | Delete the rule file(s) or directory. | `research finding` |
| **Refresh / reload behavior** | Not documented. Most IDEs in this category require restart/reload. | `assumption` |
| **Known limitations** | **Documentation is sparse.** The product recently rebranded from Windsurf to Devin Desktop (June 2026), which may cause further documentation churn. Exact rule format, frontmatter requirements, and loading behavior should be verified against actual product behavior. `prompts.md` is a Windsurf-specific feature not shared with other tools. | `research finding` |
| **Official source links** | [Windsurf Cascade docs](https://docs.windsurf.com/plugins/cascade/cascade-overview), [Windsurf Rules guide (third-party)](https://design.dev/guides/windsurf-rules/), [Devin Desktop docs](https://docs.devin.ai/desktop/cascade/memories) | `research finding` |

---

## 6. Generic AGENTS.md (Cross-IDE Standard)

| Attribute | Detail | Confidence |
|-----------|--------|------------|
| **Supported instruction filenames** | `AGENTS.md` (standardized), `AGENT.md` (alias, can symlink to AGENTS.md for backward compat). | `verified fact` |
| **Expected file locations** | Repository root (primary). Also recognized in `.github/` by GitHub UI. Nested: subdirectory `AGENTS.md` files for monorepo packages. | `verified fact` |
| **Frontmatter requirements** | **None.** Pure markdown. No YAML frontmatter, no required fields. AGENTS.md is "just standard Markdown." | `verified fact` |
| **Precedence rules** | **Closest AGENTS.md to the edited file wins.** Explicit user chat prompts override everything. The standard does not prescribe a single precedence algorithm — each tool implements it differently (Codex uses nearest-file, Claude Code walks directory tree, etc.). | `verified fact` |
| **Directory inheritance** | **Yes — nested support.** Tools that implement the standard should read the nearest AGENTS.md in the directory tree. OpenAI's repo has 88 nested AGENTS.md files as a reference. | `verified fact` |
| **Size / context limitations** | No hard limit defined by the standard. Tool-dependent. Practical guidance: keep concise (models follow shorter instructions better). | `verified fact` |
| **Installation procedure** | Create `AGENTS.md` at project root. Most agents auto-discover it. | `verified fact` |
| **Uninstall procedure** | Delete `AGENTS.md`. | `verified fact` |
| **Refresh / reload behavior** | Tool-dependent. Most CLI tools read at session start; most IDEs require restart/reload. | `verified fact` |
| **Known limitations** | Not all coding agents recognize AGENTS.md yet. The standard does not define a machine-readable metadata format (no frontmatter). Behavior when both AGENTS.md and tool-specific files (CLAUDE.md, .cursorrules, .windsurfrules) exist is tool-dependent and often undocumented. | `verified fact` |
| **Official source links** | [agents.md](https://agents.md/) — stewarded by Agentic AI Foundation under Linux Foundation, [GitHub AGENTS.md search (60k+ repos)](https://github.com/search?q=path%3AAGENTS.md+NOT+is%3Afork+NOT+is%3Aarchived&type=code) | `verified fact` |

---

## 7. DESIGN.md-Compatible Agents

| Attribute | Detail | Confidence |
|-----------|--------|------------|
| **Supported instruction filenames** | `DESIGN.md` (standardized by Google Labs spec). | `verified fact` |
| **Expected file locations** | Project root (by convention). Not a spec requirement but the de facto standard. | `research finding` |
| **Frontmatter requirements** | **Yes — YAML frontmatter** is the core of the spec. Defines design tokens: `colors`, `typography`, `spacing`, `rounded`, `components`. Followed by markdown body sections (Overview, Colors, Typography, Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts). Frontmatter must begin/end with `---`. | `verified fact` |
| **Precedence rules** | Not standardized — tool-dependent. DESIGN.md is a data format, not a runtime instruction system. Tools that consume it may merge it with other instruction files. | `research finding` |
| **Directory inheritance** | Not defined by the spec. Tool-dependent. By convention, one DESIGN.md per project/product. | `research finding` |
| **Size / context limitations** | No hard limit in spec. Practical constraint: design system tokens typically 200-500 lines. | `verified fact` |
| **Installation procedure** | Create `DESIGN.md` at project root with YAML frontmatter + markdown body. Explicit tool support required. | `verified fact` |
| **Uninstall procedure** | Delete `DESIGN.md`. | `verified fact` |
| **Refresh / reload behavior** | Tool-dependent. No standardized refresh mechanism. | `assumption` |
| **Known limitations** | **Not universally recognized.** Requires explicit tool support. Currently compatible with: Claude Code, Cursor, Kiro, Windsurf (per designmd.app). Original Google Stitch integration. The spec is in "alpha" version. Consumer behavior for unknown content is documented (see spec), but actual tool implementations may vary. | `verified fact` |
| **Official source links** | [DESIGN.md spec](https://github.com/google-labs-code/design.md/blob/main/docs/spec.md), [DESIGN.md library (461+ files)](https://designmd.app/), [Google Stitch announcement](https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-design-md/) | `verified fact` |

---

## 8. Agent Skills System (agentskills.io)

| Attribute | Detail | Confidence |
|-----------|--------|------------|
| **Supported instruction filenames** | `SKILL.md` (primary), with supporting files in `references/`, `templates/`, `scripts/`, `examples/`, `assets/` directories. | `verified fact` |
| **Expected file locations** | Hermes: `~/.hermes/skills/<category>/<name>/SKILL.md`. Agent Skills Hub: centralized registry. External dirs configurable via `skills.external_dirs`. | `verified fact` |
| **Frontmatter requirements** | **Yes — YAML frontmatter required.** Minimum: `name` (string) and `description` (string, ≤60 chars recommended). Optional: `version`, `author`, `license`, `platforms`, `metadata.hermes` (tags, category, fallback/requires toolsets, config settings), `required_environment_variables`. | `verified fact` |
| **Precedence rules** | Skills are **on-demand** — loaded explicitly via `/skill-name` command, `skill_view()` tool, or skill bundles. Not automatically injected into every session. Local skills shadow external dir skills with the same name. Bundle names take precedence over individual skill names. | `verified fact` |
| **Directory inheritance** | **Not applicable.** Skills are loaded by name, not by directory tree position. Categories are organizational only. | `verified fact` |
| **Size / context limitations** | Skills use **progressive disclosure:** `skills_list()` shows ~3K tokens of all skill names/descriptions, `skill_view(name)` loads full content on demand. No hard per-skill size limit, but practical constraints apply. | `verified fact` |
| **Installation procedure** | Hermes: `skill_manage(action='create', ...)`, `/learn` command, manual placement in skills directory, or install from Skills Hub. | `verified fact` |
| **Uninstall procedure** | Hermes: `skill_manage(action='delete', name='...')`, or delete the skill directory. | `verified fact` |
| **Refresh / reload behavior** | Skills loaded **per-invocation** (every `/skill` command re-reads the SKILL.md). Changes take effect immediately for the next invocation. No session restart needed. | `verified fact` |
| **Known limitations** | Primarily a **Hermes Agent** feature — other tools (OpenCode, Goose) may have similar but incompatible skill systems. The agentskills.io standard is emerging but not universally adopted. Skills with `platforms` restriction are hidden on incompatible OS. Write-approval gate (`skills.write_approval`) can require human review for skill changes. | `verified fact` |
| **Official source links** | [Hermes Skills docs](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills), [Hermes Creating Skills](https://hermes-agent.nousresearch.com/docs/developer-guide/creating-skills), [agentskills.io spec](https://agentskills.io/specification) | `verified fact` |

---

## Cross-Cutting Comparison

| Aspect | Hermes | Codex CLI | Claude Code | Cursor | Windsurf | AGENTS.md std | DESIGN.md | Skills |
|--------|--------|-----------|-------------|--------|----------|---------------|-----------|--------|
| **Primary filename** | `.hermes.md` | `AGENTS.md` | `CLAUDE.md` | `.cursor/rules/*.mdc` | `.windsurfrules` → `.devin/rules/` | `AGENTS.md` | `DESIGN.md` | `SKILL.md` |
| **Frontmatter needed?** | No (ctx) / Yes (skills) | No | No | Yes (.mdc) | Undocumented | No | Yes | Yes |
| **Nested file support?** | Yes (progressive) | Yes (nearest wins) | Yes (tree walk + lazy) | Yes (globs) | Undocumented | Yes (tool-dependent) | No | N/A |
| **Auto-loaded?** | Yes (ctx files) | Yes | Yes | Yes | Yes | Yes (if supported) | No | On-demand |
| **Size limit** | 20K chars | `project_doc_max_bytes` | ~200 lines suggested | Undocumented | Undocumented | N/A | N/A | N/A |
| **Hot-reload?** | Partial (progressive) | No | Partial (compact) | No (reload required) | Undocumented | Tool-dependent | Tool-dependent | Yes (next invocation) |

---

## Conflicts & Unknowns

1. **Hermes + AGENTS.md**: Hermes reads AGENTS.md as project context, BUT only when no `.hermes.md` is present. If a project has both, AGENTS.md is ignored. This is unusual compared to other tools that merge or layer multiple files.

2. **Claude Code + AGENTS.md**: Officially, Claude Code reads AGENTS.md. But its primary format is CLAUDE.md. The exact merging behavior when both AGENTS.md and CLAUDE.md exist at the same level is **undocumented** — does one take precedence, or are both loaded?

3. **Codex AGENTS.override.md**: The global `~/.codex/AGENTS.override.md` vs `~/.codex/AGENTS.md` hierarchy is documented on learn.chatgpt.com but NOT in the primary Codex docs. This may change.

4. **Windsurf → Devin Desktop rebrand**: June 2026 rebrand means documentation is in flux. `.devin/rules/` is the new path, but `.windsurf/rules/` and `.windsurfrules` still work. Exact format for rule files in the new directory is undocumented.

5. **DESIGN.md agent support**: designmd.app claims compatibility with Claude Code, Cursor, Kiro, and Windsurf, but actual testing is needed to verify that these tools load DESIGN.md automatically vs needing explicit instruction.

6. **"Design Canon" name collision**: The DESIGN.md spec from Google Labs and this "Design Canon" project are complementary but distinct. The canon may compile to DESIGN.md as one output target, but DESIGN.md is a data format, not a policy compiler.

---

## Research Methodology

- **Primary sources**: Official documentation pages, GitHub READMEs, spec documents
- **Secondary sources**: Community blog posts, issue trackers (for behavioral details not in docs)
- **Confidence tagging**: Each claim is tagged as:
  - `verified fact` — confirmed by official documentation or primary source
  - `research finding` — found through research but official docs are limited/unclear
  - `assumption` — reasonable inference from available evidence, not confirmed
  - `proposal` — recommendation for Design Canon, not a description of existing behavior
- **Blockers**: Claude Code memory docs were only available via HTML (1.3M chars), extracted with regex. Codex AGENTS.md docs were a redirect to a non-loading page. Some URL extracts failed (DuckDuckGo was search-only, not an extraction backend).

---

*Generated 2026-07-18 for the Design Canon project research/agent-compatibility branch.*
