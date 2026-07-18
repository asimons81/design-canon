> **Proposal** — generated fixture brief for the Design Canon benchmark factory. Not a final scoring rubric.

# B003: Editorial Article

| Field | Value |
|---|---|
| **ID** | `B003` |
| **Status** | proposal |
| **Category** | editorial |
| **Applicable Design Canon profile** | `editorial` |

## Title

Editorial Long-Form Article

## Objective

Generate a readable, typographically rich editorial article page from supplied markdown content. The page must prioritize reading comfort across viewports, with clear typographic hierarchy, appropriate line lengths, and minimal visual distraction. This benchmark tests how models handle text-first layouts where decoration must serve readability.

## Audience

General educated readership. Article is a technology-analysis piece aimed at a similar audience to Stratechery, The Verge, or A List Apart.

## Supplied Content

- Article title: "The Compiler Gap: Why Policy-as-Code Belongs in the Deploy Pipeline"
- Author byline: "Alex Mercer"
- Publication date: "July 14, 2026"
- Estimated reading time: "12 min read"
- Article body: ~1,200 words of markdown content (provided as a standalone `.md` file) containing:
  - 6 section headings (H2), 3 subsection headings (H3)
  - 2 blockquote pull quotes
  - 1 numbered list (4 items)
  - 1 bulleted list (5 items)
  - 1 inline code snippet `<code>gates.yaml</code>`
  - 1 code block (8 lines, YAML syntax)
  - 1 hyperlink footnote reference
  - 3 body paragraphs per section on average
- A social-share call-to-action at the bottom: "Share this article"

## Functional Requirements

1. Render the article title, byline, date, and reading-time estimate above the body
2. Display the full article body with proper heading hierarchy
3. Render blockquotes with visual distinction from body text
4. Render code blocks with monospace font, appropriate background, and preserved whitespace
5. Maintain a comfortable reading measure (line length) on desktop — aim for 60–75 characters per line
6. Render a "Share" action at the bottom of the article
7. Include a site-level header with publication name and a site-level footer
8. Render article content without horizontal scrolling at either viewport

## Required Components

- Site masthead/header (publication name: "The Pipeline")
- Article header (title, byline, date, reading time)
- Body content with heading hierarchy (H2, H3)
- Blockquote component (distinct from body text)
- Code block component (monospace, background, syntax-themed)
- Inline code treatment
- Social-share section (buttons or links)
- Site footer (copyright, links: About, Archive, RSS)

## Interaction States

| State | Element(s) | Expectation |
|---|---|---|
| `hover` | Hyperlinks within article body | Underline or color change |
| `hover` | Share buttons | Visible state change |
| `focus` | All links and share buttons | Visible focus ring (≥ 2 px, 3:1 contrast) |
| `active` | Share buttons | Pressed state distinguishable |
| `focus` | Code block (if interactive) | Focus remains on interactive elements only |
| print | Whole page | Print stylesheet or print-friendly rendering |

## Viewport Dimensions

| Viewport | Width | Height |
|---|---|---|
| Desktop | 1280 px | 800 px |
| Mobile | 375 px | 667 px |

## Accessibility Expectations

- Heading hierarchy is sequential and semantic (`h1` for article title, `h2` for sections, `h3` for subsections)
- Article body uses a readable serif or high-legibility sans-serif at 16–20 px on desktop
- Line length (measure) between 60–75 characters per line on desktop
- Link text is distinguishable from body text (underline preferred; color-only acceptable only if contrast ratio ≥ 3:1 and links have hover underline)
- Code blocks have sufficient contrast (background vs. text ≥ 4.5:1)
- Images (none supplied) should not be generated as placeholders
- Focus order follows reading order
- Skip-to-content link is present
- Dark mode is not required but text contrast must meet WCAG AA in the chosen scheme

## Prohibited Shortcuts

- No CSS framework or utility library
- No copy-pasted article template from a production publication
- No single-file HTML unless the output is explicitly a static page (single HTML file with inline `<style>` is acceptable)
- Do not use lorem ipsum or placeholder text for the article body — the supplied markdown must be rendered verbatim
- Do not embed a custom web font that degrades reading performance or flashes invisible text for more than 300 ms
- Do not generate decorative illustrations for the article unless the content explicitly calls for them
- Do not use a generic "make an article page" prompt as the sole instruction

## Scoring Criteria (proposal — weights not final)

| Category | What it measures |
|---|---|
| **Typography** | Readable measure, appropriate type scale, comfortable leading, deliberate typeface choice |
| **Reading comfort** | Whitespace, paragraph spacing, line-height, column width work together for sustained reading |
| **Heading hierarchy** | Visual weight of headings corresponds to semantic level; sections are scannable |
| **Code presentation** | Code blocks are clearly demarcated, monospace, scrollable without breaking layout |
| **Blockquote treatment** | Pull quotes are visually distinct without overwhelming body text |
| **Responsiveness** | Text reflows cleanly at mobile; no horizontal overflow; font size may adjust |
| **Interaction feedback** | Hover and focus states on links and share buttons |
| **Content integrity** | Supplied markdown is rendered faithfully; no dropped paragraphs, mangled formatting, or content changes |
| **Generic-default avoidance** | No default Inter/Roboto without rationale, no decorative gradients on a text-focused layout, no large hero images competing with the article |

## Expected Deliverables

1. **Source output** — full generated source tree (HTML, CSS)
2. **Markdown input** — the supplied `.md` file (already part of the benchmark fixture)
3. **Design policy** — policy document or marker stating none was used
4. **Desktop screenshot** — 1280×800 showing article body with at least two sections
5. **Mobile screenshot** — 375×667 showing article header and first section
6. **Lint report** — `design-canon lint --profile editorial` output
7. **Accessibility report** — automated a11y scan findings

## Run-Manifest Fields

(Same schema as B001. The `profile` field must record `editorial`.)

## Known Ambiguity Risks

- **Code block scrolling**: Whether code blocks should horizontally scroll or wrap is unspecified. Wrapping is more accessible but alters the visual presentation of the YAML.
- **Share button implementation**: Share buttons can link to `mailto:`, open `mailto:` with pre-filled text, or be inert UI. The brief does not specify which behavior.
- **Article sidebar or table of contents**: Not required, but some runs may add a TOC or related-articles sidebar. This affects the layout's width and reading experience.
- **Font choice latitude**: A serif font may increase readability but also increases page weight if custom-loaded. The brief does not specify serif vs. sans-serif.
- **Byline styling**: Not specified whether the byline should include an author avatar, bio link, or social links. This creates variance in the article header density.
- **Reading-time estimate styling**: The supplied "12 min read" may be displayed inline with the date, in a separate badge, or as an aside — affecting visual hierarchy.
