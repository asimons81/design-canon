# Provenance Record

> Generated for Design Canon research tracks. See also individual provenance notes
> within each track's output files.

## Meta

| Field | Value |
|-------|-------|
| Agent | Hermes (Hermes Agent by Nous Research) |
| Model | deepseek-v4-flash |
| Date | 2026-07-18 |
| Repository | github.com/asimons81/design-canon |
| Base commit | `ae8484d` (HEAD of `main` at start) |

## Tracks

### Track A — Benchmark Factory

| Field | Value |
|-------|-------|
| Branch | `research/benchmark-factory` |
| Output path | `research/benchmarks/`, `research/methodology/` |
| Content type | proposal |
| Research method | Clean-room benchmark briefs based on common frontend surface types |
| Assumptions | Briefs are brand-neutral and framework-neutral by construction |
| Validation | All 15 briefs follow the same template; methodology separates objective from subjective metrics |
| Unresolved | Scoring weights; human-preference rubric; statistical significance threshold |

### Track B — Agent Compatibility

| Field | Value |
|-------|-------|
| Branch | `research/agent-compatibility` |
| Output path | `research/compatibility/` |
| Content type | research finding / verified fact / assumption (per claim) |
| Research method | Official documentation where available; primary-source web research |
| Assumptions | Tool documentation accessed on 2026-07-18 is current |
| Validation | Each claim tagged with confidence level; conflicting/undocumented behavior flagged |
| Unresolved | Some tools (e.g. Windsurf) have limited public documentation; claims marked accordingly |

### Track C — Fixture Foundry

| Field | Value |
|-------|-------|
| Branch | `fixtures/anti-slop-suite` |
| Output path | `fixtures/patterns/` |
| Content type | generated fixture |
| Research method | Deliberate anti-pattern construction targeting existing Design Canon rule IDs |
| Assumptions | Fixtures target the existing `rules/core.json` rule set only |
| Validation | Expected findings documented in MANIFEST.md per fixture |
| Unresolved | No new rule IDs proposed without explicit `[proposed]` marking |

### Track D — Platform QA

| Field | Value |
|-------|-------|
| Branch | `qa/platform-matrix` |
| Output path | `qa/` |
| Content type | proposal |
| Research method | Systematic enumeration of platform, installation, and runtime scenarios |
| Assumptions | Test cases assume standard Node.js/npm/git tooling on each platform |
| Validation | Each test case has discrete expected result and cleanup procedure |
| Unresolved | macOS testing requires hardware not consistently available |

## Non-Goals

The following are explicitly out of scope for this work package:

- Modifying `main` branch
- Publishing npm packages
- Creating GitHub releases
- Tagging versions
- Modifying branch protection or security settings
- Changing public schemas
- Changing suppression semantics
- Changing CLI commands or package exports
- Adding runtime dependencies
- Finalizing benchmark scoring policy
- Implementing agent adapters
- Adding fixtures to the core catalog
- Copying proprietary prompt files or unlicensed rule sets
- Claiming superiority without evidence

## Source References

| Reference | URL | Accessed |
|-----------|-----|----------|
| Design Canon repo | https://github.com/asimons81/design-canon | 2026-07-18 |
| Design Canon README | README.md at commit `ae8484d` | 2026-07-18 |
| Design Canon rules | rules/core.json at commit `ae8484d` | 2026-07-18 |
| Design Canon profiles | profiles/*.json at commit `ae8484d` | 2026-07-18 |
| Design Canon schemas | schema/*.json at commit `ae8484d` | 2026-07-18 |
| Hermes Agent docs | https://hermes-agent.nousresearch.com/docs | 2026-07-18 |
| OpenAI Codex docs | https://codex.docs.openai.com | 2026-07-18 |
| Claude Code docs | https://docs.anthropic.com/en/docs/claude-code | 2026-07-18 |
| Cursor docs | https://docs.cursor.com | 2026-07-18 |
| Windsurf docs | https://docs.windsurf.com | 2026-07-18 |
| AGENTS.md convention | https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-agents-md | 2026-07-18 |
