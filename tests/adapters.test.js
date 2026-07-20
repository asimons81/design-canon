import test from 'node:test';
import assert from 'node:assert/strict';
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  applyAdapterPlan,
  planAdapter,
  runAdapterCommand
} from '../src/adapters.js';

async function temporaryProject(t, prefix = 'design-canon-adapter-') {
  const directory = await mkdtemp(join(tmpdir(), prefix));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

test('agents adapter dry-run previews without filesystem changes', async (t) => {
  const project = await temporaryProject(t);
  const plan = await planAdapter({
    action: 'install',
    projectPath: project,
    profileName: 'marketing',
    target: 'agents'
  });
  assert.equal(plan.operations.length, 1);
  assert.equal(plan.operations[0].action, 'create');
  assert.equal(await exists(join(project, 'AGENTS.md')), false);
});

test('agents adapter fresh install is idempotent', async (t) => {
  const project = await temporaryProject(t);
  await runAdapterCommand({
    action: 'install',
    projectPath: project,
    profileName: 'marketing',
    target: 'agents',
    write: true
  });
  const path = join(project, 'AGENTS.md');
  const content = await readFile(path, 'utf8');
  assert.match(content, /design-canon:start profile=marketing target=agents/);
  assert.match(content, /Marketing and Landing Pages/);
  assert.match(content, /design-canon:end/);

  const second = await planAdapter({
    action: 'install',
    projectPath: project,
    profileName: 'marketing',
    target: 'agents'
  });
  assert.equal(second.operations[0].action, 'unchanged');
});

test('managed block update preserves surrounding user content', async (t) => {
  const project = await temporaryProject(t);
  const path = join(project, 'AGENTS.md');
  await writeFile(path, '# User instructions\n\nKeep this line.\n', 'utf8');

  await runAdapterCommand({
    action: 'install',
    projectPath: project,
    profileName: 'marketing',
    target: 'agents',
    write: true
  });
  await runAdapterCommand({
    action: 'install',
    projectPath: project,
    profileName: 'editorial',
    target: 'agents',
    write: true
  });
  const content = await readFile(path, 'utf8');
  assert.match(content, /^# User instructions/m);
  assert.match(content, /Keep this line\./);
  assert.equal((content.match(/design-canon:start/g) ?? []).length, 1);
  assert.match(content, /profile=editorial/);
  assert.doesNotMatch(content, /profile=marketing target=agents/);
});

test('malformed managed markers fail closed', async (t) => {
  const project = await temporaryProject(t);
  await writeFile(
    join(project, 'AGENTS.md'),
    '<!-- design-canon:start profile=marketing target=agents -->\nmissing end\n',
    'utf8'
  );
  await assert.rejects(
    planAdapter({
      action: 'install',
      projectPath: project,
      profileName: 'marketing',
      target: 'agents'
    }),
    /malformed Design Canon managed markers/
  );
});

test('uninstall removes only the managed block and preserves user content', async (t) => {
  const project = await temporaryProject(t);
  const path = join(project, 'AGENTS.md');
  await writeFile(path, '# User instructions\n\nKeep this line.\n', 'utf8');
  await runAdapterCommand({
    action: 'install',
    projectPath: project,
    profileName: 'product-app',
    target: 'codex',
    write: true
  });
  await runAdapterCommand({
    action: 'uninstall',
    projectPath: project,
    target: 'codex',
    write: true
  });
  const content = await readFile(path, 'utf8');
  assert.match(content, /Keep this line\./);
  assert.doesNotMatch(content, /design-canon:start/);
});

test('uninstall deletes an otherwise empty managed AGENTS.md', async (t) => {
  const project = await temporaryProject(t);
  await runAdapterCommand({
    action: 'install',
    projectPath: project,
    profileName: 'product-app',
    target: 'hermes',
    write: true
  });
  await runAdapterCommand({
    action: 'uninstall',
    projectPath: project,
    target: 'hermes',
    write: true
  });
  assert.equal(await exists(join(project, 'AGENTS.md')), false);
});

test('managed install preserves CRLF line endings', async (t) => {
  const project = await temporaryProject(t);
  const path = join(project, 'AGENTS.md');
  await writeFile(path, '# User\r\n\r\nKeep.\r\n', 'utf8');
  await runAdapterCommand({
    action: 'install',
    projectPath: project,
    profileName: 'marketing',
    target: 'agents',
    write: true
  });
  const content = await readFile(path, 'utf8');
  assert.equal(content.includes('\r\n'), true);
  assert.equal(content.replaceAll('\r\n', '').includes('\n'), false);
});

test('adapters work in paths containing spaces', async (t) => {
  const root = await temporaryProject(t);
  const project = join(root, 'project with spaces');
  await mkdir(project);
  await runAdapterCommand({
    action: 'install',
    projectPath: project,
    profileName: 'editorial',
    target: 'agents',
    write: true
  });
  assert.equal(await exists(join(project, 'AGENTS.md')), true);
});

test('Claude adapter creates import and generated policy, then uninstalls safely', async (t) => {
  const project = await temporaryProject(t);
  const claudePath = join(project, 'CLAUDE.md');
  await writeFile(claudePath, '# Existing Claude notes\n', 'utf8');

  await runAdapterCommand({
    action: 'install',
    projectPath: project,
    profileName: 'product-app',
    target: 'claude',
    write: true
  });
  const importContent = await readFile(claudePath, 'utf8');
  const policyPath = join(project, '.design-canon', 'claude.md');
  const policy = await readFile(policyPath, 'utf8');
  assert.match(importContent, /@\.design-canon\/claude\.md/);
  assert.match(importContent, /Existing Claude notes/);
  assert.match(policy, /^<!-- design-canon:generated profile=product-app target=claude -->/);

  await runAdapterCommand({
    action: 'uninstall',
    projectPath: project,
    target: 'claude',
    write: true
  });
  assert.equal(await exists(policyPath), false);
  assert.match(await readFile(claudePath, 'utf8'), /Existing Claude notes/);
  assert.doesNotMatch(await readFile(claudePath, 'utf8'), /design-canon:start/);
});

test('Cursor adapter emits current always-applied MDC frontmatter', async (t) => {
  const project = await temporaryProject(t);
  await runAdapterCommand({
    action: 'install',
    projectPath: project,
    profileName: 'product-app',
    target: 'cursor',
    write: true
  });
  const path = join(project, '.cursor', 'rules', 'design-canon.mdc');
  const content = await readFile(path, 'utf8');
  assert.match(content, /^---\ndescription:/);
  assert.match(content, /\nglobs:\n/);
  assert.match(content, /\nalwaysApply: true\n---/);
  assert.match(content, /design-canon:generated profile=product-app target=cursor/);

  const second = await planAdapter({
    action: 'install',
    projectPath: project,
    profileName: 'product-app',
    target: 'cursor'
  });
  assert.equal(second.operations[0].action, 'unchanged');
});

test('Windsurf adapter emits current always_on frontmatter', async (t) => {
  const project = await temporaryProject(t);
  await runAdapterCommand({
    action: 'install',
    projectPath: project,
    profileName: 'product-app',
    target: 'windsurf',
    write: true
  });
  const path = join(project, '.windsurf', 'rules', 'design-canon.md');
  const content = await readFile(path, 'utf8');
  assert.match(content, /^---\ntrigger: always_on\n---/);
  assert.match(content, /design-canon:generated profile=product-app target=windsurf/);
  assert.ok([...content].length <= 12000);
});

test('standalone adapters refuse to overwrite unowned files', async (t) => {
  const project = await temporaryProject(t);
  const path = join(project, '.cursor', 'rules');
  await mkdir(path, { recursive: true });
  await writeFile(join(path, 'design-canon.mdc'), '# User-owned file\n', 'utf8');
  await assert.rejects(
    planAdapter({
      action: 'install',
      projectPath: project,
      profileName: 'marketing',
      target: 'cursor'
    }),
    /not marked as Design Canon-owned/
  );
});

test('applyAdapterPlan applies an explicit preview plan', async (t) => {
  const project = await temporaryProject(t);
  const plan = await planAdapter({
    action: 'install',
    projectPath: project,
    profileName: 'marketing',
    target: 'agents'
  });
  await applyAdapterPlan(plan);
  assert.equal(await exists(join(project, 'AGENTS.md')), true);
});
