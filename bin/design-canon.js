#!/usr/bin/env node
import { compileCommand } from '../src/compile.js';
import { lintCommand } from '../src/lint.js';

const HELP = `Design Canon v0.1.0-alpha.0

Usage:
  design-canon compile --profile <name> [--target design|skill|agents] [--output <path>]
  design-canon lint [path] [--profile <name>] [--format text|json]
  design-canon profiles

Examples:
  design-canon compile --profile marketing --target design --output DESIGN.md
  design-canon compile --profile product-app --target skill --output SKILL.md
  design-canon lint ./src --profile product-app
`;

function valueAfter(args, flag, fallback) {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    console.log(HELP);
    return;
  }

  if (command === 'profiles') {
    console.log('marketing\nproduct-app\neditorial');
    return;
  }

  if (command === 'compile') {
    const profile = valueAfter(args, '--profile', 'product-app');
    const target = valueAfter(args, '--target', 'design');
    const output = valueAfter(args, '--output', null);
    await compileCommand({ profile, target, output });
    return;
  }

  if (command === 'lint') {
    const path = args[1] && !args[1].startsWith('--') ? args[1] : '.';
    const profile = valueAfter(args, '--profile', 'product-app');
    const format = valueAfter(args, '--format', 'text');
    const result = await lintCommand({ path, profile, format });
    process.exitCode = result.errors > 0 ? 1 : 0;
    return;
  }

  console.error(`Unknown command: ${command}\n\n${HELP}`);
  process.exitCode = 2;
}

main().catch((error) => {
  console.error(`design-canon: ${error.message}`);
  process.exitCode = 2;
});
