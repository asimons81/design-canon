#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const SOURCE_ID = /^source\.[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/;
const PROPOSAL_ID = /^proposal\.[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/;
const RULE_ID = /^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/;
const FIXTURE_ID = /^fixture\.[a-z0-9.-]+\.(violation|control|borderline|profile)\.[a-z][a-z0-9-]*$/;
const SHA256 = /^[a-f0-9]{64}$/;

const SOURCE_TYPES = new Set([
  'official-standard',
  'official-guidance',
  'research-paper',
  'open-source-project',
  'public-design-system',
  'public-example',
  'public-article',
  'original-observation'
]);
const LICENSE_STATUSES = new Set(['explicit-open-license', 'publicly-readable', 'unknown', 'not-applicable']);
const PROPOSAL_STATUSES = new Set(['draft', 'researched', 'review-ready']);
const CATEGORIES = new Set([
  'accessibility', 'badges', 'borders', 'color', 'components', 'copy', 'data-integrity',
  'depth', 'editorial', 'forms', 'hierarchy', 'layout', 'marketing', 'mobile', 'motion',
  'navigation', 'radius', 'responsive', 'spacing', 'states', 'tables', 'tokens', 'typography'
]);
const SURFACES = new Set([
  'universal', 'marketing', 'product-app', 'editorial', 'mobile', 'commerce',
  'documentation', 'public-sector'
]);
const FEASIBILITY = new Set(['mechanical', 'semantic', 'visual', 'manual-only']);
const MATCHER_KINDS = new Set(['exact-word', 'phrase', 'token-sequence', 'css-property', 'dom-structure', 'heuristic']);
const IMPACTS = new Set(['nuisance', 'degraded', 'serious', 'blocking']);
const COPY_PATTERN_CLASSES = new Set([
  'empty-adjective', 'generic-hero', 'unsupported-superlative', 'fake-urgency',
  'vague-transformation', 'business-abstraction', 'repetitive-cta', 'fake-social-proof',
  'filler-transition', 'anthropomorphic-product-claim'
]);
const RISK_LEVELS = new Set(['low', 'medium', 'high']);
const CASE_TYPES = new Set(['violation', 'control', 'borderline', 'profile']);
const FIXTURE_PROFILES = new Set(['universal', 'marketing', 'product-app', 'editorial', 'mobile', 'anti-slop']);
const LANGUAGES = new Set(['html', 'css', 'javascript', 'typescript', 'jsx', 'tsx', 'vue', 'svelte', 'json']);
const REVIEWER_TYPES = new Set(['human', 'model-assisted', 'future-detector']);

function fail(message) {
  throw new Error(message);
}

function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
  return value;
}

function string(value, label, minimum = 1, maximum = Infinity) {
  if (typeof value !== 'string') fail(`${label} must be a string`);
  if (value.length < minimum) fail(`${label} must contain at least ${minimum} characters`);
  if (value.length > maximum) fail(`${label} must contain at most ${maximum} characters`);
  return value;
}

function array(value, label, minimum = 0) {
  if (!Array.isArray(value)) fail(`${label} must be an array`);
  if (value.length < minimum) fail(`${label} must contain at least ${minimum} item(s)`);
  return value;
}

function oneOf(value, allowed, label) {
  if (!allowed.has(value)) fail(`${label} must be one of: ${[...allowed].join(', ')}`);
  return value;
}

function exactKeys(value, allowed, label) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(`${label} contains unknown property '${key}'`);
  }
}

function uniqueStrings(values, label) {
  const seen = new Set();
  for (const [index, value] of values.entries()) {
    string(value, `${label}[${index}]`);
    if (seen.has(value)) fail(`${label} contains duplicate value '${value}'`);
    seen.add(value);
  }
}

function trueKeys(value, keys, label) {
  const record = object(value, label);
  for (const key of keys) {
    if (record[key] !== true) fail(`${label}.${key} must be true`);
  }
}

function validDateTime(value, label) {
  string(value, label);
  if (Number.isNaN(Date.parse(value))) fail(`${label} must be an ISO-8601 date-time`);
}

function validUrl(value, label) {
  string(value, label);
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail(`${label} must be a valid URL`);
  }
  if (!['https:', 'http:'].includes(parsed.protocol)) fail(`${label} must use http or https`);
}

function ensureSafeRelativePath(value, label) {
  string(value, label);
  if (/^[A-Za-z]:/.test(value) || value.startsWith('/') || value.startsWith('\\')) {
    fail(`${label} must be relative`);
  }
  const normalized = value.replaceAll('\\', '/');
  if (normalized.split('/').includes('..')) fail(`${label} must not escape its manifest directory`);
  return normalized;
}

function containsForbiddenRegexField(value, path = 'document') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => containsForbiddenRegexField(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (['rawregex', 'regexsource', 'executablepattern'].includes(key.toLowerCase())) {
      fail(`${path}.${key} is forbidden; submit matcher intent, not executable regex`);
    }
    containsForbiddenRegexField(child, `${path}.${key}`);
  }
}

export function validateResearchSource(input) {
  const value = object(input, 'source');
  exactKeys(value, new Set([
    '$schema', 'schemaVersion', 'sourceId', 'sourceType', 'title', 'publisher', 'url',
    'sourceLocation', 'accessedAt', 'publishedAt', 'licenseStatus', 'license', 'summary',
    'supportingClaims', 'shortExcerpt', 'contentHash', 'independence'
  ]), 'source');
  if (value.schemaVersion !== 1) fail('source.schemaVersion must be 1');
  if (!SOURCE_ID.test(value.sourceId)) fail('source.sourceId has an invalid format');
  oneOf(value.sourceType, SOURCE_TYPES, 'source.sourceType');
  string(value.title, 'source.title', 3, 200);
  validDateTime(value.accessedAt, 'source.accessedAt');
  if (value.publishedAt !== undefined) validDateTime(value.publishedAt, 'source.publishedAt');
  oneOf(value.licenseStatus, LICENSE_STATUSES, 'source.licenseStatus');
  string(value.summary, 'source.summary', 40, 1200);
  const claims = array(value.supportingClaims, 'source.supportingClaims', 1);
  claims.forEach((claim, index) => string(claim, `source.supportingClaims[${index}]`, 15, 400));
  if (value.shortExcerpt !== undefined) string(value.shortExcerpt, 'source.shortExcerpt', 1, 200);
  if (value.contentHash !== undefined && !/^sha256:[a-f0-9]{64}$/.test(value.contentHash)) {
    fail('source.contentHash must use sha256:<64 lowercase hex characters>');
  }
  if (value.sourceType === 'original-observation') {
    string(value.sourceLocation, 'source.sourceLocation', 3, 300);
  } else {
    string(value.publisher, 'source.publisher', 2, 120);
    validUrl(value.url, 'source.url');
  }
  trueKeys(value.independence, [
    'publiclyAccessible', 'noPaywallBypass', 'noLeakedMaterial',
    'notDerivedFromPrivateEpsteinMd', 'independentSynthesis'
  ], 'source.independence');
  return value;
}

export function validateRuleProposal(input) {
  const value = object(input, 'proposal');
  containsForbiddenRegexField(value, 'proposal');
  exactKeys(value, new Set([
    '$schema', 'schemaVersion', 'proposalId', 'proposedRuleId', 'title', 'status', 'category',
    'surfaces', 'summary', 'instruction', 'rationale', 'claimType', 'sourceIds', 'examples',
    'exceptions', 'universalBan', 'universalBanJustification', 'detector', 'copyPattern',
    'impact', 'falsePositiveRisk', 'fixturePlan', 'provenanceAttestation', 'notes'
  ]), 'proposal');
  if (value.schemaVersion !== 1) fail('proposal.schemaVersion must be 1');
  if (!PROPOSAL_ID.test(value.proposalId)) fail('proposal.proposalId has an invalid format');
  if (value.proposedRuleId !== undefined && !RULE_ID.test(value.proposedRuleId)) {
    fail('proposal.proposedRuleId has an invalid format');
  }
  string(value.title, 'proposal.title', 8, 120);
  oneOf(value.status, PROPOSAL_STATUSES, 'proposal.status');
  oneOf(value.category, CATEGORIES, 'proposal.category');
  const surfaces = array(value.surfaces, 'proposal.surfaces', 1);
  uniqueStrings(surfaces, 'proposal.surfaces');
  surfaces.forEach((surface) => oneOf(surface, SURFACES, 'proposal.surfaces item'));
  string(value.summary, 'proposal.summary', 30, 500);
  string(value.instruction, 'proposal.instruction', 20, 500);
  string(value.rationale, 'proposal.rationale', 50, 1200);
  oneOf(value.claimType, new Set(['research-backed', 'original-observation', 'hybrid']), 'proposal.claimType');
  const sourceIds = array(value.sourceIds, 'proposal.sourceIds');
  uniqueStrings(sourceIds, 'proposal.sourceIds');
  for (const sourceId of sourceIds) if (!SOURCE_ID.test(sourceId)) fail(`invalid source id '${sourceId}'`);
  if (['research-backed', 'hybrid'].includes(value.claimType) && sourceIds.length === 0) {
    fail('research-backed and hybrid proposals require at least one source');
  }

  const examples = object(value.examples, 'proposal.examples');
  exactKeys(examples, new Set(['violations', 'controls', 'borderline']), 'proposal.examples');
  for (const [key, minimum] of [['violations', 2], ['controls', 2], ['borderline', 1]]) {
    const items = array(examples[key], `proposal.examples.${key}`, minimum);
    items.forEach((item, index) => string(item, `proposal.examples.${key}[${index}]`, 5, 500));
  }

  const exceptions = array(value.exceptions, 'proposal.exceptions');
  exceptions.forEach((entry, index) => {
    const exception = object(entry, `proposal.exceptions[${index}]`);
    exactKeys(exception, new Set(['description', 'examples']), `proposal.exceptions[${index}]`);
    string(exception.description, `proposal.exceptions[${index}].description`, 15, 400);
    const exceptionExamples = array(exception.examples, `proposal.exceptions[${index}].examples`, 1);
    exceptionExamples.forEach((item, itemIndex) => string(item, `proposal.exceptions[${index}].examples[${itemIndex}]`, 3, 300));
  });
  if (typeof value.universalBan !== 'boolean') fail('proposal.universalBan must be a boolean');
  if (value.universalBan) string(value.universalBanJustification, 'proposal.universalBanJustification', 80, 800);

  const detector = object(value.detector, 'proposal.detector');
  exactKeys(detector, new Set(['feasibility', 'signalDescription', 'matcherProposal', 'limitations']), 'proposal.detector');
  oneOf(detector.feasibility, FEASIBILITY, 'proposal.detector.feasibility');
  string(detector.signalDescription, 'proposal.detector.signalDescription', 20, 800);
  const matcher = object(detector.matcherProposal, 'proposal.detector.matcherProposal');
  exactKeys(matcher, new Set(['kind', 'patterns', 'caseSensitive', 'wordBoundary']), 'proposal.detector.matcherProposal');
  oneOf(matcher.kind, MATCHER_KINDS, 'proposal.detector.matcherProposal.kind');
  const patterns = array(matcher.patterns, 'proposal.detector.matcherProposal.patterns');
  patterns.forEach((pattern, index) => string(pattern, `proposal.detector.matcherProposal.patterns[${index}]`, 1, 200));
  if (matcher.caseSensitive !== undefined && typeof matcher.caseSensitive !== 'boolean') fail('proposal.detector.matcherProposal.caseSensitive must be a boolean');
  if (matcher.wordBoundary !== undefined && typeof matcher.wordBoundary !== 'boolean') fail('proposal.detector.matcherProposal.wordBoundary must be a boolean');
  const limitations = array(detector.limitations, 'proposal.detector.limitations', 1);
  limitations.forEach((item, index) => string(item, `proposal.detector.limitations[${index}]`, 10, 400));

  if (value.category === 'copy') {
    const copyPattern = object(value.copyPattern, 'proposal.copyPattern');
    exactKeys(copyPattern, new Set(['patternClass', 'replacementStrategy']), 'proposal.copyPattern');
    oneOf(copyPattern.patternClass, COPY_PATTERN_CLASSES, 'proposal.copyPattern.patternClass');
    string(copyPattern.replacementStrategy, 'proposal.copyPattern.replacementStrategy', 30, 600);
  }

  oneOf(value.impact, IMPACTS, 'proposal.impact');
  const risk = object(value.falsePositiveRisk, 'proposal.falsePositiveRisk');
  exactKeys(risk, new Set(['level', 'scenarios', 'mitigations']), 'proposal.falsePositiveRisk');
  oneOf(risk.level, RISK_LEVELS, 'proposal.falsePositiveRisk.level');
  const scenarios = array(risk.scenarios, 'proposal.falsePositiveRisk.scenarios', 1);
  scenarios.forEach((item, index) => string(item, `proposal.falsePositiveRisk.scenarios[${index}]`, 10, 400));
  const mitigations = array(risk.mitigations, 'proposal.falsePositiveRisk.mitigations', 1);
  mitigations.forEach((item, index) => string(item, `proposal.falsePositiveRisk.mitigations[${index}]`, 10, 400));

  const fixturePlan = array(value.fixturePlan, 'proposal.fixturePlan', 3);
  const caseTypes = new Set();
  const fixtureIds = new Set();
  fixturePlan.forEach((entry, index) => {
    const fixture = object(entry, `proposal.fixturePlan[${index}]`);
    exactKeys(fixture, new Set(['fixtureId', 'caseType', 'description']), `proposal.fixturePlan[${index}]`);
    if (!FIXTURE_ID.test(fixture.fixtureId)) fail(`invalid fixture id '${fixture.fixtureId}'`);
    if (fixtureIds.has(fixture.fixtureId)) fail(`duplicate fixture id '${fixture.fixtureId}'`);
    fixtureIds.add(fixture.fixtureId);
    oneOf(fixture.caseType, CASE_TYPES, `proposal.fixturePlan[${index}].caseType`);
    caseTypes.add(fixture.caseType);
    string(fixture.description, `proposal.fixturePlan[${index}].description`, 15, 400);
  });
  for (const required of ['violation', 'control', 'borderline']) {
    if (!caseTypes.has(required)) fail(`proposal.fixturePlan requires a ${required} case`);
  }

  trueKeys(value.provenanceAttestation, [
    'cleanRoom', 'notCopiedFromPrivateCorpus', 'notReverseEngineeredFromEpsteinMd',
    'sourcesRecorded', 'originalSynthesis'
  ], 'proposal.provenanceAttestation');
  return value;
}

export function validateCandidateFixture(input) {
  const value = object(input, 'fixture');
  exactKeys(value, new Set([
    '$schema', 'schemaVersion', 'fixtureId', 'proposalId', 'caseType', 'profile', 'surface',
    'sourceFiles', 'constraints', 'expected', 'rationale', 'provenance'
  ]), 'fixture');
  if (value.schemaVersion !== 1) fail('fixture.schemaVersion must be 1');
  if (!FIXTURE_ID.test(value.fixtureId)) fail('fixture.fixtureId has an invalid format');
  if (!PROPOSAL_ID.test(value.proposalId)) fail('fixture.proposalId has an invalid format');
  oneOf(value.caseType, CASE_TYPES, 'fixture.caseType');
  oneOf(value.profile, FIXTURE_PROFILES, 'fixture.profile');
  string(value.surface, 'fixture.surface', 3, 80);

  const files = array(value.sourceFiles, 'fixture.sourceFiles', 1);
  const paths = new Set();
  files.forEach((entry, index) => {
    const file = object(entry, `fixture.sourceFiles[${index}]`);
    exactKeys(file, new Set(['path', 'language', 'bytes', 'sha256']), `fixture.sourceFiles[${index}]`);
    const safePath = ensureSafeRelativePath(file.path, `fixture.sourceFiles[${index}].path`);
    if (paths.has(safePath)) fail(`duplicate fixture source path '${safePath}'`);
    paths.add(safePath);
    oneOf(file.language, LANGUAGES, `fixture.sourceFiles[${index}].language`);
    if (!Number.isInteger(file.bytes) || file.bytes < 1 || file.bytes > 200000) {
      fail(`fixture.sourceFiles[${index}].bytes must be between 1 and 200000`);
    }
    if (!SHA256.test(file.sha256)) fail(`fixture.sourceFiles[${index}].sha256 must be lowercase SHA-256`);
  });

  const constraints = object(value.constraints, 'fixture.constraints');
  trueKeys(constraints, ['selfContained', 'deterministic', 'syntheticContent'], 'fixture.constraints');
  if (constraints.externalDependencies !== false) fail('fixture.constraints.externalDependencies must be false');
  if (constraints.networkAccess !== false) fail('fixture.constraints.networkAccess must be false');

  const expected = object(value.expected, 'fixture.expected');
  exactKeys(expected, new Set(['currentDeterministic', 'semanticExpectations', 'mustNotTrigger']), 'fixture.expected');
  array(expected.currentDeterministic, 'fixture.expected.currentDeterministic').forEach((entry, index) => {
    const finding = object(entry, `fixture.expected.currentDeterministic[${index}]`);
    exactKeys(finding, new Set(['ruleId', 'minimum', 'maximum']), `fixture.expected.currentDeterministic[${index}]`);
    if (!RULE_ID.test(finding.ruleId)) fail(`invalid rule id '${finding.ruleId}'`);
    if (!Number.isInteger(finding.minimum) || finding.minimum < 0) fail('finding minimum must be a non-negative integer');
    if (!Number.isInteger(finding.maximum) || finding.maximum < finding.minimum) {
      fail('finding maximum must be an integer greater than or equal to minimum');
    }
  });
  array(expected.semanticExpectations, 'fixture.expected.semanticExpectations').forEach((entry, index) => {
    const expectation = object(entry, `fixture.expected.semanticExpectations[${index}]`);
    exactKeys(expectation, new Set(['description', 'reviewerType']), `fixture.expected.semanticExpectations[${index}]`);
    string(expectation.description, `fixture.expected.semanticExpectations[${index}].description`, 15, 500);
    oneOf(expectation.reviewerType, REVIEWER_TYPES, `fixture.expected.semanticExpectations[${index}].reviewerType`);
  });
  const mustNotTrigger = array(expected.mustNotTrigger, 'fixture.expected.mustNotTrigger');
  uniqueStrings(mustNotTrigger, 'fixture.expected.mustNotTrigger');
  for (const ruleId of mustNotTrigger) if (!RULE_ID.test(ruleId)) fail(`invalid mustNotTrigger rule id '${ruleId}'`);

  string(value.rationale, 'fixture.rationale', 30, 1000);
  trueKeys(value.provenance, ['generatedForProposal', 'cleanRoom', 'noCopiedInterface'], 'fixture.provenance');
  return value;
}

export function validateResearchGraph({ sources, proposals, fixtures }) {
  const sourceById = new Map();
  const proposalById = new Map();
  const fixtureById = new Map();

  for (const source of sources.map(validateResearchSource)) {
    if (sourceById.has(source.sourceId)) fail(`duplicate source id '${source.sourceId}'`);
    sourceById.set(source.sourceId, source);
  }
  for (const proposal of proposals.map(validateRuleProposal)) {
    if (proposalById.has(proposal.proposalId)) fail(`duplicate proposal id '${proposal.proposalId}'`);
    proposalById.set(proposal.proposalId, proposal);
    for (const sourceId of proposal.sourceIds) {
      if (!sourceById.has(sourceId)) fail(`proposal '${proposal.proposalId}' references missing source '${sourceId}'`);
    }
  }
  for (const fixture of fixtures.map(validateCandidateFixture)) {
    if (fixtureById.has(fixture.fixtureId)) fail(`duplicate fixture id '${fixture.fixtureId}'`);
    fixtureById.set(fixture.fixtureId, fixture);
    const proposal = proposalById.get(fixture.proposalId);
    if (!proposal) fail(`fixture '${fixture.fixtureId}' references missing proposal '${fixture.proposalId}'`);
    if (!proposal.fixturePlan.some((entry) => entry.fixtureId === fixture.fixtureId)) {
      fail(`fixture '${fixture.fixtureId}' is not declared in proposal '${fixture.proposalId}'`);
    }
  }

  return {
    sources: sourceById.size,
    proposals: proposalById.size,
    fixtures: fixtureById.size
  };
}

async function findJsonFiles(directory, predicate = () => true) {
  const found = [];
  async function walk(current) {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile() && entry.name.endsWith('.json') && predicate(path)) found.push(path);
    }
  }
  await walk(directory);
  return found;
}

async function readDocuments(paths) {
  const documents = [];
  for (const path of paths) {
    try {
      documents.push({ path, value: JSON.parse(await readFile(path, 'utf8')) });
    } catch (error) {
      throw new Error(`${path}: ${error.message}`);
    }
  }
  return documents;
}

async function verifyFixtureFiles(fixtures, manifestPaths) {
  for (let index = 0; index < fixtures.length; index += 1) {
    const fixture = fixtures[index];
    const manifestPath = manifestPaths[index];
    const base = dirname(manifestPath);
    for (const file of fixture.sourceFiles) {
      const path = resolve(base, file.path);
      const relativePath = relative(base, path);
      if (relativePath.startsWith(`..${sep}`) || relativePath === '..') fail(`${manifestPath}: source path escapes manifest directory`);
      const bytes = await readFile(path);
      const details = await stat(path);
      if (details.size !== file.bytes) fail(`${manifestPath}: byte count mismatch for ${file.path}`);
      const hash = createHash('sha256').update(bytes).digest('hex');
      if (hash !== file.sha256) fail(`${manifestPath}: SHA-256 mismatch for ${file.path}`);
    }
  }
}

export async function validateResearchTree(root, { includeExamples = false, includeCandidates = true } = {}) {
  const sourcePaths = [];
  const proposalPaths = [];
  const fixturePaths = [];

  if (includeExamples) {
    sourcePaths.push(join(root, 'research', 'templates', 'source.original-observation.example.json'));
    proposalPaths.push(join(root, 'research', 'templates', 'proposal.copy.decorative-live-badge.example.json'));
    fixturePaths.push(join(root, 'research', 'templates', 'fixture.decorative-live-badge.example.json'));
  }
  if (includeCandidates) {
    sourcePaths.push(...await findJsonFiles(join(root, 'research', 'candidates', 'sources')));
    proposalPaths.push(...await findJsonFiles(join(root, 'research', 'candidates', 'proposals')));
    fixturePaths.push(...await findJsonFiles(
      join(root, 'fixtures', 'candidates'),
      (path) => path.endsWith(`${sep}manifest.json`) || path.endsWith('/manifest.json')
    ));
  }

  const [sourceDocs, proposalDocs, fixtureDocs] = await Promise.all([
    readDocuments(sourcePaths),
    readDocuments(proposalPaths),
    readDocuments(fixturePaths)
  ]);
  const result = validateResearchGraph({
    sources: sourceDocs.map((entry) => entry.value),
    proposals: proposalDocs.map((entry) => entry.value),
    fixtures: fixtureDocs.map((entry) => entry.value)
  });
  await verifyFixtureFiles(fixtureDocs.map((entry) => entry.value), fixtureDocs.map((entry) => entry.path));
  return result;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const includeExamples = args.delete('--examples');
  if (args.size > 1) fail('usage: node scripts/validate-research.js [--examples] [root]');
  const root = resolve([...args][0] ?? process.cwd());
  const result = await validateResearchTree(root, { includeExamples, includeCandidates: !includeExamples });
  console.log(`Research validation passed: ${result.sources} source(s), ${result.proposals} proposal(s), ${result.fixtures} fixture(s).`);
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    console.error(`Research validation failed: ${error.message}`);
    process.exitCode = 2;
  });
}
