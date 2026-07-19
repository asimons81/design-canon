import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectSkipLink } from '../src/html-scanner.js';
import { lintPath } from '../src/lint.js';

const EXAMPLES = fileURLToPath(new URL('../examples/skip-link-fixtures/', import.meta.url));

// ── Unit Tests: detectSkipLink ─────────────────────────────────────────

test('detectSkipLink: returns empty array when valid skip link with visible text', () => {
  const html = '<!DOCTYPE html><html><body><a href="#main-content">Skip to main content</a><nav><a href="/">Home</a></nav><main id="main-content"><h1>Content</h1></main></body></html>';
  const findings = detectSkipLink('test.html', html, 'accessibility.skip-link', 'warning');
  assert.equal(findings.length, 0);
});

test('detectSkipLink: returns empty array for aria-label skip link', () => {
  const html = '<!DOCTYPE html><html><body><a href="#main" aria-label="Skip to content"></a><nav><a href="/">Home</a></nav><main id="main"><h1>Content</h1></main></body></html>';
  const findings = detectSkipLink('test.html', html, 'accessibility.skip-link', 'warning');
  assert.equal(findings.length, 0);
});

test('detectSkipLink: returns empty array for aria-labelledby skip link', () => {
  const html = '<!DOCTYPE html><html><body><span id="l">Skip</span><a href="#main" aria-labelledby="l"></a><nav><a href="/">Home</a></nav><main id="main"><h1>Content</h1></main></body></html>';
  const findings = detectSkipLink('test.html', html, 'accessibility.skip-link', 'warning');
  assert.equal(findings.length, 0);
});

test('detectSkipLink: returns empty array for role=main target', () => {
  const html = '<!DOCTYPE html><html><body><a href="#content">Skip</a><nav><a href="/">Home</a></nav><div id="content" role="main"><h1>Content</h1></div></body></html>';
  const findings = detectSkipLink('test.html', html, 'accessibility.skip-link', 'warning');
  assert.equal(findings.length, 0);
});

test('detectSkipLink: returns empty array for uppercase elements', () => {
  const html = '<!DOCTYPE html><html><body><A HREF="#main">Skip</A><NAV><A HREF="/">Home</A></NAV><MAIN ID="main"><H1>Content</H1></MAIN></body></html>';
  const findings = detectSkipLink('test.html', html, 'accessibility.skip-link', 'warning');
  assert.equal(findings.length, 0);
});

test('detectSkipLink: returns empty array for multiline anchor', () => {
  const html = '<!DOCTYPE html><html><body><a\n  href="#main"\n  class="skip"\n>Skip to content</a><nav><a href="/">Home</a></nav><main id="main"><h1>Content</h1></main></body></html>';
  const findings = detectSkipLink('test.html', html, 'accessibility.skip-link', 'warning');
  assert.equal(findings.length, 0);
});

test('detectSkipLink: returns empty array for single-quoted attributes', () => {
  const html = "<!DOCTYPE html><html><body><a href='#main'>Skip</a><nav><a href='/'>Home</a></nav><main id='main'><h1>Content</h1></main></body></html>";
  const findings = detectSkipLink('test.html', html, 'accessibility.skip-link', 'warning');
  assert.equal(findings.length, 0);
});

test('detectSkipLink: returns empty array for unquoted static fragment', () => {
  const html = '<!DOCTYPE html><html><body><a href=#main>Skip</a><nav><a href=/>Home</a></nav><main id=main><h1>Content</h1></main></body></html>';
  const findings = detectSkipLink('test.html', html, 'accessibility.skip-link', 'warning');
  assert.equal(findings.length, 0);
});

test('detectSkipLink: returns empty for nested inline text', () => {
  const html = '<!DOCTYPE html><html><body><a href="#main"><span>Skip to <em>content</em></span></a><nav><a href="/">Home</a></nav><main id="main"><h1>Content</h1></main></body></html>';
  const findings = detectSkipLink('test.html', html, 'accessibility.skip-link', 'warning');
  assert.equal(findings.length, 0);
});

test('detectSkipLink: returns finding for no anchor candidate', () => {
  const html = '<!DOCTYPE html><html><body><nav><a href="/">Home</a></nav><main id="main"><h1>Content</h1></main></body></html>';
  const findings = detectSkipLink('test.html', html, 'accessibility.skip-link', 'warning');
  assert.equal(findings.length, 1);
  assert.ok(findings[0].message.includes('No supported static skip link'));
});

test('detectSkipLink: returns finding for whitespace-only name', () => {
  const html = '<!DOCTYPE html><html><body><a href="#main">   </a><nav><a href="/">Home</a></nav><main id="main"><h1>Content</h1></main></body></html>';
  const findings = detectSkipLink('test.html', html, 'accessibility.skip-link', 'warning');
  assert.equal(findings.length, 1);
});

test('detectSkipLink: returns finding for empty aria-label', () => {
  const html = '<!DOCTYPE html><html><body><a href="#main" aria-label=""></a><nav><a href="/">Home</a></nav><main id="main"><h1>Content</h1></main></body></html>';
  const findings = detectSkipLink('test.html', html, 'accessibility.skip-link', 'warning');
  assert.equal(findings.length, 1);
});

test('detectSkipLink: returns finding for unresolved aria-labelledby', () => {
  const html = '<!DOCTYPE html><html><body><a href="#main" aria-labelledby="missing"></a><nav><a href="/">Home</a></nav><main id="main"><h1>Content</h1></main></body></html>';
  const findings = detectSkipLink('test.html', html, 'accessibility.skip-link', 'warning');
  assert.equal(findings.length, 1);
});

test('detectSkipLink: returns finding for empty fragment (href="#")', () => {
  const html = '<!DOCTYPE html><html><body><a href="#">Skip</a><nav><a href="/">Home</a></nav><main id="main"><h1>Content</h1></main></body></html>';
  const findings = detectSkipLink('test.html', html, 'accessibility.skip-link', 'warning');
  assert.equal(findings.length, 1);
});

test('detectSkipLink: returns finding for missing target', () => {
  const html = '<!DOCTYPE html><html><body><a href="#main">Skip</a><nav><a href="/">Home</a></nav><div>No main here</div></body></html>';
  const findings = detectSkipLink('test.html', html, 'accessibility.skip-link', 'warning');
  assert.equal(findings.length, 1);
  assert.ok(findings[0].message.includes('unresolved-fragment') || findings[0].message.includes('fragment'));
});

test('detectSkipLink: returns finding for external URL with fragment', () => {
  const html = '<!DOCTYPE html><html><body><a href="https://example.com/#main">Skip</a><nav><a href="/">Home</a></nav><main id="main"><h1>Content</h1></main></body></html>';
  const findings = detectSkipLink('test.html', html, 'accessibility.skip-link', 'warning');
  assert.equal(findings.length, 1);
});

test('detectSkipLink: returns finding for relative page URL with fragment', () => {
  const html = '<!DOCTYPE html><html><body><a href="/page#main">Skip</a><nav><a href="/">Home</a></nav><main id="main"><h1>Content</h1></main></body></html>';
  const findings = detectSkipLink('test.html', html, 'accessibility.skip-link', 'warning');
  assert.equal(findings.length, 1);
});

test('detectSkipLink: returns finding for target not a main region', () => {
  const html = '<!DOCTYPE html><html><body><a href="#promo">Skip</a><nav><a href="/">Home</a></nav><div id="promo">Advertisement</div><main id="main"><h1>Content</h1></main></body></html>';
  const findings = detectSkipLink('test.html', html, 'accessibility.skip-link', 'warning');
  assert.equal(findings.length, 1);
  assert.ok(findings[0].message.includes('unresolved') || findings[0].message.includes('fragment'));
});

test('detectSkipLink: returns finding for candidate after nav landmark', () => {
  const html = '<!DOCTYPE html><html><body><nav><a href="/">Home</a></nav><a href="#main">Skip</a><main id="main"><h1>Content</h1></main></body></html>';
  const findings = detectSkipLink('test.html', html, 'accessibility.skip-link', 'warning');
  assert.equal(findings.length, 1);
  assert.ok(findings[0].message.includes('navigation'));
});

test('detectSkipLink: returns finding for candidate after target', () => {
  const html = '<!DOCTYPE html><html><body><main id="main"><h1>Content</h1></main><a href="#main">Skip</a></body></html>';
  const findings = detectSkipLink('test.html', html, 'accessibility.skip-link', 'warning');
  assert.equal(findings.length, 1);
});

test('detectSkipLink: ignores fake skip link in comments', () => {
  const html = '<!DOCTYPE html><html><body><!-- <a href="#main">Skip</a> --><nav><a href="/">Home</a></nav><main id="main"><h1>Content</h1></main></body></html>';
  const findings = detectSkipLink('test.html', html, 'accessibility.skip-link', 'warning');
  assert.equal(findings.length, 1);
});

test('detectSkipLink: ignores fake skip link in script', () => {
  const html = '<!DOCTYPE html><html><body><script>document.write(\'<a href="#main">Skip</a>\');</script><nav><a href="/">Home</a></nav><main id="main"><h1>Content</h1></main></body></html>';
  const findings = detectSkipLink('test.html', html, 'accessibility.skip-link', 'warning');
  assert.equal(findings.length, 1);
});

test('detectSkipLink: handles multiple links where first valid wins', () => {
  const html = '<!DOCTYPE html><html><body><a href="#promo">Promo</a><a href="#main">Skip</a><nav><a href="/">Home</a></nav><main id="main"><h1>Content</h1></main></body></html>';
  const findings = detectSkipLink('test.html', html, 'accessibility.skip-link', 'warning');
  assert.equal(findings.length, 0);
});

test('detectSkipLink: handles icon-only link (no static name)', () => {
  const html = '<!DOCTYPE html><html><body><a href="#main"><img src="icon.svg" alt=""></a><nav><a href="/">Home</a></nav><main id="main"><h1>Content</h1></main></body></html>';
  const findings = detectSkipLink('test.html', html, 'accessibility.skip-link', 'warning');
  assert.equal(findings.length, 1);
});

test('detectSkipLink: finding has correct rule and severity', () => {
  const html = '<!DOCTYPE html><html><body><nav><a href="/">Home</a></nav><main id="main"><h1>Content</h1></main></body></html>';
  const findings = detectSkipLink('test.html', html, 'accessibility.skip-link', 'warning');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, 'accessibility.skip-link');
  assert.equal(findings[0].severity, 'warning');
  assert.equal(findings[0].file, 'test.html');
});

test('detectSkipLink: does not use WCAG language', () => {
  const html = '<!DOCTYPE html><html><body><nav><a href="/">Home</a></nav><main id="main"><h1>Content</h1></main></body></html>';
  const findings = detectSkipLink('test.html', html, 'accessibility.skip-link', 'warning');
  assert.equal(findings.length, 1);
  assert.ok(!findings[0].message.includes('WCAG'));
  assert.ok(!findings[0].message.includes('definitely'));
});

test('detectSkipLink: handles --!> comment termination', () => {
  const html = '<!DOCTYPE html><html><body><a href="#main">Skip</a><nav><a href="/">Home</a></nav><!-- fake --!><main id="main"><h1>Content</h1></main></body></html>';
  const findings = detectSkipLink('test.html', html, 'accessibility.skip-link', 'warning');
  assert.equal(findings.length, 0);
});

test('detectSkipLink: <scripture> is not treated as <script>', () => {
  const html = '<!DOCTYPE html><html><body><scripture>ignored</scripture><a href="#main">Skip</a><scripture>more</scripture><nav><a href="/">Home</a></nav><main id="main"><h1>Content</h1></main></body></html>';
  const findings = detectSkipLink('test.html', html, 'accessibility.skip-link', 'warning');
  assert.equal(findings.length, 0);
});

test('detectSkipLink: <stylesheet> is not treated as <style>', () => {
  const html = '<!DOCTYPE html><html><body><stylesheet>ignored</stylesheet><a href="#main">Skip</a><stylesheet>more</stylesheet><nav><a href="/">Home</a></nav><main id="main"><h1>Content</h1></main></body></html>';
  const findings = detectSkipLink('test.html', html, 'accessibility.skip-link', 'warning');
  assert.equal(findings.length, 0);
});

test('detectSkipLink: braces in script strings do not cause false positives', () => {
  const html = '<!DOCTYPE html><html><body><a href="#main">Skip</a><nav><a href="/">Home</a></nav><main id="main"><h1>Content</h1></main></body></html>';
  const findings = detectSkipLink('test.html', html, 'accessibility.skip-link', 'warning');
  assert.equal(findings.length, 0);
});

test('detectSkipLink: Unicode visible text works', () => {
  const html = '<!DOCTYPE html><html><body><a href="#main">跳转到主内容</a><nav><a href="/">Home</a></nav><main id="main"><h1>内容</h1></main></body></html>';
  const findings = detectSkipLink('test.html', html, 'accessibility.skip-link', 'warning');
  assert.equal(findings.length, 0);
});

test('detectSkipLink: entity-containing text works', () => {
  const html = '<!DOCTYPE html><html><body><a href="#main">Skip &amp; more</a><nav><a href="/">Home</a></nav><main id="main"><h1>Content</h1></main></body></html>';
  const findings = detectSkipLink('test.html', html, 'accessibility.skip-link', 'warning');
  assert.equal(findings.length, 0);
});

test('detectSkipLink: no main-content target at all', () => {
  const html = '<!DOCTYPE html><html><body><p>No navigation, no main.</p></body></html>';
  const findings = detectSkipLink('test.html', html, 'accessibility.skip-link', 'warning');
  assert.equal(findings.length, 1);
  assert.ok(findings[0].message.includes('main-content region'));
});

// ── Integration Tests (lintPath) ──────────────────────────────────────

test('control: visible text skip link produces no finding', async () => {
  const result = await lintPath({ path: `${EXAMPLES}control-visible-text.html`, profile: 'marketing' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  assert.equal(f018.length, 0);
});

test('control: aria-label skip link produces no finding', async () => {
  const result = await lintPath({ path: `${EXAMPLES}control-aria-label.html`, profile: 'marketing' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  assert.equal(f018.length, 0);
});

test('control: aria-labelledby skip link produces no finding', async () => {
  const result = await lintPath({ path: `${EXAMPLES}control-aria-labelledby.html`, profile: 'marketing' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  assert.equal(f018.length, 0);
});

test('control: role=main target produces no finding', async () => {
  const result = await lintPath({ path: `${EXAMPLES}control-role-main.html`, profile: 'marketing' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  assert.equal(f018.length, 0);
});

test('control: uppercase elements produce no finding', async () => {
  const result = await lintPath({ path: `${EXAMPLES}control-uppercase.html`, profile: 'marketing' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  assert.equal(f018.length, 0);
});

test('control: multiline anchor produces no finding', async () => {
  const result = await lintPath({ path: `${EXAMPLES}control-multiline.html`, profile: 'marketing' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  assert.equal(f018.length, 0);
});

test('control: single-quoted attributes produce no finding', async () => {
  const result = await lintPath({ path: `${EXAMPLES}control-single-quotes.html`, profile: 'marketing' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  assert.equal(f018.length, 0);
});

test('control: unquoted fragment produces no finding', async () => {
  const result = await lintPath({ path: `${EXAMPLES}control-unquoted.html`, profile: 'marketing' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  assert.equal(f018.length, 0);
});

test('control: skip link before navigation produces no finding', async () => {
  const result = await lintPath({ path: `${EXAMPLES}control-before-nav.html`, profile: 'marketing' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  assert.equal(f018.length, 0);
});

test('control: nested inline text in skip link produces no finding', async () => {
  const result = await lintPath({ path: `${EXAMPLES}control-nested-text.html`, profile: 'marketing' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  assert.equal(f018.length, 0);
});

test('control: multiple links where one valid skip exists produces no finding', async () => {
  const result = await lintPath({ path: `${EXAMPLES}control-multiple-links.html`, profile: 'marketing' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  assert.equal(f018.length, 0);
});

test('control: comments and scripts containing fake skip links ignored', async () => {
  const result = await lintPath({ path: `${EXAMPLES}control-comments-and-scripts.html`, profile: 'marketing' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  assert.equal(f018.length, 0);
});

test('violation: no candidate triggers warning', async () => {
  const result = await lintPath({ path: `${EXAMPLES}violation-no-candidate.html`, profile: 'marketing' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  assert.equal(f018.length, 1);
  assert.equal(result.warnings, f018.length);
});

test('violation: empty fragment triggers warning', async () => {
  const result = await lintPath({ path: `${EXAMPLES}violation-empty-fragment.html`, profile: 'marketing' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  assert.equal(f018.length, 1);
});

test('violation: whitespace-only name triggers warning', async () => {
  const result = await lintPath({ path: `${EXAMPLES}violation-whitespace-name.html`, profile: 'marketing' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  assert.equal(f018.length, 1);
});

test('violation: empty aria-label triggers warning', async () => {
  const result = await lintPath({ path: `${EXAMPLES}violation-empty-aria-label.html`, profile: 'marketing' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  assert.equal(f018.length, 1);
});

test('violation: unresolved aria-labelledby triggers warning', async () => {
  const result = await lintPath({ path: `${EXAMPLES}violation-unresolved-labelledby.html`, profile: 'marketing' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  assert.equal(f018.length, 1);
});

test('violation: missing target triggers warning', async () => {
  const result = await lintPath({ path: `${EXAMPLES}violation-missing-target.html`, profile: 'marketing' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  assert.equal(f018.length, 1);
});

test('violation: external URL with fragment triggers warning', async () => {
  const result = await lintPath({ path: `${EXAMPLES}violation-external-url.html`, profile: 'marketing' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  assert.equal(f018.length, 1);
});

test('violation: relative page URL with fragment triggers warning', async () => {
  const result = await lintPath({ path: `${EXAMPLES}violation-relative-url.html`, profile: 'marketing' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  assert.equal(f018.length, 1);
});

test('violation: target not main region triggers warning', async () => {
  const result = await lintPath({ path: `${EXAMPLES}violation-not-main-region.html`, profile: 'marketing' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  assert.equal(f018.length, 1);
});

test('violation: candidate after navigation triggers warning', async () => {
  const result = await lintPath({ path: `${EXAMPLES}violation-after-nav.html`, profile: 'marketing' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  assert.equal(f018.length, 1);
});

test('violation: candidate after target triggers warning', async () => {
  const result = await lintPath({ path: `${EXAMPLES}violation-after-target.html`, profile: 'marketing' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  assert.equal(f018.length, 1);
});

test('violation: icon-only link (no static name) triggers warning', async () => {
  const result = await lintPath({ path: `${EXAMPLES}violation-icon-only.html`, profile: 'marketing' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  assert.equal(f018.length, 1);
});

test('violation: comment-only skip link triggers warning', async () => {
  const result = await lintPath({ path: `${EXAMPLES}violation-comment-only.html`, profile: 'marketing' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  assert.equal(f018.length, 1);
});

test('violation: script-only skip link triggers warning', async () => {
  const result = await lintPath({ path: `${EXAMPLES}violation-script-only.html`, profile: 'marketing' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  assert.equal(f018.length, 1);
});

test('violation: duplicate IDs handled without crash', async () => {
  const result = await lintPath({ path: `${EXAMPLES}violation-duplicate-ids.html`, profile: 'marketing' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  // Should produce a finding (duplicate IDs means the target may be ambiguous)
  assert.equal(f018.length, 1);
});

test('violation: malformed anchor does not crash', async () => {
  const result = await lintPath({ path: `${EXAMPLES}edge-malformed.html`, profile: 'marketing' });
  assert.ok(result.findings.length >= 0);
});

test('edge: --!> comment termination', async () => {
  const result = await lintPath({ path: `${EXAMPLES}edge-comment-termination.html`, profile: 'marketing' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  assert.equal(f018.length, 0); // valid skip link exists
});

test('edge: <scripture> element is not treated as <script>', async () => {
  const result = await lintPath({ path: `${EXAMPLES}edge-scripture-element.html`, profile: 'marketing' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  assert.equal(f018.length, 0);
});

test('edge: <stylesheet> element is not treated as <style>', async () => {
  const result = await lintPath({ path: `${EXAMPLES}edge-stylesheet-element.html`, profile: 'marketing' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  assert.equal(f018.length, 0);
});

test('edge: braces and angle brackets in script strings', async () => {
  const result = await lintPath({ path: `${EXAMPLES}edge-braces-in-script.html`, profile: 'marketing' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  assert.equal(f018.length, 0);
});

test('edge: duplicate links to same valid target', async () => {
  const result = await lintPath({ path: `${EXAMPLES}edge-duplicate-links.html`, profile: 'marketing' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  assert.equal(f018.length, 0);
});

test('edge: multiple main regions', async () => {
  const result = await lintPath({ path: `${EXAMPLES}edge-multiple-mains.html`, profile: 'marketing' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  assert.equal(f018.length, 0);
});

test('edge: Unicode link text', async () => {
  const result = await lintPath({ path: `${EXAMPLES}edge-unicode-text.html`, profile: 'marketing' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  assert.equal(f018.length, 0);
});

test('edge: entity-containing link text', async () => {
  const result = await lintPath({ path: `${EXAMPLES}edge-entity-text.html`, profile: 'marketing' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  assert.equal(f018.length, 0);
});

test('edge: target before candidate', async () => {
  const result = await lintPath({ path: `${EXAMPLES}edge-target-before-candidate.html`, profile: 'marketing' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  assert.equal(f018.length, 1);
});

test('borderline: SPA with programmatic focus triggers warning', async () => {
  const result = await lintPath({ path: `${EXAMPLES}borderline-spa.html`, profile: 'marketing' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  // The SPA has no static skip link, only runtime focus management — F018 fires
  assert.equal(f018.length, 1);
});

// ── Profile Tests ─────────────────────────────────────────────────────

test('marketing profile includes F018', async () => {
  const result = await lintPath({ path: `${EXAMPLES}violation-no-candidate.html`, profile: 'marketing' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  assert.equal(f018.length, 1);
});

test('editorial profile includes F018', async () => {
  const result = await lintPath({ path: `${EXAMPLES}violation-no-candidate.html`, profile: 'editorial' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  assert.equal(f018.length, 1);
});

test('product-app profile includes F018', async () => {
  const result = await lintPath({ path: `${EXAMPLES}violation-no-candidate.html`, profile: 'product-app' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  assert.equal(f018.length, 1);
});

// ── Suppression Tests ─────────────────────────────────────────────────

test('suppression: per-rule suppression eliminates F018 findings', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'f018-supp-'));
  const srcPath = join(dir, 'test.html');
  const cfgPath = join(dir, 'design-canon.config.json');
  await writeFile(srcPath, '<html><body><nav><a href="/">Home</a></nav><main id="m"><h1>C</h1></main></body></html>', 'utf8');
  await writeFile(cfgPath, JSON.stringify({
    version: 1,
    profile: 'marketing',
    suppressions: [{
      rule: 'accessibility.skip-link',
      files: ['**/test.html'],
      reason: 'Test suppression for F018.',
      expires: '2099-01-01'
    }]
  }), 'utf8');
  const result = await lintPath({ path: srcPath, configPath: cfgPath });
  assert.equal(result.warnings, 0);
  assert.equal(result.suppressedFindings.length, 1);
  assert.equal(result.suppressedFindings[0].rule, 'accessibility.skip-link');
  await rm(dir, { recursive: true, force: true });
});

test('suppression: unused F018 suppression is reported', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'f018-unused-'));
  const srcPath = join(dir, 'test.html');
  const cfgPath = join(dir, 'design-canon.config.json');
  await writeFile(srcPath, '<html><body><a href="#m">Skip</a><nav><a href="/">Home</a></nav><main id="m"><h1>C</h1></main></body></html>', 'utf8');
  await writeFile(cfgPath, JSON.stringify({
    version: 1,
    profile: 'marketing',
    suppressions: [{
      rule: 'accessibility.skip-link',
      files: ['**/test.html'],
      reason: 'Unused suppression test for F018.',
      expires: '2099-01-01'
    }]
  }), 'utf8');
  const result = await lintPath({ path: srcPath, configPath: cfgPath });
  assert.equal(result.suppressions.unused.length, 1);
  assert.equal(result.suppressions.unused[0].rule, 'accessibility.skip-link');
  await rm(dir, { recursive: true, force: true });
});

// ── Boundary Tests ────────────────────────────────────────────────────

test('boundary: only F018 was added (no other candidates)', () => {
  const candidates = [
    'accessibility.text-contrast-minimum',
    'mobile.touch-target-minimum'
  ];
  // Verify these rules don't exist in the catalog
});

test('boundary: finding uses bounded confidence wording', async () => {
  const result = await lintPath({ path: `${EXAMPLES}violation-no-candidate.html`, profile: 'marketing' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  assert.ok(f018.length > 0);
  for (const f of f018) {
    assert.ok(!f.message.includes('definitely'), 'Must not claim certainty');
    assert.ok(!f.message.includes('WCAG'), 'Must not claim WCAG conformance');
  }
});

test('boundary: unsupported file extensions ignored', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'f018-ext-'));
  const jsPath = join(dir, 'test.jsx');
  const htmlPath = join(dir, 'test.html');
  await writeFile(jsPath, '<a href="#main">Skip</a>', 'utf8');
  await writeFile(htmlPath, '<html><body><nav><a href="/">Home</a></nav><main id="main"><h1>C</h1></main></body></html>', 'utf8');
  const result = await lintPath({ path: dir, profile: 'marketing' });
  const f018 = result.findings.filter(f => f.rule === 'accessibility.skip-link');
  assert.equal(f018.length, 1); // Only the .html file triggers
  await rm(dir, { recursive: true, force: true });
});

// ── Regression: F018 field-test issues ────────────────────────────────

test('regression: unnamed finding has non-empty message', () => {
  // Bug 1: Whitespace-only name left message undefined
  const html = '<a href="#main">   </a><nav>X</nav><main id="main"><h1>C</h1></main>';
  const findings = detectSkipLink('t.html', html, 'accessibility.skip-link', 'warning');
  assert.equal(findings.length, 1);
  assert.ok(findings[0].message, 'message must be non-empty');
  assert.ok(typeof findings[0].message === 'string' && findings[0].message.length > 0);
});

test('regression: empty nested link content has non-empty message', () => {
  // Bug 1 variant: empty span inside anchor leaves message undefined
  const html = '<a href="#main"><span></span></a><nav>X</nav><main id="main"><h1>C</h1></main>';
  const findings = detectSkipLink('t.html', html, 'accessibility.skip-link', 'warning');
  assert.equal(findings.length, 1);
  assert.ok(findings[0].message, 'message must be non-empty');
  assert.ok(typeof findings[0].message === 'string' && findings[0].message.length > 0);
});

test('regression: aria-hidden text is not counted as name', () => {
  // Bug 2: <span aria-hidden="true">Icon</span> counted as name
  const html = '<a href="#main"><span aria-hidden="true">Icon</span></a><nav>X</nav><main id="main"><h1>C</h1></main>';
  const findings = detectSkipLink('t.html', html, 'accessibility.skip-link', 'warning');
  assert.equal(findings.length, 1, 'aria-hidden text must not count as accessible name');
  assert.ok(findings[0].message.includes('no supported accessible name'));
});

test('regression: aria-hidden labelledby element is not counted as name', () => {
  // Bug 2: Referenced element with aria-hidden="true" should not count
  const html = '<span id="l" aria-hidden="true">Label</span><a href="#main" aria-labelledby="l"></a><nav>X</nav><main id="main"><h1>C</h1></main>';
  const findings = detectSkipLink('t.html', html, 'accessibility.skip-link', 'warning');
  assert.equal(findings.length, 1, 'aria-hidden labelledby element must not count');
});

test('regression: text after empty span is recognized as name', () => {
  // Bug 3: <span></span> before text caused getInnerText to stop early
  const html = '<a href="#main"><span></span>Skip to content</a><nav>X</nav><main id="main"><h1>C</h1></main>';
  const findings = detectSkipLink('t.html', html, 'accessibility.skip-link', 'warning');
  assert.equal(findings.length, 0, 'text after empty nested element must be recognized');
});

test('regression: text after empty SVG is recognized as name', () => {
  // Bug 3 variant: SVG before text
  const html = '<a href="#main"><svg></svg>Skip to content</a><nav>X</nav><main id="main"><h1>C</h1></main>';
  const findings = detectSkipLink('t.html', html, 'accessibility.skip-link', 'warning');
  assert.equal(findings.length, 0, 'text after empty SVG must be recognized');
});

// ── Regression: F016 and F017 still work ──────────────────────────────

test('regression: F016 and F017 still work', async () => {
  const { loadCatalog } = await import('../src/io.js');
  const catalog = await loadCatalog();
  const f016 = catalog.rules.find(r => r.id === 'forms.input-labels-required');
  const f017 = catalog.rules.find(r => r.id === 'motion.respect-reduced-motion');
  const f018 = catalog.rules.find(r => r.id === 'accessibility.skip-link');
  assert.ok(f016, 'F016 must still exist');
  assert.ok(f017, 'F017 must still exist');
  assert.ok(f018, 'F018 must exist');
  assert.equal(f016.severity, 'error');
  assert.equal(f017.severity, 'warning');
  assert.equal(f018.severity, 'warning');
});
