import { open, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { validateArtifactHashes } from './capture.js';

export function terminalManifestDecision(manifest) {
  const reasons = [];
  if (manifest?.status !== 'complete') reasons.push('manifest-status-not-complete');
  if (manifest?.captureStatus !== 'complete') reasons.push('capture-status-not-complete');
  if (manifest?.invalidReason !== null) reasons.push('invalid-reason-present');
  return { admitted: reasons.length === 0, reasons };
}

export async function assertRequiredRunArtifacts(runDirectory, manifest) {
  const required = [
    'manifest.json',
    'manifest.initial.json',
    'brief.md',
    manifest.assembledInstructionsPath,
    'transcript/raw.jsonl',
    'transcript/stderr.txt',
    'transcript/normalized.json',
    'transcript/final-message.txt',
    'source/index.html',
    'source/styles.css',
    'source/script.js',
    'render-metadata.json',
    'evidence/workspace.diff',
    'evidence/workspace-diff.json',
    'evidence/effective-command.json',
    'evidence/isolation-evidence.json',
    manifest.artifactHashesPath,
    manifest.lintReportPath,
    manifest.accessibilityReportPath,
    manifest.browserNetworkReportPath
  ];
  for (const viewport of manifest.viewportResults ?? []) {
    required.push(viewport.viewportScreenshot, viewport.fullPageScreenshot);
  }
  if ((manifest.viewportResults ?? []).length !== 2) {
    throw new Error('Final manifest does not contain both viewport capture records.');
  }
  for (const path of required) {
    if (!path || !(await stat(join(runDirectory, path)).then((info) => info.isFile()).catch(() => false))) {
      throw new Error(`Required run artifact is missing: ${path ?? '[unset]'}`);
    }
  }
  await validateArtifactHashes(runDirectory, manifest.artifactHashesPath);
  if (manifest.networkIsolation?.valid !== true) {
    throw new Error('Final manifest lacks valid attempt-bound isolation evidence.');
  }
  return true;
}

async function appendRecord(handle, record) {
  await handle.write(`${JSON.stringify(record)}\n`);
  await handle.sync();
}

export async function runBatchHarness({
  runs,
  statePath,
  executeAttempt,
  readManifest = async (run) => JSON.parse(await readFile(run.manifestPath, 'utf8')),
  validateArtifacts = null
}) {
  const state = await open(statePath, 'wx', 0o600);
  const attemptedRunIds = [];
  try {
    for (const [index, run] of runs.entries()) {
      attemptedRunIds.push(run.runId);
      await appendRecord(state, {
        type: 'attempt-launched',
        runId: run.runId,
        executionOrder: index + 1,
        launchedAt: new Date().toISOString()
      });
      const exitCode = await executeAttempt(run);
      let manifest = null;
      let manifestReadError = null;
      try {
        manifest = await readManifest(run);
      } catch (error) {
        manifestReadError = error.message;
      }
      const decision = terminalManifestDecision(manifest);
      if (manifest?.runId !== run.runId) decision.reasons.push('manifest-run-id-mismatch');
      if (exitCode !== 0) decision.reasons.push('child-exit-nonzero');
      if (manifestReadError) decision.reasons.push('manifest-unreadable');
      if (decision.reasons.length === 0 && validateArtifacts) {
        try {
          await validateArtifacts(run, manifest);
        } catch (error) {
          decision.reasons.push(`required-artifacts-invalid: ${error.message}`);
        }
      }
      decision.admitted = decision.reasons.length === 0;
      const nextAttemptAdmitted = decision.admitted && index + 1 < runs.length;
      await appendRecord(state, {
        type: 'terminal-decision',
        runId: run.runId,
        processExitCode: exitCode,
        manifestStatus: manifest?.status ?? null,
        captureStatus: manifest?.captureStatus ?? null,
        invalidReason: manifest?.invalidReason ?? null,
        terminalDecision: decision.admitted ? 'complete' : 'stop',
        reasons: decision.reasons,
        nextAttemptAdmitted,
        decidedAt: new Date().toISOString()
      });
      if (!decision.admitted) {
        const error = new Error(`Batch stopped after ${run.runId}: ${decision.reasons.join(', ')}`);
        error.attemptedRunIds = attemptedRunIds;
        throw error;
      }
    }
    return { attemptedRunIds, completed: true };
  } finally {
    await state.close();
  }
}
