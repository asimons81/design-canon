#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { compileCommand } from '../src/compile.js';
import { listProfiles } from '../src/io.js';
import { lintCommand } from '../src/lint.js';

const packageJson = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url), 'utf8')
);

const HELP = `Design Canon v${packageJson.version}

Usage:
  design-canon compile --profile <name> [--target design|skill|agents] [--output <path>]
  design-canon lint [path] [--profile <name>] [--format text|json]
  design-canon profiles
  design-canon --version

Examples:
  design-canon compile --profile marketing --target design --output DESIGN.md
  design-canon compile --profile product-app --target skill --output SKILL.md
  design-canon lint ./src --profile product-app
`;

function parseOptions(args, allowed, defaults = {}) {
  const values = { ...defaults };
  const seen = new Set();
  const positionals = [];

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith('--')) {
      positionals.push(token);
      continue;
    }
    if (!allowed.has(token)) {
      throw new Error(`Unknown option '${token}'.`);
    }
    if (seen.has(token)) {
      throw new Error(`Option '${token}' may only be specified once.`);
    }
    const next = args[index + 1];
    if (!next || next.startsWith('--')) {
      throw new Error(`Option '${token}' requires a value.`);
    }
    values[token] = next;
    seen.add(token);
    index += 1;
  }

  return { values, positionals };
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    console.log(HELP);
    return;
  }
  if (command === '--version' || command === '-v') {
    console.log(packageJson.version);
    return;
  }

  if (command === 'profiles') {
    if (args.length !== 1) {
      throw new Error("Command 'profiles' does not accept arguments.");
    }
    console.log((await listProfiles()).join('\n'));
    return;
  }

  if (command === 'compile') {
    const { values, positionals } = parseOptions(
      args.slice(1),
      new Set(['--profile', '--target', '--output']),
      {
        '--profile': 'product-app',
        '--target': 'design',
        '--output': null
      }
    );
    if (positionals.length) {
      throw new Error(`Unexpected argument '${positionals[0]}'.`);
    }
    if (!['design', 'skill', 'agents'].includes(values['--target'])) {
      throw new Error(
        `Invalid target '${values['--target']}'. Use design, skill, or agents.`
      );
    }
    await compileCommand({
      profile: values['--profile'],
      target: values['--target'],
      output: values['--output']
    });
    return;
  }

  if (command === 'lint') {
    const { values, positionals } = parseOptions(
      args.slice(1),
      new Set(['--profile', '--format']),
      {
        '--profile': 'product-app',
        '--format': 'text'
      }
    );
    if (positionals.length > 1) {
      throw new Error(`Unexpected argument '${positionals[1]}'.`);
    }
    if (!['text', 'json'].includes(values['--format'])) {
      throw new Error(
        `Invalid format '${values['--format']}'. Use text or json.`
      );
    }
    const result = await lintCommand({
      path: positionals[0] ?? '.',
      profile: values['--profile'],
      format: values['--format']
    });
    process.exitCode = result.errors > 0 ? 1 : 0;
    return;
  }

  throw new Error(`Unknown command '${command}'.`);
}

main().catch((error) => {
  console.error(`design-canon: ${error.message}`);
  console.error("Run 'design-canon --help' for usage.");
  process.exitCode = 2;
});
