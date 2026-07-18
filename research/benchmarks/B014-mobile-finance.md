> **Proposal** — generated fixture brief for the Design Canon benchmark factory. Not a final scoring rubric.

# B014: Mobile Finance Interface

| Field | Value |
|---|---|
| **ID** | `B014` |
| **Status** | proposal |
| **Category** | product-app |
| **Applicable Design Canon profile** | `product-app` |

## Title

Mobile Personal Finance Dashboard

## Objective

Generate a mobile-first personal finance dashboard showing account balances, recent transactions, a spending breakdown, and quick-transfer functionality. The interface must present sensitive financial data in a clear, trustworthy layout optimized for thumb-reach and glanceability. This benchmark tests mobile-specific layout constraints — bottom navigation, card-focused layouts, and numeric data presentation.

## Audience

Individual users managing personal finances on a smartphone. Expects secure visual tone, clear numbers, and quick access to common actions.

## Supplied Content

- App name: "Penny"
- User greeting: "Good morning, Jordan"
- Account summary (4 accounts):
  - **Checking** (••••4821): $3,420.50
  - **Savings** (••••9033): $12,850.75
  - **Credit Card** (••••6710): −$847.23 (due in 12 days)
  - **Investment** (••••2241): $24,100.00
- Net worth indicator: "$39,524.02" (+$1,240 this month)
- Recent transactions (6 rows):
  | Date | Merchant | Amount | Category |
  |---|---|---|---|
  | Today | Electric Co. | −$124.50 | Utilities |
  | Yesterday | Coffee Shop | −$5.75 | Dining |
  | Yesterday | Salary Deposit | +$4,200.00 | Income |
  | Jul 15 | Grocery Mart | −$89.32 | Groceries |
  | Jul 14 | Streaming Service | −$14.99 | Entertainment |
  | Jul 13 | Gas Station | −$42.00 | Transport |
- Spending breakdown (4 categories with percentages): Housing 35%, Food 22%, Transport 12%, Other 31%
- Quick actions: "Transfer", "Pay", "Deposit", "Statements"

## Functional Requirements

1. Render a mobile-first layout (desktop viewport should show a centered phone-sized container, max-width ~400 px)
2. Display user greeting and net worth prominently at the top
3. Show account cards for each of the 4 accounts with balance, masked account number, and a visual indicator of account type
4. Render a recent-transactions list (6 rows) with date, merchant, amount (colored: red for debits, green for credits), and category
5. Display a spending breakdown (pie/donut chart or bar visualization of 4 categories)
6. Show 4 quick-action buttons in a horizontal row or 2×2 grid
7. Include a bottom navigation bar with at least 4 tabs (e.g., Home, Accounts, Transfer, Profile)

## Required Components

- Status bar / top header (greeting + optional notification bell)
- Net worth card (large number, monthly change indicator)
- Account card list (4 cards, swipable or stacked)
- Transaction list (6 rows with date, merchant, amount, category icon/label)
- Spending breakdown chart (donut, pie, or bar — SVG/Canvas, not image)
- Quick-action buttons (4 items with icon + label)
- Bottom navigation bar (4 tabs, with active-tab indicator)

## Interaction States

| State | Element(s) | Expectation |
|---|---|---|
| `hover` | Quick-action buttons, bottom nav tabs | Visible state change |
| `hover` | Account cards | Slight lift or border emphasis |
| `hover` | Transaction rows | Background highlight |
| `focus` | All interactive elements | Visible focus ring (≥ 2 px, 3:1 contrast) |
| `active` / `pressed` | Buttons, nav tabs, cards | Pressed state distinguishable |
| `selected` | Bottom nav tab | Active tab clearly distinguished |
| `focus` | (No form inputs for main view) | — |
| swipe | Account cards | Optional horizontal swipe between accounts |
| scroll | Transaction list | Cards remain fixed; transaction rows scroll |
| `empty` | (Not applicable — all data supplied) | — |

## Viewport Dimensions

| Viewport | Width | Height |
|---|---|---|
| Desktop | 1280 px | 800 px |
| Mobile | 375 px | 667 px |

Note: This is a **mobile-first** benchmark. Desktop rendering must be constrained to a phone-sized container (max-width ~400 px, centered).

## Accessibility Expectations

- Monetary values use proper currency formatting (e.g., `$3,420.50` with grouping separators)
- Negative amounts (debits) are indicated with both a minus sign and red color (not color alone)
- Account cards have clear headings — masked account numbers are not announced as digits (screen readers should read "Checking ending in 4821")
- Bottom navigation uses `role="tablist"` / `role="tab"` or `<nav>` with `aria-label`
- Transaction amounts include `aria-label` with full description (e.g., "Debit one hundred twenty-four dollars and fifty cents")
- Spending breakdown chart has an accessible data table or `aria-label` with percentages
- Quick-action buttons have both icon and text label
- Touch targets minimum 44×44 px (especially bottom nav and quick actions)
- Color contrast: all text on colored backgrounds ≥ 4.5:1
- No horizontal overflow at mobile viewport

## Prohibited Shortcuts

- No CSS framework or utility library
- No charting library (donut/pie chart must be SVG or Canvas, no images)
- No copy-pasted finance dashboard template
- No single-file solution unless explicitly defined
- Do not implement real financial data connections or APIs
- Do not generate placeholder chart images — chart must be rendered
- Do not use a generic "build a finance app" prompt as the sole instruction

## Scoring Criteria (proposal — weights not final)

| Category | What it measures |
|---|---|
| **Mobile-first layout** | Layout is thumb-friendly, bottom nav is accessible, content fills mobile viewport naturally |
| **Numeric data presentation** | Currency formatting, decimal alignment, positive/negative distinction are clear |
| **Account overview** | Account cards are scannable; net worth is prominent |
| **Spending visualization** | Chart is readable at small size, category labels are clear |
| **Transaction list** | Rows are scannable; debits and credits are instantly distinguishable |
| **Quick actions** | Actions are prominent and reachable with the thumb |
| **Bottom navigation** | Tabs are clear, active tab is obvious, navigation is intuitive |
| **Interaction feedback** | Hover/focus/active states on cards, nav, actions |
| **Generic-default avoidance** | No purple finance-app stereotypes, no decorative charts (3D, shadows), no AI-generic icons |

## Expected Deliverables

1. **Source output** — full generated source tree (HTML, CSS, JS)
2. **Design policy** — policy document or marker stating none was used
3. **Mobile screenshot (full)** — 375×667 showing dashboard with greeting, net worth, accounts, and transactions
4. **Mobile screenshot (scroll)** — 375×667 showing spending breakdown and quick actions
5. **Desktop screenshot** — 1280×800 showing the phone-sized centered container
6. **Lint report** — `design-canon lint --profile product-app` output
7. **Accessibility report** — automated a11y scan findings

## Run-Manifest Fields

(Same schema as B001. Profile: `product-app`. Note: additional field `mobile_first` set to `true`.)

## Known Ambiguity Risks

- **Account card interaction**: Not specified whether account cards should be tappable (navigating to account detail) or informational only. This affects interaction depth.
- **Spending breakdown implementation**: Donut chart vs. pie chart vs. horizontal bar is not specified. Each has different data-ink ratios and mobile readability characteristics.
- **Bottom nav tab destinations**: The brief says "4 tabs" with example labels but does not specify whether tabs should switch the main content area (single-page app behavior) or be inert UI. This is a major architectural difference.
- **Desktop container treatment**: The brief requires a "centered phone-sized container" but does not specify whether it should include a phone bezel graphic, shadow, or plain box. This affects desktop visual polish scoring.
- **Currency precision**: All supplied values use 2 decimal places, but the brief does not mandate consistent decimal formatting across the interface. Some runs may omit decimals on whole numbers.
- **Spending category colors**: Not supplied. Runs must choose their own color palette for the 4 spending categories, introducing variance in chart appearance and accessibility.
- **Transaction list scrolling vs. full list**: At mobile 375×667, 6 transactions may not all be visible without scrolling. The brief does not specify whether the full list must be visible or if scrolling is acceptable.
