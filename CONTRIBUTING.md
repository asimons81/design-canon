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

`npm run check` verifies repository policy and internal Markdown links. Do not bypass it for documentation-only changes.

## Rule Requirements

A proposed rule must be:

- scoped to the surfaces where it applies;
- written as an actionable instruction;
- accompanied by a rationale when the tradeoff is not obvious;
- paired with observable verification;
- explicit about whether a detector is definitive or heuristic;
- covered by a fixture or regression test when mechanically detectable;
- free of copied proprietary prompt text and unlicensed branded systems.

A rule that says only “make it look better” is not a rule.

## Detector Requirements

Regex detectors operate on untrusted source text. Keep them narrow, bounded, and explainable.

Every detector pull request must include:

- representative positive fixtures;
- representative negative fixtures;
- expected evidence;
- false-positive discussion;
- a reason the check belongs in static or browser-assisted linting rather than subjective visual review.

Avoid catastrophic backtracking, whole-repository catchalls, and rules that silently read generated output or dependencies.

## Documentation Requirements

Documentation is part of the product contract.

- Link to the current source of truth instead of duplicating operational state across multiple files.
- Label historical research as historical when a newer contract supersedes it.
- Distinguish implemented, calibrated, tagged, released on GitHub, published to npm, provenance-backed, and planned.
- Use source-checkout commands until a public npm version is independently verified.
- Keep command examples explicit about their working directory and prerequisites.
- Update [`docs/RELEASE_STATUS.md`](docs/RELEASE_STATUS.md) whenever release state changes.
- Update `CHANGELOG.md` for user-visible behavior or operational changes.
- Run `npm run check` after changing Markdown links, file names, package versions, workflows, or release documentation.

Do not rewrite immutable benchmark history to make it look cleaner. Add a current status note and preserve the original decision trail.

## Benchmark Requirements

Benchmark code must be reviewable without spending money or contacting a model provider.

- CI and pull-request tests must use fixtures, fake CLIs, or provider-free probes.
- Live provider calls require separate, explicit user authorization with the exact attempt count and a reviewed spend estimate.
- Attempt IDs are immutable and must never be overwritten or reused.
- Failed evidence remains failed; do not relabel, repair in place, or infer a winner from incomplete calibration data.
- Do not commit `.benchmark/`, transcripts, screenshots, generated run source, authentication material, or machine-local evidence.
- Bootstrap scripts that modify users, packages, permissions, or sudoers must fail closed, pin external identities, and clearly state that they require a dedicated environment.

## Pull Requests

Keep changes focused. Complete the pull-request checklist and include screenshots when generated guidance changes visual output.

Resolve or explicitly supersede every blocking review thread before marking a pull request ready. Keep measured execution heads distinct from later documentation-only or maintenance commits.

Require all applicable repository, Node, browser, package, dependency, and security checks. Merge with the expected head SHA so a moving branch cannot slip through review.

Open an issue before adding a broad aesthetic prohibition. Contextual defaults should not become universal dogma by accident.

## Branch Lifecycle

- Create short-lived topic branches from current `main`.
- Do not build new work on a merged topic branch.
- Delete same-repository head branches after their pull requests are squash-merged.
- Preserve branches with open pull requests or commits not reachable from `main`.
- Use immutable tags for release history. Never move, reuse, or replace a release tag.
- Follow [`docs/MAINTENANCE.md`](docs/MAINTENANCE.md) for safe branch auditing and deletion.

## Releases

A version bump or tag is not enough to claim a release. Follow [`docs/RELEASE_STATUS.md`](docs/RELEASE_STATUS.md) and [`docs/RELEASING.md`](docs/RELEASING.md).

Never claim npm provenance unless the registry exposes it for the exact version. Never announce a package before its dist-tag, integrity values, contents, and clean installation have been verified.

## Security

Read `SECURITY.md` before contributing executable adapters, rule loading, source traversal, CI, publishing, benchmark tooling, or third-party integrations.
