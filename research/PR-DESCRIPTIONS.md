# Design Canon Research Work — Draft PRs

PR descriptions to use when creating draft pull requests from each research branch.

---

## PR: research/benchmark-factory

**Title:** Research: Benchmark factory — 15 briefs + methodology proposal

**Body:**

```markdown
## Summary

This PR introduces a reproducible benchmark suite and methodology for evaluating
whether Design Canon guidance measurably improves AI-generated interfaces.

## Contents

### Benchmark Briefs (research/benchmarks/)

15 brand-neutral, model-neutral, framework-neutral frontend benchmark briefs:

| ID | Title | Surface Type |
|----|-------|-------------|
| B001 | SaaS Landing Page | marketing |
| B002 | Developer Dashboard | product-app |
| B003 | Editorial Article | editorial |
| B004 | Documentation Site | product-app |
| B005 | Application Settings | product-app |
| B006 | Mobile Onboarding | marketing |
| B007 | E-Commerce Product Page | marketing |
| B008 | Pricing Page | marketing |
| B009 | Personal Portfolio | marketing |
| B010 | Data-Dense Analytics | product-app |
| B011 | Public-Sector Service | editorial |
| B012 | Authentication Flow | product-app |
| B013 | Project-Management Board | product-app |
| B014 | Mobile Finance Interface | product-app |
| B015 | Legacy Interface Redesign | mixed |

Each brief specifies: objective, audience, supplied content, functional requirements,
required components, interaction states, viewports, accessibility expectations,
prohibited shortcuts, scoring categories, expected deliverables, run-manifest fields,
and known ambiguity risks.

### Methodology Proposal (research/methodology/PROPOSAL.md)

A draft methodology for comparing three conditions:
1. No design guidance
2. Large generic design prompt
3. Design Canon compiled guidance

Proposes recording: model, version, prompts, instruction files, token usage, runtime,
source output, screenshots, viewport dimensions, accessibility results, lint findings,
commit hashes, environment, and human preference votes.

Objective metrics are clearly separated from subjective evaluation.

## Status

- [x] All 15 briefs created
- [x] Methodology drafted
- [ ] Scoring weights — proposed for review, not finalized

## Non-Goals

- No evaluation of Design Canon vs. alternatives
- No scoring finalization
- No benchmark execution
- No modifications to core runtime or CLI
```

---

## PR: research/agent-compatibility

**Title:** Research: Agent compatibility matrix + adapter recommendations

**Body:**

```markdown
## Summary

This PR documents how 8 AI coding tools consume persistent project instructions,
and proposes adapter output formats for each.

## Contents

### Compatibility Matrix (research/compatibility/MATRIX.md)

Detailed comparison across:

- Hermes Agent
- OpenAI Codex CLI/Desktop
- Claude Code
- Cursor IDE
- Windsurf IDE
- Generic AGENTS.md agents
- DESIGN.md-compatible agents
- Agent Skills-compatible tools

For each tool, documents: supported filenames, expected locations, frontmatter
requirements, precedence rules, directory inheritance, size limits, installation
and uninstall procedures, refresh behavior, known limitations, and official
source links. Every claim is tagged with a confidence level.

### Adapter Recommendations (research/compatibility/ADAPTERS.md)

Proposes output format, filename, placement, and frontmatter for each tool.
Does not implement adapters; flags conflicting or undocumented behavior.

## Confidence Legend

- **verified fact** — Confirmed in official documentation or primary source
- **research finding** — Observed behavior from reliable secondary sources
- **assumption** — Reasonable inference from available documentation
- **conflicting/undocumented** — Tools disagree or documentation is incomplete

## Status

- [x] Hermes Agent
- [x] OpenAI Codex
- [x] Claude Code
- [x] Cursor IDE
- [x] Windsurf IDE
- [x] Generic AGENTS.md
- [x] DESIGN.md-compatible
- [x] Agent Skills-compatible
- [ ] Implement adapters (deferred — this PR is research only)
```

---

## PR: fixtures/anti-slop-suite

**Title:** Fixtures: Anti-slop suite — 15 intentionally poor frontend fixtures

**Body:**

```markdown
## Summary

This PR introduces 15 deliberately bad frontend HTML fixtures for testing
Design Canon's linter and rule detectors.

## Contents

### Fixtures (fixtures/patterns/)

| ID | File | Anti-Pattern | Target Profile |
|----|------|-------------|----------------|
| F001 | F001-index.html | Purple gradient default | marketing |
| F002 | F002-index.html | Centered-everything layout | marketing |
| F003 | F003-index.html | Excessive pill shapes | marketing |
| F004 | F004-index.html | Giant rounded cards | marketing |
| F005 | F005-index.html | Shadow soup | marketing |
| F006 | F006-index.html | Generic hero copy | marketing |
| F007 | F007-index.html | Hidden keyboard focus | marketing |
| F008 | F008-index.html | transition: all | marketing |
| F009 | F009-index.html | Weak information hierarchy | marketing |
| F010 | F010-index.html | Unreadable editorial measure | editorial |
| F011 | F011-index.html | Poor dashboard density | product-app |
| F012 | F012-index.html | Competing primary CTAs | marketing |
| F013 | F013-index.html | Inconsistent spacing tokens | marketing |
| F014 | F014-index.html | Decorative animation overload | marketing |
| F015 | F015-index.html | Weak mobile hierarchy | marketing |

### Expected Findings (fixtures/patterns/MANIFEST.md)

Each fixture documented with: expected rule findings, expected severity, acceptable
finding count range, known false-positive risks, and explanation of why the fixture
is deliberately bad.

## Design Notes

- All fixtures are single self-contained HTML files with embedded CSS
- No external dependencies
- Only existing rule IDs from `rules/core.json` are referenced
- Multi-rule triggering is documented and expected (realistic bad code overlaps)
- New rule proposals are explicitly marked as `[proposed]`

## Status

- [x] All 15 fixtures created
- [x] Manifest with expected findings
- [x] No duplicate or modified core rules
```

---

## PR: qa/platform-matrix

**Title:** QA: Cross-platform verification matrix

**Body:**

```markdown
## Summary

This PR introduces a complete cross-platform verification matrix for Design
Canon, covering platform, installation, and runtime scenarios.

## Contents

### Verification Matrix (qa/MATRIX.md)

25 discrete test cases covering:

**Platform/Environment (5 cases):**
Windows native (CMD), Windows native (PowerShell), WSL, Ubuntu, macOS

**Node.js Versions (3 cases):**
Node.js 20, 22, 24

**Installation (3 cases):**
npm tarball, GitHub clone, paths with spaces

**Runtime (14 cases):**
Read-only directories, malformed JSON and config, invalid profiles, unknown rules,
expired suppressions, oversized files, symlinks, interrupted commands, empty projects,
unsupported file types, monorepos, nested projects, uninstall/reinstall

Each test case specifies:
- Test ID, environment, prerequisites, exact commands
- Expected result and exit code
- Files expected to change
- Cleanup procedure
- Failure evidence to capture

## Status

- [x] All 25 test cases documented
- [x] Platform/environment matrix
- [x] Install/uninstall scenarios
- [x] Edge cases and hostile inputs
- [ ] macOS cases marked for manual testing
```
