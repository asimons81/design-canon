import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadCatalog } from '../src/io.js';
import {
  buildGuidanceArtifacts,
  generateRunPlan,
  loadCatalogFreeze,
  loadFrozenGuidanceCatalog,
  loadProtocol,
  loadStrictProfile,
  measureText,
  repositoryPath,
  writeGuidanceBundle
} from '../research/benchmark/harness/lib.js';

const CATALOG_COMMIT = '5caa9e0315a1f10f0e5f70e6218d4fc9049d2530';
const GUIDANCE_FIELDS = ['id', 'category', 'title', 'severity', 'instruction', 'rationale', 'verify'];

function guidanceShape(rule) {
  return Object.fromEntries(
    GUIDANCE_FIELDS
      .filter((field) => rule[field] !== undefined)
      .map((field) => [field, rule[field]])
  );
}

test('protocol v1 freezes four conditions and 180 planned runs', async () => {
  const protocol = await loadProtocol();
  assert.equal(protocol.protocolId, 'monolith-vs-compiled-v1');
  assert.deepEqual(protocol.conditions.map((condition) => condition.id), ['A', 'B', 'C', 'D']);
  assert.equal(protocol.benchmarks.length, 15);
  assert.equal(protocol.repetitionsPerCondition, 3);
  assert.equal(protocol.minimumRunCount, 180);
  assert.equal(protocol.admission.officialRunsAdmitted, false);
});

test('generic baseline matches its frozen hash and exact size', async () => {
  const protocol = await loadProtocol();
  const content = await readFile(repositoryPath(protocol.genericGuidance.path), 'utf8');
  assert.deepEqual(measureText(content), {
    characters: protocol.genericGuidance.characters,
    utf8Bytes: protocol.genericGuidance.utf8Bytes,
    sha256: protocol.genericGuidance.sha256
  });
});

test('guidance snapshot matches the protocol-v1 freeze exactly', async () => {
  const freeze = await loadCatalogFreeze();
  const snapshot = await loadFrozenGuidanceCatalog(freeze);
  assert.equal(snapshot.sourceCatalogVersion, freeze.catalogVersion);
  assert.equal(snapshot.sourceCatalogCommit, CATALOG_COMMIT);
  assert.equal(snapshot.rules.length, 18);
  assert.deepEqual(snapshot.rules.map((rule) => rule.id), freeze.ruleIds);
});

test('live catalog still contains every frozen rule with the accepted wording', async () => {
  const [catalog, snapshot] = await Promise.all([
    loadCatalog(),
    loadFrozenGuidanceCatalog()
  ]);
  const byId = new Map(catalog.rules.map((rule) => [rule.id, rule]));
  for (const frozenRule of snapshot.rules) {
    const liveRule = byId.get(frozenRule.id);
    assert.ok(liveRule, `Live catalog no longer contains '${frozenRule.id}'.`);
    assert.deepEqual(guidanceShape(liveRule), frozenRule);
  }
});

test('frozen strict profiles select explicit stable subsets', async () => {
  const expectedCounts = {
    marketing: 16,
    'product-app': 12,
    editorial: 13
  };
  const freeze = await loadCatalogFreeze();
  const accepted = new Set(freeze.ruleIds);
  for (const [profileName, expectedCount] of Object.entries(expectedCounts)) {
    const profile = await loadStrictProfile(profileName);
    assert.equal(profile.sourceProfile, profileName);
    assert.equal(profile.ruleIds.length, expectedCount);
    assert.equal(new Set(profile.ruleIds).size, profile.ruleIds.length);
    for (const ruleId of profile.ruleIds) {
      assert.equal(accepted.has(ruleId), true, `${profileName} references ${ruleId}`);
    }
  }
});

test('monolith and compiled guidance share wording but differ by frozen selection', async () => {
  const expectedCounts = {
    marketing: 16,
    'product-app': 12,
    editorial: 13
  };
  for (const [profileName, expectedCount] of Object.entries(expectedCounts)) {
    const first = await buildGuidanceArtifacts({
      profileName,
      catalogCommit: CATALOG_COMMIT
    });
    const second = await buildGuidanceArtifacts({
      profileName,
      catalogCommit: CATALOG_COMMIT
    });
    assert.equal(first.contents.C, second.contents.C, 'monolith must be deterministic');
    assert.equal(first.contents.D, second.contents.D, 'compiled output must be deterministic');
    assert.equal(first.records.C.ruleIds.length, 18);
    assert.equal(first.records.D.ruleIds.length, expectedCount);
    assert.equal(first.records.C.catalogCommit, first.records.D.catalogCommit);
    assert.ok(first.records.D.utf8Bytes < first.records.C.utf8Bytes);
    for (const ruleId of first.records.D.ruleIds) {
      const marker = `### ${ruleId}:`;
      const escaped = marker.replaceAll('.', '\\.');
      assert.match(first.contents.C, new RegExp(escaped));
      assert.match(first.contents.D, new RegExp(escaped));
    }
  }
});

test('run plan is deterministic, balanced, and complete', async () => {
  const protocol = await loadProtocol();
  const first = generateRunPlan(protocol);
  const second = generateRunPlan(protocol);
  assert.deepEqual(first, second);
  assert.equal(first.runs.length, 180);

  for (const condition of ['A', 'B', 'C', 'D']) {
    assert.equal(first.runs.filter((run) => run.condition === condition).length, 45);
  }
  const cells = new Map();
  for (const run of first.runs) {
    const entries = cells.get(run.cellId) ?? [];
    entries.push(run);
    cells.set(run.cellId, entries);
  }
  assert.equal(cells.size, 45);
  for (const entries of cells.values()) {
    assert.deepEqual(
      [...new Set(entries.map((run) => run.condition))].sort(),
      ['A', 'B', 'C', 'D']
    );
    assert.deepEqual(entries.map((run) => run.executionOrder).sort(), [1, 2, 3, 4]);
  }
});

test('guidance bundle writes immutable artifacts and manifest', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'design-canon-benchmark-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const result = await writeGuidanceBundle({
    outputDirectory: directory,
    profileName: 'marketing',
    catalogCommit: CATALOG_COMMIT
  });
  const manifest = JSON.parse(
    await readFile(join(directory, 'guidance-manifest.json'), 'utf8')
  );
  assert.equal(manifest.profile, 'marketing');
  assert.equal(manifest.artifacts.C.ruleIds.length, 18);
  assert.equal(manifest.artifacts.D.ruleIds.length, 16);
  assert.equal(manifest.artifacts.B.sha256, result.records.B.sha256);
  assert.equal(manifest.admission.officialReady, false);

  for (const condition of ['B', 'C', 'D']) {
    const content = await readFile(join(directory, manifest.artifacts[condition].path), 'utf8');
    assert.equal(measureText(content).sha256, manifest.artifacts[condition].sha256);
  }
});
