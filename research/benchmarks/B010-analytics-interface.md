> **Proposal** — generated fixture brief for the Design Canon benchmark factory. Not a final scoring rubric.

# B010: Data-Dense Analytics Interface

| Field | Value |
|---|---|
| **ID** | `B010` |
| **Status** | proposal |
| **Category** | product-app |
| **Applicable Design Canon profile** | `product-app` |

## Title

Data-Dense Analytics Dashboard

## Objective

Generate an analytics interface that presents multiple data dimensions simultaneously — time-series line charts, categorical bar chart, key-value metric tiles, and a data table — in a layout that prioritizes scanability and comparison. This is the most visually complex benchmark in the set, designed to test whether models can organize dense information without visual noise.

## Audience

Data analysts and product managers who need to compare metrics across dimensions daily. High data literacy; expects compact, label-rich visualizations.

## Supplied Content

- Dashboard title: "Campaign Performance — Q3 2026"
- Six KPI metric tiles (label + value + change arrow):
  - Impressions: 2.4M (+12.3%)
  - Clicks: 184K (+8.7%)
  - CTR: 7.67% (−0.4 pp)
  - Conversions: 12,842 (+22.1%)
  - CPA: $24.18 (−5.2%)
  - Revenue: $847K (+18.9%)
- Line chart data: 12 data points by month (Jan–Dec) for two series: "Paid" [120, 135, 128, 142, 158, 165, 149, 172, 188, 201, 215, 238] and "Organic" [45, 48, 52, 49, 55, 58, 62, 60, 68, 72, 79, 85]
- Bar chart data: 5 categories (channels: Social, Search, Email, Direct, Display) with two metrics per channel: "Spend" [22K, 45K, 12K, 18K, 30K] and "Conversions" [1.2K, 3.8K, 2.1K, 0.9K, 1.5K]
- Data table: 8 rows × 5 columns (Campaign, Impressions, Clicks, Conv., CPA)
- Date range selector dropdown with "Last 30 days", "Last quarter", "Year to date", "Custom" options

## Functional Requirements

1. Render six KPI metric tiles in a horizontal row on desktop, grid on mobile
2. Render a time-series multi-line chart showing two trends over 12 months
3. Render a grouped or stacked bar chart comparing 5 channels across 2 metrics
4. Render a scrollable data table with 8 rows and 5 columns
5. Include a date range selector with at least 4 predefined options
6. All charts must be rendered (SVG or Canvas), not image placeholders
7. The layout must fit in the desktop viewport without requiring vertical scroll for the first screen (metric tiles + one chart visible above the fold)

## Required Components

- Dashboard header (title, date range selector)
- KPI metric tiles (6 tiles with label, value, change arrow, and optional mini sparkline)
- Multi-line chart (2 series, 12 data points each, with legend)
- Grouped bar chart (5 groups, 2 bars per group, with legend)
- Data table (8 rows, 5 columns, sortable headers)
- Chart legends (clear labeling for both charts)
- Tooltip or hover label on chart data points (optional but encouraged)

## Interaction States

| State | Element(s) | Expectation |
|---|---|---|
| `hover` | KPI tiles | Slight lift or background change |
| `hover` | Chart data points | Tooltip with exact value appears |
| `hover` | Chart legend items | Highlight or dim the corresponding series |
| `hover` | Table rows | Row highlight for scanability |
| `hover` | Sortable column headers | Cursor change, sort indicator |
| `focus` | All interactive elements | Visible focus ring (≥ 2 px, 3:1 contrast) |
| `active` | Dropdown, sortable headers, any clickable | Pressed state distinguishable |
| `focus` | Chart elements (if interactive) | Accessible focus management for data points |
| `empty` | (No empty states — all data supplied) | — |
| `error` | (No error states) | — |

## Viewport Dimensions

| Viewport | Width | Height |
|---|---|---|
| Desktop | 1280 px | 800 px |
| Mobile | 375 px | 667 px |

## Accessibility Expectations

- Charts must have descriptive `aria-label` or `role="img"` with a text summary of the data
- Chart data should be available in an alternative text format (table or description)
- KPI tiles have clear labels — change arrows are accompanied by text direction (e.g., "up 12.3%")
- Data table uses proper `<table>`, `<th scope>`, `<caption>` or `aria-label`
- Sortable columns use `aria-sort`
- Color is not the only differentiator between chart series (patterns, dashed lines, or labels supplement)
- The date range selector is a proper `<select>` or equivalent with associated label
- Focus order is logical: header → filters → KPI → chart → chart → table
- Touch targets minimum 44×44 px on mobile

## Prohibited Shortcuts

- No third-party charting library (no Chart.js, D3, Recharts, etc.) — charts must be implemented in vanilla SVG or Canvas
- No CSS framework or utility library
- No copy-pasted analytics dashboard template
- No single-file solution unless explicitly defined
- Do not generate image placeholders for charts
- Do not use a generic "build analytics dashboard" prompt as the sole instruction

## Scoring Criteria (proposal — weights not final)

| Category | What it measures |
|---|---|
| **Data density management** | Dense information remains scannable; whitespace separates dimensions |
| **Chart implementation** | SVG/Canvas charts are legible, accurate, and appropriately labeled |
| **KPI presentation** | Metrics are prominent; changes are easy to scan |
| **Chart-reader interaction** | Tooltips or hover states help users read exact values |
| **Table design** | Data table is readable, sortable, and fits the layout |
| **Responsiveness** | Dense layout degrades to mobile without data loss; charts still legible |
| **Consistency** | Color coding is consistent across charts, tiles, and table |
| **Accessibility** | Charts have text alternatives; table is semantic; interactions are keyboard-accessible |
| **Generic-default avoidance** | No purple gradients, no decorative blobs, no 3D chart effects, no chart junk |

## Expected Deliverables

1. **Source output** — full generated source tree (HTML, CSS, JS)
2. **Design policy** — policy document or marker stating none was used
3. **Desktop screenshot** — 1280×800 showing KPI row and at least one chart in-view
4. **Mobile screenshot** — 375×667 showing KPI grid and first chart
5. **Chart detail screenshot** — desktop, with at least one tooltip/hover active on a chart
6. **Lint report** — `design-canon lint --profile product-app` output
7. **Accessibility report** — automated a11y scan findings

## Run-Manifest Fields

(Same schema as B001. Profile: `product-app`. Note: additional field for `tooltip_interaction_screenshot`.)

## Known Ambiguity Risks

- **Chart aspect ratios**: The brief does not specify chart dimensions or aspect ratios. Some runs may use wide short charts while others use square charts, affecting data readability and how many charts fit above the fold.
- **Chart type for bar chart**: Grouped bar vs. stacked bar vs. side-by-side is not prescribed. Grouped bars (two bars per channel) are likely but not required.
- **Tooltip implementation**: The brief encourages but does not require tooltips. Some runs will have no chart interaction at all; others may have rich tooltip systems. This creates a significant variance in interactivity scoring.
- **Mini sparklines in KPI tiles**: The brief says "(optional mini sparkline)" — some runs will include trend sparklines in each KPI tile, others won't. The presence of sparklines changes visual density considerably.
- **Responsive chart treatment on mobile**: Charts designed for desktop width must be adapted for mobile. The brief does not specify how (scroll, resize, stack). Different approaches affect mobile usability.
- **Data accuracy**: Runs must render the exact supplied data. Minor rendering errors (missing data point, swapped series) may be hard to detect in screenshots but affect correctness.
- **Sortable table implementation**: Client-side JS sort vs. static markup with sortable headers only (no JS) are both valid but have very different interaction capabilities.
