# ADR-002: Browser-Assisted Analysis Architecture

**Status:** Proposed  
**Date:** 2026-07-18  
**Branch:** `architecture/browser-assisted-analysis`  
**Extends:** ADR-001

## Context

ADR-001 authorized dependency-free static analyzers. F016, F017, and F018 now prove that model in production. The two remaining accepted candidates, `accessibility.text-contrast-minimum` and `mobile.touch-target-size`, require rendered facts that source scanning cannot reliably establish: cascade, inheritance, computed colors, alpha composition, viewport layout, transforms, geometry, overlap, and spacing.

A broad static approximation would create deterministic output without trustworthy correspondence to the rendered interface.

## Decision

Design Canon will remain static-first and add an **optional browser-assisted capability** using Playwright with pinned Chromium.

This ADR authorizes infrastructure only. The browser-foundation PR must not implement contrast, touch targets, frameworks, arbitrary server startup, or public-site crawling.

## Execution Modes

- `static`: existing rules only; never launches a browser; works without Playwright or Chromium.
- `auto`: runs static rules and browser analyzers when available; otherwise reports machine-readable `skipped` analysis.
- `browser`: requires browser capability; unavailable runtime is an explicit operation error.

Exact CLI and configuration names are reserved for the foundation PR.

## Supported Inputs

First tranche:

- local `.html`
- inline CSS and scripts
- relative local CSS, images, and fonts inside the normalized scan root

Unsupported:

- remote URLs and assets
- authentication
- arbitrary local servers
- framework build pipelines
- cross-root file access
- user-provided shell commands

Path traversal outside the scan root is rejected.

## Runtime and Lifecycle

Playwright with Chromium is selected because it provides isolated contexts, deterministic viewports, computed styles, geometry, request interception, timeouts, and mature CI support.

A lint operation must:

1. detect capability once
2. launch at most one browser process
3. create an isolated context per page
4. apply security and viewport policy
5. navigate to the local document
6. wait for `DOMContentLoaded` plus one bounded layout flush
7. run registered browser analyzers
8. close page and context in `finally`
9. close the browser at operation completion

Do not wait for `networkidle`. Do not launch a browser per rule.

## Security Policy

Local HTML is untrusted executable content.

Default policy:

- deny external HTTP/HTTPS, WebSockets, remote scripts, fonts, images, APIs, analytics, and telemetry
- allow only the document and relative local assets inside the scan root
- deny popups, downloads, permissions, clipboard, geolocation, notifications, camera, microphone, and external navigation
- block or disable service workers
- terminate workers with the context
- dismiss dialogs
- cap page creation, execution time, concurrency, and artifacts
- expose no shell execution or unrestricted Node APIs to analyzers

JavaScript remains enabled because runtime-applied classes and styles can affect computed measurements. Findings must state that only the bounded initial rendered state was analyzed.

Security-sensitive behavior requires regression tests.

## Deterministic Environment

Required viewport presets:

```text
desktop: 1440 x 900
mobile: 390 x 844
```

First tranche uses:

- Chromium only
- device scale factor 1
- zoom 100 percent
- fixed color scheme when configured
- denied external network
- bounded initial page state

Evidence must record browser version and viewport. Results do not prove identical rendering across other browsers, operating systems, fonts, zoom levels, themes, or runtime states.

## Resource Limits

Initial defaults:

- one browser process per lint operation
- maximum two concurrent pages
- 10-second page timeout
- bounded total-operation timeout
- existing linter file-size caps
- no screenshots, video, trace, HAR, or downloads by default

Cleanup must be tested after success, timeout, malformed pages, analyzer exceptions, and crashes where practical.

## Analyzer Boundary

Lifecycle and rule logic must be separate.

A browser analyzer receives a bounded internal context containing normalized file path, scan root, selected viewport, operation deadline, rule metadata, evidence helpers, and page access through an internal adapter.

An analyzer must not launch browsers, change global configuration, access files outside the scan root, perform network requests, mutate the repository, or write arbitrary artifacts.

## Result Taxonomy

Browser analysis has four statuses:

- `confirmed`: required rendered evidence was collected and supports a deterministic result
- `indeterminate`: browser ran, but evidence was not trustworthy, such as image or gradient backgrounds, unresolved compositing, unsupported transforms, or ambiguous overlap
- `skipped`: eligible analysis did not run, such as unavailable browser in `auto`
- `failed`: launch, navigation, analyzer, timeout, or page-crash failure

Only `confirmed` may support a production accessibility finding. Missing runtime evidence must never be presented as a pass or violation.

## Evidence Contract

Existing finding fields remain:

- file
- line when meaningful
- rule
- severity
- message
- evidence

Browser metadata must include:

- analysis status
- viewport name and dimensions
- browser engine and version
- relevant computed measurements
- bounded confidence text

The foundation PR must define a backward-compatible JSON schema before browser rules ship.

## Static and Browser Coexistence

The linter will:

1. compile the profile
2. run static analyzers
3. identify browser-capable rules
4. resolve execution mode
5. run eligible analyzers once per page and viewport
6. merge results deterministically
7. apply existing suppressions
8. format human and JSON output

Browser availability must not alter static finding order, evidence, or exit behavior.

Existing supression syntax, rationale, scope, expiry, and unused-suppression reporting remain unchanged. `skipped`, `indeterminate`, and `failed` are analysis records, not suppressible findings.

## Packaging and CI

Playwright must not become mandatory for static users. Chromium binaries must not be bundled in the npm tarball. The foundation PR must choose and validate an optional delivery mechanism and document explicit setup, such as:

```bash
npx playwright install chromium
```

Static CI must pass without installing Chromium. A separate browser CI job must install pinned Playwright and Chromium, run foundation tests, verify blocked network, cleanup, and timeouts, and keep CodeQL and dependency review green.

### Failure Semantics

- `static`: browser capability irrelevant
- `auto`: unavailable capability produces `skipped` records and preserves static results
- `browser`: unavailable capability is an operation error

Page-specific failures must identify the file, preserve static results, close resources, follow a documented exit policy, and never become confirmed accessibility findings.

## Acceptance Gates for the Foundation PR

The browser foundation is accepted only when it proves:

1. static operation works with no browser packages installed
2. runtime detection is deterministic
3. one Chromium process is reused per operation
4. page contexts are isolated
5. network and cross-root asset access are denied
6. popups, downloads, permissions, service workers, and external navigation are blocked
7. viewports are applied and recorded
8. readiness uses `DOMContentLoaded` plus bounded layout flush
9. timeouts and all cleanup paths are tested
10. analyzers use a lifecycle-independent registry or adapter
11. static output and ordering remain unchanged
12. JSON unambiguously represents all four statuses
13. suppressions remain unchanged
14. no contrast or touch-target rule is added
15. packaging excludes Chromium binaries
16. static and browser CI paths are independently green
17. CodeQL, dependency review, repository validation, audit, and package dry-run pass

## Sequencing

1. ADR-002, architecture only
2. browser-analysis foundation
3. rendered text contrast
4. rendered touch targets

Text contrast comes first because computed color and typography have a narrower first-tranche surface than interactive geometry and spacing.

## Consequences

Benefits:

- rendered evidence for the final ADR-001 candidates
- lightweight static workflow preserved
- explicit uncertainty
- centralized lifecycle and security controls
- reusable infrastructure and measurable evidence

Costs and risks:

- larger installation, CI, and security surface
- environment pinning
- slower operations
- optional-dependency complexity
- possible browser leaks or resource abuse
- schema complexity
- browser rules skipped in static environments

These risks are accepted only with the gates and sequence above.

## Reserved Decisions for the Foundation PR

The next PR must explicitly decide and test:

- CLI and config names
- optional dependency mechanism
- failed-analysis exit codes
- final structured result schema
- browser-version metadata location
- scan-root local-origin mechanism
- per-operation JavaScript control
- color-scheme defaults
- browser CI Node matrix
- concurrency override limits

None may be decided implicitly inside a production rule.

## Outcome

The browser layer is infrastructure, not proof of conformance. It may confirm bounded rendered measurements, report indeterminate cases, or state that analysis was skipped or failed.

This architecture is required before production implementation of `accessibility.text-contrast-minimum` and `mobile.touch-target-size`.
