import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  cp, lstat, mkdir, readFile, readdir, realpath, stat, writeFile
} from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import {
  buildGuidanceArtifacts, deterministicShuffle, loadCatalogFreeze, measureText,
  repositoryPath, sha256, writeJson
} from './lib.js';
import { verifyTreeInventoryLock } from './tree-lock.js';

export const B000_R1_CALIBRATION_PATH = 'research/benchmark/calibration/b000-codex-sol-standard-v1.json';
export const B000_CALIBRATION_PATH = 'research/benchmark/calibration/b000-codex-sol-standard-v1-r2.json';
export const B000_ALLOWED_FILES = Object.freeze(['index.html', 'script.js', 'styles.css']);
export const FORBIDDEN_INSTRUCTIONS = Object.freeze([
  'AGENTS.md', 'CLAUDE.md', 'DESIGN.md', '.cursor', '.windsurf', '.mcp.json', 'skills', 'plugins'
]);
const R2_ADMISSION_TOKEN = Symbol('B000 r2 initialization admission');

export async function loadB000Calibration(calibrationPath = B000_CALIBRATION_PATH) {
  return JSON.parse(await readFile(repositoryPath(calibrationPath), 'utf8'));
}

export function verifyB000Order(calibration) {
  const order = deterministicShuffle(calibration.conditions, calibration.executionOrderSeed);
  if (JSON.stringify(order) !== JSON.stringify(calibration.expectedExecutionOrder) ||
      order.join(',') !== 'A,B,D,C') {
    throw new Error(`B000 execution order mismatch: ${order.join(',')}`);
  }
  return calibration.runs.map((run) => ({ ...run }));
}

export async function prepareB000Guidance(outputDirectory, {
  calibrationPath = B000_CALIBRATION_PATH
} = {}) {
  const calibration = await loadB000Calibration(calibrationPath);
  const freeze = await loadCatalogFreeze();
  const rebuilt = await buildGuidanceArtifacts({
    profileName: calibration.brief.profile,
    catalogCommit: freeze.catalogCommit
  });
  await mkdir(outputDirectory, { recursive: true });
  const paths = { B: 'generic-guidance.md', C: 'full-monolith.md', D: 'compiled-design-canon.md' };
  await Promise.all(Object.entries(paths).map(([condition, name]) =>
    writeFile(join(outputDirectory, name), rebuilt.contents[condition], 'utf8')));
  const manifest = {
    schemaVersion: 1,
    calibrationId: calibration.calibrationId,
    profile: calibration.brief.profile,
    artifacts: Object.fromEntries(['A', 'B', 'C', 'D'].map((condition) => [condition, {
      ...rebuilt.records[condition],
      path: paths[condition] ?? null
    }]))
  };
  await writeJson(join(outputDirectory, 'guidance-manifest.json'), manifest);
  return { calibration, manifest };
}

export async function assertB000R2InitializationAdmission({
  authorization,
  expectedRepairHead,
  currentHead,
  currentProtocolTree,
  r1LockInventory
}) {
  const calibration = await loadB000Calibration();
  if (authorization !== true) throw new Error('A separate explicit live-r2 initialization authorization is required.');
  if (!/^[0-9a-f]{40}$/.test(expectedRepairHead ?? '') || currentHead !== expectedRepairHead) {
    throw new Error('Current repository HEAD does not match the reviewed repair head.');
  }
  if (currentProtocolTree !== calibration.protocolV1GitTree) {
    throw new Error('Protocol v1 differs from the r2 frozen manifest.');
  }
  const runIds = calibration.runs.map((run) => run.runId);
  if (
    runIds.join(',') !== 'B000-A-r2,B000-B-r2,B000-D-r2,B000-C-r2' ||
    runIds.some((runId) => runId.endsWith('-r1'))
  ) {
    throw new Error('The r2 initializer manifest contains a forbidden attempt identity.');
  }
  const r1Lock = await verifyTreeInventoryLock(r1LockInventory);
  return Object.freeze({
    [R2_ADMISSION_TOKEN]: true,
    expectedRepairHead,
    r1Lock
  });
}

export async function initializeB000({
  outputRoot,
  guidanceDirectory,
  admission,
  calibrationPath = B000_CALIBRATION_PATH
}) {
  if (admission?.[R2_ADMISSION_TOKEN] !== true) {
    throw new Error('r2 initialization admission was not established.');
  }
  const calibration = await loadB000Calibration(calibrationPath);
  const runs = verifyB000Order(calibration);
  const brief = await readFile(repositoryPath(calibration.brief.path), 'utf8');
  const guidanceManifest = JSON.parse(await readFile(join(guidanceDirectory, 'guidance-manifest.json'), 'utf8'));
  if (await lstat(outputRoot).catch(() => null)) {
    throw new Error('r2 output root already exists; immutable attempts cannot be overwritten.');
  }
  await mkdir(outputRoot, { recursive: false });
  const initialized = [];
  for (const run of runs) {
    const runDirectory = join(outputRoot, run.runId);
    await mkdir(runDirectory, { recursive: false });
    await Promise.all(['instructions', 'transcript', 'source', 'screenshots', 'reports', 'evidence']
      .map((name) => mkdir(join(runDirectory, name))));
    const artifact = guidanceManifest.artifacts[run.condition];
    const guidance = artifact.path ? await readFile(join(guidanceDirectory, artifact.path), 'utf8') : null;
    const assembled = guidance ? `${brief.trimEnd()}\n\n---\n\n${guidance}` : `${brief.trimEnd()}\n`;
    await writeFile(join(runDirectory, 'brief.md'), brief, 'utf8');
    await writeFile(join(runDirectory, 'assembled-instructions.md'), assembled, 'utf8');
    let guidancePath = null;
    if (guidance !== null) {
      guidancePath = `instructions/${basename(artifact.path)}`;
      await writeFile(join(runDirectory, guidancePath), guidance, 'utf8');
    }
    const manifest = {
      schemaVersion: 1,
      calibrationId: calibration.calibrationId,
      official: false,
      claimEligible: false,
      benchmarkId: 'B000',
      runId: run.runId,
      attemptId: `${run.runId}-${randomUUID()}`,
      runnerContractAmendment: calibration.runnerContractAmendment,
      condition: run.condition,
      repetition: 1,
      executionOrder: run.executionOrder,
      profile: calibration.brief.profile,
      status: 'planned',
      startedAt: null,
      completedAt: null,
      requestedModel: calibration.candidateRuntime.modelAlias,
      modelDisplayName: calibration.candidateRuntime.modelDisplayName,
      resolvedModelIdentifier: null,
      reasoningEffort: calibration.candidateRuntime.reasoningEffort,
      briefPath: 'brief.md',
      briefHash: sha256(brief),
      guidancePath,
      guidanceHash: artifact.sha256,
      assembledInstructionsPath: 'assembled-instructions.md',
      assembledInstructionHash: sha256(assembled),
      instructionCharacters: measureText(assembled).characters,
      instructionBytes: measureText(assembled).utf8Bytes,
      instructionTokens: null,
      tokenizer: artifact.tokenizer,
      usage: null,
      observedCost: null,
      estimatedCost: null,
      runtimeMs: null,
      actionCount: null,
      execution: null,
      environment: {},
      limits: { ...calibration.candidateBudgets },
      networkIsolation: null,
      workspaceValidation: null,
      captureStatus: 'not-started',
      viewportResults: [],
      lintReportPath: null,
      accessibilityReportPath: null,
      artifactHashesPath: null,
      invalidReason: null
    };
    await Promise.all([
      writeJson(join(runDirectory, 'manifest.initial.json'), manifest),
      writeJson(join(runDirectory, 'manifest.json'), manifest)
    ]);
    initialized.push({ runId: run.runId, runDirectory });
  }
  return initialized;
}

function run(executable, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { cwd, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const stdout = [];
    const stderr = [];
    child.stdout.on('data', (chunk) => stdout.push(Buffer.from(chunk)));
    child.stderr.on('data', (chunk) => stderr.push(Buffer.from(chunk)));
    child.once('error', reject);
    child.once('exit', (code) => code === 0
      ? resolve(Buffer.concat(stdout).toString('utf8'))
      : reject(new Error(Buffer.concat(stderr).toString('utf8') || `${executable} exited ${code}`)));
  });
}

function assertInside(parent, candidate) {
  const rel = relative(resolve(parent), resolve(candidate));
  if (rel === '' || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    throw new Error('Path must be a child of its declared root.');
  }
}

async function rejectInstructionParents(workspace, stopAt) {
  let current = resolve(workspace);
  const boundary = resolve(stopAt);
  while (true) {
    for (const name of FORBIDDEN_INSTRUCTIONS) {
      if (await lstat(join(current, name)).catch(() => null)) {
        throw new Error(`Forbidden instruction or agent configuration '${name}' is visible at '${current}'.`);
      }
    }
    if (current === boundary) break;
    const parent = dirname(current);
    if (parent === current) throw new Error('Workspace root is not beneath the declared isolation root.');
    current = parent;
  }
}

export async function createOpaqueWorkspace({ workspaceRoot, repositoryRoot }) {
  const root = resolve(workspaceRoot);
  const repo = resolve(repositoryRoot);
  const rootReal = await realpath(root);
  const repoReal = await realpath(repo);
  if (rootReal === repoReal || rootReal.startsWith(`${repoReal}${sep}`) || repoReal.startsWith(`${rootReal}${sep}`)) {
    throw new Error('Workspace isolation root must be outside and not contain the repository.');
  }
  await rejectInstructionParents(rootReal, rootReal);
  const workspace = join(rootReal, randomUUID().replaceAll('-', ''));
  assertInside(rootReal, workspace);
  await mkdir(workspace, { recursive: false });
  await Promise.all(B000_ALLOWED_FILES.map((name) => writeFile(join(workspace, name), Buffer.alloc(0))));
  await run('git', ['init', '--quiet'], workspace);
  await run('git', ['config', 'user.name', 'Benchmark Runner'], workspace);
  await run('git', ['config', 'user.email', 'runner.invalid@example.invalid'], workspace);
  await run('git', ['add', '--', ...B000_ALLOWED_FILES], workspace);
  await run('git', ['commit', '--quiet', '-m', 'starter'], workspace);
  const validation = await validateWorkspace(workspace, rootReal, { requireEmpty: true });
  return { workspace, validation };
}

export async function validateWorkspace(workspace, workspaceRoot, { requireEmpty = false } = {}) {
  assertInside(workspaceRoot, workspace);
  await rejectInstructionParents(workspace, workspaceRoot);
  const entries = await readdir(workspace, { withFileTypes: true });
  const names = entries.map((entry) => entry.name).sort();
  const expected = ['.git', ...B000_ALLOWED_FILES].sort();
  if (JSON.stringify(names) !== JSON.stringify(expected)) {
    throw new Error(`Workspace contains unexpected entries: ${names.join(', ')}`);
  }
  for (const entry of entries) {
    const info = await lstat(join(workspace, entry.name));
    if (info.isSymbolicLink()) throw new Error(`Symlink output is forbidden: ${entry.name}`);
    if (entry.name === '.git') {
      if (!info.isDirectory()) throw new Error('.git must be runner-owned directory metadata.');
      continue;
    }
    if (!info.isFile()) throw new Error(`Project entry must be a regular file: ${entry.name}`);
    if (requireEmpty && info.size !== 0) throw new Error(`Starter file is not empty: ${entry.name}`);
  }
  return { valid: true, files: [...B000_ALLOWED_FILES], empty: requireEmpty };
}

export async function validateAndCopySource({ workspace, workspaceRoot, runDirectory }) {
  const validation = await validateWorkspace(workspace, workspaceRoot);
  const sourceDirectory = join(runDirectory, 'source');
  const existing = await readdir(sourceDirectory);
  if (existing.length > 0) throw new Error('Run source directory is immutable and already contains output.');
  for (const name of B000_ALLOWED_FILES) {
    const source = join(workspace, name);
    const info = await stat(source);
    if (!info.isFile()) throw new Error(`Missing required project file: ${name}`);
    await cp(source, join(sourceDirectory, name), { errorOnExist: true, force: false });
  }
  const fileHashes = Object.fromEntries(await Promise.all(B000_ALLOWED_FILES.map(async (name) => {
    const bytes = await readFile(join(sourceDirectory, name));
    return [name, { bytes: bytes.length, sha256: sha256(bytes) }];
  })));
  return { ...validation, fileHashes };
}
