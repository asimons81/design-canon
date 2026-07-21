#!/usr/bin/env node
import { resolve } from 'node:path';
import { captureRun } from '../research/benchmark/harness/capture.js';
import { parseCliArgs } from '../research/benchmark/harness/lib.js';

async function main() {
  const options = parseCliArgs(process.argv.slice(2), {
    '--run': { required: true },
    '--entry': { required: false, default: 'source/index.html' },
    '--browser-executable': { required: true }
  });
  const result = await captureRun({
    runDirectory: resolve(options['--run']),
    entry: options['--entry'],
    browserExecutablePath: options['--browser-executable']
  });
  process.stdout.write(`${JSON.stringify({
    runId: result.manifest.runId,
    status: result.manifest.status,
    viewports: result.manifest.viewportResults.length,
    accessibilityIssues: result.accessibilityReport.issueTotal,
    lintFindings: result.lintReport.findings.length
  }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(`benchmark-capture: ${error.message}`);
  process.exitCode = 1;
});
