# Architecture

Design Canon separates design knowledge from agent prompts.

## Layers

1. **Rule catalog**: atomic, versioned rules with scope, severity, rationale, verification, and optional mechanical detectors.
2. **Profiles**: surface-specific selections and overrides. A dashboard should not inherit every landing-page rule.
3. **Compiler**: produces compact `DESIGN.md`, `SKILL.md`, or `AGENTS.md` instructions from the selected profile.
4. **Static linter**: scans source files for detectable anti-patterns and accessibility failures. Results are heuristics with evidence.
5. **Visual judge**: planned screenshot-based review with structured findings and before/after evidence.
6. **Taste memory**: planned local preference profile learned from explicit approvals and rejections, with decay and project isolation.
7. **Benchmark harness**: planned paired evaluations that compare agent output with and without a canon under fixed tasks and rubrics.

## Design Principles

- **Contextual over universal**: gradients, shadows, cards, and familiar fonts are not sins. Unexamined defaults are.
- **Progressive disclosure**: load the smallest useful rule set instead of injecting a giant prompt.
- **Evidence over vibes**: every enforceable rule should define verification and every detector should show evidence.
- **Agent-agnostic**: support open instruction formats rather than binding the project to one model vendor.
- **Clean-room implementation**: learn from public behavior and open standards without copying unlicensed proprietary prompt files.
- **Human authority**: lint and visual scores inform judgment; they do not replace it.

## Proposed Visual Review Contract

A visual review should return machine-readable JSON with:

- profile and viewport
- design score and generic-output score
- findings grouped by hierarchy, type, spacing, color, depth, motion, responsiveness, accessibility, and originality
- evidence regions or selectors
- severity and confidence
- suggested next actions
- explicit pass threshold

The Markdown report is rendered from the same JSON so automation and human review cannot drift.
