# ADR-002: Browser-Assisted Analysis Architecture

**Status:** Accepted
**Date:** 2026-07-18
**Branch:** `decision/browser-assisted-analysis`
**PR:** (pending)

## Context

The Design Canon static linter is a zero-runtime-dependency, local-first, deterministic tool that operates on source text alone. This architecture is sufficient for the Tranche 1 rules (form labels, reduced motion, skip links) and will remain the default path for all static-detectable rules.

ADR-001 identified two rules that cannot be implemented with useful confidence under the static-linter architecture alone:

- **`accessibility.text-contrast-minimum`** requires CSS cascade resolution, opacity composition, background-image fallback analysis, pseudo-element rendering, and CSS custom-property resolution — none of which are achievable with source-text pattern matching.
- **`mobile.touch-target-minimum`** requires the rendered box model (getBoundingClientRect), viewport-responsive sizing, CSS `transform: scale()` evaluation, and element overlap detection.

Both rules need a browser-rendered analysis pipeline.

## Decision

Create an **optional, bounded, deterministic browser-assisted analysis foundation** as a second analysis path within Design Canon. The static linter remains the default and always runs. Browser analysis is opt-in, security-isolated, and explicitly scoped to analysis types that cannot be performed statically.

## Architecture Principles

### Optional Runtime

Playwright with pinned Chromium is an optional development dependency. The npm package must not bundle Chromium. Static analysis must work without Playwright installed. Users explicitly opt in to browser analysis.

### Deterministic Mode Selection

Three execution modes, explicit at the CLI and configuration level:

| Mode | CLI Value | Config Value | Behavior |
|------|-----------|--------------|----------|
| Static | `static` | `"static"` | Default. Only static analysis. No browser dependency checked. |
| Auto | `auto` | `"auto"` | Run browser analysis when Chromium is available. Skip browser analyses silently when unavailable. Static always runs. |
| Browser | `browser` | `"browser"` | Require browser analysis. If Chromium is unavailable, produce an explicit operation error with a non-zero exit code. |

### Capability Detection

Capability detection is deterministic and cached. The linter checks:
1. Can the Playwright module be imported?
2. Can Chromium be launched?

Results are cached for the duration of the lint operation. The capability check is performed once at the start of the analysis.

### Security Isolation

Every local HTML document is treated as untrusted executable content. The browser context enforces:

- All external HTTP/HTTPS requests blocked
- WebSockets blocked
- Remote scripts, fonts, images blocked
- Analytics, telemetry, API requests blocked
- Popups, downloads blocked
- Permissions (clipboard, geolocation, notifications, camera, microphone) denied
- External navigation blocked
- Service-worker persistence blocked
- Cross-root file access blocked
- Dialogs dismissed automatically
- Workers terminated with their browser context

No shell execution or unrestricted Node API access is exposed to analyzers.

### Lifecycle

- One Chromium browser process per lint operation
- One isolated browser context per analyzed page
- Maximum two concurrent pages (default)
- 10-second default page timeout
- Bounded total-operation timeout
- Clean teardown on success, failure, timeout, or exception
- No `networkidle` — readiness determined by navigation + DOMContentLoaded + one animation frame or equivalent style/layout flush

### Analyzer Architecture

Separation of concerns:

1. **Browser lifecycle manager** — launches browser, manages contexts, enforces concurrency
2. **Page adapter** — wrapped page with security policy, timeouts, evidence helpers
3. **Security policy manager** — request routing rules
4. **Analyzer interface** — bounded internal contract receiving normalized file path, scan root, viewport, deadline, rule metadata, evidence helpers, and a controlled page adapter
5. **Analyzer registry** — maps capability IDs to analyzer functions

Analyzers must not launch browsers, perform network requests, access files outside the scan root, modify global configuration, mutate the repository, or write arbitrary artifacts.

### Viewport Presets

| Name | Width | Height | DPR | Zoom |
|------|-------|--------|-----|------|
| `desktop` | 1440 | 900 | 1 | 100% |
| `mobile` | 390 | 844 | 1 | 100% |

Viewport and browser version are recorded in analysis metadata.

### Analysis Statuses

| Status | Meaning | Supports Finding? |
|--------|---------|-------------------|
| `confirmed` | Analyzer completed and produced a definitive result | Yes |
| `indeterminate` | Analyzer ran but could not determine a clear result | No |
| `skipped` | Analysis was not performed | No |
| `failed` | Analysis encountered an operational error | No |

- `skipped` is used when the runtime is unavailable in `auto` mode
- `failed` is used when the runtime is unavailable in `browser` mode (produces an operation error)
- Static results survive browser failures — static findings are always emitted independently

### Output Schema

Analysis records are separate from findings:

```json
{
  "status": "confirmed",
  "file": "src/index.html",
  "analyzerId": "test.rendered-evidence",
  "viewport": "desktop",
  "browserEngine": "chromium",
  "browserVersion": "130.0.6723.58",
  "measurements": {},
  "message": "Analysis completed successfully.",
  "confidence": "high"
}
```

### Suppressions

No browser-specific suppression syntax is added. Existing finding suppressions remain unchanged. Analysis records (`skipped`, `indeterminate`, `failed`) are not suppressible findings.

## Supported Inputs (Tranche 1)

- Local `.html` files
- Inline CSS and JavaScript
- Relative local stylesheets (within scan root)
- Relative images and fonts (within normalized scan root)

Explicitly not supported:
- Remote URLs
- External assets
- Cross-root file access
- Arbitrary local servers
- Framework build commands
- Authentication workflows
- User-provided shell commands

## Test Readiness

The browser-analysis foundation must be independently testable without exercising any production rule:

- Standalone test-only analyzers prove the analyzer contract
- Capability tests verify each mode's behavior with and without Playwright
- Lifecycle tests verify launch, teardown, concurrency, and timeout behavior
- Security tests verify every blocked resource type
- Rendering tests verify viewports, CSS loading, image loading, DPR
- Status tests verify every status transition and non-finding property
- Regression tests verify all 16 existing rules and 283 existing tests are unchanged

## Consequences

### Positive

1. Production contrast and touch-target rules become implementable with useful confidence.
2. Static users are unaffected — no new dependencies, unchanged CLI defaults, unchanged output format.
3. Security isolation prevents browser analysis from becoming an attack vector.
4. Deterministic mode selection eliminates environment-dependent surprises.
5. Separate analysis records keep the existing finding schema stable.

### Negative

1. Increased codebase complexity — two analysis paths instead of one.
2. CI matrix expansion — a browser-tested CI job with Chromium installation.
3. Documentation burden — users must understand three execution modes.
4. Playwright version pinning — Chromium updates may shift behavior.

### Neutral

1. The analyzer registry is a framework, not a collection of rules. No production rules are registered in the foundation PR.
2. The `auto` mode introduces a best-effort analysis concept that the current static-only architecture does not have.

## Non-Goals

This decision does not authorize:

- Production `accessibility.text-contrast-minimum` rule
- Production `mobile.touch-target-minimum` rule
- Public-site crawling
- Remote URL analysis
- Authentication workflows
- Autofixes
- Server startup
- Framework build commands
- JSX, Vue, Svelte, or Astro template rendering
- Any production rule registration
