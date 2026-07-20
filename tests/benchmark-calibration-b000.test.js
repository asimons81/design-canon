import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  deterministicShuffle,
  generateRunPlan,
  loadProtocol,
  repositoryPath
} from '../research/benchmark/harness/lib.js';

async function loadCalibration() {
  return JSON.parse(
    await readFile(
      repositoryPath('research', 'benchmark', 'calibration', 'b000-codex-sol-standard-v1.json'),
      'utf8'
    )
  );
}

test('B000 is calibration-only and absent from protocol v1', async () => {
  const [calibration, protocol] = await Promise.all([
    loadCalibration(),
    loadProtocol()
  ]);
  assert.equal(calibration.official, false);
  assert.equal(calibration.claimEligible, false);
  assert.equal(calibration.brief.benchmarkId, 'B000');
  assert.equal(protocol.benchmarks.some((entry) => entry.id === 'B000'), false);
  assert.equal(generateRunPlan(protocol).runs.some((entry) => entry.benchmarkId === 'B000'), false);
});

test('B000 calibration order is deterministic and frozen', async () => {
  const calibration = await loadCalibration();
  const order = deterministicShuffle(
    calibration.conditions,
    calibration.executionOrderSeed
  );
  assert.deepEqual(order, ['A', 'B', 'D', 'C']);
  assert.deepEqual(order, calibration.expectedExecutionOrder);
  assert.deepEqual(
    calibration.runs.map((run) => run.condition),
    calibration.expectedExecutionOrder
  );
  assert.deepEqual(
    calibration.runs.map((run) => run.executionOrder),
    [1, 2, 3, 4]
  );
  assert.equal(new Set(calibration.runs.map((run) => run.runId)).size, 4);
});

test('B000 pins the requested Sol Standard Codex settings', async () => {
  const calibration = await loadCalibration();
  assert.deepEqual(
    {
      framework: calibration.candidateRuntime.agentFramework,
      minimumVersion: calibration.candidateRuntime.minimumCodexCliVersion,
      model: calibration.candidateRuntime.modelAlias,
      display: calibration.candidateRuntime.modelDisplayName,
      effort: calibration.candidateRuntime.reasoningEffort,
      label: calibration.candidateRuntime.reasoningLabel,
      fast: calibration.candidateRuntime.fastMode,
      max: calibration.candidateRuntime.maxMode,
      search: calibration.candidateRuntime.webSearch,
      config: calibration.candidateRuntime.userConfig,
      rules: calibration.candidateRuntime.userExecPolicyRules,
      persistence: calibration.candidateRuntime.sessionPersistence,
      sandbox: calibration.candidateRuntime.sandbox,
      approval: calibration.candidateRuntime.approvalPolicy
    },
    {
      framework: 'Codex CLI',
      minimumVersion: '0.144.4',
      model: 'gpt-5.6',
      display: 'GPT-5.6 Sol',
      effort: 'medium',
      label: 'Standard',
      fast: false,
      max: false,
      search: 'disabled',
      config: 'ignored',
      rules: 'ignored',
      persistence: 'ephemeral',
      sandbox: 'workspace-write',
      approval: 'never'
    }
  );
  assert.equal(calibration.candidateRuntime.exactCodexCliVersion, '0.144.4');
  assert.equal(calibration.candidateRuntime.resolvedModelIdentifier, null);
});

test('B000 budget and isolation policy fail closed', async () => {
  const calibration = await loadCalibration();
  assert.equal(calibration.candidateBudgets.wallClockSecondsPerRun, 1200);
  assert.equal(calibration.candidateBudgets.maximumToolActionsPerRun, 80);
  assert.equal(calibration.candidateBudgets.automaticRetries, 0);
  assert.equal(
    calibration.candidateBudgets.modelControlPlaneNetwork,
    'OpenAI service transport only'
  );
  assert.equal(calibration.candidateBudgets.workspaceCommandNetwork, 'blocked');
  assert.equal(calibration.candidateBudgets.browserCaptureNetwork, 'blocked');
  assert.equal(calibration.candidateBudgets.packageInstallation, 'forbidden');
  assert.deepEqual(
    calibration.candidateBudgets.allowedWorkspaceFiles,
    ['index.html', 'styles.css', 'script.js']
  );
  for (const field of [
    'freshWorkspacePerRun',
    'workspaceOutsideRepository',
    'freshGitRepositoryPerRun'
  ]) {
    assert.equal(calibration.isolation[field], true, field);
  }
  for (const field of [
    'parentProjectInstructionsAllowed',
    'projectAgentsFilesAllowed',
    'mcpServersAllowed',
    'pluginsAllowed',
    'skillsAllowed',
    'crossRunStateAllowed',
    'priorRunOutputsVisible',
    'conditionLabelsVisibleToModel'
  ]) {
    assert.equal(calibration.isolation[field], false, field);
  }
  assert.ok(calibration.failClosedRules.length >= 8);
});

test('B000 brief is local, dependency-free, and interaction-bearing', async () => {
  const calibration = await loadCalibration();
  const brief = await readFile(repositoryPath(calibration.brief.path), 'utf8');
  for (const required of [
    'index.html',
    'styles.css',
    'script.js',
    'Do not install packages',
    'Do not use external fonts',
    'working pricing toggle',
    'working expand/collapse behavior',
    '390 CSS pixels'
  ]) {
    assert.match(brief, new RegExp(required.replaceAll('.', '\\.')));
  }
  assert.doesNotMatch(brief, /Condition [ABCD]|full monolith|compiled Design Canon/i);
});

test('runner contract requires safe noninteractive Codex execution', async () => {
  const contract = await readFile(
    repositoryPath('research', 'benchmark', 'calibration', 'B000-RUNNER-CONTRACT.md'),
    'utf8'
  );
  for (const required of [
    '--model gpt-5.6',
    '--sandbox workspace-write',
    '--ask-for-approval never',
    '--ignore-user-config',
    '--ignore-rules',
    '--ephemeral',
    '--strict-config',
    '--json',
    'model_reasoning_effort="medium"',
    'web_search="disabled"',
    'automatic retries: zero',
    'Codex service transport allowed',
    'workspace-command and browser egress blocked',
    'Do not edit protocol-v1 admission fields'
  ]) {
    assert.match(contract, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(contract, /Do not use `--dangerously-bypass-approvals-and-sandbox`, `--yolo`/);
});
