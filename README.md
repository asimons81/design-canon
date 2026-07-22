<p align="center">
  <img src="assets/design-canon-header.webp" alt="Design Canon transforms generic AI-generated interface chaos into disciplined, ship-ready design systems." width="100%" />
</p>

<p align="center">
  <a href="https://x.com/tonysimons_"><img src="https://img.shields.io/static/v1?label=X&message=%40tonysimons_&color=000000&style=for-the-badge&logo=x&logoColor=white" alt="Follow @tonysimons_ on X" /></a>
  <a href="https://github.com/asimons81/design-canon/actions/workflows/test.yml"><img src="https://img.shields.io/github/actions/workflow/status/asimons81/design-canon/test.yml?branch=main&style=for-the-badge&label=build" alt="Build status" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/asimons81/design-canon?style=for-the-badge" alt="MIT License" /></a>
  <img src="https://img.shields.io/static/v1?label=Node.js&message=20%2B&color=339933&style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js 20 or newer" />
  <img src="https://img.shields.io/static/v1?label=required%20runtime%20deps&message=zero&color=2563EB&style=for-the-badge" alt="Zero required runtime dependencies" />
</p>

<h1 align="center">Design Canon</h1>

<p align="center"><strong>Stop shipping the model's favorite UI.</strong></p>

Design Canon is an open design-policy compiler, linter, and visual-QA project for AI coding agents. It turns a structured catalog of contextual design rules into compact instructions for the interface you are actually building, then checks the result for detectable violations.

It is not an 800,000-character prompt brick. It is a versioned system.

## Watch the Launch Film

[![Design Canon launch film poster](assets/design-canon-launch-poster.png)](https://youtu.be/kmndi7eyEnc)

**Design Canon turns generic AI-generated interface defaults into scoped, testable, versioned design policy.**

## Why

AI agents can generate polished frontend code quickly, but they often converge on the same defaults: centered hero stacks, purple gradients, giant rounded cards, decorative shadows, generic copy, weak focus states, and motion sprayed everywhere.

A giant markdown file can nudge the model, but it creates four new problems:

- irrelevant context consumes tokens and dilutes important rules;
- universal bans confuse taste with dogma;
- prose rules cannot prove they were followed;
- the system cannot learn from explicit user preferences.

Design Canon separates rules, profiles, compilation, linting, browser-assisted evidence, future visual review, and future taste memory.

## Working Alpha

The repository includes:

- atomic, scoped design rules with rationale and verification;
- profiles for marketing pages, product applications, and editorial layouts;
- compilation to `DESIGN.md`, `SKILL.md`, or general agent instructions;
- dependency-free static linting for bounded source heuristics;
- optional browser-assisted linting for rendered text contrast and touch-target size;
- project-local, rationale-required suppressions that preserve evidence;
- safe dry-run installation and uninstall adapters for AGENTS.md, Codex, Hermes, Claude Code, Cursor, and Windsurf;
- an installable Agent Skill for compatible coding agents;
- hardened benchmark and local capture infrastructure;
- regression, package, dependency, browser, and security gates.

Playwright is an optional dependency used only for browser-assisted analysis. Static compilation, linting, configuration, and adapter workflows do not require it.

## Release Status

`v0.1.0-alpha.1` exists as an immutable source tag. The npm package and matching GitHub Release are not considered complete until their public records, integrity values, dist-tags, and clean installation are independently verified.

This maintenance work occurs after the alpha.1 tag. The next public package candidate is therefore `0.1.0-alpha.2`; the existing tag will not be moved or reused.

Use the source checkout instructions below until npm publication is confirmed. See the [authoritative release-status ledger](https://github.com/asimons81/design-canon/blob/main/docs/RELEASE_STATUS.md) for the exact boundary.

## Quick Start from Source

```bash
git clone https://github.com/asimons81/design-canon.git
cd design-canon
npm ci --ignore-scripts
npm run check
npm test

node ./bin/design-canon.js compile \
  --profile marketing \
  --target design \
  --output DESIGN.md

node ./bin/design-canon.js lint ./src --profile marketing
```

Available profiles:

```bash
node ./bin/design-canon.js profiles
```

The default lint mode is `static`. To require browser-assisted analysis from a source checkout, install Chromium explicitly and select browser mode:

```bash
npx playwright install chromium
node ./bin/design-canon.js lint ./path/to/site \
  --profile marketing \
  --mode browser
```

`auto` mode uses browser analysis when the optional Playwright and Chromium capability is available; otherwise it preserves static results and reports browser analysis as skipped. `browser` mode fails when the capability is unavailable.

## Install into an Agent

Preview a portable root `AGENTS.md` installation:

```bash
node ./bin/design-canon.js init . \
  --profile product-app \
  --target agents
```

Apply it only after reviewing the preview:

```bash
node ./bin/design-canon.js init . \
  --profile product-app \
  --target agents \
  --write
```

Targets include `agents`, `codex`, `hermes`, `claude`, `cursor`, and `windsurf`. See [`docs/ADAPTERS.md`](docs/ADAPTERS.md) for command contexts, file locations, scope behavior, safety guarantees, and uninstall commands.

## Justified Exceptions

Design Canon does not confuse a detector with an aesthetic law. Projects can suppress a finding only through an explicit, scoped rationale in `design-canon.config.json`:

```json
{
  "$schema": "./schema/config.schema.json",
  "version": 1,
  "profile": "marketing",
  "suppressions": [
    {
      "rule": "color.purple-gradient-default",
      "files": ["src/brand/**/*.css"],
      "reason": "Purple is the documented primary brand color for this campaign.",
      "approvedBy": "design-systems",
      "expires": "2099-12-31"
    }
  ]
}
```

```bash
node ./bin/design-canon.js lint . \
  --config design-canon.config.json \
  --format json
```

Expired, unknown, duplicated, absolute, or path-escaping suppressions fail closed. Suppressed findings remain in the JSON report with their evidence and rationale. Unused suppressions are reported for cleanup.

See [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md) for the complete contract.

## The Upgrade

| Prompt bundle | Design Canon |
|---|---|
| One enormous context file | Compiles only relevant rules |
| Blanket style bans | Contextual profiles and justified exceptions |
| Advice only | Static and browser-assisted mechanical evidence |
| No verification contract | Every enforceable rule defines observable checks |
| Same taste for everyone | Planned project-local preference memory |
| Unclear provenance | Versioned, reviewable, open rule packs |
| “Looks better” claims | Frozen benchmark protocol with explicit claim boundaries |

The subjective visual judge and project taste memory remain planned. Browser-assisted mechanical checks are already implemented and should not be confused with a model-based visual verdict.

## Benchmark Status

The repository includes a hardened benchmark harness, but the public benchmark campaign has not been run. The nonofficial B000 calibration completed successfully across four frozen conditions and validated runner isolation, capture, network denial, and artifact integrity. B000 is claim-ineligible and did not select a winner.

B001-B015 remain unexecuted. Any provider-backed benchmark run requires separate user authorization, an exact call count, and a reviewed spend estimate. Normal installation, compilation, linting, and agent-adapter workflows do not invoke a model provider.

See [`research/benchmark/calibration/B000-PHASE2-RUNNER.md`](research/benchmark/calibration/B000-PHASE2-RUNNER.md) for the calibration record and safety boundaries.

## Repository Map

```text
bin/                    CLI entry point
src/                    compiler, selector, linter, browser analysis, adapters
rules/                  atomic design-policy catalog
profiles/               surface-specific rule selection
schema/                 open JSON schemas
skills/design-canon/    portable Agent Skill
examples/               examples and controlled fixtures
tests/                  regression and integration tests
docs/README.md          documentation map
docs/RELEASE_STATUS.md  source tag, GitHub Release, and npm state
docs/ARCHITECTURE.md    current and planned system layers
docs/CONFIGURATION.md   configuration and suppression contract
docs/ADAPTERS.md        safe agent installation and uninstall
ROADMAP.md              completed work and remaining milestones
```

## Philosophy

Gradients are not illegal. Shadows are not illegal. Inter is not illegal. Cards are not illegal.

**Unexamined defaults are the enemy.**

A detector creates a review obligation, not an automatic aesthetic verdict. The final authority remains the person shipping the interface.

## Clean-Room Notice

Design Canon is an independent clean-room implementation based on public product behavior, open design standards, and original rules. Do not submit copied proprietary prompt files or unlicensed branded design systems.

## License

MIT
