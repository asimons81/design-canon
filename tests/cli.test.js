import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../bin/design-canon.js', import.meta.url));
const packageJsonPath = fileURLToPath(new URL('../package.json', import.meta.url));

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
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

test('version is package-driven', async () => {
  const result = await run(['--version']);
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  assert.equal(result.code, 0);
  assert.equal(result.stdout.trim(), packageJson.version);
});

test('profiles command discovers available profiles', async () => {
  const result = await run(['profiles']);
  assert.equal(result.code, 0);
  assert.equal(result.stdout.trim(), 'editorial\nmarketing\nproduct-app');
});

test('unknown option fails closed', async () => {
  const result = await run(['compile', '--profiel', 'marketing']);
  assert.equal(result.code, 2);
  assert.match(result.stderr, /Unknown option '--profiel'/);
});

test('missing option value fails closed', async () => {
  const result = await run(['compile', '--profile']);
  assert.equal(result.code, 2);
  assert.match(result.stderr, /requires a value/);
});

test('invalid format fails before scanning', async () => {
  const result = await run(['lint', '.', '--format', 'xml']);
  assert.equal(result.code, 2);
  assert.match(result.stderr, /Invalid format 'xml'/);
});

test('unsafe profile input is rejected', async () => {
  const result = await run(['compile', '--profile', '../secret']);
  assert.equal(result.code, 2);
  assert.match(result.stderr, /Invalid profile name/);
});

test('lint uses exit code one for error findings', async () => {
  const result = await run([
    'lint',
    './examples/sloppy',
    '--profile',
    'marketing',
    '--format',
    'json'
  ]);
  assert.equal(result.code, 1);
  const payload = JSON.parse(result.stdout);
  assert.ok(payload.errors >= 1);
});

test('justified config suppression removes the failing exit code', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'design-canon-cli-config-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const configPath = join(directory, 'design-canon.config.json');
  await writeFile(
    configPath,
    JSON.stringify({
      version: 1,
      profile: 'marketing',
      suppressions: [
        {
          rule: 'a11y.visible-focus',
          files: ['examples/sloppy/index.html'],
          reason: 'The fixture intentionally demonstrates removal of visible focus.',
          approvedBy: 'test-suite',
          expires: '2099-01-01'
        }
      ]
    }),
    'utf8'
  );

  const result = await run([
    'lint',
    './examples/sloppy',
    '--config',
    configPath,
    '--format',
    'json'
  ]);
  assert.equal(result.code, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.errors, 0);
  assert.equal(payload.suppressedFindings.length, 1);
});
