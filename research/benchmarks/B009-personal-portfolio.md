> **Proposal** — generated fixture brief for the Design Canon benchmark factory. Not a final scoring rubric.

# B009: Personal Portfolio

| Field | Value |
|---|---|
| **ID** | `B009` |
| **Status** | proposal |
| **Category** | marketing |
| **Applicable Design Canon profile** | `marketing` |

## Title

Personal Portfolio / About Page

## Objective

Generate a single-page personal portfolio website for a fictional designer/developer. The page must present professional identity, selected work samples, and contact information in a layout that balances personal expression with usability. This benchmark tests how models handle content where visual personality matters without resorting to generic portfolio templates.

## Audience

Potential employers, collaborators, and clients evaluating the individual's work. Expects clear navigation, professional presentation, and appropriate use of whitespace.

## Supplied Content

- Name: "Jordan Chen"
- Title: "Product Designer & Front-End Developer"
- Location: "Portland, OR"
- Brief bio (2 paragraphs, ~150 words): covers background in design systems, 5+ years experience, transition from graphic design to product design, current focus on design tooling
- Skills tags: "Design Systems", "UI/UX", "Prototyping", "HTML/CSS", "React", "Figma", "Accessibility", "Design Tokens"
- Work samples (3 projects):
  - **Project 1**: "Pragma Dashboard" — design systems work for a developer tool. "Led the redesign of the deployment monitoring dashboard, improving scan time by 40%."
  - **Project 2**: "Stovetop Commerce" — e-commerce UX. "Designed the product detail page and checkout flow for a D2C kitchenware brand."
  - **Project 3**: "Accessibility Audit Kit" — open-source tool. "Created a structured accessibility audit framework used by 3 enterprise teams."
- Social links: GitHub, LinkedIn, X/Twitter, Dribbble (handle: "jordanchendesign")
- Contact email: "hello@jordanchendesign.com"

## Functional Requirements

1. Render a hero/intro section with name, title, location, and a brief tagline
2. Render a bio section with the supplied biographical text
3. Display skills as individual tags/badges in a grouped layout
4. Show three project cards with title, description, and optional context
5. Include a contact section with email link and social links
6. Navigation links (either in a header or as anchor links) to each section
7. All sections must be reachable from a single scroll or click

## Required Components

- Hero section (name, title, location, optional avatar placeholder)
- Bio/article section (text content with heading)
- Skills cloud / tag list (8 tags)
- Project cards (3 cards with title, description)
- Social link bar (4 platforms with icon or text)
- Contact section (email link, optional contact form placeholder)
- Navigation (sticky header or sidebar nav with section links)
- Footer (copyright, back-to-top link)

## Interaction States

| State | Element(s) | Expectation |
|---|---|---|
| `hover` | Project cards | Lift, shadow change, or border highlight |
| `hover` | Skill tags | Background or color change |
| `hover` | Social links, nav links | Color or underline change |
| `focus` | All interactive elements | Visible focus ring (≥ 2 px, 3:1 contrast) |
| `active` | Any clickable element | Pressed state distinguishable |
| `focus` | Nav links | Visible even on light background |
| scroll | Navigation | Current section highlighted in nav (optional but valuable) |
| scroll | Sticky header | Header remains accessible while scrolling |

## Viewport Dimensions

| Viewport | Width | Height |
|---|---|---|
| Desktop | 1280 px | 800 px |
| Mobile | 375 px | 667 px |

## Accessibility Expectations

- Heading hierarchy: name as `h1`, section titles as `h2`
- Navigation is a `<nav>` element with accessible name
- Project cards use `<article>` or proper heading (`h3`)
- Social links have discernible link text (not just icons — include platform name or `aria-label`)
- Skill tags are readable inline content (not just visual badges); could be a `<ul>` list
- Email link uses `mailto:` protocol
- Avatar/photo placeholder has appropriate `alt` text or `role="presentation"`
- Touch targets minimum 44×44 px on mobile
- Page is fully keyboard-navigable
- No auto-playing animations or video

## Prohibited Shortcuts

- No CSS framework or utility library
- No copy-pasted portfolio template
- No single-file solution unless explicitly defined
- Do not generate an actual avatar/photo — use a styled placeholder if at all
- Do not generate lorem ipsum content — all supplied text must be rendered verbatim
- Do not embed a blog, Instagram feed, or external content not specified
- Do not use a generic "build a portfolio" prompt as the sole instruction

## Scoring Criteria (proposal — weights not final)

| Category | What it measures |
|---|---|
| **Visual identity** | The page feels personal and intentional, not templated |
| **Typography** | Display type and body type work together; hierarchy is clear |
| **Layout** | Whitespace is used well; sections flow naturally on scroll |
| **Project presentation** | Project cards present info clearly without overcrowding |
| **Skill presentation** | Tags are scannable and visually consistent |
| **Navigation** | Sections are easy to reach; the current section is evident |
| **Responsiveness** | Layout adapts cleanly between desktop and mobile |
| **Interaction feedback** | Hover/focus states across cards, tags, links, nav |
| **Component consistency** | Cards, tags, links, headings share consistent tokens |
| **Generic-default avoidance** | No purple/indigo decorative blobs, no generic "creative" layouts, no hero animation that distracts |

## Expected Deliverables

1. **Source output** — full generated source tree (HTML, CSS; JS optional)
2. **Design policy** — policy document or marker stating none was used
3. **Desktop screenshot** — 1280×800 showing at least hero, bio, skills, and first project card
4. **Mobile screenshot** — 375×667 showing hero and bio sections
5. **Lint report** — `design-canon lint --profile marketing` output
6. **Accessibility report** — automated a11y scan findings

## Run-Manifest Fields

(Same schema as B001. Profile: `marketing`.)

## Known Ambiguity Risks

- **Avatar inclusion**: The brief says "optional avatar placeholder." Some runs will include a geometric avatar or initial-letter placeholder; others will skip it. This affects hero visual density.
- **Project detail depth**: The brief does not specify whether clicking a project card should open a modal, navigate to a sub-page, or do nothing (static content). This affects interactivity scoring.
- **Skill tag ordering**: The 8 supplied skills can be ordered alphabetically, by category, or randomly. This affects scannability but is not prescribed.
- **Social link icons**: The brief says "with icon or text." Runs that use icon-only links must ensure aria-labels; text-only links are simpler but less conventional.
- **"Back-to-top" link**: Required in the footer but not specified as visible vs. only visible on scroll. Both approaches are valid.
- **Bio paragraph styling**: Not specified whether the bio should use a single column or two-column layout. This affects reading comfort on desktop.
