import test from 'node:test';
import assert from 'node:assert/strict';
import { access, chmod, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCodexExecArgs, deriveCodexCapabilities, REQUIRED_EXEC_OPTIONS, REQUIRED_GLOBAL_OPTIONS } from '../research/benchmark/harness/codex-adapter.js';
import { classifyExecutionFailure, executeJsonlProcess } from '../research/benchmark/harness/execution-state.js';

const fake = fileURLToPath(new URL('./fixtures/fake-codex.js', import.meta.url));
const fragmenter = fileURLToPath(new URL('./fixtures/fragmented-jsonl-child.js', import.meta.url));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
async function temp(t) { const path = await mkdtemp(join(tmpdir(), 'dc-hardening-')); t.after(() => rm(path, { recursive: true, force: true })); return path; }
async function execute(t, executable, args, env = {}, overrides = {}) {
  const root = await temp(t);
  const result = await executeJsonlProcess({
    executable, args, cwd: root, stdin: '', rawStdoutPath: join(root, 'raw.jsonl'), stderrPath: join(root, 'stderr.txt'),
    normalizedPath: join(root, 'normalized.json'), timeoutMs: 5000, killGraceMs: 100, actionBudget: 10000,
    env: { ...process.env, ...env }, ...overrides
  });
  return { root, result, raw: await readFile(join(root, 'raw.jsonl')), stderr: await readFile(join(root, 'stderr.txt')) };
}

test('global approval precedes exec and exec-scoped options; no evidence path reaches child', () => {
  const capabilities = deriveCodexCapabilities(REQUIRED_GLOBAL_OPTIONS.join('\n'), REQUIRED_EXEC_OPTIONS.join('\n'));
  const args = buildCodexExecArgs({ workspace: '/opaque/current' }, capabilities);
  assert.deepEqual(args.slice(0, 3), ['--ask-for-approval', 'never', 'exec']);
  assert.ok(args.indexOf('--cd') > args.indexOf('exec'));
  assert.ok(args.includes('service_tier="default"'));
  assert.ok(args.includes('sandbox_workspace_write.network_access=false'));
  assert.ok(args.includes('sandbox_workspace_write.exclude_tmpdir_env_var=true'));
  assert.ok(args.includes('sandbox_workspace_write.exclude_slash_tmp=true'));
  assert.ok(!args.includes('--output-last-message'));
  assert.equal(args.at(-1), '-');
  assert.throws(() => buildCodexExecArgs({ workspace: '/x', model: 'other' }, capabilities), /requires model/);
});

test('lossless recorder preserves fragmented multibyte bytes, malformed line, and incomplete tail', async (t) => {
  const execution = await execute(t, process.execPath, [fragmenter], { FRAGMENT_COUNT: '2000' });
  const lines = [];
  for (let index = 0; index < 2000; index += 1) lines.push(JSON.stringify({ type: 'item.started', item: { type: 'command_execution', id: `€-${index}` } }));
  lines.push('{malformed');
  const expected = Buffer.concat([Buffer.from(`${lines.join('\n')}\n`), Buffer.from('{"type":"item.completed","item":{"type":"agent_message","text":"tail €"}}')]);
  assert.equal(hash(execution.raw), hash(expected));
  assert.deepEqual(execution.raw, expected);
  assert.equal(execution.result.normalized.actionCount, 2000);
  assert.equal(execution.result.normalized.malformed.length, 1);
  assert.ok(execution.result.normalized.incompleteFinalLine);
  assert.equal(execution.result.normalized.finalAssistantMessage, 'tail €');
});

test('normalization and stderr evidence never reopen replaced raw pathnames', async (t) => {
  const root = await temp(t);
  const rawPath = join(root, 'raw.jsonl');
  const stderrPath = join(root, 'stderr.txt');
  const movedRawPath = join(root, 'original-raw.jsonl');
  const movedStderrPath = join(root, 'original-stderr.txt');
  const realRaw = Buffer.from([
    JSON.stringify({ type: 'thread.started' }),
    JSON.stringify({ type: 'turn.completed' }),
    ''
  ].join('\n'));
  const realStderr = Buffer.from('real stderr evidence\n');
  const replacementRaw = Buffer.from(JSON.stringify({ type: 'attacker.replacement' }) + '\n');
  const replacementStderr = Buffer.from('replacement stderr\n');
  const childScript = 'setTimeout(() => { process.stdout.write(' + JSON.stringify(realRaw.toString()) +
    '); process.stderr.write(' + JSON.stringify(realStderr.toString()) + '); }, 150)';
  const executionPromise = executeJsonlProcess({
    executable: process.execPath, args: ['-e', childScript], cwd: root, stdin: '',
    rawStdoutPath: rawPath, stderrPath, normalizedPath: join(root, 'normalized.json'),
    timeoutMs: 5000, killGraceMs: 100, actionBudget: 100, env: process.env
  });
  for (let attempts = 0; attempts < 100; attempts += 1) {
    try { await Promise.all([access(rawPath), access(stderrPath)]); break; }
    catch { await new Promise((resolveDelay) => setTimeout(resolveDelay, 5)); }
  }
  try {
    await rename(rawPath, movedRawPath);
    await rename(stderrPath, movedStderrPath);
  } catch (error) {
    if (process.platform === 'win32' && ['EACCES', 'EPERM'].includes(error.code)) {
      await executionPromise;
      t.skip('Windows does not permit renaming these open exclusive evidence handles.');
      return;
    }
    throw error;
  }
  await Promise.all([writeFile(rawPath, replacementRaw), writeFile(stderrPath, replacementStderr)]);
  const result = await executionPromise;
  assert.equal(result.exitCode, 0, result.stderrText);
  assert.equal(result.normalized.eventTypes['attacker.replacement'], undefined);
  assert.equal(result.normalized.eventCount, 2);
  assert.equal(result.stderrText, realStderr.toString());
  assert.deepEqual(await readFile(movedRawPath), realRaw);
  assert.deepEqual(await readFile(movedStderrPath), realStderr);
  assert.deepEqual(await readFile(rawPath), replacementRaw);
  assert.deepEqual(await readFile(stderrPath), replacementStderr);
});

test('immediate exit, delayed chunks, partial output, and runtime classifications terminate', async (t) => {
  const immediate = await execute(t, process.execPath, ['-e', '']);
  assert.equal(immediate.result.exitCode, 0);
  const delayed = await execute(t, process.execPath, ['-e', "process.stdout.write('{\\\"type\\\":\\\"thread.started\\\"}\\n');setTimeout(()=>process.stdout.end('{\\\"type\\\":\\\"turn.completed\\\"}\\n'),25)"]);
  assert.equal(delayed.result.normalized.eventCount, 2);
  for (const [scenario, expected] of [['auth-failure','authentication-failure'],['invalid-model','invalid-model'],['invalid-reasoning','unsupported-reasoning-setting'],['invalid-approval','invalid-approval-setting'],['nonzero','nonzero-exit'],['malformed','malformed-jsonl']]) {
    const item = await execute(t, process.execPath, [fake], { FAKE_CODEX_SCENARIO: scenario });
    assert.equal(classifyExecutionFailure(item.result), expected);
  }
  const partial = await execute(t, process.execPath, [fake], { FAKE_CODEX_SCENARIO: 'partial-output' });
  assert.ok(partial.result.normalized.incompleteFinalLine);
});

test('Linux timeout terminates the detached child process group', async (t) => {
  if (process.platform === 'win32') {
    t.skip('Windows process trees use the separately implemented taskkill /T path.');
    return;
  }
  const grandchildScript = 'process.on(\'SIGTERM\', () => {}); setInterval(() => {}, 1000)';
  const childScript =
    'const { spawn } = require(\'node:child_process\');' +
    'process.on(\'SIGTERM\', () => {});' +
    'const child = spawn(process.execPath, [\'-e\', ' + JSON.stringify(grandchildScript) + '], { stdio: \'ignore\' });' +
    'process.stdout.write(JSON.stringify({ type: \'grandchild.started\', pid: child.pid }) + \'\\n\');' +
    'setInterval(() => {}, 1000);';
  const execution = await execute(t, process.execPath, ['-e', childScript], {}, { timeoutMs: 2000, killGraceMs: 50 });
  assert.equal(execution.result.timedOut, true);
  assert.equal(execution.result.terminationSignal, 'SIGTERM+SIGKILL');
  const grandchildPid = JSON.parse(execution.raw.toString('utf8').trim()).pid;
  let alive = true;
  for (let attempts = 0; attempts < 100; attempts += 1) {
    try {
      process.kill(grandchildPid, 0);
      const processState = (await readFile('/proc/' + grandchildPid + '/stat', 'utf8')).split(' ')[2];
      if (processState === 'Z') { alive = false; break; }
    } catch (error) {
      if (['ENOENT', 'ESRCH'].includes(error.code)) { alive = false; break; }
      throw error;
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 10));
  }
  if (alive) { try { process.kill(grandchildPid, 'SIGKILL'); } catch {} }
  assert.equal(alive, false, 'grandchild survived process-group termination');
});

test('spawn ENOENT and EACCES preserve terminal raw and stderr evidence', async (t) => {
  const missing = await execute(t, join(await temp(t), 'does-not-exist'), []);
  assert.equal(missing.result.spawnError.code, 'ENOENT');
  assert.equal(classifyExecutionFailure(missing.result), 'executable-not-found');
  const blocked = join(await temp(t), 'blocked');
  await writeFile(blocked, '#!/bin/sh\nexit 0\n');
  if (process.platform !== 'win32') {
    await chmod(blocked, 0o600);
    const denied = await execute(t, blocked, []);
    assert.equal(denied.result.spawnError.code, 'EACCES');
    assert.equal(classifyExecutionFailure(denied.result), 'permission-denied');
  }
});
