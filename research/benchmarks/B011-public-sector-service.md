> **Proposal** — generated fixture brief for the Design Canon benchmark factory. Not a final scoring rubric.

# B011: Public-Sector Service Page

| Field | Value |
|---|---|
| **ID** | `B011` |
| **Status** | proposal |
| **Category** | editorial/public-sector |
| **Applicable Design Canon profile** | `editorial` |

## Title

Public-Sector Government Service Information Page

## Objective

Generate an informational page for a municipal government service. The page must clearly communicate eligibility, required documents, application steps, and contact information for citizens who may be unfamiliar with online government services. The tone must be authoritative, approachable, and trustworthy — no startup-style marketing language, hero animations, or decorative illustrations.

## Audience

Residents of a mid-sized city (general public, ages 18–80+). Assumes varying levels of digital literacy. Some visitors may be using assistive technology, older devices, or low-bandwidth connections.

## Supplied Content

- Service name: "Housing Assistance Application"
- Agency name: "City of Riverton Department of Housing"
- Eligibility summary: "Available to Riverton residents earning at or below 60% of the area median income."
- Required documents list: government ID, proof of residency, last 3 pay stubs, tax return, landlord contact information (5 items)
- Application steps:
  1. Check eligibility using the online pre-screening tool
  2. Gather required documents
  3. Submit application online or in person at 200 Civic Center Drive
  4. Interview with a housing counselor (scheduled within 10 business days)
  5. Receive determination letter within 30 days
- Contact information: phone (555-0100), email (housing@riverton.gov), hours (Mon-Fri 8AM-5PM), address (200 Civic Center Drive, 3rd Floor)
- Language availability: English and Spanish
- Last updated: January 15, 2026

## Functional Requirements

1. Service title and agency name clearly at top of page
2. Eligibility summary with clear income threshold
3. Required documents checklist
4. Numbered step-by-step application process
5. Contact information card with phone, email, address, and hours
6. Language toggle or link to Spanish version
7. "Last updated" date clearly displayed
8. Print-friendly layout

## Required Components

- Page header with agency name and city seal placeholder
- Eligibility summary card (highlighted with background color, not decorative border)
- Document checklist with bullet or checkbox icons (accessible)
- Numbered step list (1–5 steps)
- Contact information card (plain, no shadows or icons that add no information)
- Language toggle link
- Footer with "Last updated" date, copyright, and back-to-top link

## Interaction States

| State | Element(s) | Expectation |
|---|---|---|
| `hover` | Links | Visible underline or color change |
| `focus` | All interactive elements | High-contrast focus ring (minimum 3:1) |
| `active` | Links | Visible pressed state |
| print | Entire page | Readable print stylesheet (no colored backgrounds, visible link URLs) |

## Viewport Dimensions

| Viewport | Width | Height |
|---|---|---|
| Desktop | 1280 px | 800 px |
| Mobile | 375 px | 667 px |

## Accessibility Expectations

- WCAG 2.2 AA minimum
- Skip-to-content link at top of page
- Heading hierarchy: h1 > h2 > h3
- All form elements have associated labels
- No information conveyed solely through color
- Minimum text size 16px on mobile
- Print stylesheet hides navigation, shows link URLs inline
- ARIA landmarks: banner, main, contentinfo, navigation

## Prohibited Shortcuts

- No CSS framework (no Bootstrap, Tailwind, USWDS, etc.)
- No startup-style language ("revolutionize", "supercharge", etc.)
- No decorative hero images or illustrations
- No gradient backgrounds or decorative patterns
- No parallax scrolling or animations
- No cookie consent or modal dialogs
- No placeholder government seal that looks unprofessional

## Scoring Criteria (proposal — weights not final)

| Category | What it measures |
|---|---|
| **Information hierarchy** | Most important info (eligibility, steps) is most prominent; contact info is findable |
| **Typography** | Readable at all sizes; generous line-height; adequate measure for long text |
| **Color** | Neutral, accessible palette; no decorative color; high contrast |
| **Layout** | Linear readability on mobile; no horizontal scroll; print-friendly |
| **Content clarity** | Plain language; steps are actionable; documents are scannable |
| **Accessibility** | Keyboard navigable; skip link works; heading hierarchy correct; ARIA landmarks present |
| **Trust signals** | Official tone; updated date visible; contact info prominent |

## Expected Deliverables

1. Source output (HTML + CSS)
2. Design policy marker
3. Desktop screenshot at 1280×800
4. Mobile screenshot at 375×667
5. Lint report: `design-canon lint --profile editorial`
6. Accessibility report

## Run-Manifest Fields

(Standard manifest per brief template)

## Known Ambiguity Risks

- **Government seal**: Whether to include a city seal placeholder. The brief prohibits unprofessional placeholders but doesn't specify seal format.
- **Print stylesheet depth**: Full print CSS vs. basic responsive that also prints. Depth affects scoring.
- **Language toggle implementation**: Actual language switch (showing placeholder Spanish text) vs. just a link to a separate page.
- **Step 3 "in person" option**: May require an address sub-component within a step, which not all runs will implement identically.
