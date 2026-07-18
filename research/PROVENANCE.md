# Research Provenance

## Origin

The initial four-track research package was generated on 2026-07-18 by Hermes Agent using `deepseek-v4-flash` on isolated feature branches:

- `research/benchmark-factory`
- `research/agent-compatibility`
- `fixtures/anti-slop-suite`
- `qa/platform-matrix`

The requested boundaries prohibited runtime API changes, schema changes, package publication, release tags, branch-protection changes, and unsupported superiority claims.

## Maintainer review

The material was subsequently reviewed and edited before merge. Review included:

- checking benchmark structure and executable profile assignments,
- separating deterministic fixture output from future semantic expectations,
- running every fixture against the current linter,
- adding regression tests for benchmark structure and fixture findings,
- verifying agent compatibility claims against primary documentation,
- removing speculative or unsupported adapter behavior,
- distinguishing Design Canon's current policy document from Google DESIGN.md conformance,
- replacing hard-coded and nondeterministic QA commands,
- running repository verification and the complete test suite on each branch.

The merged files therefore represent a combination of generated research and maintainer-reviewed corrections. They should not be treated as untouched model output.

## Source classes

### Repository sources

- the Design Canon rule catalog,
- profile definitions,
- schemas,
- CLI implementation,
- tests,
- configuration and release documentation.

### Primary external documentation

Compatibility claims were checked against the official documentation or source repositories for:

- Hermes Agent,
- OpenAI Codex,
- Claude Code,
- Cursor,
- Windsurf,
- AGENTS.md,
- Google DESIGN.md,
- Agent Skills.

Primary-source links are preserved beside the reviewed claims in `research/compatibility/MATRIX.md`.

## Content classification

- Benchmark briefs: **proposal**
- Benchmark methodology: **maintainer-reviewed proposal**
- Compatibility matrix: **maintainer-reviewed research**
- Adapter plan: **proposal**
- HTML anti-pattern files: **generated fixtures**
- Fixture counts: **verified against the current linter and enforced by tests**
- QA matrix: **maintainer-reviewed test specification, not execution evidence**

## Limitations

- No official benchmark runs have been completed.
- No blind preference dataset exists yet.
- No agent adapter from the research plan has been implemented yet.
- The QA matrix does not certify platforms until execution evidence is attached.
- Tool behavior may change. Compatibility claims require revalidation before stable adapter releases.
- Google DESIGN.md compatibility requires a dedicated validated adapter and concrete project token input.

## Clean-room statement

The research and fixtures were created from public documentation, the existing Design Canon implementation, and original synthetic examples. Proprietary prompt files and unlicensed rule catalogs were not intentionally copied.
