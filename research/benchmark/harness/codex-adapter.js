import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, realpath, readFile, writeFile } from 'node:fs/promises';
import { delimiter, dirname, join } from 'node:path';
import { sha256, writeJson } from './lib.js';

export const REQUIRED_CODEX_VERSION = '0.144.4';
export const REQUIRED_GLOBAL_OPTIONS = Object.freeze(['--ask-for-approval']);
export const REQUIRED_EXEC_OPTIONS = Object.freeze([
  '--cd', '--model', '--sandbox', '--ignore-user-config', '--ignore-rules',
  '--ephemeral', '--strict-config', '--json', '--config'
]);
export const REQUIRED_CODEX_OPTIONS = Object.freeze([...REQUIRED_GLOBAL_OPTIONS, ...REQUIRED_EXEC_OPTIONS]);

const DISABLED_FEATURES = Object.freeze([
  'apps', 'browser_use', 'computer_use', 'fast_mode', 'image_generation', 'plugins',
  'skill_mcp_dependency_install'
]);
const REQUIRED_CONFIG = Object.freeze([
  'model_reasoning_effort="medium"',
  'service_tier="default"',
  'web_search="disabled"',
  'skills.include_instructions=false',
  'sandbox_workspace_write.network_access=false',
  'sandbox_workspace_write.exclude_tmpdir_env_var=true',
  'sandbox_workspace_write.exclude_slash_tmp=true'
]);

export function parseCodexVersion(output) {
  const match = String(output).match(/(?:codex-cli\s+)?(\d+)\.(\d+)\.(\d+)/);
  if (!match) throw new Error('Unable to parse Codex CLI version.');
  return { raw: String(output).trim(), version: `${match[1]}.${match[2]}.${match[3]}`, parts: match.slice(1).map(Number) };
}

export function versionAtLeast(actual, minimum) {
  const left = parseCodexVersion(actual).parts;
  const right = parseCodexVersion(minimum).parts;
  for (let i = 0; i < 3; i += 1) if (left[i] !== right[i]) return left[i] > right[i];
  return true;
}

function optionsIn(help) {
  return new Set([...String(help).matchAll(/(?:^|\s)(--[a-z][a-z0-9-]*)/gm)].map((match) => match[1]));
}

export function deriveCodexCapabilities(globalHelp, execHelp = globalHelp) {
  const global = optionsIn(globalHelp);
  const exec = optionsIn(execHelp);
  const missingGlobal = REQUIRED_GLOBAL_OPTIONS.filter((option) => !global.has(option));
  const missingExec = REQUIRED_EXEC_OPTIONS.filter((option) => !exec.has(option));
  return {
    global: [...global].sort(), exec: [...exec].sort(), missingGlobal, missingExec,
    missing: [...missingGlobal, ...missingExec], valid: missingGlobal.length === 0 && missingExec.length === 0
  };
}

export function buildCodexExecArgs({ workspace, model = 'gpt-5.6-sol', effort = 'medium', serviceTier = 'default' }, capabilities) {
  if (!capabilities?.valid) throw new Error(`Codex CLI lacks required options: ${(capabilities?.missing ?? REQUIRED_CODEX_OPTIONS).join(', ')}`);
  if (model !== 'gpt-5.6-sol' || effort !== 'medium' || serviceTier !== 'default') {
    throw new Error('B000 requires model gpt-5.6-sol, medium reasoning, and the Standard/default service tier.');
  }
  const args = ['--ask-for-approval', 'never', 'exec', '--cd', workspace, '--model', model,
    '--sandbox', 'workspace-write', '--ignore-user-config', '--ignore-rules', '--ephemeral',
    '--strict-config', '--json'];
  for (const feature of DISABLED_FEATURES) args.push('--disable', feature);
  for (const config of REQUIRED_CONFIG) args.push('--config', config);
  args.push('-');
  return args;
}

function runCapture(executable, args, options = {}) {
  return new Promise((resolve) => {
    let settled = false;
    const child = spawn(executable, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], ...options });
    const stdout = [];
    const stderr = [];
    child.stdout?.on('data', (chunk) => stdout.push(Buffer.from(chunk)));
    child.stderr?.on('data', (chunk) => stderr.push(Buffer.from(chunk)));
    child.once('error', (error) => {
      if (settled) return;
      settled = true;
      resolve({ code: null, signal: null, error: { code: error.code ?? null, message: error.message }, stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr) });
    });
    child.once('close', (code, signal) => {
      if (settled) return;
      settled = true;
      resolve({ code, signal, error: null, stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr) });
    });
  });
}

async function resolveExecutable(executable, env = process.env) {
  if (executable.includes('/') || executable.includes('\\')) return realpath(executable);
  for (const entry of String(env.PATH ?? '').split(delimiter)) {
    const candidate = join(entry, executable);
    try { return await realpath(candidate); } catch {}
  }
  return null;
}

export async function codexPreflight({ executable = 'codex', evidenceDirectory, expectedVersion = REQUIRED_CODEX_VERSION, env = process.env }) {
  await mkdir(evidenceDirectory, { recursive: true });
  const common = { env };
  const [versionResult, globalHelpResult, execHelpResult] = await Promise.all([
    runCapture(executable, ['--version'], common), runCapture(executable, ['--help'], common),
    runCapture(executable, ['exec', '--help'], common)
  ]);
  const versionText = (versionResult.stdout.length ? versionResult.stdout : versionResult.stderr).toString('utf8');
  const globalHelp = (globalHelpResult.stdout.length ? globalHelpResult.stdout : globalHelpResult.stderr).toString('utf8');
  const execHelp = (execHelpResult.stdout.length ? execHelpResult.stdout : execHelpResult.stderr).toString('utf8');
  let parsed = null;
  try { parsed = parseCodexVersion(versionText); } catch {}
  const capabilities = deriveCodexCapabilities(globalHelp, execHelp);
  const executablePath = await resolveExecutable(executable, env);
  const executableHash = executablePath ? sha256(await readFile(executablePath)) : null;
  await Promise.all([
    writeFile(join(evidenceDirectory, 'codex-version.txt'), versionText),
    writeFile(join(evidenceDirectory, 'codex-help.txt'), globalHelp),
    writeFile(join(evidenceDirectory, 'codex-exec-help.txt'), execHelp)
  ]);
  const result = {
    schemaVersion: 2, executable, executablePath, executableSha256: executableHash,
    version: parsed?.version ?? null, expectedVersion,
    versionAccepted: parsed?.version === expectedVersion,
    globalHelpSha256: sha256(globalHelp), execHelpSha256: sha256(execHelp), capabilities,
    spawnErrors: [versionResult.error, globalHelpResult.error, execHelpResult.error].filter(Boolean),
    passed: versionResult.code === 0 && globalHelpResult.code === 0 && execHelpResult.code === 0 &&
      parsed?.version === expectedVersion && capabilities.valid
  };
  await writeJson(join(evidenceDirectory, 'codex-preflight.json'), result);
  return result;
}

export function effectiveCommandHash(executable, args) {
  return createHash('sha256').update(JSON.stringify([executable, ...args])).digest('hex');
}

export function redactEffectiveCommand(executable, args, safeEnvironmentNames = []) {
  return {
    executable, arguments: [...args], stdin: '<assembled-instructions>', secretsLogged: false,
    safeEnvironmentNames: [...safeEnvironmentNames].sort(), sha256: effectiveCommandHash(executable, args)
  };
}
