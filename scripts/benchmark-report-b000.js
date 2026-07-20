#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildB000CalibrationReport, writeB000CalibrationReport } from '../research/benchmark/harness/calibration-report.js';
import { parseCliArgs } from '../research/benchmark/harness/lib.js';

async function main() {
  const options = parseCliArgs(process.argv.slice(2), {
    '--runs': { required: true }, '--output': { required: true }, '--json-output': { required: true },
    '--repository-commit': { required: true }, '--codex-version': { required: false, default: null },
    '--preflight': { required: false, default: null }
  });
  const preflight = options['--preflight'] ? JSON.parse(await readFile(resolve(options['--preflight']), 'utf8')) : null;
  const report = await buildB000CalibrationReport({
    runsRoot: resolve(options['--runs']), repositoryCommit: options['--repository-commit'],
    codexVersion: options['--codex-version'], preflight
  });
  await writeB000CalibrationReport({ report, jsonOutput: options['--json-output'], markdownOutput: options['--output'] });
  process.stdout.write(`${JSON.stringify({ recommendation: report.recommendation, attempts: report.attempts.length }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(`benchmark-report-b000: ${error.message}`);
  process.exitCode = 1;
});
