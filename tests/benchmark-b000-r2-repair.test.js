import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import {
  chmod, mkdir, mkdtemp, readFile, rm, writeFile
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { runBatchHarness } from '../research/benchmark/harness/batch.js';
import { resolveBrowserExecutable } from '../research/benchmark/harness/browser.js';
import { captureRun } from '../research/benchmark/harness/capture.js';
import {
  isolationEvidenceSha256,
  validateIsolationEvidenceHash
} from '../research/benchmark/harness/isolation.js';
import { sha256, writeJson } from '../research/benchmark/harness/lib.js';
import { generateWorkspaceDiff } from '../research/benchmark/harness/workspace-diff.js';

const exec = promisify(execFile);
const RUNS = ['B000-A-r2', 'B000-B-r2', 'B000-D-r2', 'B000-C-r2']
  .map((runId) => ({ runId }));

async function temp(t, prefix = 'dc-b000-r2-') {
  const path = await mkdtemp(join(tmpdir(), prefix));
  t.after(() => rm(path, { recursive: true, force: true }));
  return path;
}

function completeManifest() {
  return { status: 'complete', captureStatus: 'complete', invalidReason: null };
}

async function batchScenario(t, results) {
  const root = await temp(t, 'dc-batch-');
  const attempted = [];
  let outcome = null;
  try {
    outcome = await runBatchHarness({
      runs: RUNS,
      statePath: join(root, 'batch-state.jsonl'),
      executeAttempt: async (run) => {
        attempted.push(run.runId);
        return results[run.runId]?.exitCode ?? 0;
      },
      readManifest: async (run) => ({
        runId: run.runId,
        ...(results[run.runId]?.manifest ?? completeManifest())
      })
    });
  } catch (error) {
    outcome = error;
  }
  const records = (await readFile(join(root, 'batch-state.jsonl'), 'utf8'))
    .trim()
    .split('\n')
    .map(JSON.parse);
  return { attempted, outcome, records };
}

for (const [name, result] of [
  ['capture failure in A', { exitCode: 1, manifest: { status: 'failed', captureStatus: 'failed', invalidReason: 'capture-failure' } }],
  ['source-validation failure in A', { exitCode: 1, manifest: { status: 'failed', captureStatus: 'not-run-source-invalid', invalidReason: 'source-validation-failure' } }],
  ['artifact-hash failure in A', { exitCode: 1, manifest: { status: 'failed', captureStatus: 'failed', invalidReason: 'artifact-hash-failure' } }],
  ['nonzero execution in A', { exitCode: 7, manifest: { status: 'failed', captureStatus: 'not-run-execution-failed', invalidReason: 'nonzero-exit' } }],
  ['failed manifest with child exit zero', { exitCode: 0, manifest: { status: 'failed', captureStatus: 'failed', invalidReason: 'capture-failure' } }],
  ['nonzero child with complete manifest', { exitCode: 9, manifest: completeManifest() }]
]) {
  test(`${name} prevents B, D, and C from launching`, async (t) => {
    const resultSet = { 'B000-A-r2': result };
    const scenario = await batchScenario(t, resultSet);
    assert.deepEqual(scenario.attempted, ['B000-A-r2']);
    assert.match(scenario.outcome.message, /Batch stopped after B000-A-r2/);
    const terminal = scenario.records.at(-1);
    assert.equal(terminal.terminalDecision, 'stop');
    assert.equal(terminal.nextAttemptAdmitted, false);
  });
}

test('successful A admits B and no later attempt after B fails', async (t) => {
  const scenario = await batchScenario(t, {
    'B000-A-r2': { exitCode: 0, manifest: completeManifest() },
    'B000-B-r2': { exitCode: 1, manifest: { status: 'failed', captureStatus: 'failed', invalidReason: 'test-stop' } }
  });
  assert.deepEqual(scenario.attempted, ['B000-A-r2', 'B000-B-r2']);
});

test('successful A and B admit D and no later attempt after D fails', async (t) => {
  const scenario = await batchScenario(t, {
    'B000-A-r2': { exitCode: 0, manifest: completeManifest() },
    'B000-B-r2': { exitCode: 0, manifest: completeManifest() },
    'B000-D-r2': { exitCode: 1, manifest: { status: 'failed', captureStatus: 'failed', invalidReason: 'test-stop' } }
  });
  assert.deepEqual(scenario.attempted, ['B000-A-r2', 'B000-B-r2', 'B000-D-r2']);
});

test('only four complete attempts can reach C completion', async (t) => {
  const scenario = await batchScenario(t, {});
  assert.deepEqual(scenario.attempted, RUNS.map((run) => run.runId));
  assert.equal(scenario.outcome.completed, true);
  const decisions = scenario.records.filter((record) => record.type === 'terminal-decision');
  assert.equal(decisions.length, 4);
  assert.ok(decisions.every((record) => record.terminalDecision === 'complete'));
  assert.equal(decisions.at(-1).nextAttemptAdmitted, false);
});

function signedEvidence(overrides = {}) {
  const evidence = {
    schemaVersion: 2,
    runId: 'B000-A-r2',
    repositoryHead: 'a'.repeat(40),
    effectiveCommandHash: 'b'.repeat(64),
    nested: { z: 1, a: { y: 2, b: 3 } },
    probes: { beta: { passed: true }, alpha: { passed: true } },
    array: ['A', 'B', 'D', 'C'],
    ...overrides
  };
  evidence.evidenceSha256 = isolationEvidenceSha256(evidence);
  return evidence;
}

test('isolation hash ignores object insertion order including nested objects', () => {
  const first = signedEvidence();
  const second = {
    array: ['A', 'B', 'D', 'C'],
    probes: { alpha: { passed: true }, beta: { passed: true } },
    nested: { a: { b: 3, y: 2 }, z: 1 },
    effectiveCommandHash: 'b'.repeat(64),
    repositoryHead: 'a'.repeat(40),
    runId: 'B000-A-r2',
    schemaVersion: 2
  };
  second.evidenceSha256 = isolationEvidenceSha256(second);
  assert.equal(first.evidenceSha256, second.evidenceSha256);
});

test('isolation hash preserves array order', () => {
  assert.notEqual(
    signedEvidence().evidenceSha256,
    signedEvidence({ array: ['A', 'D', 'B', 'C'] }).evidenceSha256
  );
});

test('persisted isolation evidence recomputes and mutations fail closed', async (t) => {
  const root = await temp(t, 'dc-isolation-hash-');
  const path = join(root, 'evidence.json');
  const evidence = signedEvidence();
  await writeJson(path, evidence);
  const persisted = JSON.parse(await readFile(path, 'utf8'));
  assert.equal(validateIsolationEvidenceHash(persisted), true);
  for (const mutate of [
    (value) => { value.runId = 'B000-B-r2'; },
    (value) => { value.probes.alpha.passed = false; },
    (value) => { value.repositoryHead = 'c'.repeat(40); },
    (value) => { value.effectiveCommandHash = 'd'.repeat(64); }
  ]) {
    const changed = structuredClone(persisted);
    mutate(changed);
    assert.throws(() => validateIsolationEvidenceHash(changed), /hash mismatch/);
  }
});

async function gitWorkspace(t) {
  const root = await temp(t, 'dc-diff-workspace-');
  await Promise.all([
    writeFile(join(root, 'index.html'), ''),
    writeFile(join(root, 'styles.css'), ''),
    writeFile(join(root, 'script.js'), '')
  ]);
  await exec('git', ['init', '--quiet'], { cwd: root });
  await exec('git', ['config', 'user.name', 'Runner Test'], { cwd: root });
  await exec('git', ['config', 'user.email', 'runner@example.invalid'], { cwd: root });
  await exec('git', ['add', '--', 'index.html', 'styles.css', 'script.js'], { cwd: root });
  await exec('git', ['commit', '--quiet', '-m', 'starter'], { cwd: root });
  return root;
}

test('Git diff evidence preserves ordinary modifications', async (t) => {
  const workspace = await gitWorkspace(t);
  const runDirectory = await temp(t, 'dc-diff-run-');
  await writeFile(join(workspace, 'index.html'), '<main>changed</main>\n');
  const report = await generateWorkspaceDiff({ workspace, runDirectory });
  const raw = await readFile(join(runDirectory, 'evidence', 'workspace.diff'));
  assert.match(raw.toString('utf8'), /changed/);
  assert.equal(report.rawDiffSha256, sha256(raw));
  assert.match(report.starterCommit, /^[0-9a-f]{40}$/);
});

test('Git diff evidence preserves an empty diff', async (t) => {
  const workspace = await gitWorkspace(t);
  const runDirectory = await temp(t, 'dc-diff-empty-');
  const report = await generateWorkspaceDiff({ workspace, runDirectory });
  assert.equal(report.rawDiffBytes, 0);
  assert.equal(report.rawDiffSha256, sha256(Buffer.alloc(0)));
});

test('Git diff evidence is binary-safe', async (t) => {
  const workspace = await gitWorkspace(t);
  const runDirectory = await temp(t, 'dc-diff-binary-');
  await writeFile(join(workspace, 'script.js'), Buffer.from([0, 1, 2, 3, 255, 0, 10]));
  const report = await generateWorkspaceDiff({ workspace, runDirectory });
  const raw = await readFile(join(runDirectory, 'evidence', 'workspace.diff'));
  assert.equal(report.rawDiffSha256, sha256(raw));
  assert.ok(raw.length > 0);
});

test('missing Git metadata preserves failure evidence and fails', async (t) => {
  const workspace = await temp(t, 'dc-no-git-');
  const runDirectory = await temp(t, 'dc-no-git-run-');
  await assert.rejects(generateWorkspaceDiff({ workspace, runDirectory }), /generation failed/);
  const report = JSON.parse(await readFile(join(runDirectory, 'evidence', 'workspace-diff.json'), 'utf8'));
  assert.notEqual(report.starterCommitExitCode, 0);
});

test('Git command failure is terminal and preserved', async (t) => {
  const workspace = await temp(t, 'dc-diff-command-');
  const runDirectory = await temp(t, 'dc-diff-command-run-');
  const runCommand = async (_executable, args) => ({
    exitCode: args[0] === 'diff' ? 12 : 0,
    signal: null,
    stdout: Buffer.from(args[0] === 'rev-parse' ? `${'a'.repeat(40)}\n` : ''),
    stderr: Buffer.from(args[0] === 'diff' ? 'forced failure' : ''),
    spawnError: null
  });
  await assert.rejects(
    generateWorkspaceDiff({ workspace, runDirectory, runCommand }),
    /generation failed/
  );
  const report = JSON.parse(await readFile(join(runDirectory, 'evidence', 'workspace-diff.json'), 'utf8'));
  assert.equal(report.exitCode, 12);
});

test('existing Git diff artifact is never overwritten', async (t) => {
  const workspace = await gitWorkspace(t);
  const runDirectory = await temp(t, 'dc-diff-existing-');
  await mkdir(join(runDirectory, 'evidence'));
  await writeFile(join(runDirectory, 'evidence', 'workspace.diff'), 'immutable');
  await assert.rejects(generateWorkspaceDiff({ workspace, runDirectory }), /already exists/);
});

test('capture failure after diff leaves diff and structured failure evidence intact', async (t) => {
  const workspace = await gitWorkspace(t);
  const runDirectory = await temp(t, 'dc-diff-capture-');
  for (const name of ['source', 'reports', 'screenshots']) await mkdir(join(runDirectory, name));
  await Promise.all([
    writeFile(join(workspace, 'index.html'), '<main>changed</main>\n'),
    writeFile(join(runDirectory, 'source', 'index.html'), '<main>changed</main>\n'),
    writeFile(join(runDirectory, 'source', 'styles.css'), ''),
    writeFile(join(runDirectory, 'source', 'script.js'), '')
  ]);
  const diff = await generateWorkspaceDiff({ workspace, runDirectory });
  await writeJson(join(runDirectory, 'manifest.json'), {
    runId: 'capture-forensic-test',
    profile: 'marketing',
    status: 'planned',
    environment: {},
    limits: {}
  });
  await assert.rejects(
    captureRun({
      runDirectory,
      browserExecutablePath: join(runDirectory, 'missing-chromium'),
      diffSha256: diff.rawDiffSha256
    })
  );
  assert.equal(sha256(await readFile(join(runDirectory, 'evidence', 'workspace.diff'))), diff.rawDiffSha256);
  const failure = JSON.parse(await readFile(join(runDirectory, 'reports', 'capture-failure.json'), 'utf8'));
  assert.equal(failure.status, 'failed');
  assert.equal(failure.diffSha256, diff.rawDiffSha256);
  await assert.rejects(readFile(join(runDirectory, 'artifact-hashes.json')));
});

test('browser executable validation rejects missing, outside-root, directory, and non-executable paths', async (t) => {
  const root = await temp(t, 'dc-browser-root-');
  const outside = await temp(t, 'dc-browser-outside-');
  const executable = join(root, 'chromium');
  await writeFile(executable, 'fixture');
  await chmod(executable, 0o600);
  await assert.rejects(
    resolveBrowserExecutable(join(root, 'missing'), { pinnedRoot: root })
  );
  await assert.rejects(
    resolveBrowserExecutable(join(outside, 'chromium'), { pinnedRoot: root })
  );
  await assert.rejects(resolveBrowserExecutable(root, { pinnedRoot: root }), /regular file/);
  await assert.rejects(resolveBrowserExecutable(executable, { pinnedRoot: root }));
});
