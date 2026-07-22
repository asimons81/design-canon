# Architecture

Design Canon separates design knowledge from agent prompts and separates mechanical evidence from subjective judgment.

## Layers

1. **Rule catalog**: atomic, versioned rules with scope, severity, rationale, verification, and optional mechanical detectors.
2. **Profiles**: surface-specific selections and overrides. A dashboard should not inherit every landing-page rule.
3. **Compiler**: produces compact `DESIGN.md`, `SKILL.md`, or `AGENTS.md` instructions from the selected profile.
4. **Static linter**: scans supported source files without a browser for bounded anti-pattern and accessibility heuristics. Findings carry evidence and remain review triggers rather than aesthetic verdicts.
5. **Browser-assisted mechanical analysis**: optionally renders local HTML in an isolated Playwright Chromium context for supported measurements such as text contrast and touch-target geometry. External network access is blocked. Confirmed, indeterminate, skipped, and failed analysis states remain distinct.
6. **Visual judge**: planned screenshot-based review for broader composition, hierarchy, originality, and before-and-after evidence. This layer is not implemented by the current browser-assisted mechanical analyzers.
7. **Taste memory**: planned local preference profile learned from explicit approvals and rejections, with decay and project isolation.
8. **Benchmark harness**: implemented fail-closed calibration infrastructure for fixed prompts, isolated agent execution, usage accounting, local capture, lint, accessibility calibration, and immutable evidence. The full paired benchmark campaign and blind comparison remain planned.

## Execution Modes

The linter exposes three modes:

- `static`: source analysis only. This is the default and requires no browser dependency.
- `auto`: run browser-assisted analyzers when Playwright and Chromium are available; otherwise preserve static results and report browser analysis as skipped.
- `browser`: require browser-assisted analysis and fail when the capability is unavailable.

Browser mode does not crawl public websites. It operates on local HTML and scan-root-contained assets under the security policy in `src/browser/`.

## Design Principles

- **Contextual over universal**: gradients, shadows, cards, and familiar fonts are not sins. Unexamined defaults are.
- **Progressive disclosure**: load the smallest useful rule set instead of injecting a giant prompt.
- **Evidence over vibes**: every enforceable rule should define verification and every detector should show evidence.
- **Mechanical versus subjective separation**: rendered measurements do not become a general design score.
- **Agent-agnostic**: support open instruction formats rather than binding the project to one model vendor.
- **Clean-room implementation**: learn from public behavior and open standards without copying unlicensed proprietary prompt files.
- **Human authority**: lint and future visual scores inform judgment; they do not replace it.
- **Explicit spend boundaries**: provider-backed research is opt-in, budgeted, and separate from normal local product use.
- **Release-state precision**: tagged source, GitHub Releases, npm packages, and provenance are verified independently.

## Proposed Visual Review Contract

A future visual review should return machine-readable JSON with:

- profile and viewport;
- design score and generic-output score;
- findings grouped by hierarchy, type, spacing, color, depth, motion, responsiveness, accessibility, and originality;
- evidence regions or selectors;
- severity and confidence;
- suggested next actions;
- explicit pass threshold;
- provenance for every mechanical, model-generated, and human conclusion.

The Markdown report will be rendered from the same JSON so automation and human review cannot drift.
