# B000: Relayboard calibration landing page

## Status

Nonofficial calibration brief. B000 exists only to validate the execution runner, isolation, accounting, capture, and failure-preservation pipeline. It is not part of protocol v1, must not enter the 180-run dataset, and must not support a superiority claim.

## Task

Build a responsive, single-page marketing site for **Relayboard**, a fictional release-coordination service for small software teams.

Relayboard gives a team one place to see what is shipping, who owns each release item, which checks are still blocking launch, and what changed since the previous release.

## Required content

The page must include:

1. A header with the Relayboard name and working anchor navigation.
2. A hero section with a clear product explanation and primary call to action.
3. A compact product-status preview showing at least three release items with different states.
4. A feature section covering ownership, launch checks, and change history.
5. A pricing section with monthly and annual options.
6. A working pricing toggle that updates visible prices and billing labels without reloading the page.
7. A short FAQ with at least three questions and working expand/collapse behavior.
8. A final call-to-action section.
9. A footer.

Use this fixed pricing copy:

- Starter: $12 monthly or $120 annually
- Team: $29 monthly or $290 annually
- Studio: $59 monthly or $590 annually

## Technical constraints

- Use only `index.html`, `styles.css`, and `script.js`.
- Use vanilla HTML, CSS, and JavaScript.
- Do not install packages.
- Do not use external fonts, images, icon services, CDNs, analytics, APIs, or network requests.
- The page must work when opened directly from the local filesystem.
- All navigation, pricing-toggle, and FAQ interactions must work without a build step.
- Support desktop and mobile layouts.
- Avoid horizontal overflow at 390 CSS pixels wide.
- Use semantic HTML and provide visible keyboard focus.

## Output boundary

Write only the finished project files into the provided workspace. Do not modify benchmark manifests, condition guidance, transcripts, runner code, or files outside the workspace.
