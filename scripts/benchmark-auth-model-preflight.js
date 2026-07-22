#!/usr/bin/env node
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createOpaqueWorkspace, validateWorkspace } from '../research/benchmark/harness/b000.js';
import {
  buildCodexExecArgs, codexPreflight, deriveCodexCapabilities, effectiveCommandHash, redactEffectiveCommand
} from '../research/benchmark/harness/codex-adapter.js';
import { classifyExecutionFailure, executeJsonlProcess } from '../research/benchmark/harness/execution-state.js';
import {
  assertIsolationEvidence, buildAgentLaunch, generateIsolationEvidence, grantAgentWorkspaceAccess,
  revokeAgentWorkspaceAccess, SAFE_AGENT_ENVIRONMENT
} from '../research/benchmark/harness/isolation.js';
import { parseCliArgs, REPOSITORY_ROOT, writeJson } from '../research/benchmark/harness/lib.js';

const PREFLIGHT_ID = 'auth-model-preflight-sol-canonical-r1';
const PROMPT = 'Reply with exactly PREFLIGHT_OK. Do not use tools or modify files.\n';

async function main() {
  const options = parseCliArgs(process.argv.slice(2), {
    '--output': { required: true }, '--workspace-root': { required: true },
    '--codex': { required: false, default: '/usr/local/bin/codex' }
  });
  const output = resolve(options['--output']);
  const evidenceDirectory = join(output, 'evidence');
  const transcriptDirectory = join(output, 'transcript');
  const workspaceRoot = resolve(options['--workspace-root']);
  await mkdir(output, { recursive: false, mode: 0o700 });
  await Promise.all([mkdir(evidenceDirectory), mkdir(transcriptDirectory)]);
  await writeFile(join(output, 'prompt.txt'), PROMPT, { encoding: 'utf8', flag: 'wx' });

  const preflight = await codexPreflight({ executable: options['--codex'], evidenceDirectory, env: SAFE_AGENT_ENVIRONMENT });
  if (!preflight.passed) throw new Error('Codex capability preflight failed.');
  const capabilities = deriveCodexCapabilities(
    await readFile(join(evidenceDirectory, 'codex-help.txt'), 'utf8'),
    await readFile(join(evidenceDirectory, 'codex-exec-help.txt'), 'utf8')
  );
  const created = await createOpaqueWorkspace({ workspaceRoot, repositoryRoot: REPOSITORY_ROOT });
  const sibling = join(workspaceRoot, `.auth-model-preflight-sibling-${process.pid}`);
  await mkdir(sibling, { mode: 0o700 });
  let accessGranted = false;
  try {
    await grantAgentWorkspaceAccess(created.workspace);
    accessGranted = true;
    const args = buildCodexExecArgs({ workspace: created.workspace }, capabilities);
    const commandHash = effectiveCommandHash(options['--codex'], args);
    await writeJson(join(evidenceDirectory, 'effective-command.json'),
      redactEffectiveCommand(options['--codex'], args, Object.keys(SAFE_AGENT_ENVIRONMENT)));
    const isolation = await generateIsolationEvidence({
      runId: PREFLIGHT_ID, workspace: created.workspace, workspaceRoot, siblingWorkspace: sibling,
      repositoryRoot: REPOSITORY_ROOT, evidenceDirectory, codexExecutable: options['--codex'],
      codexVersion: preflight.version, effectiveCommandHash: commandHash
    });
    await assertIsolationEvidence(isolation, { runId: PREFLIGHT_ID, workspace: created.workspace, effectiveCommandHash: commandHash });
    const launch = buildAgentLaunch(options['--codex'], args);
    const execution = await executeJsonlProcess({
      executable: launch.executable, args: launch.args, cwd: created.workspace, stdin: PROMPT,
      rawStdoutPath: join(transcriptDirectory, 'raw.jsonl'), stderrPath: join(transcriptDirectory, 'stderr.txt'),
      normalizedPath: join(transcriptDirectory, 'normalized.json'), timeoutMs: 120000,
      killGraceMs: 30000, actionBudget: 0,
      env: { PATH: '/usr/local/bin:/usr/bin:/bin', LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' }
    });
    await revokeAgentWorkspaceAccess(created.workspace);
    accessGranted = false;
    const workspaceValidation = await validateWorkspace(created.workspace, workspaceRoot, { requireEmpty: true });
    const failureClass = classifyExecutionFailure(execution);
    const finalMessage = execution.normalized.finalAssistantMessage;
    if (finalMessage !== null) await writeFile(join(transcriptDirectory, 'final-message.txt'), finalMessage, { encoding: 'utf8', flag: 'wx' });
    const passed = Boolean(!failureClass && execution.normalized.actionCount === 0 && finalMessage?.trim() === 'PREFLIGHT_OK' && workspaceValidation.valid);
    const report = {
      schemaVersion: 1, classification: 'authentication/model preflight', preflightId: PREFLIGHT_ID,
      measuredBenchmarkRun: false, benchmarkId: null, generatedAt: new Date().toISOString(), passed,
      priorRequestedIdentifier: 'gpt-5.6', requestedModel: 'gpt-5.6-sol',
      reason: 'canonical-model-ID verification', modelDisplayName: 'GPT-5.6 Sol',
      official: false, claimEligible: false, measuredB000Usage: false,
      benchmarkBriefIncluded: false, benchmarkGuidanceIncluded: false,
      resolvedModelIdentifier: execution.normalized.resolvedModelIdentifier,
      reasoningEffort: 'medium', reasoningLabel: 'Standard', serviceTier: 'default',
      fastMode: false, maxMode: false, webSearch: 'disabled', sandbox: 'workspace-write', approvalPolicy: 'never',
      usage: execution.normalized.usage, actionCount: execution.normalized.actionCount,
      execution: {
        startedAt: execution.startedAt, completedAt: execution.endedAt, runtimeMs: execution.runtimeMs,
        exitCode: execution.exitCode, exitSignal: execution.exitSignal, timedOut: execution.timedOut,
        terminationSignal: execution.terminationSignal, failureClass
      },
      controlPlaneTransportAvailable: !failureClass,
      isolationEvidenceSha256: isolation.evidenceSha256, effectiveCommandSha256: commandHash,
      workspaceValidation, transcript: { raw: 'transcript/raw.jsonl', stderr: 'transcript/stderr.txt', normalized: 'transcript/normalized.json' }
    };
    await writeJson(join(output, 'auth-model-preflight.json'), report);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (!passed) process.exitCode = 2;
  } finally {
    if (accessGranted) await revokeAgentWorkspaceAccess(created.workspace).catch(() => {});
    await rm(sibling, { recursive: true, force: true });
  }
}

main().catch((error) => { console.error(`benchmark-auth-model-preflight: ${error.message}`); process.exitCode = 1; });
