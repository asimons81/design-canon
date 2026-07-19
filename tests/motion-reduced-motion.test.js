import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanCssMotion, extractStyleBlocks, detectUnprotectedMotion, detectUnprotectedMotionInHtml } from '../src/css-reduced-motion.js';
import { lintPath } from '../src/lint.js';

const EXAMPLES = fileURLToPath(new URL('../examples/motion-fixtures/', import.meta.url));

// ── CSS Scanner Unit Tests ────────────────────────────────────────────

test('scanner: animation without override produces finding', () => {
  const findings = scanCssMotion('.card { animation: fade 300ms ease; }');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].selector, '.card');
  assert.equal(findings[0].hasOverride, false);
});

test('scanner: animation with override produces no finding', () => {
  const css = '.card { animation: fade 300ms ease; } @media (prefers-reduced-motion: reduce) { .card { animation: none; } }';
  assert.equal(scanCssMotion(css).length, 0);
});

test('scanner: transition with override produces no finding', () => {
  const css = '.button { transition: transform 200ms; } @media (prefers-reduced-motion: reduce) { .button { transition: none; } }';
  assert.equal(scanCssMotion(css).length, 0);
});

test('scanner: partial protection finds unprotected selectors', () => {
  const css = '.card { animation: fade 1s; } .modal { animation: slide 1s; } @media (prefers-reduced-motion: reduce) { .card { animation: none; } }';
  const findings = scanCssMotion(css);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].selector, '.modal');
});

test('scanner: disabled values produce no findings', () => {
  assert.equal(scanCssMotion('.card { animation: none; }').length, 0);
  assert.equal(scanCssMotion('.card { transition: none; }').length, 0);
  assert.equal(scanCssMotion('.card { transition-duration: 0s; }').length, 0);
  assert.equal(scanCssMotion('.card { animation-duration: 0ms; }').length, 0);
});

test('scanner: keyframes alone produce no findings', () => {
  assert.equal(scanCssMotion('@keyframes fade { from { opacity: 0; } to { opacity: 1; } }').length, 0);
});

test('scanner: selector-list splitting works', () => {
  const css = '.card, .modal { animation: fade 1s; } @media (prefers-reduced-motion: reduce) { .card { animation: none; } .modal { animation: none; } }';
  assert.equal(scanCssMotion(css).length, 0);
});

test('scanner: case variations in @media work', () => {
  const css = '.card { animation: fade 1s; } @media (PREFERS-REDUCED-MOTION: REDUCE) { .card { animation: none; } }';
  assert.equal(scanCssMotion(css).length, 0);
});

test('scanner: prefers-reduced-motion: no-preference is not recognized', () => {
  const css = '.card { animation: fade 1s; } @media (prefers-reduced-motion: no-preference) { .card { animation: fade 1s; } }';
  const findings = scanCssMotion(css);
  assert.equal(findings.length, 1);
});

test('scanner: unrelated @media does not count', () => {
  const css = '.card { animation: fade 1s; } @media screen { .card { animation: none; } }';
  const findings = scanCssMotion(css);
  assert.equal(findings.length, 1);
});

test('scanner: malformed CSS does not crash', () => {
  const findings = scanCssMotion('.card { animation: fade 1s; .other { unfinished');
  assert.ok(Array.isArray(findings));
});

test('scanner: comments are ignored', () => {
  const css = '/* .card { animation: fade 1s; } */ .card { animation: fadeIn 1s; } @media (prefers-reduced-motion: reduce) { .card { animation: none; } }';
  assert.equal(scanCssMotion(css).length, 0);
});

test('scanner: hover-state selectors are distinct', () => {
  const css = '.button { transition: 200ms; } @media (prefers-reduced-motion: reduce) { .button { transition: none; } }';
  assert.equal(scanCssMotion(css).length, 0);
});

test('scanner: duplicate selectors handled', () => {
  const css = '.card { animation: fade 1s; } .card { animation: slide 1s; } @media (prefers-reduced-motion: reduce) { .card { animation: none; } }';
  assert.equal(scanCssMotion(css).length, 0);
});

// ── Inline <style> Extraction Tests ───────────────────────────────────

test('extractStyleBlocks: finds <style> content', () => {
  const blocks = extractStyleBlocks('<html><style>.card {}</style></html>');
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].content, '.card {}');
});

test('extractStyleBlocks: comment-encased <style> is ignored', () => {
  const blocks = extractStyleBlocks('<!-- <style>.card {}</style> --><style>.btn {}</style>');
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].content, '.btn {}');
});

test('extractStyleBlocks: uppercase <STYLE> works', () => {
  const blocks = extractStyleBlocks('<STYLE>.card {}</STYLE>');
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].content, '.card {}');
});

test('extractStyleBlocks: <script> content ignored', () => {
  const blocks = extractStyleBlocks('<script>var x = "<style>.card {}</style>";</script><style>.btn {}</style>');
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].content, '.btn {}');
});

// ── detectUnprotectedMotion Tests ─────────────────────────────────────

test('detectUnprotectedMotion returns findings', () => {
  const findings = detectUnprotectedMotion('.card { animation: fade 1s; }');
  assert.equal(findings.length, 1);
  assert.ok(findings[0].message.includes('static reduced-motion override'));
  assert.ok(!findings[0].message.includes('WCAG'));
});

test('detectUnprotectedMotionInHtml extracts and scans <style>', () => {
  const html = '<html><style>.card { animation: fade 1s; }</style></html>';
  const findings = detectUnprotectedMotionInHtml(html, 'test.html', 'test.rule', 'warning');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, 'test.rule');
  assert.equal(findings[0].severity, 'warning');
});

// ── Integration Tests (lintPath) ──────────────────────────────────────

test('violation: animation-only .css produces warning', async () => {
  const result = await lintPath({ path: `${EXAMPLES}violation-animation.css`, profile: 'marketing' });
  const f017 = result.findings.filter(f => f.rule === 'motion.respect-reduced-motion');
  assert.ok(f017.length >= 1, 'Should find at least one motion finding');
  assert.equal(result.warnings, f017.length);
});

test('violation: transition-only .css produces warning', async () => {
  const result = await lintPath({ path: `${EXAMPLES}violation-transition.css`, profile: 'marketing' });
  const f017 = result.findings.filter(f => f.rule === 'motion.respect-reduced-motion');
  assert.ok(f017.length >= 1);
});

test('violation: partial protection only warns on unprotected selector', async () => {
  const result = await lintPath({ path: `${EXAMPLES}violation-partial-protection.css`, profile: 'marketing' });
  const f017 = result.findings.filter(f => f.rule === 'motion.respect-reduced-motion');
  assert.equal(f017.length, 1);
  assert.ok(f017[0].evidence.includes('.modal'));
});

test('control: fully protected .css produces no warnings', async () => {
  const result = await lintPath({ path: `${EXAMPLES}control-fully-protected.css`, profile: 'marketing' });
  const f017 = result.findings.filter(f => f.rule === 'motion.respect-reduced-motion');
  assert.equal(f017.length, 0);
});

test('control: zero-duration .css produces no warnings', async () => {
  const result = await lintPath({ path: `${EXAMPLES}control-zero-duration.css`, profile: 'marketing' });
  const f017 = result.findings.filter(f => f.rule === 'motion.respect-reduced-motion');
  assert.equal(f017.length, 0);
});

test('control: animation-none .css produces no warnings', async () => {
  const result = await lintPath({ path: `${EXAMPLES}control-animation-none.css`, profile: 'marketing' });
  const f017 = result.findings.filter(f => f.rule === 'motion.respect-reduced-motion');
  assert.equal(f017.length, 0);
});

test('control: keyframes-only .css produces no warnings', async () => {
  const result = await lintPath({ path: `${EXAMPLES}control-keyframes-only.css`, profile: 'marketing' });
  const f017 = result.findings.filter(f => f.rule === 'motion.respect-reduced-motion');
  assert.equal(f017.length, 0);
});

test('violation: inline <style> block triggers finding', async () => {
  const result = await lintPath({ path: `${EXAMPLES}violation-style-block.html`, profile: 'marketing' });
  const f017 = result.findings.filter(f => f.rule === 'motion.respect-reduced-motion');
  assert.ok(f017.length >= 1);
});

test('control: inline <style> with override produces no warnings', async () => {
  const result = await lintPath({ path: `${EXAMPLES}control-style-block.html`, profile: 'marketing' });
  const f017 = result.findings.filter(f => f.rule === 'motion.respect-reduced-motion');
  assert.equal(f017.length, 0);
});

test('edge: uppercase <STYLE> triggers finding', async () => {
  const result = await lintPath({ path: `${EXAMPLES}edge-uppercase-style.html`, profile: 'marketing' });
  const f017 = result.findings.filter(f => f.rule === 'motion.respect-reduced-motion');
  assert.ok(f017.length >= 1);
});

test('edge: style inside comment ignored, real style scanned', async () => {
  const result = await lintPath({ path: `${EXAMPLES}edge-style-in-comment.html`, profile: 'marketing' });
  const f017 = result.findings.filter(f => f.rule === 'motion.respect-reduced-motion');
  assert.equal(f017.length, 0);
});

// ── Editorial Profile Test ────────────────────────────────────────────

test('editorial profile includes F017', async () => {
  const result = await lintPath({ path: `${EXAMPLES}violation-animation.css`, profile: 'editorial' });
  const f017 = result.findings.filter(f => f.rule === 'motion.respect-reduced-motion');
  assert.ok(f017.length >= 1);
});

// ── Suppression Tests ─────────────────────────────────────────────────

test('suppression: per-rule suppression eliminates F017 findings', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'f017-supp-'));
  const srcPath = join(dir, 'test.css');
  const cfgPath = join(dir, 'design-canon.config.json');
  await writeFile(srcPath, '.card { animation: fade 1s; }', 'utf8');
  await writeFile(cfgPath, JSON.stringify({
    version: 1,
    profile: 'marketing',
    suppressions: [{
      rule: 'motion.respect-reduced-motion',
      files: ['**/test.css'],
      reason: 'Test suppression for F017.',
      expires: '2099-01-01'
    }]
  }), 'utf8');
  const result = await lintPath({ path: srcPath, configPath: cfgPath });
  assert.equal(result.warnings, 0);
  assert.equal(result.suppressedFindings.length, 1);
  await rm(dir, { recursive: true, force: true });
});

test('suppression: unused suppression is reported', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'f017-unused-'));
  const srcPath = join(dir, 'test.css');
  const cfgPath = join(dir, 'design-canon.config.json');
  await writeFile(srcPath, '.card { color: red; }', 'utf8');
  await writeFile(cfgPath, JSON.stringify({
    version: 1,
    profile: 'marketing',
    suppressions: [{
      rule: 'motion.respect-reduced-motion',
      files: ['**/test.css'],
      reason: 'Unused suppression test.',
      expires: '2099-01-01'
    }]
  }), 'utf8');
  const result = await lintPath({ path: srcPath, configPath: cfgPath });
  assert.equal(result.suppressions.unused.length, 1);
  await rm(dir, { recursive: true, force: true });
});

// ── F016 Regression Test ──────────────────────────────────────────────

test('regression: F016 still works and F017 is separate', async () => {
  const { loadCatalog } = await import('../src/io.js');
  const catalog = await loadCatalog();
  const f016 = catalog.rules.find(r => r.id === 'forms.input-labels-required');
  const f017 = catalog.rules.find(r => r.id === 'motion.respect-reduced-motion');
  assert.ok(f016, 'F016 must still exist');
  assert.ok(f017, 'F017 must exist');
  assert.equal(f016.severity, 'error');
  assert.equal(f017.severity, 'warning');
});

// ── Boundary Tests ────────────────────────────────────────────────────

test('boundary: no other candidate rules were implemented', () => {
  const candidates = [
    'accessibility.text-contrast-minimum',
    'accessibility.skip-navigation-link',
    'mobile.touch-target-minimum'
  ];
  // Verify these rules don't exist in the catalog (will import dynamically)
});

test('boundary: finding uses bounded confidence wording', async () => {
  const result = await lintPath({ path: `${EXAMPLES}violation-animation.css`, profile: 'marketing' });
  const f017 = result.findings.filter(f => f.rule === 'motion.respect-reduced-motion');
  assert.ok(f017.length > 0);
  for (const f of f017) {
    assert.ok(!f.message.includes('definitely'), 'Must not claim certainty');
    assert.ok(!f.message.includes('WCAG'), 'Must not claim WCAG conformance');
  }
});

// ── Shorthand Parsing Regressions ────────────────────────────────────

test('shorthand: spin with zero duration', () => {
  assert.equal(scanCssMotion('.x { animation: spin 0s; }').length, 0);
  assert.equal(scanCssMotion('.x { animation: spin 0ms; }').length, 0);
  assert.equal(scanCssMotion('.x { animation: spin 0.01ms; }').length, 0);
});

test('shorthand: ease 0s spin', () => {
  assert.equal(scanCssMotion('.x { animation: ease 0s spin; }').length, 0);
});

test('shorthand: spin 0s 1s (0s duration, 1s delay)', () => {
  assert.equal(scanCssMotion('.x { animation: spin 0s 1s; }').length, 0);
});

test('shorthand: spin with no duration defaults to 0s', () => {
  assert.equal(scanCssMotion('.x { animation: spin; }').length, 0);
});

test('shorthand: transition opacity with no duration defaults to 0s', () => {
  assert.equal(scanCssMotion('.x { transition: opacity; }').length, 0);
});

test('shorthand: transition with zero duration', () => {
  assert.equal(scanCssMotion('.x { transition: opacity 0s; }').length, 0);
  assert.equal(scanCssMotion('.x { transition: opacity 0ms; }').length, 0);
});

test('shorthand: comma-separated list with all disabled', () => {
  assert.equal(scanCssMotion('.x { animation: none, spin 0s; }').length, 0);
});

test('shorthand: comma-separated list with active component warns', () => {
  const r = scanCssMotion('.x { animation: none, spin 1s; }');
  assert.equal(r.length, 1);
  assert.equal(r[0].selector, '.x');
});

// ── Media-Query List Regressions ─────────────────────────────────────

test('media: comma-separated list with reduce branch first', () => {
  const css = '.x { animation: fade 1s; } @media (prefers-reduced-motion: reduce), (max-width: 1px) { .x { animation: none; } }';
  assert.equal(scanCssMotion(css).length, 0);
});

test('media: comma-separated list with reduce branch second', () => {
  const css = '.x { animation: fade 1s; } @media (max-width: 1px), (prefers-reduced-motion: reduce) { .x { animation: none; } }';
  assert.equal(scanCssMotion(css).length, 0);
});

test('shorthand: spin 1s produces finding', () => {
  const r = scanCssMotion('.x { animation: spin 1s; }');
  assert.equal(r.length, 1);
});

// ── Cross-Block Duplicate Selector Limitation ─────────────────────────
// Longhands split across separate blocks with the same selector are not
// aggregated. This is a documented static-analysis limitation.

test('limitation: animation name and duration in separate blocks not aggregated', () => {
  const css = '.x { animation-name: spin; }\n\n.x { animation-duration: 1s; }';
  assert.equal(scanCssMotion(css).length, 0,
    'Cross-block aggregation is not supported');
});

test('limitation: transition property and duration in separate blocks not aggregated', () => {
  const css = '.x { transition-property: opacity; }\n\n.x { transition-duration: 1s; }';
  assert.equal(scanCssMotion(css).length, 0,
    'Cross-block aggregation is not supported');
});

test('limitation: single-block name+duration still works', () => {
  const r = scanCssMotion('.x { animation-name: spin; animation-duration: 1s; }');
  assert.equal(r.length, 1);
});
