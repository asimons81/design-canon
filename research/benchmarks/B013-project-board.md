> **Proposal** — generated fixture brief for the Design Canon benchmark factory. Not a final scoring rubric.

# B013: Project-Management Board

| Field | Value |
|---|---|
| **ID** | `B013` |
| **Status** | proposal |
| **Category** | product-app |
| **Applicable Design Canon profile** | `product-app` |

## Title

Kanban-Style Project Board

## Objective

Generate a project-management board view with drag-and-drop columns representing workflow stages. The board must display task cards with summary metadata, support column-to-column movement, and adapt a multi-column layout to mobile. This benchmark tests how models handle interactive card layouts, drag affordances, and responsive column management.

## Audience

Software development teams using agile workflow. Expects fast visual scanning of task states, assignees, and priorities.

## Supplied Content

- Board title: "Sprint 27"
- Four columns (represented as supplied data, not fetched from an API):
  - **Backlog** (3 cards): "Investigate login timeout regression" (P1, assigned to Alex), "Update dependency graph" (P2, unassigned), "Write migration guide" (P3, assigned to Jordan)
  - **In Progress** (2 cards): "Refactor policy engine" (P1, assigned to Morgan, due tomorrow), "Add audit log export" (P2, assigned to Casey, due Friday)
  - **Review** (2 cards): "Fix MFA redirect loop" (P1, assigned to Alex, PR #142), "Responsive nav fixes" (P2, assigned to Jordan, PR #143)
  - **Done** (3 cards): "Initial onboarding flow" (P2, closed 2d ago), "SSO integration test" (P1, closed 3d ago), "API rate limit docs" (P3, closed 5d ago)
- Each card contains: title, priority label (P1/P2/P3), assignee name, optional due date or PR link, optional "closed" relative date
- Column headers show column title and card count

## Functional Requirements

1. Render four vertical columns in a horizontal scrollable layout on desktop
2. Each column displays its title, card count, and its cards stacked vertically
3. Task cards show title, priority, assignee, and any additional metadata
4. Cards must be draggable (or have a visible drag affordance) — at minimum, a visual indicator shows drag is possible
5. The board must be horizontally scrollable on mobile (columns should not wrap to next row)
6. Priority labels must be color-coded (P1 red/high emphasis, P2 yellow/medium, P3 green/low)
7. Column count and card count must visually match the supplied data

## Required Components

- Board header (board title, optional filter/search placeholder)
- Column component (×4) with title, card count badge, card list
- Task card component (×10) with title, priority badge, assignee, metadata
- Priority badge (3 levels with distinct colors and text redundancy — not color-only)
- Drag indicator or handle on cards (visual cue even if actual drag-not-implemented)
- Horizontal scroll container on mobile
- Column empty state (if applicable)

## Interaction States

| State | Element(s) | Expectation |
|---|---|---|
| `hover` | Task cards | Lift, shadow change, or border highlight indicating interactivity |
| `hover` | Column headers | Optional emphasis |
| `hover` | Priority badges | (Primarily informational; no hover change needed) |
| `focus` | Task cards, column controls | Visible focus ring (≥ 2 px, 3:1 contrast) |
| `active` | Drag handle or card | Pressed state or "grabbing" cursor |
| `drag` | Task card during drag | Card elevates (shadow increase); drop target column highlights |
| `drop` | Task card on drop zone | Card moves to new column (visually repositioned) |
| `empty` | Column with zero cards | Column placeholder text: "No tasks" or similar |
| scroll | Desktop board | Horizontal scrollbar visible when columns exceed viewport width |
| scroll | Mobile board | Horizontal swipe; columns remain full-height |

## Viewport Dimensions

| Viewport | Width | Height |
|---|---|---|
| Desktop | 1280 px | 800 px |
| Mobile | 375 px | 667 px |

## Accessibility Expectations

- Drag-and-drop must have a keyboard-accessible alternative (e.g., "Move to column" button or select)
- Column list is a proper `<ul>` / `<li>` structure
- Task cards use `<article>` or have a heading element (`h3` or `h4`)
- Column headings are `h2` elements
- Priority labels include text (not just color): "P1 High", "P2 Medium", "P3 Low"
- Card count in column header is labeled (e.g., "3 cards")
- Drag state is communicated via `aria-grabbed` or `aria-dropeffect` where implemented
- Focus order: board header → columns in reading order → individual cards
- Horizontal scrolling is achievable via keyboard (Tab through columns or arrow keys)
- Touch targets minimum 44×44 px on mobile

## Prohibited Shortcuts

- No CSS framework or utility library
- No drag-and-drop library (no SortableJS, dnd-kit, react-beautiful-dnd, etc.) — implement native HTML5 drag-and-drop or pointer events
- No copy-pasted kanban board template
- No single-file solution unless explicitly defined
- Do not implement real data persistence — use the supplied in-memory data
- Do not generate additional cards, columns, or metadata beyond what is supplied
- Do not use a generic "build a kanban board" prompt as the sole instruction

## Scoring Criteria (proposal — weights not final)

| Category | What it measures |
|---|---|
| **Column layout** | Columns are readable, evenly distributed, and horizontally scrollable |
| **Card design** | Cards are scannable — priority, assignee, title are immediately visible |
| **Drag-and-drop** | Drag is implementable (even if partial); visual drag affordance is clear |
| **State indication** | Priority colors, card count badges, column empty states are correct |
| **Responsiveness** | Horizontal scroll works on mobile; cards remain readable |
| **Interaction feedback** | Hover, focus, active, drag states are implemented |
| **Keyboard accessibility** | Alternative to drag-and-drop exists for keyboard-only users |
| **Component consistency** | Cards, badges, and columns share consistent tokens |
| **Generic-default avoidance** | No over-designed cards, no decorative gradients, no unnecessary avatars |

## Expected Deliverables

1. **Source output** — full generated source tree (HTML, CSS, JS)
2. **Design policy** — policy document or marker stating none was used
3. **Desktop screenshot** — 1280×800 showing all 4 columns with cards
4. **Mobile screenshot** — 375×667 showing 2–3 columns in horizontal scroll
5. **Drag-state screenshot** — desktop, with one card being dragged (or showing its drag affordance)
6. **Lint report** — `design-canon lint --profile product-app` output
7. **Accessibility report** — automated a11y scan findings

## Run-Manifest Fields

(Same schema as B001. Profile: `product-app`. Note: additional field `drag_mechanism` describing the drag implementation approach.)

## Known Ambiguity Risks

- **Drag implementation depth**: The brief requires a "visual indicator showing drag is possible" but allows varying implementation depth — from `draggable="true"` with no event handlers to a fully functional drag-and-drop with state management. This creates significant variance in interactivity scoring.
- **Keyboard alternative**: The brief requires "keyboard-accessible alternative" but does not specify its form. Some runs may add a "Move to..." select on each card; others may not implement it at all and rely on the native HTML5 drag keyword.
- **Card metadata density**: Cards have optional fields (due date, PR link, closed date). Some runs will show all metadata on every card; others may conditionally display it. This affects visual density.
- **Column width on desktop**: Not specified whether columns should fill the viewport width (flex: 1) or be fixed-width with overflow scroll. Different approaches affect how many cards are visible per column.
- **Horizontal scroll vs. wrapping**: The brief says "horizontal scrollable layout" on desktop but not all runs may respect this — some might wrap columns to rows on smaller desktop screens.
- **Card interaction beyond drag**: Not specified whether clicking a card should open a detail view, show a tooltip, or do nothing. Different runs may add different interaction layers.
