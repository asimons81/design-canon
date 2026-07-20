#!/usr/bin/env node
import { resolve, join } from 'node:path';
import { initializeB000, prepareB000Guidance } from '../research/benchmark/harness/b000.js';
import { parseCliArgs } from '../research/benchmark/harness/lib.js';

async function main() {
  const options = parseCliArgs(process.argv.slice(2), {
    '--output': { required: false, default: '.benchmark/calibration/b000' }
  });
  const root = resolve(options['--output']);
  const guidance = join(root, 'guidance');
  await prepareB000Guidance(guidance);
  const runs = await initializeB000({ outputRoot: join(root, 'runs'), guidanceDirectory: guidance });
  process.stdout.write(`${JSON.stringify({ calibration: 'B000', official: false, claimEligible: false, root, runs }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(`benchmark-calibration-b000-init: ${error.message}`);
  process.exitCode = 1;
});
