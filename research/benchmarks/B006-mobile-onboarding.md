> **Proposal** — generated fixture brief for the Design Canon benchmark factory. Not a final scoring rubric.

# B006: Mobile Onboarding

| Field | Value |
|---|---|
| **ID** | `B006` |
| **Status** | proposal |
| **Category** | marketing (mobile-first) |
| **Applicable Design Canon profile** | `marketing` |

## Title

Mobile Application Onboarding Flow

## Objective

Generate a three-screen mobile onboarding sequence for a new user who has just installed a personal finance tracking application. The flow must orient the user, communicate core value, request necessary permissions, and transition to the main application — without relying on generic illustration characters, floating UI elements, or excessive glassmorphism.

## Audience

New mobile app users aged 25–55 who are comfortable with basic smartphone operations but may not be financially sophisticated. The onboarding should feel reassuring and transparent rather than gamified or urgent.

## Supplied Content

- App name: "PocketTrace" (fictional personal finance tracker)
- Three value propositions to cover across screens:
  1. Automatic transaction categorization from bank-sync data
  2. Real-time spending alerts and monthly budget tracking
  3. Privacy-first design with on-device processing
- Permission context: needs notification access for spending alerts; explain why
- Brand colors: teal `#0D9488`, warm gray `#57534E`, background `#FAFAF9`
- Button labels: "Continue", "Enable Notifications", "Start Tracking"
- Skip option text: "Skip for now" (for the permission screen)

## Functional Requirements

1. Screen 1 — Welcome/value prop: app logo, one-line tagline, "Continue" button
2. Screen 2 — Feature highlights: three brief cards or bullet points, "Continue" button
3. Screen 3 — Permission request: explain why notifications are needed, "Enable Notifications" and "Skip for now" buttons
4. Smooth transition between screens (slide or fade)
5. Progress indicator (dots or bar) showing position in flow
6. After final screen, show a loading/transition state before "main app" placeholder

## Required Components

- Screen containers (3 screens, slide-able)
- Progress indicator (3-step dot indicator)
- Illustration area per screen (abstract or icon-based; no detailed illustrations needed — placeholder shapes acceptable with alt text)
- Primary button (consistent across screens)
- Secondary/skip link (on permission screen only)
- App logo placeholder
- Permission explanation card (Screen 3)

## Interaction States

| State | Element(s) | Expectation |
|---|---|---|
| `hover` | Buttons, skip link | Visible state change |
| `focus` | Buttons, skip link | Visible focus ring meeting 3:1 contrast |
| `active` | Primary button | Pressed state distinguishable |
| `disabled` | (Not specified) | — |
| slide transition | Screen change | Smooth 300–400ms slide or fade; no jarring jumps |
| permission prompt | System dialog | Mock the explanation UI only; do not trigger native permission dialog |

## Viewport Dimensions

| Viewport | Width | Height |
|---|---|---|
| Desktop | 375 px | 667 px |
| Mobile | 375 px | 667 px |

(Benchmark is mobile-first; same viewport for both conditions.)

## Accessibility Expectations

- Touch targets minimum 44×44 CSS pixels
- Screen content: logical DOM order matching visual order
- Progress indicator labeled with aria-label or aria-labelledby
- All decorative illustration areas marked `aria-hidden="true"`
- Skip link is keyboard-focusable and visible on focus
- No horizontal overflow at 375px width
- Color contrast: body ≥ 4.5:1, large text ≥ 3:1

## Prohibited Shortcuts

- No mobile UI framework (no Material UI, Ionic, Tailwind, etc.)
- No copy-paste of production app onboarding flows
- No single-stock-photo hero illustration
- No glassmorphism on every surface
- No pre-built onboarding component library
- No "fintech illustration pack" characters

## Scoring Criteria (proposal — weights not final)

| Category | What it measures |
|---|---|
| **Visual hierarchy** | Clear reading order per screen; progress indicator visible; primary action obvious |
| **Typography** | Readable body at mobile sizes; deliberate type scale; no tiny text |
| **Color** | Supplied palette used consistently; contrast meets accessibility baselines |
| **Layout** | Controls comfortably reachable with thumb; no content cut off at 375px |
| **Interaction** | Smooth transitions; buttons provide feedback; skip link is clearly secondary |
| **Content structure** | Value props are scannable; permission explanation is transparent |
| **Generic-default avoidance** | No illustration characters, excessive glass, floating decorative blobs, or generic "welcome aboard" copy |

## Expected Deliverables

1. **Source output** — HTML + CSS (single-file or modular)
2. **Design policy** — DESIGN.md or marker stating none used
3. **Desktop screenshot** — 375×667, first screen visible
4. **Mobile screenshot** — 375×667, permission screen visible
5. **Lint report** — `design-canon lint --profile marketing`
6. **Accessibility report** — axe-core or pa11y scan

## Run-Manifest Fields

(B002 manifest shape applies — same fields per brief)

## Known Ambiguity Risks

- **Screen transition implementation**: CSS-only transitions vs. JS-driven carousel vs. actual routing. All acceptable but affect perceived smoothness.
- **Skip behavior**: Not specified what "Skip for now" does — stays on screen, moves to next, or shows main app placeholder. Each interpretation affects scoring.
- **Illustration placeholder**: Abstract SVG vs. colored shape vs. empty area with alt text. The brief permits any, but the choice affects visual appeal scores.
- **Permission UI depth**: Mock system dialog vs. in-app explanation card vs. both. The brief asks for explanation UI, but evaluators may penalize insufficient realism.
