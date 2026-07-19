import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));
const ADR_PATH = join(ROOT, '..', 'docs', 'decisions', 'ADR-003-rendered-text-contrast-rule.md');
const SPEC_PATH = join(ROOT, '..', 'research', 'decisions', 'F019-rendered-text-contrast.json');
const MATRIX_PATH = join(ROOT, '..', 'research', 'decisions', 'candidate-production-architecture.json');
const CATALOG_PATH = join(ROOT, '..', 'rules', 'core.json');

async function load() {
  const [adr, specText, matrixText, catalogText] = await Promise.all([
    readFile(ADR_PATH, 'utf8'),
    readFile(SPEC_PATH, 'utf8'),
    readFile(MATRIX_PATH, 'utf8'),
    readFile(CATALOG_PATH, 'utf8')
  ]);
  return {
    adr,
    spec: JSON.parse(specText),
    matrix: JSON.parse(matrixText),
    catalog: JSON.parse(catalogText)
  };
}

test('ADR-003 accepts F019 as a browser-rendered warning rule', async () => {
  const { adr, spec } = await load();
  assert.match(adr, /\*\*Status:\*\* Accepted/);
  assert.match(adr, /\*\*PR:\*\* #20/);
  assert.match(adr, /\*\*Depends on:\*\* ADR-002/);
  assert.equal(spec.ruleNumber, 'F019');
  assert.equal(spec.ruleId, 'accessibility.text-contrast-minimum');
  assert.equal(spec.severity, 'warning');
  assert.equal(spec.architecture, 'browser-rendered-analysis');
});

test('F019 applies to all current profiles and HTML only', async () => {
  const { spec } = await load();
  assert.deepEqual(spec.profiles, ['marketing', 'editorial', 'product-app']);
  assert.deepEqual(spec.supportedExtensions, ['.html']);
});

test('F019 thresholds and luminance constants are fixed', async () => {
  const { spec, adr } = await load();
  assert.equal(spec.thresholds.normal, 4.5);
  assert.equal(spec.thresholds.large, 3);
  assert.equal(spec.thresholds.largeRegularMinPx, 24);
  assert.equal(spec.thresholds.largeBoldMinPx, 18.66);
  assert.equal(spec.thresholds.largeBoldMinWeight, 700);
  assert.equal(spec.thresholds.comparison, 'unrounded');
  assert.equal(spec.luminance.channelThreshold, 0.04045);
  assert.match(adr, /0\.04045/);
});

test('F019 has an explicit catalog-to-analyzer binding', async () => {
  const { spec, adr } = await load();
  assert.equal(spec.catalogBinding.field, 'detect.browserAnalyzer');
  assert.equal(spec.catalogBinding.binding.id, 'rendered.text-contrast');
  assert.equal(spec.catalogBinding.detectorFamiliesAreExclusive, true);
  assert.match(adr, /exactly one detector family/);
});

test('only confirmed violation samples become findings', async () => {
  const { spec, adr } = await load();
  assert.deepEqual(spec.sampleContract.findingCondition, {
    status: 'confirmed',
    outcome: 'violation'
  });
  assert.match(adr, /Only samples with:/);
  assert.match(adr, /Indeterminate samples remain analysis evidence and do not become findings/);
});

test('F019 supports solid alpha composition and makes complex effects indeterminate', async () => {
  const { spec } = await load();
  assert.equal(spec.colorResolution.ancestorBackgroundAlphaComposition, true);
  assert.equal(spec.colorResolution.foregroundAlphaComposition, true);
  for (const reason of ['gradient', 'image-background', 'opacity', 'text-shadow', 'text-stroke']) {
    assert.ok(spec.indeterminateReasons.includes(reason), `Missing indeterminate reason: ${reason}`);
  }
});

test('F019 evidence and location policies are machine-readable', async () => {
  const { spec } = await load();
  for (const field of ['selector', 'text', 'foreground', 'background', 'ratio', 'requiredRatio', 'viewport', 'colorScheme', 'browserVersion']) {
    assert.ok(spec.evidenceFields.includes(field), `Missing evidence field: ${field}`);
  }
  assert.match(spec.execution.sourceLinePolicy, /line 1/);
  assert.match(spec.execution.sourceLinePolicy, /DOM path/);
});

test('candidate decision is upgraded from partial static to browser-rendered implementation', async () => {
  const { matrix } = await load();
  const candidate = matrix.candidates.find((item) => item.proposalId === 'proposal.accessibility.text-contrast-minimum');
  assert.ok(candidate);
  assert.equal(candidate.disposition, 'accept-for-browser-assisted-implementation');
  assert.deepEqual(candidate.architecture, ['browser-rendered-analysis']);
  assert.equal(candidate.implementationReadiness, 'ready-for-implementation');
});

test('decision does not add F019 to the production catalog', async () => {
  const { catalog } = await load();
  const ids = catalog.rules.map((rule) => rule.id);
  assert.ok(!ids.includes('accessibility.text-contrast-minimum'));
  assert.equal(ids.length, 16);
});
