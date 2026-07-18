> **Proposal** — generated fixture brief for the Design Canon benchmark factory. Not a final scoring rubric.

# B012: Authentication Flow

| Field | Value |
|---|---|
| **ID** | `B012` |
| **Status** | proposal |
| **Category** | product-app |
| **Applicable Design Canon profile** | `product-app` |

## Title

Multi-View Authentication Flow

## Objective

Generate a complete authentication flow with login, sign-up, password-reset, and multi-factor verification views. Each view must be a distinct screen reachable via navigation from the others. This benchmark tests form design for authentication patterns — error feedback, input validation, security cues, and view transitions.

## Audience

End users of a developer tool who need to authenticate to access their workspace. Assumes familiarity with standard auth flows (email/password, MFA).

## Supplied Content

- App name: "Pragma"
- Login view:
  - Email input, password input, "Log in" button, "Forgot password?" link, "Create account" link
  - "Remember this device" checkbox (optional but encouraged)
- Sign-up view:
  - Full name input, email input, password input (with strength hint), confirm password input, "Create account" button, "Already have an account? Log in" link
  - Terms acceptance checkbox: "I agree to the Terms of Service and Privacy Policy"
- Password-reset view:
  - Email input, "Send reset link" button, "Back to log in" link
  - Confirmation state after email submitted: "Check your email for the reset link" message
- Multi-factor authentication (MFA) view:
  - 6-digit code input (6 separate boxes or single input with digit grouping)
  - "Verify" button, "Resend code" link, "Use a recovery code" link
  - Header: "Enter the verification code sent to your email"

## Functional Requirements

1. Render four distinct view states: login, sign-up, password-reset (with post-submit confirmation), and MFA
2. All four views must be present and switchable via links (no routing library — state-based rendering)
3. Implement client-side validation:
   - Email format validation
   - Password minimum length (8 characters)
   - Confirm password must match
   - MFA code must be exactly 6 digits
   - Terms checkbox must be checked for sign-up
4. Show inline validation errors (not just after submit)
5. Password-reset flow must have a distinct confirmation view after submission
6. Show a loading/processing state on form submission (even if no real API call)

## Required Components

- **Login form**: email input, password input, "Log in" button, "Forgot password?" link, "Create account" link, optional "Remember me" checkbox
- **Sign-up form**: name input, email input, password input (with strength meter or hint), confirm password input, terms checkbox, "Create account" button, "Log in" link
- **Password-reset form**: email input, "Send reset link" button, "Back to log in" link
- **Reset confirmation view**: plain confirmation message, "Back to log in" link
- **MFA form**: 6-digit code input, "Verify" button, "Resend code" link, "Use a recovery code" link
- View switcher (logic to show one view at a time based on state)
- Error message component (inline, per-field)
- Loading indicator (spinner or skeleton on submit)

## Interaction States

| State | Element(s) | Expectation |
|---|---|---|
| `hover` | All buttons, links | Visible state change |
| `focus` | All inputs, buttons, links | Visible focus ring (≥ 2 px, 3:1 contrast) |
| `active` | All buttons | Pressed state distinguishable |
| `disabled` | Submit buttons (when form invalid) | Grayed out, not clickable, distinguishable from enabled |
| `loading` | Submit buttons (during submission) | Spinner or text change; button disabled during loading |
| `error` | Inputs on validation failure | Red border or icon, error message below input, `aria-describedby` association |
| `error` | Form-level error (e.g., "Invalid credentials") | Visible error message above or below form |
| `success` | Password-reset confirmation | Confirmation view replaces form |
| `focus` | MFA digit inputs | Auto-advance to next digit on input (optional but encouraged) |
| `empty` | Initial form state | All fields empty; submit button disabled |

## Viewport Dimensions

| Viewport | Width | Height |
|---|---|---|
| Desktop | 1280 px | 800 px |
| Mobile | 375 px | 667 px |

Note: Auth forms should be centered and width-constrained (max-width ~480 px) on desktop.

## Accessibility Expectations

- Each view must have a distinct `<h1>` describing the current step
- Form error messages are associated with their input via `aria-describedby` or `aria-errormessage`
- Password input has `autocomplete="current-password"` or `new-password` as appropriate
- MFA code input uses `autocomplete="one-time-code"` where applicable
- View transitions are announced to screen readers (`aria-live` region or focus management)
- Loading state is indicated with `aria-busy="true"` on the form or `aria-label` on the spinner
- Terms checkbox has an associated label that includes links to Terms and Privacy Policy
- "Forgot password?" and "Create account" links should be reachable and clear
- MFA code input: if using separate boxes, each input is labeled (`aria-label="Digit 1"` etc.)
- Focus moves to the first input of each view when switching views
- Error summary at the top of the form (optional but highly encouraged)
- Touch targets minimum 44×44 px on mobile

## Prohibited Shortcuts

- No CSS framework or utility library
- No authentication library (Auth0, Firebase, Clerk, Supabase Auth, etc.)
- No routing library — use state-based view switching
- No copy-pasted auth flow template
- Do not implement real authentication (no API calls, no localStorage sessions)
- Do not use a generic "build login page" prompt as the sole instruction
- Passwords must not be visible in plain text in the submitted source output (use `type="password"`)

## Scoring Criteria (proposal — weights not final)

| Category | What it measures |
|---|---|
| **Form validation** | Real-time inline errors, correct validation rules, clear error messages |
| **View transitions** | Switching between login/sign-up/reset/MFA is smooth; state is preserved |
| **Loading states** | Processing state is clearly indicated on submit |
| **Error feedback** | Both per-field and form-level errors are visible and accessible |
| **Layout & spacing** | Forms are centered, well-proportioned, and comfortable to fill |
| **Interaction feedback** | Hover, focus, active, disabled states are correctly implemented |
| **Accessibility** | Labels, associations, autocomplete, focus management, and announcements are correct |
| **Component consistency** | Inputs, buttons, links, error messages share consistent tokens across all views |
| **Generic-default avoidance** | No over-designed auth pages; no decorative illustration behind forms that reduces contrast |

## Expected Deliverables

1. **Source output** — full generated source tree (HTML, CSS, JS)
2. **Design policy** — policy document or marker stating none was used
3. **Desktop screenshots** — one per view (login, sign-up, password-reset, reset-confirmation, MFA) — up to 5 screenshots at 1280×800
4. **Mobile screenshots** — login view and MFA view at 375×667
5. **Validation error screenshot** — desktop, sign-up view with at least one validation error visible
6. **Lint report** — `design-canon lint --profile product-app` output
7. **Accessibility report** — automated a11y scan findings

## Run-Manifest Fields

(Same schema as B001. Profile: `product-app`. Note: multiple screenshots for each view state.)

## Known Ambiguity Risks

- **MFA code input format**: The brief says "6 separate boxes or single input with digit grouping." Runs may choose either approach, which significantly affects the visual design and implementation complexity.
- **View transition animation**: Not specified whether view switches should be instant, fade, or slide. Different approaches affect perceived polish.
- **Password strength meter**: The brief says "with strength hint or meter" — the depth of this feature varies from a simple "Minimum 8 characters" text to a visual strength bar (weak/medium/strong).
- **Form state persistence**: Not specified whether form data typed in one view should persist if the user switches views. E.g., if a user types in the sign-up form, then clicks "Log in", then clicks "Create account" again — should the form be blank or restored?
- **"Resend code" timer**: The MFA "Resend code" link behavior is unspecified (no countdown, no disable). Some runs may implement a 30-second cooldown; others will keep it always active.
- **Recovery code flow**: The "Use a recovery code" link does not have a corresponding view described. Runs may add a recovery code input view or link to a dead end. This ambiguity may affect completeness scoring.
