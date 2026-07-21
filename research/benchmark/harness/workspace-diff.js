import { spawn } from 'node:child_process';
import { lstat, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { sha256, writeJsonExclusive } from './lib.js';

export const WORKSPACE_DIFF_COMMAND = Object.freeze([
  'git',
  'diff',
  '--no-ext-diff',
  '--binary',
  'HEAD',
  '--',
  'index.html',
  'styles.css',
  'script.js'
]);

function runBuffered(executable, args, { cwd } = {}) {
  return new Promise((resolveResult) => {
    const child = spawn(executable, args, {
      cwd,
      env: { PATH: '/usr/local/bin:/usr/bin:/bin', LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' },
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const stdout = [];
    const stderr = [];
    child.stdout?.on('data', (chunk) => stdout.push(Buffer.from(chunk)));
    child.stderr?.on('data', (chunk) => stderr.push(Buffer.from(chunk)));
    child.once('error', (error) => resolveResult({
      exitCode: null,
      signal: null,
      stdout: Buffer.concat(stdout),
      stderr: Buffer.concat(stderr),
      spawnError: { code: error.code ?? null, message: error.message }
    }));
    child.once('close', (exitCode, signal) => resolveResult({
      exitCode,
      signal,
      stdout: Buffer.concat(stdout),
      stderr: Buffer.concat(stderr),
      spawnError: null
    }));
  });
}

async function assertAbsent(path) {
  if (await lstat(path).then(() => true).catch(() => false)) {
    throw new Error(`Git diff artifact already exists: ${path}`);
  }
}

export async function generateWorkspaceDiff({
  workspace,
  runDirectory,
  runCommand = runBuffered
}) {
  const root = resolve(runDirectory);
  const workspaceRoot = resolve(workspace);
  const diffPath = join(root, 'evidence', 'workspace.diff');
  const reportPath = join(root, 'evidence', 'workspace-diff.json');
  await mkdir(dirname(diffPath), { recursive: true });
  await assertAbsent(diffPath);
  await assertAbsent(reportPath);

  const [starter, status, diff] = await Promise.all([
    runCommand('/usr/bin/git', ['rev-parse', '--verify', 'HEAD'], { cwd: workspaceRoot }),
    runCommand('/usr/bin/git', ['status', '--short', '--untracked-files=all'], { cwd: workspaceRoot }),
    runCommand('/usr/bin/git', WORKSPACE_DIFF_COMMAND.slice(1), { cwd: workspaceRoot })
  ]);
  await writeFile(diffPath, diff.stdout, { flag: 'wx' });
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    workspace: '[opaque-workspace]',
    command: WORKSPACE_DIFF_COMMAND,
    exitCode: diff.exitCode,
    signal: diff.signal,
    spawnError: diff.spawnError,
    stderr: diff.stderr.toString('utf8'),
    rawDiffPath: relative(root, diffPath).replaceAll('\\', '/'),
    rawDiffSha256: sha256(diff.stdout),
    rawDiffBytes: diff.stdout.length,
    sourceGitStatus: status.stdout.toString('utf8'),
    statusExitCode: status.exitCode,
    statusStderr: status.stderr.toString('utf8'),
    starterCommit: starter.stdout.toString('utf8').trim() || null,
    starterCommitExitCode: starter.exitCode,
    starterCommitStderr: starter.stderr.toString('utf8')
  };
  await writeJsonExclusive(reportPath, report);
  if (
    starter.exitCode !== 0 ||
    status.exitCode !== 0 ||
    diff.exitCode !== 0 ||
    starter.spawnError ||
    status.spawnError ||
    diff.spawnError
  ) {
    const error = new Error('Workspace Git diff generation failed.');
    error.failureClass = 'workspace-diff-failure';
    error.workspaceDiff = report;
    throw error;
  }
  const persisted = await readFile(diffPath);
  if (sha256(persisted) !== report.rawDiffSha256) {
    throw new Error('Persisted workspace Git diff hash mismatch.');
  }
  return report;
}
