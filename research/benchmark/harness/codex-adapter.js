import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { sha256, writeJson } from './lib.js';

export const REQUIRED_CODEX_OPTIONS = Object.freeze([
  '--cd', '--model', '--sandbox', '--ask-for-approval', '--ignore-user-config',
  '--ignore-rules', '--ephemeral', '--strict-config', '--json', '--output-last-message', '--config'
]);

export function parseCodexVersion(output) {
  const match = String(output).match(/(?:codex-cli\s+)?(\d+)\.(\d+)\.(\d+)/);
  if (!match) throw new Error('Unable to parse Codex CLI version.');
  return { raw: String(output).trim(), version: `${match[1]}.${match[2]}.${match[3]}`, parts: match.slice(1).map(Number) };
}

export function versionAtLeast(actual, minimum) {
  const left = parseCodexVersion(actual).parts;
  const right = parseCodexVersion(minimum).parts;
  for (let i = 0; i < 3; i += 1) {
    if (left[i] !== right[i]) return left[i] > right[i];
  }
  return true;
}

export function deriveCodexCapabilities(helpOutput) {
  const supported = new Set([...String(helpOutput).matchAll(/(?:^|\s)(--[a-z][a-z0-9-]*)/gm)].map((match) => match[1]));
  const missing = REQUIRED_CODEX_OPTIONS.filter((option) => !supported.has(option));
  return { supported: [...supported].sort(), missing, valid: missing.length === 0 };
}

export function buildCodexExecArgs({ workspace, finalMessagePath, model = 'gpt-5.6', effort = 'medium' }, capabilities) {
  if (!capabilities?.valid) throw new Error(`Codex CLI lacks required options: ${(capabilities?.missing ?? REQUIRED_CODEX_OPTIONS).join(', ')}`);
  return [
    'exec', '--cd', workspace, '--model', model, '--sandbox', 'workspace-write',
    '--ask-for-approval', 'never', '--ignore-user-config', '--ignore-rules', '--ephemeral',
    '--strict-config', '--json', '--output-last-message', finalMessagePath,
    '--config', `model_reasoning_effort="${effort}"`, '--config', 'web_search="disabled"', '-'
  ];
}

function runCapture(executable, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const stdout = [];
    const stderr = [];
    child.stdout.on('data', (chunk) => stdout.push(Buffer.from(chunk)));
    child.stderr.on('data', (chunk) => stderr.push(Buffer.from(chunk)));
    child.once('error', reject);
    child.once('exit', (code) => resolve({ code, stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr) }));
  });
}

export async function codexPreflight({ executable = 'codex', evidenceDirectory, minimumVersion = '0.144.0' }) {
  await mkdir(evidenceDirectory, { recursive: true });
  const versionResult = await runCapture(executable, ['--version']);
  const helpResult = await runCapture(executable, ['exec', '--help']);
  const versionText = versionResult.stdout.toString('utf8') || versionResult.stderr.toString('utf8');
  const helpText = helpResult.stdout.toString('utf8') || helpResult.stderr.toString('utf8');
  const parsed = parseCodexVersion(versionText);
  const capabilities = deriveCodexCapabilities(helpText);
  await Promise.all([
    writeFile(join(evidenceDirectory, 'codex-version.txt'), versionText),
    writeFile(join(evidenceDirectory, 'codex-exec-help.txt'), helpText)
  ]);
  const result = {
    schemaVersion: 1,
    executable,
    version: parsed.version,
    minimumVersion,
    versionAccepted: versionAtLeast(versionText, minimumVersion),
    helpSha256: sha256(helpText),
    capabilities,
    passed: versionResult.code === 0 && helpResult.code === 0 &&
      versionAtLeast(versionText, minimumVersion) && capabilities.valid
  };
  await writeJson(join(evidenceDirectory, 'codex-preflight.json'), result);
  return result;
}

export function redactEffectiveCommand(executable, args) {
  return { executable, arguments: [...args], stdin: '<assembled-instructions>', secretsLogged: false };
}
