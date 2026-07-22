# Roadmap

Design Canon is a local-first, open-source design-policy runtime. It will not require accounts, hosted services, telemetry, subscriptions, or proprietary storage.

Current release state is tracked in [`docs/RELEASE_STATUS.md`](docs/RELEASE_STATUS.md). A source tag, a GitHub Release, an npm publication, and a provenance-backed publication are separate milestones.

## v0.1: Harden the Canon

- [x] Atomic JSON rule catalog
- [x] Marketing, product-app, and editorial profiles
- [x] `DESIGN.md`, `SKILL.md`, and agent-instruction compilation
- [x] Dependency-free static linter
- [x] Optional browser-assisted text-contrast and touch-target analysis
- [x] Rationale-required, scope-limited suppressions
- [x] Strict schemas and hostile-input validation
- [x] Node 20, 22, and 24 CI
- [x] CodeQL, Dependency Review, Dependabot, and protected `main`
- [x] Publication allowlist, lockfile verification, and provenance configuration
- [x] Security, contribution, configuration, adapter, maintenance, and release documentation
- [x] Immutable `v0.1.0-alpha.1` source tag
- [x] Tokenless trusted-publishing workflow prepared for use after npm bootstrap

## v0.2: Make Adoption Frictionless

- [x] `design-canon init` with safe dry-run preview
- [x] Agent adapters for Hermes Agent, Codex, Claude Code, Cursor, Windsurf, and generic `AGENTS.md`
- [x] Strict configuration validation
- [ ] Configuration migration commands
- [x] Install and uninstall documentation for every supported adapter
- [ ] Clean tarball installation tests on Windows, macOS, Linux, and WSL
- [ ] First public npm prerelease through the required interactive bootstrap
- [ ] Configure npm trusted publishing after the package exists
- [ ] First provenance-backed npm prerelease through the trusted workflow
- [ ] Three reproducible before-and-after demonstrations

The alpha.1 source tag was created, but package publication was not completed. Because maintenance now follows that immutable tag, `0.1.0-alpha.2` is the next package candidate. The first interactive npm publication cannot claim GitHub Actions provenance; a later workflow-published version can satisfy the provenance milestone.

## v0.3: Prove the Upgrade

- [ ] Fixed, brand-neutral benchmark briefs and golden fixtures for the full suite
- [x] Reproducible run manifest with prompt, model, commit, environment, tokens, and timing
- [ ] Paired runs with no guidance, generic guidance, monolithic guidance, and compiled Design Canon policy
- [x] Local screenshot capture at desktop and mobile viewports for benchmark evidence
- [x] Accessibility and lint evidence attached to each calibrated run
- [ ] Blind human-comparison workflow exercised with independent evaluators
- [ ] Static benchmark report generated entirely from committed public artifacts

The nonofficial B000 calibration is complete with a `GO` recommendation for the runner. It validated execution isolation, browser-network denial, capture, lint, accessibility, Git diff evidence, and artifact hashing. B000 is claim-ineligible and did not select a winner. B001-B015 remain unexecuted and require separate authorization and budgeting.

## v0.4: The Canon Can See

- [x] Browser-assisted mechanical analysis for supported rendered rules
- [x] Local benchmark screenshot capture
- [ ] General-purpose local visual-review capture adapter
- [ ] Structured visual-review JSON contract
- [ ] Viewport and interaction-state matrix for product review
- [ ] Before-and-after comparison report
- [ ] Optional provider-agnostic model review
- [ ] Clear separation between mechanical evidence, model observations, and subjective recommendations
- [ ] Official accessibility scanner selected and integrated for admitted benchmark runs

Browser-assisted linting is not the planned subjective visual judge. The current browser layer measures bounded rendered properties; the future visual-review layer will assess broader composition while preserving evidence and human authority.

## v0.5: The Canon Learns the Project

- [ ] Extract project-local color, typography, spacing, radius, depth, and motion conventions
- [ ] Present inferred preferences for explicit approval or rejection
- [ ] Preference confidence, conflict detection, and time decay
- [ ] Style extraction from approved screenshots and existing code
- [ ] Privacy-preserving local storage and portable export

## v0.6: Open Rule Ecosystem

- [ ] Rule and profile authoring commands
- [ ] Fixture-driven detector tests
- [ ] Rule-pack provenance and licensing metadata
- [ ] Curated accessibility, editorial, developer-tool, dashboard, mobile, e-commerce, and public-sector packs
- [ ] Contribution governance for subjective or controversial rules

## v1.0: Open Design Policy Runtime

- [ ] Stable rule, profile, config, suppression, and report schemas
- [ ] Policy composition and semantic-version migration
- [ ] Signed plugin and rule-pack provenance
- [ ] IDE and CI integrations
- [ ] Reproducible benchmark baseline with published methodology
- [ ] Long-term governance and compatibility policy

## Victory Conditions

Design Canon is credibly better than a monolithic prompt bundle only when it can demonstrate:

- installation and first useful output in under 60 seconds;
- support for at least five agent environments;
- at least ten reproducible benchmark briefs;
- materially lower instruction-context usage;
- a statistically meaningful blind-comparison advantage;
- no accessibility regression against baseline runs;
- deterministic, evidence-bearing reports;
- provenance-backed package releases;
- external contributors and independently maintained rule packs.
