#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { captureRun } from '../research/benchmark/harness/capture.js';
import {
  assertNetworkIsolationEvidence, createOpaqueWorkspace, validateAndCopySource
} from '../research/benchmark/harness/b000.js';
import {
  buildCodexExecArgs, codexPreflight, deriveCodexCapabilities, redactEffectiveCommand
} from '../research/benchmark/harness/codex-adapter.js';
import { executeJsonlProcess, finalizeExecutionManifest } from '../research/benchmark/harness/execution-state.js';
import { parseCliArgs, REPOSITORY_ROOT, writeJson } from '../research/benchmark/harness/lib.js';

async function main() {
  const options = parseCliArgs(process.argv.slice(2), {
    '--run': { required: true }, '--workspace-root': { required: true },
    '--network-evidence': { required: true }, '--codex': { required: false, default: 'codex' },
    '--live': { required: false, default: 'false' }
  });
  if (options['--live'] !== 'true' || process.env.DESIGN_CANON_B000_LIVE !== '1') {
    throw new Error('Live B000 execution requires --live true and DESIGN_CANON_B000_LIVE=1.');
  }
  const runDirectory = resolve(options['--run']);
  const manifestPath = join(runDirectory, 'manifest.json');
  const original = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (original.benchmarkId !== 'B000' || original.official !== false || original.status !== 'planned') {
    throw new Error('Only one untouched nonofficial B000 planned run may be executed.');
  }
  const network = assertNetworkIsolationEvidence(JSON.parse(await readFile(resolve(options['--network-evidence']), 'utf8')));
  const preflight = await codexPreflight({ executable: options['--codex'], evidenceDirectory: join(runDirectory, 'evidence') });
  if (!preflight.passed) throw new Error('Codex runtime preflight failed closed.');
  const { workspace, validation: starterValidation } = await createOpaqueWorkspace({
    workspaceRoot: resolve(options['--workspace-root']), repositoryRoot: REPOSITORY_ROOT
  });
  const finalMessagePath = join(runDirectory, 'transcript', 'final-message.txt');
  const args = buildCodexExecArgs({ workspace, finalMessagePath }, deriveCodexCapabilities(
    await readFile(join(runDirectory, 'evidence', 'codex-exec-help.txt'), 'utf8')
  ));
  await writeJson(join(runDirectory, 'evidence', 'effective-command.json'), redactEffectiveCommand(options['--codex'], args));
  const executing = { ...original, status: 'running', networkIsolation: network, workspaceValidation: starterValidation };
  await writeJson(manifestPath, executing);
  const execution = await executeJsonlProcess({
    executable: options['--codex'], args, cwd: workspace,
    stdin: await readFile(join(runDirectory, original.assembledInstructionsPath)),
    rawStdoutPath: join(runDirectory, 'transcript', 'raw.jsonl'),
    stderrPath: join(runDirectory, 'transcript', 'stderr.txt'),
    normalizedPath: join(runDirectory, 'transcript', 'normalized.json'),
    timeoutMs: original.limits.wallClockSecondsPerRun * 1000,
    killGraceMs: original.limits.processKillGraceSeconds * 1000,
    actionBudget: original.limits.maximumToolActionsPerRun,
    env: Object.fromEntries(['PATH', 'SYSTEMROOT', 'TEMP', 'TMP', 'USERPROFILE', 'HOMEDRIVE', 'HOMEPATH', 'LOCALAPPDATA', 'APPDATA', 'CODEX_HOME'].filter((name) => process.env[name] !== undefined).map((name) => [name, process.env[name]]))
  });
  let manifest = finalizeExecutionManifest(executing, execution);
  try {
    manifest.workspaceValidation = await validateAndCopySource({
      workspace, workspaceRoot: resolve(options['--workspace-root']), runDirectory
    });
    const diff = await new Promise((resolveDiff) => {
      import('node:child_process').then(({ execFile }) => execFile('git', ['diff', '--no-ext-diff', '--binary'], { cwd: workspace }, (_e, stdout, stderr) => resolveDiff(stdout || stderr)));
    });
    await writeFile(join(runDirectory, 'source.diff'), diff, 'utf8');
    const executionStatus = manifest.status;
    const executionInvalidReason = manifest.invalidReason;
    try {
      const capture = await captureRun({ runDirectory });
      manifest = { ...capture.manifest, captureStatus: 'complete' };
    } catch (error) {
      manifest.captureStatus = 'failed';
      manifest.captureError = error.message;
      if (executionStatus === 'running') {
        manifest.status = 'failed';
        manifest.invalidReason = 'capture-failure';
      }
    }
    if (executionStatus !== 'running') {
      manifest.status = executionStatus;
      manifest.invalidReason = executionInvalidReason;
    }
  } catch (error) {
    manifest.status = 'invalid';
    manifest.invalidReason = `source-validation: ${error.message}`;
    manifest.captureStatus = 'not-run-source-invalid';
  }
  if (manifest.status === 'running') manifest.status = 'complete';
  await writeJson(manifestPath, manifest);
  process.stdout.write(`${JSON.stringify({ runId: manifest.runId, status: manifest.status, workspace, captureStatus: manifest.captureStatus }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(`benchmark-execute-b000: ${error.message}`);
  process.exitCode = 1;
});
