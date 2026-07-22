---
name: design-canon
description: Compiles and enforces task-specific design rules for frontend planning, implementation, review, and visual QA. Use when creating or revising web interfaces with Codex, Hermes Agent, Claude Code, Cursor, or another coding agent.
---

# Design Canon

## When to Use

Use this skill when the task creates, redesigns, or reviews a user interface. Do not load the entire rule catalog blindly. Select the closest profile and compile only the relevant canon.

Do not use benchmark or calibration scripts during normal design work. Design Canon's compilation, linting, and agent-adapter workflows are local and do not require provider-backed evaluation.

## Resolve the CLI

Before running a command, determine which CLI is actually available:

1. In a Design Canon source checkout, use `node ./bin/design-canon.js`.
2. In a project with an explicitly installed and verified package version, use the local `design-canon` binary.
3. Do not assume npm publication from a Git tag. Do not fetch an unpinned package merely to satisfy this skill.

Use `node ./bin/design-canon.js --version` or `design-canon --version` and report the resolved version when it matters to the task.

## Procedure

1. Classify the surface as `marketing`, `product-app`, or `editorial`.
2. Compile the selected profile to `DESIGN.md` using the resolved CLI.
3. Read the compiled `DESIGN.md` before planning the implementation.
4. State one concrete visual direction and define the initial token system.
5. Implement hierarchy and layout before decorative effects.
6. Run lint against the relevant source path and selected profile.
7. Use `static`, `auto`, or `browser` mode deliberately. Do not claim browser-assisted evidence when the browser capability was skipped.
8. Render the interface at narrow and wide viewports.
9. Review screenshots for hierarchy, typography, spacing, color, depth, responsiveness, focus visibility, and generic AI patterns.
10. Fix failures or document a specific design reason for each intentional exception.

Source-checkout examples:

```bash
node ./bin/design-canon.js compile \
  --profile product-app \
  --target design \
  --output DESIGN.md

node ./bin/design-canon.js lint ./src \
  --profile product-app \
  --mode static
```

## Boundaries

- A heuristic match is a review trigger, not proof of bad design.
- Browser-assisted mechanical analysis is not the planned subjective visual judge.
- Do not ban a technique globally when the context justifies it.
- Respect the project's existing brand, design system, accessibility requirements, and user decisions.
- Do not copy a third-party design file or branded system without checking its license.
- Do not alter agent instruction files unless the user explicitly asks. Use `init` in preview mode first and apply changes only after review.
- Do not install dependencies, invoke paid providers, or run benchmark scripts without explicit user authorization.
- Do not claim an npm package, GitHub Release, or provenance record without verifying that exact surface.
- Do not declare the interface complete without reviewing rendered output.

## Verification

The task is complete only when:

- the selected profile matches the surface;
- the visual direction is explicit and internally coherent;
- mechanical lint errors are resolved;
- browser-assisted status is represented accurately when used;
- the interface works at target viewports and with keyboard navigation;
- a rendered screenshot has received a deliberate visual review.
