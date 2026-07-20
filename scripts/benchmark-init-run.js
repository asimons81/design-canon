#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import {
  findBenchmarkBrief,
  loadProtocol,
  measureText,
  parseCliArgs,
  sha256,
  writeJson
} from '../research/benchmark/harness/lib.js';

async function main() {
  const options = parseCliArgs(process.argv.slice(2), {
    '--plan': { required: true },
    '--run-id': { required: true },
    '--guidance-bundle': { required: true },
    '--output-root': { required: true }
  });
  const plan = JSON.parse(await readFile(resolve(options['--plan']), 'utf8'));
  const run = plan.runs.find((candidate) => candidate.runId === options['--run-id']);
  if (!run) throw new Error(`Run '${options['--run-id']}' is not present in the plan.`);

  const protocol = await loadProtocol();
  if (plan.protocolId !== protocol.protocolId) throw new Error('Run plan protocol mismatch.');

  const bundleDirectory = resolve(options['--guidance-bundle']);
  const guidanceManifest = JSON.parse(
    await readFile(join(bundleDirectory, 'guidance-manifest.json'), 'utf8')
  );
  if (guidanceManifest.profile !== run.profile) {
    throw new Error(
      `Guidance profile '${guidanceManifest.profile}' does not match run profile '${run.profile}'.`
    );
  }
  const artifact = guidanceManifest.artifacts[run.condition];
  if (!artifact) throw new Error(`Guidance bundle lacks condition '${run.condition}'.`);

  const briefSource = await findBenchmarkBrief(run.benchmarkId);
  const brief = await readFile(briefSource, 'utf8');
  const guidance = artifact.path
    ? await readFile(join(bundleDirectory, artifact.path), 'utf8')
    : null;
  const assembled = guidance
    ? `${brief.trimEnd()}\n\n---\n\n${guidance}`
    : `${brief.trimEnd()}\n`;

  const root = resolve(options['--output-root']);
  await mkdir(root, { recursive: true });
  const runDirectory = join(root, run.runId);
  await mkdir(runDirectory, { recursive: false });
  await Promise.all([
    mkdir(join(runDirectory, 'instructions')),
    mkdir(join(runDirectory, 'transcript')),
    mkdir(join(runDirectory, 'source')),
    mkdir(join(runDirectory, 'screenshots')),
    mkdir(join(runDirectory, 'reports'))
  ]);

  const briefPath = join(runDirectory, 'brief.md');
  const assembledPath = join(runDirectory, 'assembled-instructions.md');
  await Promise.all([
    writeFile(briefPath, brief, 'utf8'),
    writeFile(assembledPath, assembled, 'utf8')
  ]);

  let guidancePath = null;
  if (guidance !== null) {
    guidancePath = join('instructions', basename(artifact.path));
    await writeFile(join(runDirectory, guidancePath), guidance, 'utf8');
  }

  const manifest = {
    schemaVersion: 1,
    protocolVersion: protocol.protocolVersion,
    protocolId: protocol.protocolId,
    benchmarkId: run.benchmarkId,
    runId: run.runId,
    condition: run.condition,
    repetition: run.repetition,
    executionOrder: run.executionOrder,
    profile: run.profile,
    status: 'planned',
    startedAt: null,
    completedAt: null,
    model: protocol.execution.model,
    modelVersion: protocol.execution.modelVersion,
    agentFramework: protocol.execution.agentFramework,
    agentVersion: protocol.execution.agentVersion,
    sampling: protocol.execution.sampling,
    catalogCommit: artifact.catalogCommit,
    selectedRuleIds: artifact.ruleIds,
    briefPath: 'brief.md',
    briefHash: sha256(brief),
    guidancePath,
    guidanceHash: artifact.sha256,
    assembledInstructionsPath: 'assembled-instructions.md',
    assembledInstructionHash: sha256(assembled),
    instructionCharacters: measureText(assembled).characters,
    instructionBytes: measureText(assembled).utf8Bytes,
    instructionTokens: null,
    tokenizer: protocol.execution.tokenizer,
    usage: null,
    estimatedCost: null,
    runtimeMs: null,
    actionCount: null,
    environment: {
      operatingSystem: null,
      architecture: null,
      nodeVersion: null,
      browser: null,
      captureTool: null,
      accessibilityTool: null
    },
    limits: {
      timeBudgetSeconds: protocol.execution.timeBudgetSeconds,
      actionBudget: protocol.execution.actionBudget,
      networkPolicy: null,
      tools: null
    },
    viewportResults: [],
    lintReportPath: null,
    accessibilityReportPath: null,
    artifactHashesPath: null,
    invalidReason: null
  };
  await writeJson(join(runDirectory, 'manifest.json'), manifest);

  process.stdout.write(`${JSON.stringify({
    runId: run.runId,
    runDirectory,
    condition: run.condition,
    profile: run.profile,
    instructionBytes: manifest.instructionBytes,
    status: manifest.status
  }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(`benchmark-init-run: ${error.message}`);
  process.exitCode = 1;
});
