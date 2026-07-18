import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  validateCandidateFixture,
  validateResearchGraph,
  validateResearchSource,
  validateResearchTree,
  validateRuleProposal
} from '../scripts/validate-research.js';

const ROOT = new URL('..', import.meta.url);
const ROOT_PATH = fileURLToPath(ROOT);

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, ROOT), 'utf8'));
}

async function readText(relativePath) {
  return readFile(new URL(relativePath, ROOT), 'utf8');
}

function assertAttestation(attestation, keys) {
  for (const key of keys) assert.equal(attestation[key], true, `${key} must be true`);
}

function walkKeys(value, visit) {
  if (Array.isArray(value)) {
    for (const item of value) walkKeys(item, visit);
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      visit(key, child);
      walkKeys(child, visit);
    }
  }
}

test('research contract schemas are valid JSON Schema documents', async () => {
  const schemaDir = new URL('../schema/', import.meta.url);
  const files = (await readdir(schemaDir)).filter((name) => name.endsWith('.schema.json'));
  const expected = new Set([
    'candidate-fixture.schema.json',
    'research-source.schema.json',
    'rule-proposal.schema.json'
  ]);

  for (const name of expected) assert.ok(files.includes(name), `missing ${name}`);

  for (const name of expected) {
    const schema = await readJson(`schema/${name}`);
    assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
    assert.equal(schema.type, 'object');
    assert.equal(schema.additionalProperties, false);
    assert.ok(Array.isArray(schema.required) && schema.required.length > 0);
  }
});

test('example source, proposal, and fixture cross-reference cleanly', async () => {
  const source = await readJson('research/templates/source.original-observation.example.json');
  const proposal = await readJson('research/templates/proposal.copy.decorative-live-badge.example.json');
  const fixture = await readJson('research/templates/fixture.decorative-live-badge.example.json');

  assert.match(source.sourceId, /^source\.[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/);
  assert.match(proposal.proposalId, /^proposal\.[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/);
  assert.ok(proposal.sourceIds.includes(source.sourceId));
  assert.equal(fixture.proposalId, proposal.proposalId);
  assert.ok(proposal.fixturePlan.some((entry) => entry.fixtureId === fixture.fixtureId));

  assertAttestation(source.independence, [
    'publiclyAccessible',
    'noPaywallBypass',
    'noLeakedMaterial',
    'notDerivedFromPrivateEpsteinMd',
    'independentSynthesis'
  ]);
  assertAttestation(proposal.provenanceAttestation, [
    'cleanRoom',
    'notCopiedFromPrivateCorpus',
    'notReverseEngineeredFromEpsteinMd',
    'sourcesRecorded',
    'originalSynthesis'
  ]);
  assertAttestation(fixture.constraints, [
    'selfContained',
    'deterministic',
    'syntheticContent'
  ]);
  assert.equal(fixture.constraints.externalDependencies, false);
  assert.equal(fixture.constraints.networkAccess, false);
});

test('proposal examples enforce controls, exceptions, and fixture diversity', async () => {
  const proposal = await readJson('research/templates/proposal.copy.decorative-live-badge.example.json');
  assert.ok(proposal.examples.violations.length >= 2);
  assert.ok(proposal.examples.controls.length >= 2);
  assert.ok(proposal.examples.borderline.length >= 1);
  assert.ok(proposal.exceptions.length >= 1);
  assert.ok(proposal.detector.limitations.length >= 1);
  assert.ok(proposal.falsePositiveRisk.scenarios.length >= 1);
  assert.ok(proposal.falsePositiveRisk.mitigations.length >= 1);

  const caseTypes = new Set(proposal.fixturePlan.map((entry) => entry.caseType));
  for (const required of ['violation', 'control', 'borderline']) {
    assert.ok(caseTypes.has(required), `missing ${required} fixture plan`);
  }
});

test('research proposal contract never accepts executable regex fields', async () => {
  const schema = await readJson('schema/rule-proposal.schema.json');
  const example = await readJson('research/templates/proposal.copy.decorative-live-badge.example.json');

  for (const value of [schema, example]) {
    walkKeys(value, (key) => {
      assert.notEqual(key.toLowerCase(), 'rawregex');
      assert.notEqual(key.toLowerCase(), 'regexsource');
      assert.notEqual(key.toLowerCase(), 'executablepattern');
    });
  }

  assert.deepEqual(
    schema.properties.detector.properties.matcherProposal.properties.kind.enum,
    ['exact-word', 'phrase', 'token-sequence', 'css-property', 'dom-structure', 'heuristic']
  );
});

test('dependency-free validators enforce the example contract', async () => {
  const source = await readJson('research/templates/source.original-observation.example.json');
  const proposal = await readJson('research/templates/proposal.copy.decorative-live-badge.example.json');
  const fixture = await readJson('research/templates/fixture.decorative-live-badge.example.json');

  assert.equal(validateResearchSource(source).sourceId, source.sourceId);
  assert.equal(validateRuleProposal(proposal).proposalId, proposal.proposalId);
  assert.equal(validateCandidateFixture(fixture).fixtureId, fixture.fixtureId);
  assert.deepEqual(
    validateResearchGraph({ sources: [source], proposals: [proposal], fixtures: [fixture] }),
    { sources: 1, proposals: 1, fixtures: 1 }
  );
  assert.deepEqual(await validateResearchTree(ROOT_PATH, { includeExamples: true }), {
    sources: 1,
    proposals: 1,
    fixtures: 1
  });
});

test('validators reject missing controls, raw regex, and unsafe fixture paths', async () => {
  const proposal = await readJson('research/templates/proposal.copy.decorative-live-badge.example.json');
  proposal.examples.controls = [];
  assert.throws(() => validateRuleProposal(proposal), /controls must contain at least 2/);

  const rawRegexProposal = await readJson('research/templates/proposal.copy.decorative-live-badge.example.json');
  rawRegexProposal.detector.rawRegex = 'live';
  assert.throws(() => validateRuleProposal(rawRegexProposal), /rawRegex is forbidden/);

  const fixture = await readJson('research/templates/fixture.decorative-live-badge.example.json');
  fixture.sourceFiles[0].path = '../outside.html';
  assert.throws(() => validateCandidateFixture(fixture), /must not escape/);
});

test('benchmark contract defines four conditions and 180 minimum runs', async () => {
  const benchmark = await readText('research/benchmark/MONOLITH_VS_COMPILED.md');
  for (const condition of ['| A |', '| B |', '| C |', '| D |']) {
    assert.match(benchmark, new RegExp(condition.replaceAll('|', '\\|')));
  }
  assert.match(benchmark, /15 x 4 x 3 = 180 runs minimum/);
  assert.match(benchmark, /same catalog commit/i);
  assert.match(benchmark, /Neither artifact may be manually edited/i);
  assert.match(benchmark, /may not support claims that Design Canon beat a private corpus/i);
});

test('clean-room guide reserves acceptance and implementation for maintainers', async () => {
  const guide = await readText('docs/CLEAN_ROOM_RESEARCH.md');
  assert.match(guide, /private `epstein\.md` corpus is not a source/i);
  assert.match(guide, /Research agents describe detection intent\. They do not submit executable regular expressions\./);
  assert.match(guide, /Only maintainers may move a proposal beyond `review-ready`\./);
  assert.match(guide, /A word is not automatically an anti-pattern\./);
});
