#!/usr/bin/env node
import { runBrowserPreflight } from '../research/benchmark/harness/browser-preflight.js';
import { parseCliArgs } from '../research/benchmark/harness/lib.js';

async function main() {
  const options = parseCliArgs(process.argv.slice(2), {
    '--output': { required: true },
    '--browser-executable': { required: true }
  });
  const evidence = await runBrowserPreflight({
    output: options['--output'],
    browserExecutablePath: options['--browser-executable']
  });
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
  if (!evidence.passed) process.exitCode = 2;
}

main().catch((error) => { console.error(`benchmark-browser-preflight: ${error.message}`); process.exitCode = 1; });
