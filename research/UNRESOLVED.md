# Unresolved Architectural Questions

> Collected during research-track implementation. These require maintainer review
> before finalization.

## Track A — Benchmark Factory

1. **Scoring weight allocation** — Should visual hierarchy, typography, accessibility,
   and originality each receive equal weight, or should they be weighted by surface type?
   A marketing page vs. a developer dashboard will prioritise different dimensions.

2. **Human-preference protocol** — Should reviewers see paired outputs side-by-side
   (A/B blind) or individually sequenced? Side-by-side is faster but risks anchoring;
   individual sequencing is cleaner but requires more sessions.

3. **Statistical significance** — What is the minimum paired-run count per brief before
   claiming a significant result? The methodology proposes N=10 per condition, but
   this should be validated against expected effect size.

4. **Model version pinning** — Should each benchmark run pin the model to a specific
   version (e.g., `claude-sonnet-4-20260701`) or allow latest-at-time-of-run and record
   the actual version? Pinning improves reproducibility; latest-at-run improves
   real-world relevance.

## Track B — Agent Compatibility

5. **Windsurf documentation gaps** — Windsurf documentation is significantly less
   detailed than Cursor or Claude Code regarding instruction-file precedence. Is
   the assumption that Windsurf follows Cursor-like conventions acceptable, or
   should we defer Windsurf support until documentation improves?

6. **AGENTS.md vs CLAUDE.md conflict** — When both exist in the same repo for
   Claude Code, which wins? Official docs imply AGENTS.md is preferred but
   CLAUDE.md may also be read. Need clarification from Anthropic.

7. **Design Canon adapter output format** — Should adapter outputs be single files
   (e.g., one AGENTS.md) or split by concern (DESIGN.md for direction + AGENTS.md
   for rules)? Single file is simpler; split files allow independent refresh.

## Track C — Fixture Foundry

8. **Fixture scope creep** — Some fixtures necessarily trigger rules from categories
   beyond their primary anti-pattern. Should fixtures be scoped to demonstrate
   exactly one anti-pattern, or is multi-rule triggering acceptable as "realistic bad
   code"? The current approach allows realistic overlap but documents all expected
   findings.

9. **New rule proposals** — When a fixture anti-pattern has no matching rule (e.g.,
   decorative animation overload without a `motion.decorative-overload` rule), should
   the fixture still be created and marked, or deferred until the rule exists?
   Created and marked as `[proposed]`.

## Track D — Platform QA

10. **macOS availability** — The project has intermittent macOS CI access. Should
    macOS-specific test cases be marked as "deferred" or "requires manual testing"?
    Marked as requiring manual testing with note.

11. **SIGINT handling** — The current CLI uses `process.exitCode`. Does Ctrl+C during
    a long lint produce a clean partial report or an unceremonious dump? Test needed.

12. **Read-only directory behavior** — The linter writes only to stdout/stderr and
    exit code. Does it attempt any writes (cache, temp files, config updates)? Current
    code appears clean, but a write-only test case is needed to confirm.

## Cross-Cutting

13. **Provenance record maintenance** — As the project evolves, how should provenance
    records for research artifacts be kept current? Option A: git-tracked in each
    research directory. Option B: separate PROVENANCE.md in the root. Option A is
    recommended for branch isolation but creates duplication.
