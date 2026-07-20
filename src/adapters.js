import { randomUUID } from 'node:crypto';
import {
  mkdir,
  readFile,
  rename,
  rm,
  stat,
  unlink,
  writeFile
} from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { renderCompiled } from './compile.js';
import { loadCatalog, loadProfile } from './io.js';
import { selectRules } from './select.js';

export const ADAPTER_TARGETS = Object.freeze([
  'agents',
  'codex',
  'hermes',
  'claude',
  'cursor',
  'windsurf'
]);

const MANAGED_START_PATTERN = /<!-- design-canon:start\b[^>]*-->/g;
const MANAGED_END_PATTERN = /<!-- design-canon:end -->/g;
const GENERATED_MARKER = '<!-- design-canon:generated';
const WINDSURF_RULE_CHARACTER_LIMIT = 12000;

function assertTarget(target) {
  if (!ADAPTER_TARGETS.includes(target)) {
    throw new Error(
      `Unknown adapter target '${target}'. Use ${ADAPTER_TARGETS.join(', ')}.`
    );
  }
}

async function assertProjectDirectory(path) {
  let info;
  try {
    info = await stat(path);
  } catch (error) {
    error.message = `Unable to inspect project directory '${path}': ${error.message}`;
    throw error;
  }
  if (!info.isDirectory()) {
    throw new Error(`Project path '${path}' is not a directory.`);
  }
}

async function readExisting(path) {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function detectEol(content) {
  return content?.includes('\r\n') ? '\r\n' : '\n';
}

function convertEol(content, eol) {
  return content.replaceAll('\r\n', '\n').replaceAll('\n', eol);
}

function findManagedBlock(content) {
  const starts = [...content.matchAll(MANAGED_START_PATTERN)];
  const ends = [...content.matchAll(MANAGED_END_PATTERN)];
  if (starts.length === 0 && ends.length === 0) return null;
  if (starts.length !== 1 || ends.length !== 1) {
    throw new Error(
      'Conflicting or malformed Design Canon managed markers were found. Refusing to guess.'
    );
  }
  const start = starts[0].index;
  const end = ends[0].index + ends[0][0].length;
  if (ends[0].index < start) {
    throw new Error(
      'The Design Canon managed end marker appears before its start marker.'
    );
  }
  return { start, end };
}

function managedBlock({ profileName, target, content, eol }) {
  const start = `<!-- design-canon:start profile=${profileName} target=${target} -->`;
  const end = '<!-- design-canon:end -->';
  return [start, convertEol(content.trim(), eol), end].join(eol);
}

function upsertManagedBlock(existing, block, eol) {
  if (existing === null) return `${block}${eol}`;
  const location = findManagedBlock(existing);
  if (location) {
    return `${existing.slice(0, location.start)}${block}${existing.slice(location.end)}`;
  }
  const separator = existing.length === 0
    ? ''
    : existing.endsWith(`${eol}${eol}`)
      ? ''
      : existing.endsWith(eol)
        ? eol
        : `${eol}${eol}`;
  return `${existing}${separator}${block}${eol}`;
}

function removeManagedBlock(existing) {
  if (existing === null) return null;
  const location = findManagedBlock(existing);
  if (!location) return existing;
  const before = existing.slice(0, location.start);
  const after = existing.slice(location.end);
  let result = `${before}${after}`;
  result = result.replace(/\r?\n{3,}/g, '\n\n');
  return result.trim().length === 0 ? '' : result;
}

function generatedMarker({ profileName, target }) {
  return `<!-- design-canon:generated profile=${profileName} target=${target} -->`;
}

function isDesignCanonOwned(content) {
  return typeof content === 'string' && content.slice(0, 600).includes(GENERATED_MARKER);
}

function operationForContent({ path, existing, next }) {
  if (next === null) {
    return { action: 'unchanged', path, before: existing, after: existing };
  }
  if (next === '') {
    if (existing === null) {
      return { action: 'unchanged', path, before: null, after: null };
    }
    return { action: 'delete', path, before: existing, after: null };
  }
  if (existing === null) {
    return { action: 'create', path, before: null, after: next };
  }
  if (existing === next) {
    return { action: 'unchanged', path, before: existing, after: existing };
  }
  return { action: 'update', path, before: existing, after: next };
}

async function planManagedFile({
  root,
  relativePath,
  profileName,
  target,
  content,
  uninstall
}) {
  const path = join(root, relativePath);
  const existing = await readExisting(path);
  if (uninstall) {
    const next = removeManagedBlock(existing);
    return operationForContent({ path, existing, next });
  }
  const eol = detectEol(existing);
  const block = managedBlock({ profileName, target, content, eol });
  const next = upsertManagedBlock(existing, block, eol);
  return operationForContent({ path, existing, next });
}

async function planOwnedFile({ root, relativePath, content, uninstall }) {
  const path = join(root, relativePath);
  const existing = await readExisting(path);
  if (uninstall) {
    if (existing === null) {
      return operationForContent({ path, existing, next: null });
    }
    if (!isDesignCanonOwned(existing)) {
      throw new Error(
        `Refusing to delete '${relativePath}' because it is not marked as Design Canon-owned.`
      );
    }
    return operationForContent({ path, existing, next: '' });
  }
  if (existing !== null && !isDesignCanonOwned(existing)) {
    throw new Error(
      `Refusing to replace '${relativePath}' because it is not marked as Design Canon-owned.`
    );
  }
  return operationForContent({ path, existing, next: content });
}

function renderAgentsPolicy(profile, rules) {
  return renderCompiled({ profile, rules, target: 'agents' });
}

function renderClaudePolicy({ profileName, compiled }) {
  return `${generatedMarker({ profileName, target: 'claude' })}\n${compiled}`;
}

function renderCursorPolicy({ profileName, profile, compiled }) {
  return `---\ndescription: Enforce the ${profile.name} Design Canon while planning, implementing, and reviewing frontend work.\nglobs:\nalwaysApply: true\n---\n${generatedMarker({ profileName, target: 'cursor' })}\n${compiled}`;
}

function renderWindsurfPolicy({ profileName, compiled }) {
  const content = `---\ntrigger: always_on\n---\n${generatedMarker({ profileName, target: 'windsurf' })}\n${compiled}`;
  if ([...content].length > WINDSURF_RULE_CHARACTER_LIMIT) {
    throw new Error(
      `Compiled Windsurf rule is ${[...content].length} characters; the supported limit is ${WINDSURF_RULE_CHARACTER_LIMIT}. Use the agents target instead.`
    );
  }
  return content;
}

export async function planAdapter({
  action,
  projectPath = '.',
  profileName = 'product-app',
  target = 'agents'
}) {
  if (!['install', 'uninstall'].includes(action)) {
    throw new Error(`Unknown adapter action '${action}'.`);
  }
  assertTarget(target);
  const root = resolve(projectPath);
  await assertProjectDirectory(root);
  const uninstall = action === 'uninstall';

  let profile = null;
  let compiled = null;
  if (!uninstall) {
    const [catalog, loadedProfile] = await Promise.all([
      loadCatalog(),
      loadProfile(profileName)
    ]);
    profile = loadedProfile;
    compiled = renderAgentsPolicy(profile, selectRules(catalog, profile));
  }

  const operations = [];
  if (['agents', 'codex', 'hermes'].includes(target)) {
    operations.push(await planManagedFile({
      root,
      relativePath: 'AGENTS.md',
      profileName,
      target,
      content: compiled,
      uninstall
    }));
  } else if (target === 'claude') {
    operations.push(await planOwnedFile({
      root,
      relativePath: join('.design-canon', 'claude.md'),
      content: uninstall ? null : renderClaudePolicy({ profileName, compiled }),
      uninstall
    }));
    operations.push(await planManagedFile({
      root,
      relativePath: 'CLAUDE.md',
      profileName,
      target,
      content: '@.design-canon/claude.md',
      uninstall
    }));
  } else if (target === 'cursor') {
    operations.push(await planOwnedFile({
      root,
      relativePath: join('.cursor', 'rules', 'design-canon.mdc'),
      content: uninstall ? null : renderCursorPolicy({ profileName, profile, compiled }),
      uninstall
    }));
  } else if (target === 'windsurf') {
    operations.push(await planOwnedFile({
      root,
      relativePath: join('.windsurf', 'rules', 'design-canon.md'),
      content: uninstall ? null : renderWindsurfPolicy({ profileName, compiled }),
      uninstall
    }));
  }

  return {
    action,
    projectPath: root,
    profileName: uninstall ? null : profileName,
    target,
    operations
  };
}

async function atomicWrite(path, content) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = join(
    dirname(path),
    `.${basename(path)}.design-canon-${randomUUID()}.tmp`
  );
  try {
    await writeFile(temporary, content, { encoding: 'utf8', flag: 'wx' });
    await rename(temporary, path);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

export async function applyAdapterPlan(plan) {
  for (const operation of plan.operations) {
    if (operation.action === 'create' || operation.action === 'update') {
      await atomicWrite(operation.path, operation.after);
    } else if (operation.action === 'delete') {
      await unlink(operation.path);
    }
  }
  return plan;
}

export async function runAdapterCommand(options) {
  const plan = await planAdapter(options);
  if (options.write === true) await applyAdapterPlan(plan);
  return plan;
}

export function formatAdapterPlan(plan, { includeContent = true } = {}) {
  const lines = [
    `Design Canon ${plan.action} ${plan.target}`,
    `Project: ${plan.projectPath}`,
    `Mode: preview${plan.profileName ? ` | Profile: ${plan.profileName}` : ''}`,
    ''
  ];
  for (const operation of plan.operations) {
    lines.push(`${operation.action.toUpperCase()} ${operation.path}`);
    if (
      includeContent &&
      (operation.action === 'create' || operation.action === 'update')
    ) {
      lines.push('', operation.after.trimEnd(), '');
    }
  }
  return `${lines.join('\n').trimEnd()}\n`;
}
