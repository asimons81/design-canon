# ADR-002: Browser-Assisted Analysis Architecture

**Status:** Accepted
**Date:** 2026-07-19
**Branch:** `architecture/browser-assisted-analysis`  
**PR:** #18
**Implemented by:** PR #19, merged as `b856b00`
**Extends:** ADR-001

## Context

ADR-001 authorized dependency-free static analyzers. F016, F017, and F018 now prove that model in production. The two remaining accepted candidates, `accessibility.text-contrast-minimum` and `mobile.touch-target-size`, require rendered facts that source scanning cannot reliably establish: cascade, inheritance, computed colors, alpha composition, viewport layout, transforms, geometry, overlap, and spacing.

A broad static approximation would create deterministic output without trustworthy correspondence to the rendered interface.

## Decision

Design Canon remains static-first and adds an **optional browser-assisted capability** using Playwright `1.61.1` with Chromium.

This ADR authorizes shared infrastructure only. Production rules must not launch their own browser, bypass lifecycle or security controls, or reinterpret operational failures as accessibility violations. The foundation shipped in PR #19 without adding contrast, touch targets, framework builds, arbitrary server startup, or public-site crawling.

## Execution Modes

- `static`: existing rules only; never launches a browser; works without Playwright or Chromium.
- `auto`: runs static rules and browser analyzers when available; otherwise reports machine-readable `skipped` analysis.
- `browser`: requires browser capability; unavailable runtime is an explicit operation error.

The accepted CLI option is `--mode static|auto|browser`. The configuration equivalent is `browser.mode`.

`browser` mode uses exit code `3` when required browser capability is unavailable. Browser availability does not alter existing static findings, ordering, suppression behavior, or static exit semantics.

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

Playwright `1.61.1` with Chromium is selected because it provides isolated contexts, deterministic viewports, computed styles, geometry, request interception, timeouts, and mature CI support.

A lint operation must:

1. detect capability once
2. launch at most one browser process
3. create an isolated context per page
4. apply security, viewport, color-scheme, JavaScript, and timeout policy
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
- 60-second total-operation timeout with a hard operation deadline
- existing linter file-size caps
- no screenshots, video, trace, HAR, or downloads by default

Cleanup must be tested after success, timeout, malformed pages, analyzer exceptions, and crashes where practical. Navigation, readiness, concurrency waits, and analyzer execution must respect the shorter of their local timeout and the remaining operation time. Late or never-resolving analyzers return failed analysis records rather than hanging the process.

## Analyzer Boundary

Lifecycle and rule logic must be separate.

A browser analyzer registers through `registerAnalyzer(capabilityId, analyzerFunction)` and receives a bounded internal context containing normalized file path, scan root, selected viewport, operation deadline, rule metadata, and controlled evidence helpers. Registered analyzers are enumerated and executed through `lintPath` after page readiness.

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

The shipped foundation defines a backward-compatible JSON schema. Browser analysis records carry status, analyzer ID, viewport, browser engine and version, measurements, message, confidence, and operational error details when applicable.

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

Playwright is pinned as the exact optional dependency `1.61.1`; it is not mandatory for static users. Chromium binaries are not bundled in the npm tarball. Browser setup is explicit:

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

## Resolved Foundation Decisions

PR #19 resolved and tested the previously reserved decisions:

- CLI: `--mode static|auto|browser`
- config: `browser.mode`, `viewport`, `javaScriptEnabled`, `colorScheme`, `concurrency`, `pageTimeout`, and `operationTimeout`
- optional dependency: exact `playwright` version `1.61.1`
- Chromium setup: `npx playwright install chromium`
- browser-unavailable exit code: `3` in required browser mode
- analysis statuses: `confirmed`, `indeterminate`, `skipped`, and `failed`
- local origin: normalized `file://` URLs restricted to the scan root
- JavaScript default: enabled, configurable per operation
- color scheme: `light` or `dark`, applied to isolated contexts
- viewports: `desktop` 1440 x 900 and `mobile` 390 x 844
- concurrency default: `2`, validated within configured bounds
- page timeout default: 10 seconds
- operation timeout default: 60 seconds with hard analyzer deadlines
- CI: static Node 20/22/24 plus a separate Chromium job on Node 20

These decisions are infrastructure contracts. Production rules may consume them but must not redefine them.

## Outcome

The browser layer is infrastructure, not proof of conformance. It confirms bounded rendered measurements, reports indeterminate cases, and records when analysis was skipped or failed.

This architecture is required before production implementation of `accessibility.text-contrast-minimum` and `mobile.touch-target-size`.
