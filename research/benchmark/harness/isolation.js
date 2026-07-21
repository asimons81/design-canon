import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmod, chown, lstat, mkdir, readFile, realpath, readdir, stat, symlink, unlink } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { sha256, stableStringify, writeJson } from './lib.js';

export const AGENT_USER = 'dcbench-agent';
export const RUNNER_USER = 'dcbench-runner';
export const COLLECT_GROUP = 'dcbench-collect';
export const REQUIRED_WORKSPACE_WRITE_PROBES = Object.freeze({
  indexFileWrite: 'index.html',
  stylesFileWrite: 'styles.css',
  scriptFileWrite: 'script.js'
});
export const SAFE_AGENT_ENVIRONMENT = Object.freeze({
  HOME: '/home/dcbench-agent',
  CODEX_HOME: '/home/dcbench-agent/.codex',
  TMPDIR: '/home/dcbench-agent/tmp',
  LANG: 'C.UTF-8',
  LC_ALL: 'C.UTF-8',
  PATH: '/usr/local/bin:/usr/bin:/bin',
  PLAYWRIGHT_BROWSERS_PATH: '/opt/dcbench/ms-playwright'
});

function hashBytes(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
export function canonicalIsolationEvidence(evidence) {
  const { evidenceSha256: _discard, ...unsignedEvidence } = evidence;
  return stableStringify(unsignedEvidence);
}

export function isolationEvidenceSha256(evidence) {
  return sha256(canonicalIsolationEvidence(evidence));
}

export function validateIsolationEvidenceHash(evidence) {
  if (evidence?.evidenceSha256 !== isolationEvidenceSha256(evidence)) {
    throw new Error('Isolation evidence hash mismatch.');
  }
  return true;
}

export function buildAgentLaunch(executable, args) {
  const environment = Object.entries(SAFE_AGENT_ENVIRONMENT).flatMap(([name, value]) => [`${name}=${value}`]);
  return { executable: '/usr/bin/sudo', args: ['-n', '-u', AGENT_USER, '/usr/bin/env', '-i', ...environment, executable, ...args], env: SAFE_AGENT_ENVIRONMENT };
}

function runCapture(executable, args, { cwd, timeoutMs = 5000 } = {}) {
  return new Promise((resolveResult) => {
    const startedAt = new Date().toISOString();
    const start = Date.now();
    const child = spawn(executable, args, { cwd, env: SAFE_AGENT_ENVIRONMENT, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const stdout = [];
    const stderr = [];
    let timedOut = false;
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolveResult({ command: [executable, ...args], startedAt, completedAt: new Date().toISOString(), runtimeMs: Date.now() - start,
        stdout: Buffer.concat(stdout).toString('utf8'), stderr: Buffer.concat(stderr).toString('utf8'), ...result });
    };
    child.stdout?.on('data', (chunk) => stdout.push(Buffer.from(chunk)));
    child.stderr?.on('data', (chunk) => stderr.push(Buffer.from(chunk)));
    child.once('error', (error) => finish({ exitCode: null, signal: null, timedOut, spawnError: { code: error.code ?? null, message: error.message } }));
    child.once('close', (exitCode, signal) => finish({ exitCode, signal, timedOut, spawnError: null }));
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, timeoutMs);
  });
}

async function idFor(user) {
  const uid = await runCapture('/usr/bin/id', ['-u', user]);
  const gid = await runCapture('/usr/bin/id', ['-g', user]);
  if (uid.exitCode !== 0 || gid.exitCode !== 0) throw new Error(`Cannot resolve identity for ${user}.`);
  return { uid: Number(uid.stdout.trim()), gid: Number(gid.stdout.trim()) };
}

async function repositoryHeadFor(repositoryPath) {
  const result = await runCapture('/usr/bin/git', ['-C', repositoryPath, 'rev-parse', '--verify', 'HEAD']);
  const head = result.stdout.trim();
  if (result.exitCode !== 0 || !/^[0-9a-f]{40}$/.test(head)) throw new Error('Cannot bind isolation evidence to repository HEAD.');
  return head;
}

async function setTreeAccess(path, uid, gid, directoryMode, fileMode) {
  const info = await lstat(path);
  await chown(path, uid, gid);
  await chmod(path, info.isDirectory() ? directoryMode : fileMode);
  if (info.isDirectory()) for (const name of await readdir(path)) await setTreeAccess(join(path, name), uid, gid, directoryMode, fileMode);
}

export async function grantAgentWorkspaceAccess(workspace) {
  const runner = await idFor(RUNNER_USER);
  const collect = await idFor(COLLECT_GROUP).catch(async () => {
    const result = await runCapture('/usr/bin/getent', ['group', COLLECT_GROUP]);
    if (result.exitCode !== 0) throw new Error('Collection group is missing.');
    return { gid: Number(result.stdout.trim().split(':')[2]) };
  });
  await setTreeAccess(workspace, runner.uid, collect.gid, 0o770, 0o660);
}

export async function revokeAgentWorkspaceAccess(workspace) {
  const runner = await idFor(RUNNER_USER);
  await setTreeAccess(workspace, runner.uid, runner.gid, 0o700, 0o600);
}

function assertProbe(probe, shouldSucceed, name) {
  const success = probe.exitCode === 0 && !probe.spawnError && !probe.timedOut;
  if (success !== shouldSucceed) throw new Error(`Isolation probe '${name}' ${shouldSucceed ? 'failed' : 'unexpectedly succeeded'}.`);
  return { ...probe, expected: shouldSucceed ? 'success' : 'failure', passed: true };
}

export async function generateIsolationEvidence({ runId, workspace, workspaceRoot, siblingWorkspace, repositoryRoot, evidenceDirectory, codexExecutable, codexVersion, effectiveCommandHash }) {
  if (process.platform !== 'linux' || process.getuid?.() === undefined) throw new Error('B000 isolation evidence requires Linux.');
  const workspaceRealPath = await realpath(workspace);
  const repositoryRealPath = await realpath(repositoryRoot);
  const evidenceRealPath = await realpath(evidenceDirectory);
  const workspaceInfo = await stat(workspaceRealPath);
  const repositoryHead = await repositoryHeadFor(repositoryRealPath);
  const agent = await idFor(AGENT_USER);
  const runner = { uid: process.getuid(), gid: process.getgid() };
  const binaryPath = await realpath(codexExecutable);
  const binarySha256 = hashBytes(await readFile(binaryPath));
  const linkPath = join(workspaceRealPath, '.probe-repository-link');
  await symlink(join(repositoryRealPath, 'package.json'), linkPath);
  const parentProbePath = join(resolve(workspaceRoot), `.agent-parent-write-${runId}`);
  const traversalPath = join(workspaceRealPath, '..', '..', relative(resolve(workspaceRoot, '..'), join(repositoryRealPath, 'package.json')));
  const agentRun = (command, args, options = {}) => {
    const launch = buildAgentLaunch(command, args);
    return runCapture(launch.executable, launch.args, { cwd: workspaceRealPath, ...options });
  };
  const sandboxRun = (command, args) => agentRun(codexExecutable, [
    'sandbox', '-P', ':workspace', '-C', workspaceRealPath, '--sandbox-state-disable-network', command, ...args
  ], { timeoutMs: 7000 });
  let probes;
  try {
    const workspaceFileWrites = Object.fromEntries(await Promise.all(
      Object.entries(REQUIRED_WORKSPACE_WRITE_PROBES).map(async ([probeName, fileName]) => [
        probeName,
        assertProbe(await agentRun('/usr/bin/truncate', ['--size', '0', join(workspaceRealPath, fileName)]), true, probeName)
      ])
    ));
    probes = {
      workspaceWrite: assertProbe(await agentRun('/usr/bin/touch', [join(workspaceRealPath, '.probe-write')]), true, 'workspace-write'),
      ...workspaceFileWrites,
      repositoryReadDenied: assertProbe(await agentRun('/usr/bin/test', ['-r', join(repositoryRealPath, 'package.json')]), false, 'repository-read-denied'),
      evidenceReadDenied: assertProbe(await agentRun('/usr/bin/test', ['-r', evidenceRealPath]), false, 'evidence-read-denied'),
      siblingReadDenied: assertProbe(await agentRun('/usr/bin/test', ['-r', siblingWorkspace]), false, 'sibling-read-denied'),
      parentWriteDenied: assertProbe(await agentRun('/usr/bin/touch', [parentProbePath]), false, 'parent-write-denied'),
      symlinkEscapeDenied: assertProbe(await agentRun('/usr/bin/cat', [linkPath]), false, 'symlink-escape-denied'),
      pathTraversalDenied: assertProbe(await agentRun('/usr/bin/cat', [traversalPath]), false, 'path-traversal-denied'),
      otherHomeDenied: assertProbe(await agentRun('/usr/bin/test', ['-r', '/home/dcbench-runner']), false, 'other-home-denied'),
      sudoDenied: assertProbe(await agentRun('/usr/bin/sudo', ['-n', '/usr/bin/true']), false, 'sudo-denied'),
      sandboxLocalWrite: assertProbe(await sandboxRun('/usr/bin/touch', [join(workspaceRealPath, '.probe-sandbox-write')]), true, 'sandbox-local-write'),
      dnsDenied: assertProbe(await sandboxRun('/usr/bin/getent', ['hosts', 'example.com']), false, 'dns-denied'),
      tcpDenied: assertProbe(await sandboxRun('/usr/bin/nc', ['-z', '-w', '2', '1.1.1.1', '443']), false, 'tcp-denied'),
      httpDenied: assertProbe(await sandboxRun('/usr/bin/curl', ['--max-time', '3', '--fail', 'http://example.com/']), false, 'http-denied'),
      httpsDenied: assertProbe(await sandboxRun('/usr/bin/curl', ['--max-time', '3', '--fail', 'https://example.com/']), false, 'https-denied')
    };
  } finally {
    await Promise.all([unlink(linkPath).catch(() => {}), unlink(join(workspaceRealPath, '.probe-write')).catch(() => {}), unlink(join(workspaceRealPath, '.probe-sandbox-write')).catch(() => {}), unlink(parentProbePath).catch(() => {})]);
  }
  const evidence = {
    schemaVersion: 2, runId, generatedAt: new Date().toISOString(), workspaceRealPath,
    workspaceIdentity: { device: String(workspaceInfo.dev), inode: String(workspaceInfo.ino) },
    agent, runner, repositoryRealPath, repositoryHead, evidenceRealPath,
    codex: { path: binaryPath, sha256: binarySha256, version: codexVersion },
    effectiveCommandHash, safeEnvironmentNames: Object.keys(SAFE_AGENT_ENVIRONMENT).sort(),
    sandbox: { permissionProfile: ':workspace', workspaceWrite: true, workspaceCommandNetworkDisabled: true, openAiControlPlaneExemptFromCommandSandbox: true },
    probes
  };
  evidence.evidenceSha256 = isolationEvidenceSha256(evidence);
  const evidencePath = join(evidenceDirectory, 'isolation-evidence.json');
  await writeJson(evidencePath, evidence);
  const persistedEvidence = JSON.parse(await readFile(evidencePath, 'utf8'));
  validateIsolationEvidenceHash(persistedEvidence);
  return persistedEvidence;
}

export async function assertIsolationEvidence(evidence, { runId, workspace, effectiveCommandHash, maximumAgeMs = 300000 }) {
  validateIsolationEvidenceHash(evidence);
  if (evidence.runId !== runId) throw new Error('Isolation evidence belongs to another run.');
  if (evidence.workspaceRealPath !== await realpath(workspace)) throw new Error('Isolation evidence belongs to another workspace.');
  if (evidence.repositoryHead !== await repositoryHeadFor(evidence.repositoryRealPath)) throw new Error('Isolation evidence repository HEAD mismatch.');
  if (evidence.effectiveCommandHash !== effectiveCommandHash) throw new Error('Isolation evidence command mismatch.');
  if (Date.now() - Date.parse(evidence.generatedAt) > maximumAgeMs) throw new Error('Isolation evidence is stale.');
  if (!Object.values(evidence.probes ?? {}).every((probe) => probe.passed === true)) throw new Error('Isolation evidence contains a failed probe.');
  return { ...evidence, valid: true };
}
