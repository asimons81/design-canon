#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadB000Calibration, verifyB000Order } from '../research/benchmark/harness/b000.js';
import { parseCliArgs } from '../research/benchmark/harness/lib.js';

function execute(args) {
  return new Promise((resolveRun) => {
    const child = spawn(process.execPath, [fileURLToPath(new URL('./benchmark-execute-b000.js', import.meta.url)), ...args], { stdio: 'inherit', windowsHide: true });
    child.once('exit', (code) => resolveRun(code));
  });
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2), {
    '--root': { required: true }, '--workspace-root': { required: true },
    '--network-evidence': { required: true }, '--codex': { required: false, default: 'codex' },
    '--live': { required: false, default: 'false' }
  });
  if (options['--live'] !== 'true' || process.env.DESIGN_CANON_B000_LIVE !== '1') throw new Error('Explicit live opt-in is required.');
  const root = resolve(options['--root']);
  const runs = verifyB000Order(await loadB000Calibration());
  for (const run of runs) {
    const code = await execute([
      '--run', join(root, 'runs', run.runId), '--workspace-root', resolve(options['--workspace-root']),
      '--network-evidence', resolve(options['--network-evidence']), '--codex', options['--codex'], '--live', 'true'
    ]);
    if (code !== 0) throw new Error(`Batch stopped after ${run.runId}; common runtime controls require review.`);
  }
}

main().catch((error) => {
  console.error(`benchmark-batch-b000: ${error.message}`);
  process.exitCode = 1;
});
