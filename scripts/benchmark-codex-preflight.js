#!/usr/bin/env node
import { resolve } from 'node:path';
import { codexPreflight } from '../research/benchmark/harness/codex-adapter.js';
import { parseCliArgs } from '../research/benchmark/harness/lib.js';

async function main() {
  const options = parseCliArgs(process.argv.slice(2), {
    '--output': { required: true },
    '--codex': { required: false, default: 'codex' }
  });
  const result = await codexPreflight({ executable: options['--codex'], evidenceDirectory: resolve(options['--output']) });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.passed) process.exitCode = 2;
}

main().catch((error) => {
  console.error(`benchmark-codex-preflight: ${error.message}`);
  process.exitCode = 1;
});
