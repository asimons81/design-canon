#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertBrowserIdentityMatches } from '../research/benchmark/harness/browser.js';
import { runBrowserPreflight, verifyBrowserPreflight } from '../research/benchmark/harness/browser-preflight.js';
import { assertRequiredRunArtifacts, runBatchHarness } from '../research/benchmark/harness/batch.js';
import { loadB000Calibration, verifyB000Order } from '../research/benchmark/harness/b000.js';
import { parseCliArgs } from '../research/benchmark/harness/lib.js';

function execute(args) {
  return new Promise((resolveRun) => {
    const child = spawn(process.execPath, [fileURLToPath(new URL('./benchmark-execute-b000.js', import.meta.url)), ...args], { stdio: 'inherit', windowsHide: true });
    child.once('error', () => resolveRun(null));
    child.once('exit', (code) => resolveRun(code));
  });
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2), {
    '--root': { required: true }, '--workspace-root': { required: true },
    '--codex': { required: false, default: '/usr/local/bin/codex' },
    '--live': { required: false, default: 'false' },
    '--browser-executable': { required: true },
    '--browser-preflight': { required: true }
  });
  if (options['--live'] !== 'true' || process.env.DESIGN_CANON_B000_LIVE !== '1') throw new Error('Explicit live opt-in is required.');
  const root = resolve(options['--root']);
  const runs = verifyB000Order(await loadB000Calibration());
  const frozenPreflight = await verifyBrowserPreflight({
    preflightPath: options['--browser-preflight'],
    browserExecutablePath: options['--browser-executable']
  });
  const readiness = await runBrowserPreflight({
    output: join(root, 'preflight', 'r2-capture-readiness'),
    browserExecutablePath: options['--browser-executable']
  });
  assertBrowserIdentityMatches(readiness.browserExecutable, frozenPreflight.browserExecutable);
  await runBatchHarness({
    runs: runs.map((run) => ({
      ...run,
      runDirectory: join(root, 'runs', run.runId),
      manifestPath: join(root, 'runs', run.runId, 'manifest.json')
    })),
    statePath: join(root, 'batch-state.jsonl'),
    executeAttempt: (run) => execute([
      '--run', run.runDirectory,
      '--workspace-root', resolve(options['--workspace-root']),
      '--codex', options['--codex'],
      '--browser-executable', options['--browser-executable'],
      '--live', 'true'
    ]),
    validateArtifacts: (run, manifest) => assertRequiredRunArtifacts(run.runDirectory, manifest)
  });
}

main().catch((error) => {
  console.error(`benchmark-batch-b000: ${error.message}`);
  process.exitCode = 1;
});
