# Documentation Map

Use this page to find the current source of truth. Historical research files remain valuable context, but they do not override current product, release, or benchmark status.

## Start here

- [`../README.md`](../README.md) - project overview and source-based quick start
- [`RELEASE_STATUS.md`](RELEASE_STATUS.md) - authoritative tag, GitHub Release, and npm publication state
- [`CONFIGURATION.md`](CONFIGURATION.md) - profiles, suppressions, failure behavior, and analysis modes
- [`ADAPTERS.md`](ADAPTERS.md) - safe installation into supported agent instruction formats
- [`ARCHITECTURE.md`](ARCHITECTURE.md) - current runtime layers and planned systems
- [`../ROADMAP.md`](../ROADMAP.md) - completed work and remaining product milestones

## Rule documentation

- [`F018-skip-link.md`](F018-skip-link.md) - static skip-link analysis
- [`F019-text-contrast.md`](F019-text-contrast.md) - rendered text-contrast analysis
- [`F020-touch-targets.md`](F020-touch-targets.md) - rendered touch-target analysis
- [`decisions/`](decisions/) - accepted architecture decisions and implementation boundaries

## Maintainer documentation

- [`RELEASING.md`](RELEASING.md) - clean release gates, first npm publication, trusted publishing, and verification
- [`MAINTENANCE.md`](MAINTENANCE.md) - merged-branch cleanup and repository hygiene
- [`../CONTRIBUTING.md`](../CONTRIBUTING.md) - contribution, detector, benchmark, documentation, and branch requirements
- [`../SECURITY.md`](../SECURITY.md) - security policy and benchmark evidence handling
- [`CLEAN_ROOM_RESEARCH.md`](CLEAN_ROOM_RESEARCH.md) - clean-room research and provenance rules

## Benchmark documentation

Current benchmark sources of truth:

- [`../research/benchmark/PROTOCOL-v1.md`](../research/benchmark/PROTOCOL-v1.md) - canonical four-condition protocol
- [`../research/benchmark/harness/README.md`](../research/benchmark/harness/README.md) - provider-free harness commands and boundaries
- [`../research/benchmark/calibration/B000-PHASE2-RUNNER.md`](../research/benchmark/calibration/B000-PHASE2-RUNNER.md) - completed nonofficial B000 calibration record
- [`BENCHMARK-PILOT-CHECKLIST.md`](BENCHMARK-PILOT-CHECKLIST.md) - current readiness checklist

Historical benchmark design material:

- `research/methodology/PROPOSAL.md` describes the superseded three-condition concept.
- B000 contract amendments preserve the calibration decision trail.
- Failed and partial calibration evidence remains local and is not a package or documentation asset.

## Status language

Use these terms consistently:

- **Implemented** means code exists and repository gates cover it.
- **Calibrated** means the nonofficial B000 runner exercise completed. It does not mean product superiority was demonstrated.
- **Tagged** means an immutable Git tag exists.
- **Released on GitHub** means a GitHub Release object exists for the tag.
- **Published to npm** means the exact package version exists in the registry and passes a clean-install check.
- **Provenance-backed** means the registry exposes provenance for that publication. Configuration alone is not provenance.
- **Planned** means the capability is not yet delivered, even when research or scaffolding exists.
