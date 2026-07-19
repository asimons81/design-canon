# F018: Static Skip Link to Main Content

**Rule ID:** `accessibility.skip-link`
**Severity:** `warning`
**File types:** `.html`

## What F018 Checks

F018 checks whether a static HTML document contains a same-document anchor element that:

1. Has a non-empty same-document fragment (`href="#..."`)
2. Has a supported accessible name (visible text, `aria-label`, or `aria-labelledby`)
3. Appears before the first `<nav>` element in document order
4. Resolves to an element with a matching `id` in the same file
5. Targets a supported main-content region (`<main>` or `[role="main"]`)

## Supported Skip-Link Pattern

```html
<a href="#main-content">Skip to main content</a>

<nav>
  <!-- navigation links -->
</nav>

<main id="main-content">
  <!-- main content -->
</main>
```

### Supported Accessible Name Sources

| Source | Example |
|--------|---------|
| Visible text | `<a href="#main">Skip to content</a>` |
| `aria-label` | `<a href="#main" aria-label="Skip to content"></a>` |
| `aria-labelledby` | `<span id="l">Skip</span><a href="#main" aria-labelledby="l"></a>` |

The following are NOT recognized as accessible names:
- `title` attribute
- Empty text or whitespace-only content
- Empty `aria-label`
- Unresolved `aria-labelledby` (referenced element not found)

### Supported Target Types

A fragment target is recognized as a main-content region when the resolved element is one of:

- `<main id="...">`
- Any element with `role="main"` and a matching `id`

Example:

```html
<div id="content" role="main">
  <!-- main content -->
</div>
```

## Source-Order Policy

A candidate skip link must appear **before the first `<nav>` element** in the document. If no `<nav>` exists, the candidate must appear **before the resolved target element**. This guarantees the link is positioned where a keyboard user would encounter it first.

## Fragment-Resolution Policy

- Only same-document fragments (`href="#target"`) are supported
- External URLs with fragments (`https://example.com/#main`) are ignored
- Relative page URLs with fragments (`/page#main`) are ignored
- Empty fragments (`href="#"`) are rejected
- Fragment values are matched case-sensitively to HTML `id` attributes
- Duplicate target IDs are treated as ambiguous and rejected
- Missing targets produce an unresolved-fragment finding
- Source line numbers are preserved in findings

## Findings

One finding per file. Evidence distinguishes:

| Scenario | Evidence Message |
|----------|-----------------|
| No anchor candidate | "No supported static skip link or main-content region was found." |
| Fragment link with no name | "Candidate ... has no supported accessible name." |
| Empty fragment | "An anchor was found with an empty fragment target." |
| Unresolved target | "A same-document bypass-link candidate was found, but its fragment target ... did not resolve..." |
| Target not main region | Same as unresolved (target not a main-content element) |
| After navigation | "...appears after the first navigation landmark." |
| After target | "...appears after its target in document order." |

## Static-Analysis Limitations

F018 uses deterministic source scanning and cannot establish:

- Whether CSS makes the link visible on keyboard focus
- Whether client-side routing rewrites the target
- Whether JavaScript prevents default navigation behavior
- Whether focus moves correctly in every browser
- Whether sticky headers obscure the target destination
- Whether the destination receives programmatic focus
- Whether an equivalent bypass mechanism exists at runtime (ARIA landmarks, heading structure, SPA focus management)
- Whether the entire interface conforms to WCAG 2.4.1 (Bypass Blocks)

Every finding uses bounded language. F018 does not claim WCAG conformance from skip-link absence alone.

## Compliant Example

```html
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Page</title></head>
<body>
  <a href="#main-content">Skip to main content</a>
  <nav>
    <ul>
      <li><a href="/">Home</a></li>
      <li><a href="/about">About</a></li>
    </ul>
  </nav>
  <main id="main-content">
    <h1>Main Content</h1>
  </main>
</body>
</html>
```

## Noncompliant Examples

### No skip link
```html
<body>
  <nav>
    <ul>
      <li><a href="/">Home</a></li>
    </ul>
  </nav>
  <main id="content">
    <h1>Content</h1>
  </main>
</body>
```

### Skip link appears after navigation
```html
<body>
  <nav>
    <ul>
      <li><a href="/">Home</a></li>
    </ul>
  </nav>
  <a href="#content">Skip</a>
  <main id="content">
    <h1>Content</h1>
  </main>
</body>
```

### Skip link targets non-main element
```html
<body>
  <a href="#promo">Skip</a>
  <nav>...</nav>
  <div id="promo">Advertisement</div>
  <main id="content">
    <h1>Content</h1>
  </main>
</body>
```

### External URL fragment (not same-document)
```html
<body>
  <a href="https://example.com/#content">Skip</a>
  <nav>...</nav>
  <main id="content">
    <h1>Content</h1>
  </main>
</body>
```

## Suppression Example

```json
{
  "version": 1,
  "profile": "marketing",
  "suppressions": [
    {
      "rule": "accessibility.skip-link",
      "files": ["src/spa/**/*.html"],
      "reason": "SPA routes manage focus programmatically on navigation.",
      "expires": "2099-01-01"
    }
  ]
}
```

## Confidence Boundary

| Can prove | Cannot prove |
|-----------|-------------|
| A supported static fragment link exists | CSS visibility on focus |
| Its target resolves in the analyzed file | Client-side routing rewrites the target |
| The target is a supported main-content region | JavaScript prevents default navigation |
| The link has a supported static name | Focus moves correctly in every browser |
| The candidate appears in supported source order | Sticky headers obscure the target |
| | The destination receives programmatic focus |
| | An equivalent bypass mechanism exists at runtime |
| | WCAG 2.4.1 conformance or failure |
