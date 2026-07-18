---
name: design-canon
description: Compiles and enforces task-specific design rules for frontend planning, implementation, review, and visual QA. Use when creating or revising web interfaces with Codex, Hermes Agent, Claude Code, Cursor, or another coding agent.
---

# Design Canon

## When to Use

Use this skill when the task creates, redesigns, or reviews a user interface. Do not load the entire rule catalog blindly. Select the closest profile and compile only the relevant canon.

## Procedure

1. Classify the surface as `marketing`, `product-app`, or `editorial`.
2. Run `design-canon compile --profile <profile> --target design --output DESIGN.md`.
3. Read the compiled `DESIGN.md` before planning the implementation.
4. State one concrete visual direction and define the initial token system.
5. Implement hierarchy and layout before decorative effects.
6. Run `design-canon lint <source-path> --profile <profile>`.
7. Render the interface at narrow and wide viewports.
8. Review the screenshots for hierarchy, typography, spacing, color, depth, responsiveness, focus visibility, and generic AI patterns.
9. Fix failures or document a specific design reason for each intentional exception.

## Boundaries

- A heuristic match is a review trigger, not proof of bad design.
- Do not ban a technique globally when the context justifies it.
- Do not copy a third-party design file or branded system without checking its license.
- Do not declare the interface complete without reviewing rendered output.

## Verification

The task is complete only when:

- The selected profile matches the surface.
- The visual direction is explicit and internally coherent.
- Mechanical lint errors are resolved.
- The interface works at target viewports and with keyboard navigation.
- A rendered screenshot has received a deliberate visual review.
