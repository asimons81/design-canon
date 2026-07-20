#!/usr/bin/env node
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { captureRun } from '../research/benchmark/harness/capture.js';
import { createOpaqueWorkspace, validateAndCopySource } from '../research/benchmark/harness/b000.js';
import { buildCodexExecArgs, codexPreflight, deriveCodexCapabilities, effectiveCommandHash, redactEffectiveCommand } from '../research/benchmark/harness/codex-adapter.js';
import { executeJsonlProcess, finalizeExecutionManifest } from '../research/benchmark/harness/execution-state.js';
import { assertIsolationEvidence, buildAgentLaunch, generateIsolationEvidence, grantAgentWorkspaceAccess, revokeAgentWorkspaceAccess, SAFE_AGENT_ENVIRONMENT } from '../research/benchmark/harness/isolation.js';
import { parseCliArgs, REPOSITORY_ROOT, writeJson } from '../research/benchmark/harness/lib.js';

async function terminalFailure(manifestPath, manifest, invalidReason, error, extra = {}) {
  const completed = {
    ...manifest, ...extra, status: 'failed', completedAt: new Date().toISOString(), invalidReason,
    failure: { name: error?.name ?? 'Error', code: error?.code ?? null, message: error?.message ?? String(error) }
  };
  await writeJson(manifestPath, completed);
  return completed;
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2), {
    '--run': { required: true }, '--workspace-root': { required: true },
    '--codex': { required: false, default: '/usr/local/bin/codex' },
    '--live': { required: false, default: 'false' }
  });
  const runDirectory = resolve(options['--run']);
  const manifestPath = join(runDirectory, 'manifest.json');
  let manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (manifest.benchmarkId !== 'B000' || manifest.official !== false || manifest.status !== 'planned') {
    throw new Error('Only one untouched nonofficial B000 planned attempt may be executed.');
  }
  if (options['--live'] !== 'true' || process.env.DESIGN_CANON_B000_LIVE !== '1') {
    await terminalFailure(manifestPath, manifest, 'live-gate-not-authorized', new Error('Live B000 execution requires --live true and DESIGN_CANON_B000_LIVE=1.'));
    throw new Error('Live B000 execution is not authorized.');
  }

  const evidenceDirectory = join(runDirectory, 'evidence');
  const workspaceRoot = resolve(options['--workspace-root']);
  let workspace = null;
  let siblingWorkspace = null;
  let accessGranted = false;
  try {
    const preflight = await codexPreflight({ executable: options['--codex'], evidenceDirectory, env: SAFE_AGENT_ENVIRONMENT });
    if (!preflight.passed) throw Object.assign(new Error('Codex runtime preflight failed closed.'), { failureClass: 'codex-preflight-failure' });
    const globalHelp = await readFile(join(evidenceDirectory, 'codex-help.txt'), 'utf8');
    const execHelp = await readFile(join(evidenceDirectory, 'codex-exec-help.txt'), 'utf8');
    const capabilities = deriveCodexCapabilities(globalHelp, execHelp);
    const created = await createOpaqueWorkspace({ workspaceRoot, repositoryRoot: REPOSITORY_ROOT });
    workspace = created.workspace;
    siblingWorkspace = join(workspaceRoot, `.sibling-${manifest.attemptId}`);
    await mkdir(siblingWorkspace, { recursive: false, mode: 0o700 });
    await grantAgentWorkspaceAccess(workspace);
    accessGranted = true;
    const codexArgs = buildCodexExecArgs({ workspace }, capabilities);
    const commandHash = effectiveCommandHash(options['--codex'], codexArgs);
    const command = redactEffectiveCommand(options['--codex'], codexArgs, Object.keys(SAFE_AGENT_ENVIRONMENT));
    await writeJson(join(evidenceDirectory, 'effective-command.json'), command);
    const generatedEvidence = await generateIsolationEvidence({
      runId: manifest.runId, workspace, workspaceRoot, siblingWorkspace,
      repositoryRoot: REPOSITORY_ROOT, evidenceDirectory, codexExecutable: options['--codex'],
      codexVersion: preflight.version, effectiveCommandHash: commandHash
    });
    const isolation = await assertIsolationEvidence(generatedEvidence, { runId: manifest.runId, workspace, effectiveCommandHash: commandHash });
    manifest = {
      ...manifest, status: 'running', startedAt: new Date().toISOString(), networkIsolation: isolation,
      workspaceValidation: created.validation,
      environment: { ...manifest.environment, safeEnvironmentNames: Object.keys(SAFE_AGENT_ENVIRONMENT).sort(), codexVersion: preflight.version }
    };
    await writeJson(manifestPath, manifest);
    const launch = buildAgentLaunch(options['--codex'], codexArgs);
    const execution = await executeJsonlProcess({
      executable: launch.executable, args: launch.args, cwd: workspace,
      stdin: await readFile(join(runDirectory, manifest.assembledInstructionsPath)),
      rawStdoutPath: join(runDirectory, 'transcript', 'raw.jsonl'),
      stderrPath: join(runDirectory, 'transcript', 'stderr.txt'),
      normalizedPath: join(runDirectory, 'transcript', 'normalized.json'),
      timeoutMs: manifest.limits.wallClockSecondsPerRun * 1000,
      killGraceMs: manifest.limits.processKillGraceSeconds * 1000,
      actionBudget: manifest.limits.maximumToolActionsPerRun,
      env: { PATH: '/usr/local/bin:/usr/bin:/bin', LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' }
    });
    manifest = finalizeExecutionManifest(manifest, execution);
    await writeJson(manifestPath, manifest);
    await revokeAgentWorkspaceAccess(workspace);
    accessGranted = false;
    if (execution.normalized.finalAssistantMessage !== null) {
      await writeFile(join(runDirectory, 'transcript', 'final-message.txt'), execution.normalized.finalAssistantMessage, { encoding: 'utf8', flag: 'wx' });
    }
    try {
      manifest.workspaceValidation = await validateAndCopySource({ workspace, workspaceRoot, runDirectory });
    } catch (error) {
      manifest.status = 'invalid';
      manifest.invalidReason = `source-validation-failure: ${error.message}`;
      manifest.captureStatus = 'not-run-source-invalid';
      await writeJson(manifestPath, manifest);
      return;
    }
    try {
      const priorExecutionStatus = manifest.status;
      manifest.status = manifest.invalidReason ? 'partial' : 'running';
      await writeJson(manifestPath, manifest);
      const capture = await captureRun({ runDirectory });
      const priorFailure = manifest.invalidReason;
      manifest = { ...capture.manifest, captureStatus: 'complete', executionStatusBeforeCapture: priorExecutionStatus };
      if (priorFailure) { manifest.status = 'partial'; manifest.invalidReason = priorFailure; }
    } catch (error) {
      manifest.captureStatus = 'failed';
      manifest.captureError = error.message;
      if (!manifest.invalidReason) { manifest.status = 'failed'; manifest.invalidReason = 'capture-failure'; }
    }
    await writeJson(manifestPath, manifest);
  } catch (error) {
    manifest = await terminalFailure(manifestPath, manifest, error.failureClass ?? 'startup-failure', error,
      workspace ? { opaqueWorkspaceRealPath: await import('node:fs/promises').then(({ realpath }) => realpath(workspace).catch(() => workspace)) } : {});
    throw error;
  } finally {
    if (accessGranted && workspace) await revokeAgentWorkspaceAccess(workspace).catch(() => {});
    if (siblingWorkspace) await rm(siblingWorkspace, { recursive: true, force: true }).catch(() => {});
  }
  process.stdout.write(`${JSON.stringify({ runId: manifest.runId, status: manifest.status, captureStatus: manifest.captureStatus }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(`benchmark-execute-b000: ${error.message}`);
  process.exitCode = 1;
});
