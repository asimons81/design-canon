import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertNetworkIsolationEvidence, createOpaqueWorkspace, initializeB000, loadB000Calibration,
  prepareB000Guidance, validateAndCopySource, validateWorkspace, verifyB000Order
} from '../research/benchmark/harness/b000.js';
import {
  buildCodexExecArgs, codexPreflight, deriveCodexCapabilities, REQUIRED_EXEC_OPTIONS, REQUIRED_GLOBAL_OPTIONS
} from '../research/benchmark/harness/codex-adapter.js';
import { buildB000CalibrationReport } from '../research/benchmark/harness/calibration-report.js';
import {
  EMPTY_USAGE, executeJsonlProcess, finalizeExecutionManifest, normalizeJsonl
} from '../research/benchmark/harness/execution-state.js';
import { REPOSITORY_ROOT } from '../research/benchmark/harness/lib.js';

const fake = fileURLToPath(new URL('./fixtures/fake-codex.js', import.meta.url));
const globalHelp = REQUIRED_GLOBAL_OPTIONS.join('\n');
const execHelp = REQUIRED_EXEC_OPTIONS.join('\n');

async function temp(t, prefix = 'dc-b000-') {
  const path = await mkdtemp(join(tmpdir(), prefix));
  t.after(() => rm(path, { recursive: true, force: true }));
  return path;
}

test('acceptance 1-4: boundary, order, nonofficial initialization, and pinned command', async (t) => {
  const root = await temp(t);
  const guidance = join(root, 'guidance');
  await prepareB000Guidance(guidance);
  const runs = await initializeB000({ outputRoot: join(root, 'runs'), guidanceDirectory: guidance });
  const calibration = await loadB000Calibration();
  assert.deepEqual(verifyB000Order(calibration).map((run) => run.condition), ['A', 'B', 'D', 'C']);
  assert.equal(runs.length, 4);
  for (const run of runs) {
    const manifest = JSON.parse(await readFile(join(run.runDirectory, 'manifest.json'), 'utf8'));
    assert.equal(manifest.official, false);
    assert.equal(manifest.claimEligible, false);
    assert.equal(manifest.benchmarkId, 'B000');
  }
  const args = buildCodexExecArgs({ workspace: 'opaque' }, deriveCodexCapabilities(globalHelp, execHelp));
  for (const required of ['gpt-5.6', 'workspace-write', 'never', '--ignore-user-config', '--ignore-rules', '--ephemeral', '--json', 'model_reasoning_effort="medium"', 'web_search="disabled"']) assert.ok(args.includes(required));
});

test('acceptance 5: unsupported flags and old versions fail closed', async (t) => {
  assert.throws(() => buildCodexExecArgs({ workspace: 'x' }, deriveCodexCapabilities('', '--json')), /lacks required options/);
  const root = await temp(t);
  const preflight = await codexPreflight({ executable: process.execPath, evidenceDirectory: root, expectedVersion: '999.0.0' });
  assert.equal(preflight.passed, false);
});

test('acceptance 6-8: overwrite, parent instructions, path traversal, and symlinks are rejected', async (t) => {
  const root = await temp(t);
  const guidance = join(root, 'guidance');
  await prepareB000Guidance(guidance);
  await initializeB000({ outputRoot: join(root, 'runs'), guidanceDirectory: guidance });
  await assert.rejects(initializeB000({ outputRoot: join(root, 'runs'), guidanceDirectory: guidance }), /exist/i);
  const instructed = await temp(t, 'dc-parent-');
  await writeFile(join(instructed, 'AGENTS.md'), 'forbidden');
  await assert.rejects(createOpaqueWorkspace({ workspaceRoot: instructed, repositoryRoot: REPOSITORY_ROOT }), /Forbidden instruction/);
  await assert.rejects(createOpaqueWorkspace({ workspaceRoot: REPOSITORY_ROOT, repositoryRoot: REPOSITORY_ROOT }), /outside/);
  const isolated = await temp(t, 'dc-opaque-');
  const created = await createOpaqueWorkspace({ workspaceRoot: isolated, repositoryRoot: REPOSITORY_ROOT });
  try {
    await symlink(join(created.workspace, 'index.html'), join(created.workspace, 'extra-link'));
    await assert.rejects(validateWorkspace(created.workspace, isolated), /unexpected|Symlink/);
  } catch (error) {
    if (!['EPERM', 'EACCES'].includes(error.code)) throw error;
  }
});

test('acceptance 9-10: unknown usage stays null and raw JSONL bytes are untouched', async () => {
  const bytes = Buffer.from('{"type":"thread.started"}\r\n', 'utf8');
  const before = Buffer.from(bytes);
  const normalized = normalizeJsonl(bytes);
  assert.deepEqual(normalized.usage, EMPTY_USAGE);
  assert.deepEqual(bytes, before);
});

async function executeScenario(t, scenario, { timeoutMs = 5000, actionBudget = 80 } = {}) {
  const root = await temp(t, 'dc-exec-');
  const stdout = join(root, 'raw.jsonl');
  const stderr = join(root, 'stderr.txt');
  const normalized = join(root, 'normalized.json');
  const result = await executeJsonlProcess({
    executable: process.execPath, args: [fake], cwd: root, stdin: '', rawStdoutPath: stdout,
    stderrPath: stderr, normalizedPath: normalized, timeoutMs, killGraceMs: 100,
    actionBudget, env: { ...process.env, FAKE_CODEX_SCENARIO: scenario }
  });
  return { root, stdout, stderr, normalized, result };
}

test('acceptance 11-12 and 15: fake CLI preserves timeout, failure, malformed, and has no retries', async (t) => {
  const success = await executeScenario(t, 'success');
  assert.equal(success.result.exitCode, 0);
  assert.equal(success.result.normalized.usage.inputTokens, 10);
  const failed = await executeScenario(t, 'nonzero');
  assert.equal(failed.result.exitCode, 7);
  const malformed = await executeScenario(t, 'malformed');
  assert.equal(malformed.result.normalized.malformed.length, 1);
  const timeout = await executeScenario(t, 'timeout', { timeoutMs: 2000 });
  assert.equal(timeout.result.timedOut, true);
  assert.ok((await readFile(timeout.stdout)).length > 0);
  assert.equal(timeout.result.attemptCount, undefined);
});

test('action-budget overrun terminates once and classifies partial', async (t) => {
  const execution = (await executeScenario(t, 'action-budget', { actionBudget: 2 })).result;
  assert.equal(execution.actionBudgetExceeded, true);
  const manifest = finalizeExecutionManifest({ status: 'running' }, execution);
  assert.equal(manifest.status, 'partial');
  assert.equal(manifest.invalidReason, 'tool-action-budget-exceeded');
});

test('acceptance 13: added and missing files invalidate source before capture', async (t) => {
  for (const scenario of ['forbidden-file', 'missing-files']) {
    const root = await temp(t, `dc-${scenario}-`);
    await mkdir(join(root, 'run', 'source'), { recursive: true });
    const created = await createOpaqueWorkspace({ workspaceRoot: root, repositoryRoot: REPOSITORY_ROOT });
    if (scenario === 'forbidden-file') await writeFile(join(created.workspace, 'extra.txt'), 'x');
    else await rm(join(created.workspace, 'script.js'));
    await assert.rejects(validateAndCopySource({ workspace: created.workspace, workspaceRoot: root, runDirectory: join(root, 'run') }), /unexpected/);
  }
});

test('acceptance 14: independent network controls are mandatory', () => {
  assert.throws(() => assertNetworkIsolationEvidence({ codexServiceTransportAvailable: true }), /workspaceCommand/);
  const evidence = assertNetworkIsolationEvidence({
    codexServiceTransportAvailable: true, workspaceCommandEgressBlocked: true,
    browserPageEgressBlocked: true, workspaceEnforcement: 'OS sandbox probe', browserEnforcement: 'Playwright routing probe'
  });
  assert.equal(evidence.valid, true);
});

test('acceptance 16: capture status cannot erase an execution failure', () => {
  const execution = { exitCode: 7, timedOut: false, actionBudgetExceeded: false, terminationSignal: null,
    sourceMayBePartial: true, startedAt: '2026-01-01T00:00:00Z', endedAt: '2026-01-01T00:00:01Z', runtimeMs: 1000,
    normalized: { ...normalizeJsonl(''), malformed: [], actionCount: 0 } };
  const manifest = finalizeExecutionManifest({ status: 'running' }, execution);
  assert.equal(manifest.status, 'partial');
  assert.equal(manifest.execution.completionClass, 'partial');
});

test('acceptance 17: aggregate report includes every attempt and separates measured usage from estimates', async (t) => {
  const root = await temp(t);
  for (const [index, condition] of ['A', 'B', 'D', 'C'].entries()) {
    const dir = join(root, `B000-${condition}-r1`);
    await mkdir(dir);
    await writeFile(join(dir, 'manifest.json'), JSON.stringify({
      benchmarkId: 'B000', runId: `B000-${condition}-r1`, condition, executionOrder: index + 1,
      status: 'complete', runtimeMs: 1000, actionCount: 4,
      usage: { inputTokens: 10, cachedInputTokens: 1, outputTokens: 2, reasoningTokens: null },
      captureStatus: 'complete', networkIsolation: { valid: true }, environment: {}
    }));
  }
  const report = await buildB000CalibrationReport({ runsRoot: root, repositoryCommit: 'a'.repeat(40), codexVersion: '0.144.0', preflight: { passed: true } });
  assert.equal(report.attempts.length, 4);
  assert.equal(report.totalProviderUsage.inputTokens, 40);
  assert.equal(report.totalProviderUsage.reasoningTokens, null);
  assert.equal(report.separatelyLabeledEstimate, null);
  assert.equal(report.recommendation, 'GO');
  assert.equal(report.subjectiveWinnerSelected, false);
});
