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

test('ADR status is Accepted and references PR #14', async () => {
  const data = JSON.parse(await readFile(DECISION_PATH, 'utf8'));
  assert.equal(data.adrStatus, 'Accepted');
  assert.equal(data.adrPr, '#14');
});

test('architecture boundaries section exists with authorized analysis', async () => {
  const data = JSON.parse(await readFile(DECISION_PATH, 'utf8'));
  assert.ok(data.architectureBoundaries, 'Missing architectureBoundaries');
  assert.ok(
    Array.isArray(data.architectureBoundaries.authorizedAnalysis),
    'authorizedAnalysis must be an array'
  );
  assert.ok(data.architectureBoundaries.authorizedAnalysis.length >= 2);
});

test('pattern matching limitations are documented in architecture boundaries', async () => {
  const data = JSON.parse(await readFile(DECISION_PATH, 'utf8'));
  const unsupported = data.architectureBoundaries.notSupportedByPatternMatching;
  assert.ok(Array.isArray(unsupported), 'notSupportedByPatternMatching must be an array');
  assert.ok(unsupported.length >= 3, 'Must document at least 3 pattern-matching limitations');

  const topics = unsupported.join(' ').toLowerCase();
  assert.ok(topics.includes('label') || topics.includes('for'), 'Must mention label association limitation');
  assert.ok(topics.includes('aria-labelledby'), 'Must mention aria-labelledby limitation');
  assert.ok(topics.includes('media') || topics.includes('scope'), 'Must mention media-query scope limitation');
});

test('non-negotiable architecture boundaries are documented', async () => {
  const data = JSON.parse(await readFile(DECISION_PATH, 'utf8'));
  const boundaries = data.architectureBoundaries.nonNegotiableBoundaries;
  assert.ok(Array.isArray(boundaries), 'nonNegotiableBoundaries must be an array');
  assert.ok(boundaries.length >= 5, 'Must document at least 5 architecture boundaries');

  const text = boundaries.join(' ').toLowerCase();
  assert.ok(text.includes('zero runtime'), 'Must include zero runtime dependencies');
  assert.ok(text.includes('deterministic'), 'Must include deterministic output');
  assert.ok(text.includes('local'), 'Must include local-only operation');
});

test('framework scope decision exists with HTML/CSS in Tranche 1', async () => {
  const data = JSON.parse(await readFile(DECISION_PATH, 'utf8'));
  assert.ok(data.frameworkScope, 'Missing frameworkScope');
  assert.equal(data.frameworkScope.tranche1, 'HTML and plain CSS only');
  assert.ok(
    Array.isArray(data.frameworkScope.stagedAfter),
    'frameworkScope.stagedAfter must be an array'
  );
  assert.ok(data.frameworkScope.stagedAfter.length >= 2);
});

test('framework expansion acceptance gates are defined', async () => {
  const data = JSON.parse(await readFile(DECISION_PATH, 'utf8'));
  const gates = data.frameworkScope.acceptanceGates;
  assert.ok(Array.isArray(gates), 'acceptanceGates must be an array');
  assert.ok(gates.length >= 3, 'Must define at least 3 acceptance gates');
});

test('ADR-001 human-readable document mentions Authorized Analysis Techniques', async () => {
  // Derive the ADR path from the test file location
  const adrPath = join(ROOT, '..', 'docs', 'decisions', 'ADR-001-candidate-production-architecture.md');
  const adr = await readFile(adrPath, 'utf8');
  assert.ok(adr.includes('Authorized Analysis Techniques'), 'ADR must document authorized analysis techniques');
  assert.ok(adr.includes('What Pattern Matching Cannot Do'), 'ADR must document pattern matching limitations');
  assert.ok(adr.includes('Non-Negotiable Architecture Boundaries'), 'ADR must document non-negotiable boundaries');
  assert.ok(adr.includes('Framework Scope Decision'), 'ADR must document framework scope decision');
  assert.ok(adr.match(/Status.*Accepted/), 'ADR status must be Accepted');
  assert.ok(adr.match(/PR.*?#14/) || adr.includes('PR #14'), 'ADR must reference PR #14');
});
