#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { lstat } from 'node:fs/promises';
import { promisify } from 'node:util';
import { resolve, join } from 'node:path';
import { assertB000R2InitializationAdmission, initializeB000, prepareB000Guidance } from '../research/benchmark/harness/b000.js';
import { parseCliArgs } from '../research/benchmark/harness/lib.js';

async function main() {
  const options = parseCliArgs(process.argv.slice(2), {
    '--output': { required: false, default: '.benchmark/calibration/b000-r2' },
    '--live-r2-authorization': { required: false, default: 'false' },
    '--reviewed-repair-head': { required: true },
    '--r1-lock-inventory': { required: true }
  });
  if (
    options['--live-r2-authorization'] !== 'true' ||
    process.env.DESIGN_CANON_B000_R2_INIT !== '1'
  ) {
    throw new Error('Explicit future live-r2 initialization authorization is required.');
  }
  const root = resolve(options['--output']);
  if (await lstat(root).catch(() => null)) throw new Error('r2 calibration root already exists.');
  const run = promisify(execFile);
  const [{ stdout: currentHead }, { stdout: protocolTree }] = await Promise.all([
    run('git', ['rev-parse', 'HEAD']),
    run('git', ['rev-parse', 'HEAD:research/benchmark/protocol-v1'])
  ]);
  const admission = await assertB000R2InitializationAdmission({
    authorization: true,
    expectedRepairHead: options['--reviewed-repair-head'],
    currentHead: currentHead.trim(),
    currentProtocolTree: protocolTree.trim(),
    r1LockInventory: options['--r1-lock-inventory']
  });
  const guidance = join(root, 'guidance');
  await prepareB000Guidance(guidance);
  const runs = await initializeB000({
    outputRoot: join(root, 'runs'),
    guidanceDirectory: guidance,
    admission
  });
  process.stdout.write(`${JSON.stringify({ calibration: 'B000-r2', official: false, claimEligible: false, root, runs }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(`benchmark-calibration-b000-init: ${error.message}`);
  process.exitCode = 1;
});
