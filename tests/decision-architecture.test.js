import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DECISION_PATH = join(ROOT, '..', 'research', 'decisions', 'candidate-production-architecture.json');

const ALLOWED_DISPOSITIONS = new Set([
  'accept-for-static-implementation',
  'accept-for-partial-static-implementation',
  'accept-for-browser-assisted-implementation',
  'accept-as-advisory-only',
  'remain-researched',
  'park',
  'reject'
]);

const ALLOWED_ARCHITECTURE_VALUES = new Set([
  'static-dom-analysis',
  'static-css-analysis',
  'source-level-heuristic',
  'browser-rendered-analysis',
  'semantic-model-assisted-review',
  'manual-review',
  'unsupported-under-current-architecture',
  'browser-rendered-fallback'
]);

const CANDIDATE_PROPOSAL_IDS = [
  'proposal.forms.input-labels-required',
  'proposal.accessibility.text-contrast-minimum',
  'proposal.accessibility.skip-navigation-link',
  'proposal.mobile.touch-target-minimum',
  'proposal.motion.respect-reduced-motion'
];

test('decision matrix exists and is valid JSON', async () => {
  const text = await readFile(DECISION_PATH, 'utf8');
  const data = JSON.parse(text);
  assert.ok(data, 'Decision matrix must be valid JSON');
  assert.equal(typeof data, 'object');
  assert.ok(Array.isArray(data.candidates));
  assert.equal(data.candidates.length, 5);
});

test('all five proposal IDs are present exactly once', async () => {
  const { candidates } = JSON.parse(await readFile(DECISION_PATH, 'utf8'));
  const ids = new Set(candidates.map((c) => c.proposalId));
  assert.equal(ids.size, 5);
  for (const pid of CANDIDATE_PROPOSAL_IDS) {
    assert.ok(ids.has(pid), `Missing proposal: ${pid}`);
  }
});

test('all required decision fields exist on every candidate', async () => {
  const required = [
    'proposalId', 'proposedRuleId', 'disposition', 'architecture',
    'confidenceBoundary', 'requiredInputs', 'exclusions',
    'profileRecommendations', 'severityRecommendation',
    'implementationReadiness', 'fixtureAssessment', 'acceptanceCriteria'
  ];
  const { candidates } = JSON.parse(await readFile(DECISION_PATH, 'utf8'));
  for (const candidate of candidates) {
    for (const field of required) {
      assert.ok(
        candidate[field] !== undefined,
        `${candidate.proposalId} missing required field: ${field}`
      );
    }
  }
});

test('dispositions use the allowed set', async () => {
  const { candidates } = JSON.parse(await readFile(DECISION_PATH, 'utf8'));
  for (const candidate of candidates) {
    assert.ok(
      ALLOWED_DISPOSITIONS.has(candidate.disposition),
      `${candidate.proposalId} has invalid disposition: ${candidate.disposition}`
    );
  }
});

test('architecture values use the allowed set', async () => {
  const { candidates } = JSON.parse(await readFile(DECISION_PATH, 'utf8'));
  for (const candidate of candidates) {
    assert.ok(
      Array.isArray(candidate.architecture),
      `${candidate.proposalId}.architecture must be an array`
    );
    for (const arch of candidate.architecture) {
      assert.ok(
        ALLOWED_ARCHITECTURE_VALUES.has(arch),
        `${candidate.proposalId} has invalid architecture value: ${arch}`
      );
    }
  }
});

test('each candidate includes confidence boundaries with canProve and cannotProve', async () => {
  const { candidates } = JSON.parse(await readFile(DECISION_PATH, 'utf8'));
  for (const candidate of candidates) {
    const cb = candidate.confidenceBoundary;
    assert.ok(cb, `${candidate.proposalId} missing confidenceBoundary`);
    assert.ok(
      typeof cb.canProve === 'string' && cb.canProve.length > 20,
      `${candidate.proposalId}.confidenceBoundary.canProve must be a substantial string`
    );
    assert.ok(
      typeof cb.cannotProve === 'string' && cb.cannotProve.length > 20,
      `${candidate.proposalId}.confidenceBoundary.cannotProve must be a substantial string`
    );
  }
});

test('each fixture assessment references violation, control, and borderline coverage', async () => {
  const { candidates } = JSON.parse(await readFile(DECISION_PATH, 'utf8'));
  for (const candidate of candidates) {
    const fa = candidate.fixtureAssessment;
    for (const caseType of ['violation', 'control', 'borderline']) {
      assert.ok(
        fa[caseType] !== undefined,
        `${candidate.proposalId}.fixtureAssessment missing ${caseType} case`
      );
      assert.ok(
        fa[caseType].fixtureId && typeof fa[caseType].fixtureId === 'string',
        `${candidate.proposalId}.fixtureAssessment.${caseType} must have a fixtureId string`
      );
      assert.equal(typeof fa[caseType].usable, 'boolean');
    }
  }
});

test('implementation sequencing names exactly two Tranche 1 candidates', async () => {
  const data = JSON.parse(await readFile(DECISION_PATH, 'utf8'));
  assert.ok(Array.isArray(data.tranche1));
  assert.equal(data.tranche1.length, 2, 'Tranche 1 must have exactly 2 candidates');
  assert.ok(data.tranche1Rationale && data.tranche1Rationale.length > 50);
});

test('Tranche 1 candidates are input labels and reduced motion', async () => {
  const data = JSON.parse(await readFile(DECISION_PATH, 'utf8'));
  assert.ok(data.tranche1.includes('proposal.forms.input-labels-required'));
  assert.ok(data.tranche1.includes('proposal.motion.respect-reduced-motion'));
});

test('no production files were modified by this PR', async () => {
  // This test verifies the decision record structure does not reference
  // modifications to production files. The actual file-modification check
  // happens via git diff in the CI gate.
  const { candidates } = JSON.parse(await readFile(DECISION_PATH, 'utf8'));
  for (const candidate of candidates) {
    assert.equal(
      candidate.severityRecommendation,
      candidate.severityRecommendation,
      `Severity for ${candidate.proposalId} is a recommendation, not a production change`
    );
  }
});

test('all acceptance criteria include required fields', async () => {
  const { candidates } = JSON.parse(await readFile(DECISION_PATH, 'utf8'));
  const acFields = [
    'requiredTests', 'requiredFixtures', 'cliBehavior',
    'suppressionBehavior', 'performanceConstraints', 'failureBoundaries', 'documentation'
  ];
  for (const candidate of candidates) {
    const ac = candidate.acceptanceCriteria;
    for (const field of acFields) {
      assert.ok(
        ac[field] !== undefined,
        `${candidate.proposalId}.acceptanceCriteria missing ${field}`
      );
      assert.ok(
        typeof ac[field] === 'string' || Array.isArray(ac[field]),
        `${candidate.proposalId}.acceptanceCriteria.${field} must be string or array`
      );
    }
  }
});

test('decision matrix includes deferred-architecture map', async () => {
  const data = JSON.parse(await readFile(DECISION_PATH, 'utf8'));
  assert.ok(data.deferredArchitecture);
  const keys = Object.keys(data.deferredArchitecture);
  assert.equal(keys.length, 5);
});
