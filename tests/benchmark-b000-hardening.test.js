import test from 'node:test';
import assert from 'node:assert/strict';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { buildCodexExecArgs, deriveCodexCapabilities, REQUIRED_EXEC_OPTIONS, REQUIRED_GLOBAL_OPTIONS } from '../research/benchmark/harness/codex-adapter.js';
import { classifyExecutionFailure, executeJsonlProcess } from '../research/benchmark/harness/execution-state.js';

const fake = resolve('tests/fixtures/fake-codex.js');
const fragmenter = resolve('tests/fixtures/fragmented-jsonl-child.js');
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
