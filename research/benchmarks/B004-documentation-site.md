> **Proposal** — generated fixture brief for the Design Canon benchmark factory. Not a final scoring rubric.

# B004: Documentation Site

| Field | Value |
|---|---|
| **ID** | `B004` |
| **Status** | proposal |
| **Category** | editorial |
| **Applicable Design Canon profile** | `editorial` |

## Title

Technical Documentation Site

## Objective

Generate a multi-page documentation site for a developer tool. The site must combine a hierarchical navigation sidebar with prose content, inline code samples, and API reference tables. The primary challenge is designing a layout where navigation and content coexist without crowding, and where technical content remains readable at both viewports.

## Audience

Software developers integrating with the documented API. Assumed comfortable with YAML, JSON, REST conventions, and terminal commands.

## Supplied Content

- Product name: "Pragma CLI"
- Site title: "Pragma Documentation"
- Three pages of content (supplied as separate markdown files):
  - **Getting Started**: Installation instructions (npm, Homebrew, Docker), a 3-step quickstart with code blocks, and a verification command
  - **Configuration**: YAML reference table with 6 configuration fields (name, type, default, required, description), 2 example config blocks
  - **API Reference**: 4 endpoint entries (method, path, parameters table, request body example, response example), status code table
- Navigation tree structure:
  - Home
  - Getting Started
  - Configuration
    - Schema Reference
  - API Reference
    - Endpoints
    - Errors

## Functional Requirements

1. Render a persistent left sidebar with the navigation tree, indicating the current page
2. Render the main content area with proper typographic hierarchy for technical prose
3. Render code blocks with syntax highlighting (language-appropriate)
4. Render at least one parameters table with proper table semantics
5. The sidebar must collapse or overlay on mobile viewport
6. All internal navigation links must work (anchor-based or page-based)
7. Include a top-level search bar placeholder (input field, no back-end required)

## Required Components

- Site header (product logo/name, search input placeholder)
- Sidebar navigation (expandable/collapsible tree, current-page indicator)
- Main content area (article, headings, prose, code blocks)
- Inline code treatment (monospace, background highlight)
- Code block component (monospace, copy button optional)
- Parameter/API reference table (thead, tbody, proper scope)
- Footer (copyright, link to GitHub)

## Interaction States

| State | Element(s) | Expectation |
|---|---|---|
| `hover` | Sidebar links | Background or text color change |
| `hover` | Inline links within docs | Underline or color change |
| `focus` | All focusable elements | Visible focus ring (≥ 2 px, 3:1 contrast) |
| `active` | Sidebar links, search placeholder | Pressed state distinguishable |
| `hover` | Table rows | Optional row highlight (improves scanability) |
| `focus` | Code block (non-interactive) | Code block itself not focusable; copy button if present is focusable |
| expand/collapse | Sidebar tree items | Animated or instant expand; state should be visually clear |
| search focus | Search input | Placeholder text remains or moves; clear visual indication of active input |

## Viewport Dimensions

| Viewport | Width | Height |
|---|---|---|
| Desktop | 1280 px | 800 px |
| Mobile | 375 px | 667 px |

## Accessibility Expectations

- Sidebar is a `<nav>` element with aria-label or aria-labelledby
- Current page in sidebar is indicated by both visual style (`aria-current="page"`) and text
- Code blocks have sufficient contrast (≥ 4.5:1 code text against code background)
- Tables use `<th scope="col">` or `scope="row"` as appropriate
- Search input has an associated `<label>` or `aria-label`
- Skip-to-content link is available
- Heading hierarchy: page title is `h1`, sections are `h2`, subsections `h3`
- Focus order: sidebar → content → footer (or skip-link bypassing sidebar)
- Sidebar collapse toggle has an accessible name (e.g., "Menu" or "Close navigation")
- All icons (if any) have `aria-hidden="true"` or text alternatives

## Prohibited Shortcuts

- No CSS framework or utility library
- No documentation-site template copied verbatim from an existing project
- No single-file solution unless explicitly defined
- Do not generate placeholder lorem ipsum — the supplied markdown content must be rendered
- Do not embed a live Search-as-a-Service widget (Algolia, Meilisearch, etc.) — a static input placeholder is sufficient
- Do not populate the page with extra documentation content beyond what is supplied
- Do not use a generic "build docs" prompt as the sole instruction

## Scoring Criteria (proposal — weights not final)

| Category | What it measures |
|---|---|
| **Information architecture** | Sidebar hierarchy is clear; current location is always visible |
| **Typography** | Technical prose is readable; code is distinct from prose; headings have clear hierarchy |
| **Code presentation** | Syntax readability, background contrast, inline code vs. block code distinction |
| **Table design** | Tables are readable, responsive, and properly use semantic markup |
| **Responsiveness** | Sidebar collapses cleanly on mobile; content does not overflow; table horizontal scroll if needed |
| **Interaction feedback** | Hover/focus states on sidebar, links, tables, search |
| **Component consistency** | Code blocks, tables, headings, links share consistent tokens |
| **Content integrity** | All supplied markdown pages are rendered faithfully |
| **Generic-default avoidance** | No decorative elements that interfere with reading; no generic AI visual tropes |

## Expected Deliverables

1. **Source output** — full generated source tree (multi-page or single-page with navigation)
2. **Design policy** — policy document or marker stating none was used
3. **Desktop screenshot** — 1280×800 showing sidebar + content for "API Reference" page
4. **Mobile screenshot** — 375×667 showing "Getting Started" page with sidebar collapsed/overlayed
5. **Lint report** — `design-canon lint --profile editorial` output
6. **Accessibility report** — automated a11y scan findings

## Run-Manifest Fields

(Same schema as B001. Profile: `editorial`.)

## Known Ambiguity Risks

- **Single-page vs. multi-page**: The brief requires three pages of content but does not specify whether they should be separate HTML files (multi-page site) or sections within a single HTML page with JS navigation. Both approaches affect navigation implementation, URL structure, and scoring on "internal navigation."
- **Search behavior**: The search bar is a placeholder only. Runs that wire up a JS filter on the navigation tree vs. a static inert input may behave differently, but both are acceptable.
- **Syntax highlighting technique**: The brief does not specify whether to use server-side highlighting (pre-colored spans), client-side JS library, or no highlighting. Highlighting quality varies significantly.
- **Sidebar depth indicators**: The navigation tree has two levels (Configuration > Schema Reference, API Reference > Endpoints). Depth can be shown with indentation, expand/collapse arrows, or nested lists — affecting visual density.
- **"Current page" visual indicator**: Not prescribed whether to use a background color, left border accent, bold text, or icon. This introduces variance in sidebar styling.
- **Code block width at mobile**: Code blocks longer than the viewport may overflow or be truncated. The brief does not specify handling. Wrapping vs. scrolling is a design choice with accessibility implications.
