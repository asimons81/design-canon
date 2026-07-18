> **Proposal** — generated fixture brief for the Design Canon benchmark factory. Not a final scoring rubric.

# B002: Developer Dashboard

| Field | Value |
|---|---|
| **ID** | `B002` |
| **Status** | proposal |
| **Category** | product-app |
| **Applicable Design Canon profile** | `product-app` |

## Title

Developer Operations Dashboard

## Objective

Generate a dashboard interface that surfaces real-time operational data for a deployment-pipeline monitoring tool. The dashboard must present time-series metrics, a recent-events feed, and service-status indicators in a legible, information-dense layout. The primary challenge is organizing complex data without visual chaos.

## Audience

Platform engineers and DevOps practitioners who monitor multiple services daily. High data literacy; expects dense, scannable layouts.

## Supplied Content

- Dashboard title: "Pragma — Pipeline Overview"
- Four metric cards:
  - **Active Gates**: 12 (with trend arrow +8% from last week)
  - **Blocked Deployments**: 3 (trend -2 from yesterday)
  - **Pass Rate**: 94.2% (trend +1.1 pp)
  - **Audit Events Today**: 847 (trend +23%)
- A recent-events table with 6 rows: timestamp, service name, event type, status, user
- Three service-status badges: `api` (healthy), `policy-engine` (degraded), `db-sync` (healthy)
- An inline time-series sparkline data set (12 data points representing hourly pass rate over the last 12 hours: [92.1, 93.4, 91.8, 94.0, 93.7, 94.5, 93.2, 92.9, 94.8, 95.1, 94.2, 93.8])

## Functional Requirements

1. Render a top-level header with the dashboard title and a user-avatar placeholder
2. Display four metric summary cards in a horizontal row (desktop) and a stacked column (mobile)
3. Render a time-series inline chart or sparkline for pass-rate history (last 12 hours)
4. Display service-status badges with color-coded health indicators (green = healthy, yellow/orange = degraded, red = down)
5. Render a recent-events table sortable by at least one column (timestamp or status)
6. Ensure the layout does not horizontally overflow the viewport at either breakpoint
7. Include a sidebar navigation with links: Dashboard, Pipelines, Policies, Audit, Settings

## Required Components

- Top app header (title, optional user avatar or settings gear icon)
- Sidebar navigation (collapsible on mobile)
- Metric cards (4 cards in a responsive grid)
- Inline sparkline / mini-chart (rendered as SVG or Canvas, not an image)
- Service-status section (3 badges)
- Data table (6 rows, minimum 4 columns, sortable header)
- Responsive grid that rearranges cards from horizontal to vertical on mobile

## Interaction States

| State | Element(s) | Expectation |
|---|---|---|
| `hover` | Table rows, metric cards, sidebar links | Background or border highlight |
| `hover` | Sortable column headers | Cursor change, visible sort-direction indicator |
| `focus` | All interactive elements | Visible focus ring (≥ 2 px offset, 3:1 contrast) |
| `active` | Sidebar links, sortable headers | Pressed state distinguishable |
| `focus` | Table rows (if clickable) | Focus outline that remains visible after mouse click |
| scroll | Sidebar | If sidebar overflows, internal scrollbar |
| scroll | Data table | Table header remains fixed if the table body scrolls |

## Viewport Dimensions

| Viewport | Width | Height |
|---|---|---|
| Desktop | 1280 px | 800 px |
| Mobile | 375 px | 667 px |

## Accessibility Expectations

- Keyboard-navigable sidebar with visible focus indicator and expected ARIA role (`navigation`)
- Data table uses proper `<table>`, `<th scope>`, `<caption>` or `aria-label`
- Sparkline chart must have an accessible text alternative (data table or `aria-label` with summary)
- Status badges must not rely on color alone — include text labels or icon indicators
- Minimum touch targets 44×44 px on mobile
- Sortable column headers indicate sort direction to screen readers (`aria-sort`)
- Color contrast: metric card text ≥ 4.5:1, badge text ≥ 4.5:1
- No loss of functionality when page zoomed to 200%

## Prohibited Shortcuts

- No third-party charting library (no Chart.js, D3, Recharts, etc.) — the sparkline must be implemented in vanilla SVG, Canvas, or inline CSS
- No CSS framework or utility library
- No copy-pasted dashboard template
- No single-file solution unless the deliverable explicitly defines a single-file format
- Do not generate placeholder images for chart content (the chart must be rendered, not an image)
- Do not use a generic "build a dashboard" prompt as the sole instruction

## Scoring Criteria (proposal — weights not final)

| Category | What it measures |
|---|---|
| **Data density** | Information is dense but scannable; whitespace is used to group, not to spread |
| **Visual hierarchy** | Header > metric summaries > chart > table ordering is clear at a glance |
| **Typography** | Precise data labeling, readable tabular figures, consistent scale |
| **Color** | Semantic color (status, trend direction) is used consistently and redundantly labeled |
| **Responsiveness** | Desktop four-column layout degrades gracefully to mobile without data loss |
| **Chart quality** | Sparkline is readable at native size, shows trend direction clearly |
| **Component consistency** | Cards, table cells, badges share the same spacing, radius, and type tokens |
| **Interaction feedback** | Hover, focus states visible across all interactive zones |
| **Generic-default avoidance** | No purple gradients, exaggerated shadows, decorative blobs, or unlabeled metric decorations |

## Expected Deliverables

1. **Source output** — full generated source tree (HTML, CSS, JS)
2. **Design policy** — the policy document or marker stating none was used
3. **Desktop screenshot** — 1280×800 with dashboard fully rendered
4. **Mobile screenshot** — 375×667 with dashboard fully rendered
5. **Lint report** — `design-canon lint --profile product-app` output
6. **Accessibility report** — automated a11y scan findings

## Run-Manifest Fields

(Same schema as B001; see `B001-saas-landing.md` for the full manifest field table. The `profile` field must record `product-app`.)

## Known Ambiguity Risks

- **Sparkline implementation**: How the sparkline is drawn (inline SVG, CSS bar chart, Canvas) affects file size, rendering fidelity, and accessibility options. The brief does not mandate a specific technique.
- **Table sortability**: The brief requires one sortable column but does not specify whether sorting should be implemented client-side (JS) or assumed to be handled server-side. Runs using static HTML may mark the header as sortable without implementing the sort behavior.
- **Sidebar collapse on mobile**: The brief says "collapsible on mobile" but does not specify the collapse mechanism (hamburger toggle, overlay, off-canvas). Different mechanisms change mobile usability scoring.
- **"Recent events" time format**: No relative vs. absolute time format is prescribed (e.g., "2 min ago" vs "14:23:01"). Both are industry-standard but affect column width and scannability.
- **Metric card trend rendering**: The trend data (+8%, -2, etc.) can be shown as plain text, colored text with arrow, or a mini bar. This varies visual density across runs.
- **Chart data rendering at mobile**: The sparkline may need to be wider than the mobile viewport. The brief does not specify truncation vs. scroll vs. alternative mobile representation.
