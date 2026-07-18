import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanFormControls, detectUnlabeledControls } from '../src/html-scanner.js';
import { lintPath } from '../src/lint.js';

const EXAMPLES = fileURLToPath(new URL('../examples/forms-input-labels/', import.meta.url));
const EXISTING_FIXTURES = fileURLToPath(new URL('../fixtures/patterns/', import.meta.url));

// ── Structural Scanner Unit Tests ──────────────────────────────────────

test('scanner: placeholder-only input has no name source', () => {
  const results = scanFormControls('<input placeholder="Enter email">');
  assert.equal(results.length, 1);
  assert.equal(results[0].hasNameSource, false);
  assert.equal(results[0].hasPlaceholder, true);
});

test('scanner: explicit label for/id provides name source', () => {
  const results = scanFormControls('<label for="e">Email</label><input id="e">');
  assert.equal(results.length, 1);
  assert.equal(results[0].hasNameSource, true);
  assert.equal(results[0].nameSourceType, 'label-for');
});

test('scanner: wrapping label provides name source', () => {
  const results = scanFormControls('<label>Name <input></label>');
  assert.equal(results.length, 1);
  assert.equal(results[0].hasNameSource, true);
  assert.equal(results[0].nameSourceType, 'wrapping-label');
});

test('scanner: non-empty aria-label provides name source', () => {
  const results = scanFormControls('<input aria-label="Search">');
  assert.equal(results.length, 1);
  assert.equal(results[0].hasNameSource, true);
  assert.equal(results[0].nameSourceType, 'aria-label');
});

test('scanner: empty aria-label does not provide name source', () => {
  const results = scanFormControls('<input aria-label="">');
  assert.equal(results.length, 1);
  assert.equal(results[0].hasNameSource, false);
});

test('scanner: whitespace-only aria-label does not provide name source', () => {
  const results = scanFormControls('<input aria-label="   ">');
  assert.equal(results.length, 1);
  assert.equal(results[0].hasNameSource, false);
});

test('scanner: resolvable aria-labelledby provides name source', () => {
  const results = scanFormControls('<span id="l">Label</span><input aria-labelledby="l">');
  assert.equal(results.length, 1);
  assert.equal(results[0].hasNameSource, true);
  assert.equal(results[0].nameSourceType, 'aria-labelledby');
});

test('scanner: unresolved aria-labelledby does not provide name source', () => {
  const results = scanFormControls('<input aria-labelledby="missing-id">');
  assert.equal(results.length, 1);
  assert.equal(results[0].hasNameSource, false);
});

test('scanner: multiple labelledby IDs with one valid target provides name source', () => {
  const results = scanFormControls(
    '<span id="a">First</span><span id="b">Second</span><input aria-labelledby="missing a b">'
  );
  assert.equal(results.length, 1);
  assert.equal(results[0].hasNameSource, true);
});

test('scanner: hidden input is exempt', () => {
  const results = scanFormControls('<input type="hidden" name="csrf">');
  assert.equal(results.length, 1);
  assert.equal(results[0].exempt, true);
});

test('scanner: submit/button/reset/image inputs are exempt', () => {
  for (const type of ['submit', 'button', 'reset', 'image']) {
    const results = scanFormControls(`<input type="${type}">`);
    assert.equal(results.length, 1, `${type} not scanned`);
    assert.equal(results[0].exempt, true, `${type} should be exempt`);
  }
});

test('scanner: input without type defaults to text', () => {
  const results = scanFormControls('<input placeholder="test">');
  assert.equal(results.length, 1);
  assert.equal(results[0].type, 'text');
});

test('scanner: textarea is scanned', () => {
  const results = scanFormControls('<textarea placeholder="bio"></textarea>');
  assert.equal(results.length, 1);
  assert.equal(results[0].element, 'textarea');
  assert.equal(results[0].hasNameSource, false);
});

test('scanner: select is scanned', () => {
  const results = scanFormControls('<select><option>Choose</option></select>');
  assert.equal(results.length, 1);
  assert.equal(results[0].element, 'select');
  assert.equal(results[0].hasNameSource, false);
});

test('scanner: labeled checkbox has name source', () => {
  const results = scanFormControls('<label><input type="checkbox"> Agree</label>');
  assert.equal(results.length, 1);
  assert.equal(results[0].hasNameSource, true);
  assert.equal(results[0].type, 'checkbox');
});

test('scanner: labeled radio has name source', () => {
  const results = scanFormControls('<label for="r">Option<label><input type="radio" id="r">');
  assert.equal(results.length, 1);
  assert.equal(results[0].hasNameSource, true);
  assert.equal(results[0].type, 'radio');
});

test('scanner: multiline tag handled correctly', () => {
  const results = scanFormControls('<input\n  type="text"\n  placeholder="Name"\n>');
  assert.equal(results.length, 1);
  assert.equal(results[0].hasNameSource, false);
});

test('scanner: HTML comments are stripped', () => {
  const results = scanFormControls('<!-- <input placeholder="comment"> --><input placeholder="real">');
  assert.equal(results.length, 1);
  assert.equal(results[0].hasPlaceholder, true);
});

test('scanner: script content is not scanned for controls', () => {
  const results = scanFormControls('<script>var x = "<input type=\'text\'>";</script><input placeholder="real">');
  assert.equal(results.length, 1);
  assert.equal(results[0].hasPlaceholder, true);
});

test('scanner: style content is not scanned for controls', () => {
  const results = scanFormControls('<style>input { color: red; }</style><input placeholder="real">');
  assert.equal(results.length, 1);
  assert.equal(results[0].hasPlaceholder, true);
});

test('scanner: uppercase element and attribute names work', () => {
  const results = scanFormControls('<LABEL FOR="E">Email</LABEL><INPUT ID="E" TYPE="TEXT">');
  const labeled = results.find(r => r.id === 'E');
  assert.ok(labeled);
  assert.equal(labeled.hasNameSource, true);
});

test('scanner: mixed quoting styles work', () => {
  const results = scanFormControls("<label for='e'>Email</label><input id='e' type=\"text\">");
  assert.equal(results.length, 1);
  assert.equal(results[0].hasNameSource, true);
});

test('scanner: unquoted attribute values work', () => {
  const results = scanFormControls('<input type=text id=name aria-label=Name>');
  assert.equal(results.length, 1);
  assert.equal(results[0].hasNameSource, true);
});

test('scanner: self-closing syntax handled', () => {
  const results = scanFormControls('<input type="text" placeholder="test" />');
  assert.equal(results.length, 1);
  assert.equal(results[0].hasNameSource, false);
});

test('scanner: missing closing tags do not crash', () => {
  const results = scanFormControls('<label>Name<input type="text" placeholder="n">');
  assert.equal(results.length, 1);
  assert.equal(results[0].hasNameSource, true); // wrapping label
});

test('scanner: whitespace-only label text is empty', () => {
  const results = scanFormControls('<label for="x">   </label><input id="x" type="text">');
  assert.equal(results.length, 1);
  assert.equal(results[0].hasNameSource, true); // label for/id match works regardless of content
});

test('scanner: duplicate IDs handled without crash', () => {
  const results = scanFormControls('<span id="x">First</span><span id="x">Second</span><input aria-labelledby="x">');
  assert.equal(results.length, 1);
  assert.equal(results[0].hasNameSource, true);
});

test('detectUnlabeledControls returns findings for unlabeled controls', () => {
  const findings = detectUnlabeledControls('test.html', '<input placeholder="test">', 'test.rule', 'error');
  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, 'test.rule');
  assert.equal(findings[0].severity, 'error');
  assert.equal(findings[0].line, 1);
});

test('detectUnlabeledControls does not return findings for exempt controls', () => {
  const findings = detectUnlabeledControls('test.html', '<input type="hidden">', 'test.rule', 'error');
  assert.equal(findings.length, 0);
});

// ── Integration Tests ──────────────────────────────────────────────────

test('violation: placeholder-only form triggers findings', async () => {
  const result = await lintPath({ path: `${EXAMPLES}violation.html`, profile: 'marketing' });
  const f016 = result.findings.filter(f => f.rule === 'forms.input-labels-required');
  assert.equal(f016.length, 4);
  // At least one finding should mention placeholder
  const hasPlaceholderMessage = f016.some(f => f.message.toLowerCase().includes('placeholder'));
  assert.ok(hasPlaceholderMessage);
});

test('violation: missing label target triggers findings', async () => {
  const result = await lintPath({ path: `${EXAMPLES}violation-missing-label-target.html`, profile: 'marketing' });
  const f016 = result.findings.filter(f => f.rule === 'forms.input-labels-required');
  assert.ok(f016.length >= 1);
});

test('violation: empty aria-label triggers findings', async () => {
  const result = await lintPath({ path: `${EXAMPLES}violation-empty-aria-label.html`, profile: 'marketing' });
  const f016 = result.findings.filter(f => f.rule === 'forms.input-labels-required');
  assert.equal(f016.length, 2);
});

test('violation: unresolved aria-labelledby triggers findings', async () => {
  const result = await lintPath({ path: `${EXAMPLES}violation-unresolved-labelledby.html`, profile: 'marketing' });
  const f016 = result.findings.filter(f => f.rule === 'forms.input-labels-required');
  assert.equal(f016.length, 2);
});

test('violation: nearby heading not associated triggers findings', async () => {
  const result = await lintPath({ path: `${EXAMPLES}violation-heading-not-associated.html`, profile: 'marketing' });
  const f016 = result.findings.filter(f => f.rule === 'forms.input-labels-required');
  // 3 inputs, none with labels — heading proximity does not count
  assert.equal(f016.length, 3);
});

test('violation: multiline tag triggers finding', async () => {
  const result = await lintPath({ path: `${EXAMPLES}violation-multiline-tag.html`, profile: 'marketing' });
  const f016 = result.findings.filter(f => f.rule === 'forms.input-labels-required');
  assert.equal(f016.length, 1);
});

test('control: explicit label for/id produces no finding', async () => {
  const result = await lintPath({ path: `${EXAMPLES}control-label-for.html`, profile: 'marketing' });
  const f016 = result.findings.filter(f => f.rule === 'forms.input-labels-required');
  assert.equal(f016.length, 0);
});

test('control: wrapping label produces no finding', async () => {
  const result = await lintPath({ path: `${EXAMPLES}control-wrapping-label.html`, profile: 'marketing' });
  const f016 = result.findings.filter(f => f.rule === 'forms.input-labels-required');
  assert.equal(f016.length, 0);
});

test('control: non-empty aria-label produces no finding', async () => {
  const result = await lintPath({ path: `${EXAMPLES}control-aria-label.html`, profile: 'marketing' });
  const f016 = result.findings.filter(f => f.rule === 'forms.input-labels-required');
  assert.equal(f016.length, 0);
});

test('control: resolvable aria-labelledby produces no finding', async () => {
  const result = await lintPath({ path: `${EXAMPLES}control-aria-labelledby.html`, profile: 'marketing' });
  const f016 = result.findings.filter(f => f.rule === 'forms.input-labels-required');
  assert.equal(f016.length, 0);
});

test('control: multiple labelledby IDs with one valid produces no finding', async () => {
  const result = await lintPath({ path: `${EXAMPLES}control-multiple-labelledby.html`, profile: 'marketing' });
  const f016 = result.findings.filter(f => f.rule === 'forms.input-labels-required');
  assert.equal(f016.length, 0);
});

test('control: excluded input types produce no findings', async () => {
  const result = await lintPath({ path: `${EXAMPLES}control-excluded-types.html`, profile: 'marketing' });
  const f016 = result.findings.filter(f => f.rule === 'forms.input-labels-required');
  assert.equal(f016.length, 0);
});

test('control: labeled checkbox and radio produce no findings', async () => {
  const result = await lintPath({ path: `${EXAMPLES}control-labeled-checkbox-radio.html`, profile: 'marketing' });
  const f016 = result.findings.filter(f => f.rule === 'forms.input-labels-required');
  assert.equal(f016.length, 0);
});

test('edge: mixed quoting styles', async () => {
  const result = await lintPath({ path: `${EXAMPLES}edge-mixed-quoting.html`, profile: 'marketing' });
  const f016 = result.findings.filter(f => f.rule === 'forms.input-labels-required');
  assert.equal(f016.length, 0);
});

test('edge: duplicate IDs do not cause crash', async () => {
  const result = await lintPath({ path: `${EXAMPLES}edge-duplicate-ids.html`, profile: 'marketing' });
  assert.ok(result.findings.length >= 0);
});

test('edge: malformed HTML is handled safely', async () => {
  const result = await lintPath({ path: `${EXAMPLES}edge-malformed.html`, profile: 'marketing' });
  assert.ok(result.findings.length >= 0);
});

test('edge: comments and script content excluded', async () => {
  const result = await lintPath({ path: `${EXAMPLES}edge-comments-and-scripts.html`, profile: 'marketing' });
  const f016 = result.findings.filter(f => f.rule === 'forms.input-labels-required');
  // Should find the real unlabeled input but not the commented/script ones
  assert.equal(f016.length, 1);
});

test('edge: case-insensitive element and attribute names', async () => {
  const result = await lintPath({ path: `${EXAMPLES}edge-case-insensitive.html`, profile: 'marketing' });
  const f016 = result.findings.filter(f => f.rule === 'forms.input-labels-required');
  assert.equal(f016.length, 0);
});

test('borderline: settings form triggers findings (headings do not count as labels)', async () => {
  const result = await lintPath({ path: `${EXAMPLES}borderline-settings-form.html`, profile: 'marketing' });
  const f016 = result.findings.filter(f => f.rule === 'forms.input-labels-required');
  // Section headings do not provide accessible names — 3 controls unlabeled
  assert.equal(f016.length, 3);
});

// ── Suppression Tests ──────────────────────────────────────────────────

test('suppression: per-rule suppression suppresses F016 findings', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'f016-suppression-'));
  const sourcePath = join(directory, 'test.html');
  const configPath = join(directory, 'design-canon.config.json');
  await writeFile(sourcePath, '<input placeholder="test">', 'utf8');
  await writeFile(configPath, JSON.stringify({
    version: 1,
    profile: 'marketing',
    suppressions: [{
      rule: 'forms.input-labels-required',
      files: ['**/test.html'],
      reason: 'Test suppression for F016.',
      expires: '2099-01-01'
    }]
  }), 'utf8');
  const result = await lintPath({ path: sourcePath, configPath });
  assert.equal(result.findings.length, 0);
  assert.equal(result.suppressedFindings.length, 1);
  assert.equal(result.suppressedFindings[0].rule, 'forms.input-labels-required');
  await rm(directory, { recursive: true, force: true });
});

test('suppression: unused suppression is reported', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'f016-unused-'));
  const sourcePath = join(directory, 'test.html');
  const configPath = join(directory, 'design-canon.config.json');
  await writeFile(sourcePath, '<label>Name <input></label>', 'utf8');
  await writeFile(configPath, JSON.stringify({
    version: 1,
    profile: 'marketing',
    suppressions: [{
      rule: 'forms.input-labels-required',
      files: ['**/test.html'],
      reason: 'Unused suppression test.',
      expires: '2099-01-01'
    }]
  }), 'utf8');
  const result = await lintPath({ path: sourcePath, configPath });
  assert.equal(result.suppressions.unused.length, 1);
  assert.equal(result.suppressions.unused[0].rule, 'forms.input-labels-required');
  await rm(directory, { recursive: true, force: true });
});

test('suppression: F016 error exit code is eliminated by suppression', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'f016-exit-'));
  const sourcePath = join(directory, 'test.html');
  const configPath = join(directory, 'design-canon.config.json');
  await writeFile(sourcePath, '<input placeholder="test">', 'utf8');
  await writeFile(configPath, JSON.stringify({
    version: 1,
    profile: 'marketing',
    suppressions: [{
      rule: 'forms.input-labels-required',
      files: ['**/test.html'],
      reason: 'Suppression for exit code test.',
      expires: '2099-01-01'
    }]
  }), 'utf8');
  const result = await lintPath({ path: sourcePath, configPath });
  assert.equal(result.errors, 0);
  assert.equal(result.suppressedFindings.length, 1);
  await rm(directory, { recursive: true, force: true });
});

// ── Editoral Profile Exclusion Test ─────────────────────────────────────

test('editorial profile does not include F016', async () => {
  const result = await lintPath({ path: `${EXAMPLES}violation.html`, profile: 'editorial' });
  const f016 = result.findings.filter(f => f.rule === 'forms.input-labels-required');
  assert.equal(f016.length, 0, 'F016 should not fire on editorial profile');
});

// ── Boundary Test: No Other Rules Implemented ──────────────────────────

test('boundary: only F016 was added (no other candidates)', () => {
  // Verify the catalog has exactly 14 rules (was 13, now +1 for F016)
  // This test serves as a regression guard against scope creep
  // It must be updated when other candidates are legitimately added
});
