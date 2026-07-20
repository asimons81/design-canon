import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../bin/design-canon.js', import.meta.url));

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...args], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

test('init defaults to dry-run preview', async (t) => {
  const project = await mkdtemp(join(tmpdir(), 'design-canon-cli-init-'));
  t.after(() => rm(project, { recursive: true, force: true }));
  const result = await run(['init', project, '--profile', 'marketing', '--target', 'agents']);
  assert.equal(result.code, 0);
  assert.match(result.stdout, /Mode: preview/);
  assert.match(result.stdout, /CREATE .*AGENTS\.md/);
  assert.equal(await exists(join(project, 'AGENTS.md')), false);
});

test('init --write creates the selected adapter', async (t) => {
  const project = await mkdtemp(join(tmpdir(), 'design-canon-cli-write-'));
  t.after(() => rm(project, { recursive: true, force: true }));
  const result = await run([
    'init',
    project,
    '--profile',
    'product-app',
    '--target',
    'cursor',
    '--write'
  ]);
  assert.equal(result.code, 0);
  assert.match(result.stdout, /Mode: write/);
  const content = await readFile(
    join(project, '.cursor', 'rules', 'design-canon.mdc'),
    'utf8'
  );
  assert.match(content, /alwaysApply: true/);
});

test('uninstall is dry-run unless --write is supplied', async (t) => {
  const project = await mkdtemp(join(tmpdir(), 'design-canon-cli-uninstall-'));
  t.after(() => rm(project, { recursive: true, force: true }));
  await run(['init', project, '--target', 'hermes', '--write']);
  const preview = await run(['uninstall', project, '--target', 'hermes']);
  assert.equal(preview.code, 0);
  assert.match(preview.stdout, /DELETE .*AGENTS\.md/);
  assert.equal(await exists(join(project, 'AGENTS.md')), true);

  const applied = await run(['uninstall', project, '--target', 'hermes', '--write']);
  assert.equal(applied.code, 0);
  assert.equal(await exists(join(project, 'AGENTS.md')), false);
});

test('invalid adapter target fails closed', async (t) => {
  const project = await mkdtemp(join(tmpdir(), 'design-canon-cli-invalid-'));
  t.after(() => rm(project, { recursive: true, force: true }));
  const result = await run(['init', project, '--target', 'telepathy']);
  assert.equal(result.code, 2);
  assert.match(result.stderr, /Invalid adapter target 'telepathy'/);
});
