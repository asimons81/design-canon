#!/usr/bin/env node
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseCliArgs, writeJson } from '../research/benchmark/harness/lib.js';

function median(values) {
  const filtered = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (filtered.length === 0) return null;
  const middle = Math.floor(filtered.length / 2);
  return filtered.length % 2 === 0
    ? (filtered[middle - 1] + filtered[middle]) / 2
    : filtered[middle];
}

async function readOptionalJson(path) {
  if (!path) return null;
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function loadRuns(root) {
  const runs = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const directory = join(root, entry.name);
    const manifest = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'));
    const lint = await readOptionalJson(
      manifest.lintReportPath ? join(directory, manifest.lintReportPath) : null
    );
    const accessibility = await readOptionalJson(
      manifest.accessibilityReportPath
        ? join(directory, manifest.accessibilityReportPath)
        : null
    );
    runs.push({ manifest, lint, accessibility });
  }
  return runs;
}

function summarizeCondition(condition, runs) {
  const selected = runs.filter((run) => run.manifest.condition === condition);
  const statuses = {};
  for (const run of selected) {
    statuses[run.manifest.status] = (statuses[run.manifest.status] ?? 0) + 1;
  }
  const lintErrors = selected.map((run) => run.lint?.errors).filter(Number.isFinite);
  const lintWarnings = selected.map((run) => run.lint?.warnings).filter(Number.isFinite);
  const accessibilityViolations = selected
    .map((run) => run.accessibility?.violations?.length)
    .filter(Number.isFinite);
  return {
    condition,
    totalRuns: selected.length,
    statuses,
    completionRate: selected.length === 0
      ? null
      : (statuses.complete ?? 0) / selected.length,
    medianInstructionBytes: median(selected.map((run) => run.manifest.instructionBytes)),
    medianInstructionTokens: median(selected.map((run) => run.manifest.instructionTokens)),
    medianRuntimeMs: median(selected.map((run) => run.manifest.runtimeMs)),
    medianLintErrors: median(lintErrors),
    medianLintWarnings: median(lintWarnings),
    medianAccessibilityViolations: median(accessibilityViolations)
  };
}

function formatValue(value, digits = 2) {
  if (value === null || value === undefined) return 'n/a';
  if (typeof value === 'number' && !Number.isInteger(value)) return value.toFixed(digits);
  return String(value);
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2), {
    '--runs': { required: true },
    '--output': { required: true },
    '--json-output': { required: true }
  });
  const runsRoot = resolve(options['--runs']);
  const runs = await loadRuns(runsRoot);
  if (runs.length === 0) throw new Error('No run manifests were found.');

  const conditions = ['A', 'B', 'C', 'D'].map((condition) =>
    summarizeCondition(condition, runs)
  );
  const summary = {
    schemaVersion: 1,
    runsRoot,
    totalRuns: runs.length,
    conditions,
    limitations: [
      'This report summarizes committed run artifacts only.',
      'Missing reports remain missing and are not imputed.',
      'Blind preference results are analyzed separately.',
      'No causal or superiority claim is valid until protocol admission is complete.'
    ]
  };
  await writeJson(resolve(options['--json-output']), summary);

  const lines = [
    '# Design Canon Benchmark Report',
    '',
    `Runs discovered: ${runs.length}`,
    '',
    '| Condition | Runs | Complete | Median instruction bytes | Median tokens | Median runtime ms | Median lint errors | Median lint warnings | Median accessibility violations |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|'
  ];
  for (const condition of conditions) {
    lines.push(
      `| ${condition.condition} | ${condition.totalRuns} | ${formatValue(
        condition.completionRate === null ? null : condition.completionRate * 100
      )}% | ${formatValue(condition.medianInstructionBytes)} | ${formatValue(
        condition.medianInstructionTokens
      )} | ${formatValue(condition.medianRuntimeMs)} | ${formatValue(
        condition.medianLintErrors
      )} | ${formatValue(condition.medianLintWarnings)} | ${formatValue(
        condition.medianAccessibilityViolations
      )} |`
    );
  }
  lines.push(
    '',
    '## Limitations',
    '',
    ...summary.limitations.map((limitation) => `- ${limitation}`),
    ''
  );
  await writeFile(resolve(options['--output']), lines.join('\n'), 'utf8');

  process.stdout.write(`${JSON.stringify({
    totalRuns: runs.length,
    markdownOutput: resolve(options['--output']),
    jsonOutput: resolve(options['--json-output'])
  }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(`benchmark-report: ${error.message}`);
  process.exitCode = 1;
});
