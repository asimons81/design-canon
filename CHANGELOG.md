# Changelog

All notable changes are documented here.

## Unreleased

### Security

- Added strict catalog and profile validation.
- Blocked unsafe profile names and path traversal.
- Added deterministic source traversal, symlink avoidance, directory exclusions, file-size limits, and a global finding cap.
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

## 0.1.0-alpha.0

- Added the initial structured rule catalog.
- Added marketing, product-app, and editorial profiles.
- Added compilation targets for `DESIGN.md`, `SKILL.md`, and general agent instructions.
- Added a dependency-free source linter with evidence-bearing findings.
- Added an Agent Skill, architecture notes, roadmap, tests, and fixture.
