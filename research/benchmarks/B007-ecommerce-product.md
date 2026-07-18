> **Proposal** — generated fixture brief for the Design Canon benchmark factory. Not a final scoring rubric.

# B007: E-Commerce Product Page

| Field | Value |
|---|---|
| **ID** | `B007` |
| **Status** | proposal |
| **Category** | marketing |
| **Applicable Design Canon profile** | `marketing` |

## Title

E-Commerce Product Detail Page

## Objective

Generate a product detail page for a direct-to-consumer retail brand. The page must present product imagery, pricing, sizing options, a detailed description, and a clear purchase path. This benchmark tests how models handle commercial layouts that must balance persuasive design with information clarity.

## Audience

Online shoppers browsing a premium kitchenware brand. Expects high-quality visual presentation and friction-free purchase flow.

## Supplied Content

- Brand name: "Stovetop"
- Product name: "Heritage Cast Iron Skillet — 12-inch"
- Price: "$89.00" (with strikethrough original "$110.00")
- Rating: 4.7 stars (based on 312 reviews)
- Short description: "Pre-seasoned, oven-safe to 500°F, compatible with all cooktops including induction."
- Bullet features (5 items): even heat distribution, dual pour spouts, helper handle, pre-seasoned flaxseed oil finish, lifetime warranty
- Long description: 2 paragraphs about craftsmanship and material
- Sizing options: "10-inch ($72)", "12-inch ($89)", "14-inch ($110)"
- Color / finish options: "Classic Black", "Matte Blue", "Raw Iron"
- Stock status: "In Stock" (with estimated delivery: "Free shipping. Arrives in 3–5 business days.")
- Review snippet: "Best skillet I've owned. Heating is perfectly even across the entire surface." — Sarah K. ★★★★★
- Related products (2): "Cast Iron Dutch Oven — $129", "Cast Iron Griddle — $74"

## Functional Requirements

1. Render a primary product image area (with the supplied illustration description as `alt` text; no actual image needed)
2. Display product title, rating (stars + count), and price with strikethrough original
3. Show at least two variant selectors (size, color/finish) as radio buttons, dropdowns, or segmented controls
4. Render an "Add to Cart" button with the currently selected variant reflected in the label or price
5. Display stock status and shipping estimate
6. Show a product description section with short and long description
7. Render a reviews section with at least one review card
8. Display related products at the bottom

## Required Components

- Product image gallery placeholder (at least one image frame with `alt` text)
- Product title and pricing block (current price, original strikethrough, discount badge if applicable)
- Star rating component (visual stars + numeric average + review count)
- Variant selector (size) — 3 options
- Variant selector (color/finish) — 3 options with visual swatch or text
- Quantity selector (increment/decrement, default 1)
- "Add to Cart" primary button
- Stock/shipping info line
- Product description (short + long)
- Review card (stars, text, author)
- Related products section (2 items, linked)

## Interaction States

| State | Element(s) | Expectation |
|---|---|---|
| `hover` | "Add to Cart" button | Color or background change; pointer cursor |
| `hover` | Variant options | Highlight/outline on hoverable option |
| `hover` | Product image area | Cursor change, optional zoom hint |
| `hover` | Rating stars | Fill or highlight on hover (if interactive) |
| `focus` | All interactive elements | Visible focus ring (≥ 2 px, 3:1 contrast) |
| `active` | "Add to Cart", variant selectors | Pressed state distinguishable |
| `disabled` | Variant option | Out of stock variant is visually disabled but still visible |
| `selected` | Variant option | Selected variant clearly distinguished from unselected |
| `focus` | Quantity selector | Visible on both increment and decrement buttons |
| `error` | (No validation needed for static page) | — |

## Viewport Dimensions

| Viewport | Width | Height |
|---|---|---|
| Desktop | 1280 px | 800 px |
| Mobile | 375 px | 667 px |

## Accessibility Expectations

- Product image has descriptive `alt` text (the supplied illustration description)
- Star rating component uses `aria-label` describing numeric value (e.g., "4.7 out of 5 stars")
- Variant selectors use `<fieldset>` and `<legend>` for groups
- Color/finish options are labeled with text (not only color swatches)
- "Add to Cart" button has a clear label
- Price changes on variant selection are announced via `aria-live="polite"`
- Heading hierarchy: product name as `h1`, sections as `h2`
- Review cards include author name and rating in an accessible format
- Touch targets minimum 44×44 px on mobile
- Color alone does not convey selection state (border, icon, or weight supplement)

## Prohibited Shortcuts

- No CSS framework or utility library
- No e-commerce platform template copied verbatim
- No single-file solution unless explicitly defined
- Do not embed a third-party cart or checkout service
- Do not generate actual product images — use the supplied description as alt text in a styled placeholder
- Do not use lorem ipsum for product descriptions — the supplied text must be rendered verbatim
- Do not implement actual add-to-cart persistence; the button state change is sufficient
- Do not use a generic "build a product page" prompt as the sole instruction

## Scoring Criteria (proposal — weights not final)

| Category | What it measures |
|---|---|
| **Product presentation** | Product info is scannable; price and CTA are prominent |
| **Variant selection** | Size/color selectors are clear, responsive, and show selected state |
| **Pricing clarity** | Current price, original price, and savings are legible and unambiguous |
| **Social proof** | Rating and review(s) are visible and credible |
| **Trust signals** | Stock status, shipping estimate, warranty info are easy to find |
| **Related products** | Recommendations are visible but not distracting |
| **Responsiveness** | Desktop two-column layout (image + details) collapses to single-column on mobile |
| **Interaction feedback** | Hover, focus, active, selected, disabled states are correct |
| **Component consistency** | Buttons, selectors, cards, review blocks share consistent tokens |
| **Generic-default avoidance** | No purple gradients, no exaggerated shadows, no generic hero layout for a product page |

## Expected Deliverables

1. **Source output** — full generated source tree (HTML, CSS, JS)
2. **Design policy** — policy document or marker stating none was used
3. **Desktop screenshot** — 1280×800 showing full product page from image to related products
4. **Mobile screenshot** — 375×667 showing product image area and variant selectors
5. **Variant-selection screenshot** — desktop, showing a non-default variant selected with price updated
6. **Lint report** — `design-canon lint --profile marketing` output
7. **Accessibility report** — automated a11y scan findings

## Run-Manifest Fields

(Same schema as B001. Profile: `marketing`.)

## Known Ambiguity Risks

- **Price update on variant selection**: The brief says "Add to Cart button with the currently selected variant reflected in the label or price." It does not specify whether price changes between sizes (sizes have different prices) should update dynamically. Some runs may implement dynamic pricing; others may show a static price with size labels only.
- **Image area design**: Since no actual product image is supplied, the placeholder can range from a styled gray box to an abstract illustration. This creates visual variance that may affect holistic impression scoring.
- **Quantity selector**: Not specified whether the quantity input should allow arbitrary text entry or only increment/decrement buttons. Both are acceptable but affect mobile usability.
- **Color swatch appearance**: The brief says "with visual swatch or text" but does not specify how color options should be rendered. Text-only, color-dot, or full-swatch approaches all valid.
- **Related products linking**: The brief says "2 items, linked" but does not specify whether links go to `#` anchor targets or hypothetical product URLs. This affects the perception of completeness.
- **Review authenticity**: The single review snippet is supplied. Runs may display it as a static card, a scrolling carousel, or a full reviews section. The implementation choice affects section density.
