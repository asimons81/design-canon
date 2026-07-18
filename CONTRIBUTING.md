# Contributing

Design Canon welcomes rules, profiles, detectors, fixtures, adapters, benchmarks, and documentation.

## Development

Requirements:

- Node.js 20 or newer
- npm
- Git

```bash
npm ci --ignore-scripts
npm run check
npm test
npm pack --dry-run --json
```

## Rule Requirements

A proposed rule must be:

- scoped to the surfaces where it applies
- written as an actionable instruction
- accompanied by a rationale when the tradeoff is not obvious
- paired with observable verification
- explicit about whether a detector is definitive or heuristic
- covered by a fixture or regression test when mechanically detectable
- free of copied proprietary prompt text and unlicensed branded systems

A rule that says only “make it look better” is not a rule.

## Detector Requirements

Regex detectors operate on untrusted source text. Keep them narrow, bounded, and explainable.

Every detector pull request must include:

- representative positive fixtures
- representative negative fixtures
- expected evidence
- false-positive discussion
- a reason the check belongs in static linting rather than visual review

Avoid catastrophic backtracking, whole-repository catchalls, and rules that silently read generated output or dependencies.

## Pull Requests

Keep changes focused. Update `CHANGELOG.md` for user-visible behavior. Complete the pull-request checklist and include screenshots when generated guidance changes visual output.

Open an issue before adding a broad aesthetic prohibition. Contextual defaults should not become universal dogma by accident.

## Security

Read `SECURITY.md` before contributing executable adapters, rule loading, source traversal, CI, publishing, or third-party integrations.
