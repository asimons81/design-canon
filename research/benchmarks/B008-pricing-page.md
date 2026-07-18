> **Proposal** — generated fixture brief for the Design Canon benchmark factory. Not a final scoring rubric.

# B008: Pricing Page

| Field | Value |
|---|---|
| **ID** | `B008` |
| **Status** | proposal |
| **Category** | marketing |
| **Applicable Design Canon profile** | `marketing` |

## Title

SaaS Pricing Page

## Objective

Generate a pricing page for a developer-tool SaaS product with three plan tiers and a feature comparison table. The page must clearly differentiate plan values, handle an enterprise tier with contact-based pricing, and include a toggle for annual vs. monthly billing. This benchmark tests how models handle comparative pricing layouts, toggle-driven content switching, and the callout/badge pattern.

## Audience

Engineering managers and developers evaluating a deployment policy tool. Cost-conscious but value-driven; expects transparent pricing.

## Supplied Content

- Product: "Pragma"
- Billing toggle: "Monthly" / "Annual" (Annual shows "Save 20%" badge)
- Three tiers:
  - **Starter** — $29/mo ($23/mo annual): 5 users, 500 policy checks/mo, email support, community access
  - **Pro** — $99/mo ($79/mo annual): 25 users, 10,000 policy checks/mo, Slack + email support, audit logs, custom policies, SSO
  - **Enterprise** — "Contact us": Unlimited users, unlimited checks, dedicated support, on-premise option, SLA, custom integrations
- Feature comparison table rows (at least 8 rows covering: users, policy checks, support, audit logs, SSO, custom policies, on-premise, SLA)
- Each tier has a CTA button: Starter = "Start Free Trial", Pro = "Start Free Trial" (highlighted / recommended), Enterprise = "Contact Sales"
- Pro tier is marked as "Most Popular"

## Functional Requirements

1. Render three pricing plan cards side by side on desktop, stacked on mobile
2. Include a billing-period toggle (Monthly ↔ Annual) that updates displayed prices
3. The "Pro" (middle) tier must be visually distinguished as the recommended plan (badge, border, or background)
4. Each card includes: plan name, price, billing period, feature list (short), CTA button
5. Render a full feature comparison table below the cards with all supplied rows
6. The Enterprise card must show "Contact us" instead of a price
7. CTA buttons must be distinct per tier (Primary for Pro, secondary for Starter/Enterprise)
8. Annual pricing must show the per-month equivalent plus a savings indicator

## Required Components

- Page heading ("Pricing" or "Choose your plan")
- Billing toggle (segmented control or switch, monthly / annual)
- Pricing card × 3 (plan name, price, period, feature list, CTA)
- "Most Popular" badge (on Pro tier)
- Savings label on annual pricing
- Feature comparison table (≥ 8 rows, 4 columns: feature | Starter | Pro | Enterprise)
- FAQ section or footer note (e.g., "All plans include a 14-day free trial. No credit card required.")

## Interaction States

| State | Element(s) | Expectation |
|---|---|---|
| `hover` | Pricing card | Card lift, border emphasis, or shadow change |
| `hover` | CTA buttons | Color/background change |
| `hover` | Toggle (monthly/annual) | Pointer cursor, active segment highlighted |
| `focus` | All interactive elements | Visible focus ring (≥ 2 px, 3:1 contrast) |
| `active` | CTA buttons, toggle options | Pressed state distinguishable |
| `selected` | Billing toggle | Active segment clearly distinguished from inactive |
| `checked` / `unchecked` | Toggle switch (if used) | Clear state difference |
| `focus` | Feature table | If table rows are interactive, focus indicator; otherwise table is informational |
| scroll | Pricing cards (mobile) | Cards stack; no horizontal overflow |

## Viewport Dimensions

| Viewport | Width | Height |
|---|---|---|
| Desktop | 1280 px | 800 px |
| Mobile | 375 px | 667 px |

## Accessibility Expectations

- Billing toggle is keyboard-operable (arrow keys or Tab + Enter)
- Price values update in a container with `aria-live="polite"` when toggle is switched
- Plan names are `h2` or `h3` elements for semantic hierarchy
- "Most Popular" badge is descriptive text, not conveyed by color alone
- Feature comparison table uses proper `<th scope="col">` and `<th scope="row">`
- Checkmark/cross icons in the comparison table have `aria-label` equivalents
- CTA buttons have clear text (not "Learn More" — specific action labels)
- Touch targets minimum 44×44 px on mobile
- No loss of information when billing toggle is switched (prices for both periods are accessible even when hidden)

## Prohibited Shortcuts

- No CSS framework or utility library
- No copy-pasted pricing page template
- No single-file solution unless explicitly defined
- Do not embed a third-party pricing or billing widget
- Do not populate the page with pricing data beyond what is supplied
- Do not implement actual Stripe/checkout integration; button click may show a placeholder state
- Do not use a generic "build a pricing page" prompt as the sole instruction

## Scoring Criteria (proposal — weights not final)

| Category | What it measures |
|---|---|
| **Plan differentiation** | Each tier's value proposition is visually clear at a glance |
| **Price presentation** | Prices, periods, and discounts are unambiguous and scannable |
| **Recommended tier treatment** | "Most Popular" is visually emphasized without diminishing other tiers |
| **Billing toggle** | Toggle is prominent, works correctly, prices update visibly |
| **Comparison table** | Table is readable, scannable, and responsive (horizontal scroll or stacked on mobile) |
| **Responsiveness** | Three-column cards → stacked layout; table remains usable on mobile |
| **Interaction feedback** | Hover/focus/active states on cards, buttons, toggle |
| **Typography** | Numbers and prices use tabular figures; plan names are prominent |
| **Component consistency** | Cards, buttons, table cells share consistent tokens |
| **Generic-default avoidance** | No purple gradients, no AI-generic hero layouts, no decorative icons that add noise |

## Expected Deliverables

1. **Source output** — full generated source tree (HTML, CSS, JS)
2. **Design policy** — policy document or marker stating none was used
3. **Desktop screenshot (monthly)** — 1280×800 showing cards + comparison table at monthly billing
4. **Desktop screenshot (annual)** — same, with annual toggle active
5. **Mobile screenshot** — 375×667 showing pricing cards stacked
6. **Lint report** — `design-canon lint --profile marketing` output
7. **Accessibility report** — automated a11y scan findings

## Run-Manifest Fields

(Same schema as B001. Profile: `marketing`.)

## Known Ambiguity Risks

- **Annual price display format**: The brief says "$23/mo" for annual but does not specify whether to also show the annual total ($276/yr). Some runs may show per-month only, others both. This affects price transparency.
- **Toggle mechanism**: Not specified whether the billing toggle should be a switch, segmented control, or tab-style buttons. Different implementations have different accessibility characteristics.
- **Comparison table on mobile**: Not specified whether to horizontally scroll or restructure into per-plan lists. Both are valid approaches with different usability trade-offs.
- **Savings indicator placement**: The brief says "Save 20%" badge on annual but does not specify where — on the toggle, on the cards, or both. This affects visibility.
- **Enterprise card CTA**: "Contact Sales" could be a button, a `mailto:` link, or a link to a contact form. The brief doesn't specify which.
- **FAQ content**: The brief says "FAQ section or footer note" but does not supply FAQ content. Runs that invent FAQ items may add noise. The note about "14-day free trial" is the minimum required content.
