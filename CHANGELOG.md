# Changelog

All notable changes are documented here.

## Unreleased

### Added

- Added project-local `design-canon.config.json` support.
- Added rationale-required, scope-limited suppressions with optional approver and expiration metadata.
- Added JSON reporting for suppressed findings and unused exceptions.
- Added a public configuration schema and configuration guide.

### Research

- Added a fail-closed, nonofficial B000 Codex calibration runner with immutable attempt manifests, isolated agent execution, lossless JSONL evidence, exact three-file source validation, binary-safe Git diffs, browser-network denial, viewport capture, lint, accessibility, and artifact hashing.
- Completed the B000 r2 calibration at measured execution head `9dcb12d831d0583f6f5e6ce974525be0b22c95e9`: all four frozen A/B/D/C conditions completed with zero retries and a final `GO` recommendation for the runner.
- Preserved failed r1 evidence as immutable and excluded it from r2 totals and claims. B001-B015 remain unexecuted and require separate authorization and budgeting.

### Fixed

- Corrected the dedicated WSL bootstrap to parse multi-word Chromium version output, verify the exact pinned Chromium SHA-256, and bind to the measured handoff head.
- Removed a legacy helper that could appear to validate hand-authored network-isolation booleans; live evidence must be machine-generated, attempt-bound, and hash-verifiable.

### Security

- Added strict catalog, profile, and configuration validation.
- Blocked unsafe profile names and path traversal.
- Added deterministic source traversal, symlink avoidance, directory exclusions, file-size limits, and a global finding cap.
- Eliminated the source-file stat/read race by inspecting and reading through one open file handle.
- Added strict CLI option parsing with fail-closed behavior.
- Added package publication allowlisting and provenance configuration.
- Pinned GitHub Actions to immutable commit SHAs.
- Added CodeQL, Dependabot, CODEOWNERS, issue forms, and a pull-request gate.

### Testing

- Added CLI, validation, profile-loading, and source-discovery regression tests.
- Expanded CI to Node.js 20, 22, and 24.
- Added package-content, dependency-audit, and CLI smoke gates.

### Documentation

- Added hardened contribution, security, and release procedures.
- Updated benchmark documentation to distinguish completed calibration from optional, separately funded benchmark execution.

## 0.1.0-alpha.0

- Added the initial structured rule catalog.
- Added marketing, product-app, and editorial profiles.
- Added compilation targets for `DESIGN.md`, `SKILL.md`, and general agent instructions.
- Added a dependency-free source linter with evidence-bearing findings.
- Added an Agent Skill, architecture notes, roadmap, tests, and fixture.
