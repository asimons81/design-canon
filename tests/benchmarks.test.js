import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const benchmarkDirectory = fileURLToPath(
  new URL('../research/benchmarks/', import.meta.url)
);

const requiredHeadings = [
  '## Title',
  '## Objective',
  '## Audience',
  '## Supplied Content',
  '## Functional Requirements',
  '## Required Components',
  '## Interaction States',
  '## Viewport Dimensions',
  '## Accessibility Expectations',
  '## Prohibited Shortcuts',
  '## Scoring Criteria',
  '## Expected Deliverables',
  '## Run-Manifest Fields',
  '## Known Ambiguity Risks'
];

const allowedProfiles = new Set(['marketing', 'product-app', 'editorial']);

test('benchmark factory contains 15 uniquely identified, structurally complete briefs', async () => {
  const files = (await readdir(benchmarkDirectory))
    .filter((name) => /^B\d{3}-.+\.md$/.test(name))
    .sort();

  assert.equal(files.length, 15);

  const ids = new Set();
  for (const file of files) {
    const content = await readFile(join(benchmarkDirectory, file), 'utf8');
    const id = content.match(/\| \*\*ID\*\* \| `([^`]+)` \|/)?.[1];
    const profile = content.match(
      /\| \*\*Applicable Design Canon profile\*\* \| `([^`]+)` \|/
    )?.[1];

    assert.ok(id, `${file} must declare an ID`);
    assert.equal(ids.has(id), false, `${file} duplicates benchmark ID ${id}`);
    ids.add(id);

    assert.ok(
      allowedProfiles.has(profile),
      `${file} must declare exactly one supported compiler profile`
    );

    for (const heading of requiredHeadings) {
      assert.match(
        content,
        new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`, 'm')
      );
    }
  }
});
