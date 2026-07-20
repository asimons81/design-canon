#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import {
  ADAPTER_TARGETS,
  formatAdapterPlan,
  runAdapterCommand
} from '../src/adapters.js';
import { compileCommand } from '../src/compile.js';
import { listProfiles } from '../src/io.js';
import { lintCommand } from '../src/lint.js';

const packageJson = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url), 'utf8')
);

const HELP = `Design Canon v${packageJson.version}

Usage:
  design-canon compile --profile <name> [--target design|skill|agents] [--output <path>]
  design-canon lint [path] [--profile <name>] [--config <path>] [--format text|json] [--mode static|auto|browser]
  design-canon init [path] [--profile <name>] [--target ${ADAPTER_TARGETS.join('|')}] [--write]
  design-canon uninstall [path] [--target ${ADAPTER_TARGETS.join('|')}] [--write]
  design-canon profiles
  design-canon --version

Examples:
  design-canon compile --profile marketing --target design --output DESIGN.md
  design-canon compile --profile product-app --target skill --output SKILL.md
  design-canon lint ./src --profile product-app
  design-canon lint . --config design-canon.config.json
  design-canon init . --profile marketing --target agents
  design-canon init . --profile product-app --target claude --write
  design-canon uninstall . --target cursor --write

Adapter commands are dry-run previews unless --write is supplied.
`;

function parseOptions(args, allowed, defaults = {}, booleanOptions = new Set()) {
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
    if (booleanOptions.has(token)) {
      values[token] = true;
      seen.add(token);
      continue;
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

function validateAdapterTarget(target) {
  if (!ADAPTER_TARGETS.includes(target)) {
    throw new Error(
      `Invalid adapter target '${target}'. Use ${ADAPTER_TARGETS.join(', ')}.`
    );
  }
}

function printAppliedPlan(plan) {
  console.log(`Design Canon ${plan.action} ${plan.target}`);
  console.log(`Project: ${plan.projectPath}`);
  console.log('Mode: write');
  for (const operation of plan.operations) {
    console.log(`${operation.action.toUpperCase()} ${operation.path}`);
  }
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
      new Set(['--profile', '--config', '--format', '--mode']),
      {
        '--profile': null,
        '--config': null,
        '--format': 'text',
        '--mode': null
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
    if (values['--mode'] !== null && !['static', 'auto', 'browser'].includes(values['--mode'])) {
      throw new Error(
        `Invalid mode '${values['--mode']}'. Use static, auto, or browser.`
      );
    }
    const result = await lintCommand({
      path: positionals[0] ?? '.',
      profile: values['--profile'],
      configPath: values['--config'],
      format: values['--format'],
      mode: values['--mode']
    });
    process.exitCode = result.errors > 0 ? 1 : 0;
    return;
  }

  if (command === 'init') {
    const { values, positionals } = parseOptions(
      args.slice(1),
      new Set(['--profile', '--target', '--write']),
      {
        '--profile': 'product-app',
        '--target': 'agents',
        '--write': false
      },
      new Set(['--write'])
    );
    if (positionals.length > 1) {
      throw new Error(`Unexpected argument '${positionals[1]}'.`);
    }
    validateAdapterTarget(values['--target']);
    const plan = await runAdapterCommand({
      action: 'install',
      projectPath: positionals[0] ?? '.',
      profileName: values['--profile'],
      target: values['--target'],
      write: values['--write']
    });
    if (values['--write']) printAppliedPlan(plan);
    else process.stdout.write(formatAdapterPlan(plan));
    return;
  }

  if (command === 'uninstall') {
    const { values, positionals } = parseOptions(
      args.slice(1),
      new Set(['--target', '--write']),
      {
        '--target': 'agents',
        '--write': false
      },
      new Set(['--write'])
    );
    if (positionals.length > 1) {
      throw new Error(`Unexpected argument '${positionals[1]}'.`);
    }
    validateAdapterTarget(values['--target']);
    const plan = await runAdapterCommand({
      action: 'uninstall',
      projectPath: positionals[0] ?? '.',
      target: values['--target'],
      write: values['--write']
    });
    if (values['--write']) printAppliedPlan(plan);
    else process.stdout.write(formatAdapterPlan(plan, { includeContent: false }));
    return;
  }

  throw new Error(`Unknown command '${command}'.`);
}

main().catch((error) => {
  console.error(`design-canon: ${error.message}`);
  console.error("Run 'design-canon --help' for usage.");
  process.exitCode = 2;
});
