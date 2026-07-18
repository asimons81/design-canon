> **Proposal** — generated fixture brief for the Design Canon benchmark factory. Not a final scoring rubric.

# B001: SaaS Landing Page

| Field | Value |
|---|---|
| **ID** | `B001` |
| **Status** | proposal |
| **Category** | marketing |
| **Applicable Design Canon profile** | `marketing` |

## Title

SaaS Marketing Landing Page

## Objective

Generate a single-page SaaS marketing landing page from a supplied product description and brand token set. The page must communicate the product value proposition, establish visual credibility, and guide visitors toward a primary call-to-action — all without relying on generic AI-sauna visual defaults.

## Audience

Technical decision-makers evaluating a developer-tool SaaS product. Assumed reading level: professional, comfortable with technical terminology but not necessarily familiar with the specific product category.

## Supplied Content

- Product name: "Pragma" (fictional developer operations tool)
- One-sentence tagline: "Ship with confidence. Pragma enforces deployment policies before they reach production."
- Three feature descriptions (2–3 sentences each) covering policy-as-code, pre-deploy gate checks, and audit trails
- One customer quote: "Pragma caught two policy violations in our first week that our manual review process missed entirely." — VP Engineering, FinCorp
- Brand token set: primary blue `#2563EB`, neutral gray `#6B7280`, background `#F9FAFB`, body text `#111827`
- Logo SVG placeholder (a simple geometric mark, `Pragma` wordmark)
- A single button label: "Start Free Trial"

## Functional Requirements

1. Render a primary hero section with headline, subheading, and CTA button
2. Render a features/comparison section presenting three capabilities
3. Render a social-proof or testimonial section with the supplied quote
4. Render a final CTA section repeating the trial offer
5. Link the primary hero CTA and the final-section CTA to `#signup`
6. Render a top-level navigation bar with links: Product, Docs, Pricing, and the CTA button
7. Render a footer with links: Documentation, Privacy, Terms, Contact

## Required Components

- Navigation bar (sticky or static, with logo and nav links)
- Hero block (headline, subhead, CTA button; may include abstract illustration or pattern)
- Feature cards or comparison grid (3 items, each with icon/heading/description)
- Testimonial card (quote + attribution)
- Final CTA section (headline + button)
- Site footer (copyright + link list)
- Favicon placeholder

## Interaction States

| State | Element(s) | Expectation |
|---|---|---|
| `hover` | All links, buttons | Visible state change (color, underline, or transform) |
| `focus` | All focusable elements | Visible focus ring or outline meeting 3:1 contrast against background |
| `active` | All buttons | Pressed state distinguishable from idle and hover |
| `loading` | (None specified — static page) | — |
| `empty` | (Not applicable) | — |
| `error` | (Not applicable) | — |
| `disabled` | (Not applicable) | — |
| scroll | Navigation bar | If sticky, nav remains visible and readable |

## Viewport Dimensions

| Viewport | Width | Height |
|---|---|---|
| Desktop | 1280 px | 800 px |
| Mobile | 375 px | 667 px |

## Accessibility Expectations

- Full keyboard navigation through all interactive elements in logical DOM order
- Visible focus indicator on every focusable element (minimum 2 px offset, 3:1 contrast)
- Heading hierarchy: one `h1`, subsequent sections use `h2`, feature cards use `h3`
- All images and icons have descriptive `alt` text or are marked `aria-hidden="true"`
- Link text is distinguishable from body text (not only by color; underline or weight difference)
- Minimum touch target size 44×44 CSS pixels on mobile viewport
- Color is not the sole carrier of meaning (e.g., link underline, icon in addition to color)
- Text contrast: body ≥ 4.5:1, large text ≥ 3:1 against background

## Prohibited Shortcuts

- Do not use a CSS framework, utility library, or component library (no Tailwind, Bootstrap, Material UI, Chakra, Shadcn, etc.)
- Do not copy-paste blocks of production landing pages or replicate a known template verbatim
- Do not use a single-file HTML/CSS bundle unless the deliverable is a static HTML page (one HTML file with inline `<style>` is acceptable; no separate JS build step)
- Do not paste a generic "build me a SaaS landing page" prompt as the sole instruction
- Do not generate placeholder images that are actually broken or empty `src` attributes
- Do not hardcode the same button/link style in three different ways (define a component class or token)

## Scoring Criteria (proposal — weights not final)

| Category | What it measures |
|---|---|
| **Visual hierarchy** | Clear reading order, adequate whitespace, logical section prominence |
| **Typography** | Readable body copy, deliberate display type, consistent scale |
| **Color** | The supplied palette is used consistently; contrast meets accessibility baselines |
| **Layout** | Responsive grid adapts from desktop to mobile without horizontal overflow |
| **Component consistency** | Buttons, cards, nav items share the same style tokens across the page |
| **Interaction feedback** | Hover, focus, and active states are visibly distinct and follow accessibility minima |
| **Content structure** | Headings are semantic, feature cards have uniform length, information density is appropriate |
| **Generic-default avoidance** | No purple gradients, exaggerated corner radius, excessive shadow, or Inter/Roboto without documented reason |

## Expected Deliverables

The benchmark run must produce:

1. **Source output** — the full generated source tree (HTML, CSS, any JS)
2. **Design policy** — the policy document (DESIGN.md or equivalent) that guided the agent, or a marker stating none was used
3. **Desktop screenshots** — viewport crop at 1280×800 plus a full-page capture
4. **Mobile screenshots** — viewport crop at 375×667 plus a full-page capture
5. **Lint report** — output of `design-canon lint --profile marketing` against the source
6. **Accessibility report** — structured findings from an automated a11y scan (e.g., axe-core, pa11y)

## Run-Manifest Fields

| Field | Type | Description |
|---|---|---|
| `benchmark_id` | `string` | `B001` |
| `run_id` | `string` | Unique run identifier |
| `timestamp` | `iso8601` | UTC timestamp of run start |
| `model` | `string` | Model identifier (e.g., `gpt-4o`, `claude-sonnet-4`) |
| `model_version` | `string` | Specific model version/checkpoint |
| `prompt` | `string` | Full prompt text or hash of prompt file |
| `prompt_strategy` | `enum` | One of: `none`, `generic`, `design-canon` |
| `instruction_file_paths` | `[string]` | Paths to any instruction or policy files used |
| `usage` | `object or null` | Provider-reported usage; unavailable fields remain null |
| `runtime_ms` | `number` | Wall-clock time from prompt to final output |
| `environment_info` | `{os, node_version, agent_version}` | Environment metadata |
| `commit_hash` | `string` | Git commit of Design Canon used |
| `viewport_desktop` | `{width, height}` | `1280, 800` |
| `viewport_mobile` | `{width, height}` | `375, 667` |
| `screenshot_paths` | `{desktop, mobile}` | Relative paths to captured screenshots |
| `lint_report_path` | `string` | Path to `design-canon lint` JSON output |
| `a11y_report_path` | `string` | Path to accessibility scan output |
| `evaluation_dataset_path` | `string or null` | Separate blinded-evaluation data, never embedded in the generation manifest |

## Known Ambiguity Risks

- **Illustration scope**: The brief does not specify whether the hero requires a custom illustration, abstract geometric pattern, photograph, or none. Different runs may invest very different effort in the hero graphic, affecting visual quality comparisons.
- **Navigation behavior on mobile**: Not specified whether the nav should collapse into a hamburger menu or stack vertically. Both are valid, but the difference affects mobile layout scoring.
- **"Feature cards" interpretation**: The brief does not prescribe two-column vs. three-column grid, card border/shadow treatment, or icon style. These are legitimate design decisions but introduce variance.
- **Scroll depth expectation**: No minimum scroll height specified. A run that fills one viewport vs. one that requires extensive scrolling may be judged differently.
- **Supplied brand tokens are minimal**: The palette provides 4 colors. Runs may need to derive additional shades (hover, border, muted background), introducing inconsistency in how those derived tones are chosen.
