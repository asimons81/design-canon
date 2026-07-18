> **Proposal** — generated fixture brief for the Design Canon benchmark factory. Not a final scoring rubric.

# B015: Legacy Interface Redesign

| Field | Value |
|---|---|
| **ID** | `B015` |
| **Status** | proposal |
| **Category** | mixed (redesign) |
| **Applicable Design Canon profiles** | `product-app` (primary), `marketing` (considerations) |

## Title

Legacy Enterprise Interface Redesign

## Objective

Redesign a provided legacy enterprise software interface. The source material is a functional but visually dated internal tool for managing customer support tickets. The redesign must improve readability, information hierarchy, and interaction quality while preserving all existing functionality and data fields. This benchmark tests restraint — the goal is improvement, not reinvention.

## Audience

Customer support agents who use this tool 6–8 hours per day. They are efficiency-focused, resistant to unnecessary change, and value muscle memory. The redesign must not introduce visual noise, hidden features, or gratuitous layout changes that harm productivity.

## Supplied Content

Legacy interface specification (described below — no actual image provided, this is a textual description):

```
Legacy "Ticket View" interface:
- Top bar: dark gray header with small white text "Support Hub v3.2.1"
- Below header: tab bar (Tickets, Customers, Reports, Settings) — blue text on light gray, no active state indicator
- Main area: ticket list table with columns: Ticket# (small monospace), Status (text: Open/Pending/Resolved/Closed), Priority (text: High/Medium/Low), Subject (text, truncated), Customer (text), Created (date), Assigned To (text)
- Table has alternating gray/white row backgrounds, no hover state, no sort indicators
- Selected ticket detail panel on right (30% width): scrollable plain white panel showing Subject, Customer name, email, phone, Status dropdown, Priority dropdown, Assigned To dropdown, Created date, Description (textarea), internal notes (textarea), Save/Cancel buttons
- Save button: green with white text, Cancel: gray button
- No search or filter controls visible by default
- Font: Arial 12px throughout; table header bold
```

## Functional Requirements

1. Ticket list with columns: Ticket#, Status, Priority, Subject, Customer, Created, Assigned To
2. Status column with visually distinct badges (Open=blue, Pending=yellow, Resolved=green, Closed=gray)
3. Priority column with visual indicators (High=red accent, Medium=yellow accent, Low=no accent)
4. Ticket detail panel showing full ticket information on selection
5. Search/filter bar above ticket list (search by keyword, filter by status or priority)
6. Sort capability on column headers (click header to sort ascending/descending)
7. Inline status or priority change without opening detail panel (select dropdown in table row)
8. Dark header with app name and user menu placeholder
9. Navigation with active state indication

## Required Components

- Application header with name, user menu placeholder
- Navigation tabs with active state
- Search bar with keyword input, status filter dropdown, priority filter dropdown
- Sortable table with hover states and sort indicators on column headers
- Status badge component (4 variants)
- Priority indicator component (3 variants)
- Ticket detail panel (slide-in or side panel)
- Form controls within detail panel (textarea, dropdowns, buttons)
- Empty state for no-search-results

## Interaction States

| State | Element(s) | Expectation |
|---|---|---|
| `hover` | Table rows, buttons, navigation items | Visible highlighting |
| `focus` | All interactive elements | Visible focus ring |
| `active` | Buttons, nav items | Pressed state |
| `selected` | Table row | Distinct highlight color vs. hover |
| `sort` | Column header | Visual indicator (arrow) for active sort direction |
| `disabled` | Save button | Grayed out if no changes made |
| `empty` | Filter results | "No tickets match your search" with clear filter button |
| transition | Detail panel | Smooth open/close (slide or fade, under 300ms) |

## Viewport Dimensions

| Viewport | Width | Height |
|---|---|---|
| Desktop | 1280 px | 800 px |
| Mobile | 375 px | 667 px |

## Accessibility Expectations

- Table uses `<table>` with `<th>` headers and `scope` attributes
- Status badges include text labels (not color alone)
- Sort buttons have `aria-sort` attribute
- Detail panel has `role="dialog"` or `aria-label`
- Filter controls have associated labels
- All form controls in detail panel have labels
- Save/Cancel buttons must not be confused visually (Save is primary)
- Minimum touch targets 44×44px on mobile

## Prohibited Shortcuts

- No CSS framework (no Tailwind, Bootstrap, etc.)
- No copy-paste of production support tools (Zendesk, Intercom, etc.)
- No charting or data visualization (this is a list/detail interface)
- No drag-and-drop, no kanban, no cards view (preserve table layout)
- No adding features not in the functional requirements
- No removing fields or functionality present in the legacy spec
- No AI copilot or chatbot additions
- No dark mode toggle or theme switcher

## Scoring Criteria (proposal — weights not final)

| Category | What it measures |
|---|---|
| **Restraint** | Improvement without unnecessary change; no gratuitous redesign |
| **Readability** | Better typography, spacing, and hierarchy than legacy; preserves scanability |
| **Information hierarchy** | Ticket list is primary; detail panel is secondary; filters are accessible |
| **Color** | Status/priority colors are meaningful and accessible; no decorative color |
| **Interaction** | Row hover, sort, filter, inline edit all work; detail panel transitions smoothly |
| **Layout** | List+detail layout works at 1280px; responsive adaptation at 375px |
| **Density** | Improved over legacy but appropriate for daily-use tool; not over-spaced |
| **Accessibility** | Semantic table, sort indicators, form labels, focus management |
| **Generic-default avoidance** | No "modern" dashboard tropes; no AI UI patterns; no glassmorphism or large shadows |

## Expected Deliverables

1. Source output (HTML + CSS + JS)
2. Design policy marker
3. Desktop screenshot at 1280×800 (list+detail view)
4. Mobile screenshot at 375×667 (stacked or single-panel view)
5. Lint report: `design-canon lint --profile product-app`
6. Accessibility report

## Run-Manifest Fields

(Standard manifest per brief template)

## Known Ambiguity Risks

- **Detail panel interaction**: Click row to select vs. click row to open panel vs. hover preview. The brief says "on selection" which is ambiguous.
- **Inline edit depth**: Dropdown in table row for status/priority vs. click-to-reveal control vs. simple text click that opens the detail panel. The brief specifies dropdown but implementation may vary.
- **Mobile strategy**: Stacked (list on top, detail below) vs. separate views with toggle vs. slide-in panel covering full screen. The brief doesn't mandate a specific mobile layout.
- **"Sort capability" scope**: Single-column sort vs. multi-column sort vs. shift-click for secondary sort. Default single-column is assumed.
- **Legacy spec fidelity**: Whether to exactly replicate the legacy data set or improve it. The brief says "preserve all existing functionality" but the spec lists text fields that may benefit from formatting (dates, phone numbers).
