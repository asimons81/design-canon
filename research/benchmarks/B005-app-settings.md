> **Proposal** — generated fixture brief for the Design Canon benchmark factory. Not a final scoring rubric.

# B005: Application Settings

| Field | Value |
|---|---|
| **ID** | `B005` |
| **Status** | proposal |
| **Category** | product-app |
| **Applicable Design Canon profile** | `product-app` |

## Title

Application Settings Page

## Objective

Generate a settings/preferences page for a developer tool. The page must organize heterogeneous form controls — text inputs, toggles, dropdowns, radio groups, and a danger-zone section — into a scannable, task-efficient layout. This benchmark tests form design, label placement, error state handling, and state persistence cues.

## Audience

Developers who configure their tooling. Expects compact, no-surprise form layouts with clear save-state feedback.

## Supplied Content

- Section organization:
  - **General** (2 fields): workspace name (text input), default branch (text input)
  - **Notifications** (3 toggles): email alerts, Slack notifications, weekly digest
  - **Deployment Policy** (radio group): "Strict" (all gates required), "Moderate" (manual approval bypass available), "Permissive" (advisory only)
  - **Integrations** (dropdown): select from "GitHub", "GitLab", "BitBucket", "None"
  - **Danger Zone** (button): "Delete Workspace" with confirmation step
- Placeholder values for each field (provided as initial state)
- Save button: "Save Changes" (disabled when no unsaved changes exist)
- Cancel link: "Discard changes"

## Functional Requirements

1. Render all settings sections as a single scrollable page
2. Render a mix of input types: text, toggle/switch, radio group, dropdown select
3. Indicate unsaved changes visually (e.g., Save button becomes enabled, dirty-field indicator)
4. Show a confirmation dialog or inline prompt before the "Delete Workspace" destructive action
5. Group related fields under section headings
6. The Danger Zone section must be visually distinct (border, background, or spacing) from other sections
7. Labels must be explicitly associated with their controls

## Required Components

- Page header ("Settings" with optional back-arrow)
- Section grouping with headings (H2 or equivalent)
- Text input with label (×2)
- Toggle/switch component (×3) with label
- Radio button group (3 options) with fieldset/legend
- Dropdown/select component (4 options)
- Primary action button ("Save Changes")
- Secondary/destructive action button ("Delete Workspace" styled in red/destructive color)
- Confirmation dialog or inline confirmation for destructive action
- Unsaved-changes indicator (dirty state)

## Interaction States

| State | Element(s) | Expectation |
|---|---|---|
| `hover` | All buttons | Visible state change |
| `hover` | Toggle/switch | Pointer cursor, optional background change |
| `focus` | All form controls | Visible focus ring (≥ 2 px, 3:1 contrast) |
| `focus` | Radio group | Focus ring on the selected option or group wrapper |
| `active` | Buttons | Pressed state distinguishable |
| `disabled` | Save button (when clean) | Grayed out, not clickable, distinguishable from enabled state |
| `error` | Form validation | Error message visible, input border indicates error, error is programmatically associated |
| `checked` / `unchecked` | Toggle, radio | State clearly distinguishable without color alone (position, icon, or label change) |
| dialog open | Confirmation modal | Focus trapped inside dialog, ESC closes, backdrop or overlay visible |
| `dirty` | Any form field | Unsaved indicator visible (Save button enabled, optional field-level marker) |

## Viewport Dimensions

| Viewport | Width | Height |
|---|---|---|
| Desktop | 1280 px | 800 px |
| Mobile | 375 px | 667 px |

## Accessibility Expectations

- All form inputs have explicit `<label>` elements (not placeholder-only labels)
- Radio group uses `<fieldset>` and `<legend>`
- Error messages are associated with inputs via `aria-describedby` or `aria-errormessage`
- Toggle switches use `role="switch"` with `aria-checked`
- Confirmation dialog uses `role="dialog"`, `aria-modal="true"`, and traps focus
- Destructive action button has a clear warning label (not just color)
- Keyboard navigation follows logical tab order through all sections
- Toggle switch is operable via keyboard (Space or Enter)
- Color is not the sole indicator of destructive intent (icon or text supplement)
- Focus must be moved to the dialog when it opens, and back to the trigger when it closes

## Prohibited Shortcuts

- No CSS framework or utility library
- No copy-pasted settings form template
- No single-file solution unless explicitly defined
- Do not implement actual state persistence (no localStorage, no API calls) — the form should simulate dirty-state tracking via inline JavaScript
- Do not generate placeholder form fields beyond what is specified
- Do not use a generic "build settings page" prompt as the sole instruction

## Scoring Criteria (proposal — weights not final)

| Category | What it measures |
|---|---|
| **Form layout** | Labels are readable and close to controls; fields are not unnecessarily spread out |
| **State indication** | Clean/dirty/destructive states are visually distinct and unambiguous |
| **Input variety** | Each input type (text, toggle, radio, select) is properly styled for its purpose |
| **Error handling** | Error messages are clear, proximate to the offending field, and accessible |
| **Destructive action UX** | Confirmation is clear but not annoying; the danger zone is visually demarcated |
| **Interaction feedback** | Hover, focus, active, disabled states are correctly implemented |
| **Responsiveness** | Single-column layout on mobile; labels reflow predictably |
| **Component consistency** | Form controls share consistent sizing, spacing, border radius, and font |
| **Generic-default avoidance** | No excessive rounded corners on form controls, no purple accent defaults, no decorative elements that distract from form task |

## Expected Deliverables

1. **Source output** — full generated source tree (HTML, CSS, JS)
2. **Design policy** — policy document or marker stating none was used
3. **Desktop screenshot** — 1280×800 with all settings sections visible
4. **Mobile screenshot** — 375×667 showing first two sections
5. **Confirmation dialog screenshot** — desktop viewport with "Delete Workspace" dialog open
6. **Lint report** — `design-canon lint --profile product-app` output
7. **Accessibility report** — automated a11y scan findings

## Run-Manifest Fields

(Same schema as B001. Profile: `product-app`.)

## Known Ambiguity Risks

- **Dirty-state granularity**: The brief does not specify whether dirty state should be tracked per-field, per-section, or globally (page-level). Global dirty state (Save enabled when any field changes) is simplest but least informative.
- **Confirmation dialog design**: The depth and wording of the "Delete Workspace" confirmation is unspecified. Some runs may use a simple "Are you sure?" dialog while others may require typing the workspace name. Both are valid but affect perceived UX maturity.
- **Toggle vs. checkbox**: The brief asks for "toggle/switch" controls. Some runs may render standard checkboxes styled as switches vs. actual `role="switch"` elements. This affects accessibility scoring.
- **Save behavior**: The brief does not specify whether clicking "Save" should show a success toast, spinner, or redirect. Different feedback mechanisms affect the perceived completeness.
- **Integrations dropdown value**: The supplied options include "GitHub", "GitLab", "BitBucket", "None". It is unspecified whether "None" means "no integration" (valid selection) or "no selection" (placeholder/unselected state).
- **Field width on desktop**: Not specified whether fields should span full content width or be constrained (e.g., max-width 600px). Different approaches change visual density significantly.
