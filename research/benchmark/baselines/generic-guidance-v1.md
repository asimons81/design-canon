# Generic Frontend Guidance v1

> Versioned, model-neutral baseline for the Design Canon benchmark.
> This artifact is original project content and may not be edited after official protocol freeze.

Build the requested interface as a complete, usable frontend rather than a static mockup.

## Product and hierarchy

- Identify the page's purpose, intended audience, primary task, and primary action before choosing a visual style.
- Make the most important information obvious at first glance.
- Use headings, grouping, alignment, contrast, and whitespace to create a clear reading order.
- Keep secondary actions visually quieter than the primary action.
- Avoid adding sections, controls, metrics, or decorative elements that do not support the brief.

## Layout and responsiveness

- Use a consistent layout grid and spacing rhythm.
- Keep content widths appropriate for the material. Long-form text should remain comfortable to read.
- Design for both required desktop and mobile viewports.
- Prevent horizontal overflow and preserve content order on narrow screens.
- Do not rely on hover as the only way to reveal essential information or controls.

## Typography

- Use a deliberate type scale with clearly differentiated display, heading, body, label, and metadata roles.
- Keep body text readable through appropriate size, line height, contrast, and measure.
- Limit the number of typefaces and weights unless the brief calls for a more expressive system.
- Avoid using typography as decoration when it weakens comprehension.

## Color, shape, and depth

- Use a restrained palette with semantic roles for background, surface, text, border, accent, success, warning, and error.
- Preserve sufficient contrast for text, controls, focus indicators, and state changes.
- Use border radius, shadows, borders, transparency, and gradients consistently rather than applying every effect to every surface.
- Reserve stronger color and elevation for meaningful hierarchy and interaction.

## Components and states

- Build reusable components for repeated patterns.
- Provide visible states for hover, focus, active, disabled, loading, empty, success, and error when the brief requires them.
- Write specific labels, validation messages, and calls to action.
- Keep destructive actions distinguishable and difficult to trigger accidentally.
- Ensure forms have persistent labels and understandable instructions.

## Accessibility and interaction

- Use semantic HTML before adding ARIA.
- Preserve keyboard access and a clearly visible focus treatment.
- Provide accessible names for interactive controls.
- Make pointer targets large enough to activate accurately.
- Respect reduced-motion preferences for nonessential animation.
- Do not use color alone to communicate meaning.

## Implementation discipline

- Define reusable design tokens for color, typography, spacing, radius, and elevation.
- Avoid scattered one-off values when a shared token or component is appropriate.
- Keep dependencies, generated code, and visual complexity proportional to the task.
- Implement the functional requirements and required interaction states, not only the initial appearance.
- Check the browser console and correct runtime errors.

## Completion review

Before declaring the task complete:

1. Verify every explicit requirement in the brief.
2. Review the interface at every required viewport.
3. Test keyboard navigation and core interactions.
4. Check loading, empty, validation, error, and disabled states where relevant.
5. Inspect for overflow, weak contrast, ambiguous hierarchy, repetitive template patterns, and unnecessary decoration.
6. Deliver the requested source files and any required screenshots or reports.
