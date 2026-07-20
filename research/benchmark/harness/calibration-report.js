import { execFile } from 'node:child_process';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { writeJson } from './lib.js';

function command(executable, args = []) {
  return new Promise((resolveCommand) => execFile(executable, args, { windowsHide: true }, (error, stdout, stderr) =>
    resolveCommand(error ? null : (stdout || stderr).trim())));
}

function sumKnown(values) {
  const known = values.filter(Number.isFinite);
  return known.length === values.length ? known.reduce((sum, value) => sum + value, 0) : null;
}

export async function buildB000CalibrationReport({ runsRoot, repositoryCommit, codexVersion, preflight }) {
  const attempts = [];
  for (const entry of (await readdir(runsRoot, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue;
    const manifest = JSON.parse(await readFile(join(runsRoot, entry.name, 'manifest.json'), 'utf8'));
    if (manifest.benchmarkId === 'B000') attempts.push(manifest);
  }
  attempts.sort((a, b) => a.executionOrder - b.executionOrder);
  const usageFields = ['inputTokens', 'cachedInputTokens', 'outputTokens', 'reasoningTokens'];
  const totalProviderUsage = Object.fromEntries(usageFields.map((field) => [field,
    sumKnown(attempts.map((attempt) => attempt.usage?.[field] ?? null))
  ]));
  const runtimeValues = attempts.map((attempt) => attempt.runtimeMs).filter(Number.isFinite);
  const actionValues = attempts.map((attempt) => attempt.actionCount).filter(Number.isFinite);
  const recommendedB001Budgets = {
    timeBudgetSeconds: runtimeValues.length ? Math.ceil(Math.max(...runtimeValues) / 1000 * 1.5 / 60) * 60 : null,
    actionBudget: actionValues.length ? Math.ceil(Math.max(...actionValues) * 1.25) : null,
    basis: 'B000 observed maxima with 50% time and 25% action headroom; review before protocol admission.'
  };
  const completed = attempts.length === 4 && attempts.every((attempt) => attempt.status === 'complete');
  const isolationValid = attempts.length === 4 && attempts.every((attempt) => attempt.networkIsolation?.valid === true);
  const report = {
    schemaVersion: 1,
    calibrationId: 'b000-codex-sol-standard-v1',
    official: false,
    claimEligible: false,
    repositoryCommit,
    environment: {
      codexVersion,
      nodeVersion: process.version,
      npmVersion: process.platform === 'win32' ? await command('cmd', ['/c', 'npm', '--version']) : await command('npm', ['--version']),
      gitVersion: await command('git', ['--version']),
      operatingSystem: process.platform,
      architecture: process.arch,
      kernel: await command(process.platform === 'win32' ? 'cmd' : 'uname', process.platform === 'win32' ? ['/c', 'ver'] : ['-a']),
      wsl: process.env.WSL_DISTRO_NAME ?? null,
      chromiumVersion: attempts.find((attempt) => attempt.environment?.browser)?.environment.browser ?? null
    },
    runtime: { requestedModel: 'gpt-5.6-sol', modelDisplayName: 'GPT-5.6 Sol', reasoningEffort: 'medium', preflight },
    frozenExecutionOrder: ['B000-A-r1', 'B000-B-r1', 'B000-D-r1', 'B000-C-r1'],
    attempts,
    totalProviderUsage,
    observedCost: null,
    separatelyLabeledEstimate: null,
    estimatedTwelveRunB001Consumption: {
      providerUsage: Object.fromEntries(usageFields.map((field) => [field,
        totalProviderUsage[field] === null ? null : Math.ceil(totalProviderUsage[field] * 3)
      ])),
      runtimeMs: runtimeValues.length === 4 ? runtimeValues.reduce((sum, value) => sum + value, 0) * 3 : null
    },
    recommendedB001Budgets,
    unknowns: [
      ...(totalProviderUsage.inputTokens === null ? ['Provider usage is incomplete.'] : []),
      'Observed provider cost, credits, and quota are unavailable unless exposed by Codex events.',
      ...(!completed ? ['Not all four attempts completed.'] : []),
      ...(!isolationValid ? ['Network isolation is incomplete or unverified.'] : [])
    ],
    recommendation: preflight?.passed === false ? 'STOP' : completed && isolationValid ? 'GO' : attempts.length === 0 ? 'STOP' : 'REVISE',
    subjectiveWinnerSelected: false,
    protocolAdmissionModified: false
  };
  return report;
}

export async function writeB000CalibrationReport({ report, jsonOutput, markdownOutput }) {
  await writeJson(resolve(jsonOutput), report);
  const lines = [
    '# B000 Codex Sol calibration report', '',
    `Recommendation: **${report.recommendation}**`, '',
    `Repository commit: \`${report.repositoryCommit}\``,
    `Codex: \`${report.environment.codexVersion ?? 'unknown'}\``,
    `Execution order: ${report.frozenExecutionOrder.join(', ')}`, '',
    '| Run | Status | Runtime ms | Actions | Exit | Input | Cached | Output | Reasoning | Capture | Isolation |',
    '|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|'
  ];
  for (const attempt of report.attempts) lines.push(
    `| ${attempt.runId} | ${attempt.status} | ${attempt.runtimeMs ?? 'n/a'} | ${attempt.actionCount ?? 'n/a'} | ${attempt.execution?.exitCode ?? 'n/a'} | ${attempt.usage?.inputTokens ?? 'n/a'} | ${attempt.usage?.cachedInputTokens ?? 'n/a'} | ${attempt.usage?.outputTokens ?? 'n/a'} | ${attempt.usage?.reasoningTokens ?? 'n/a'} | ${attempt.captureStatus} | ${attempt.networkIsolation?.valid === true ? 'verified' : 'unverified'} |`
  );
  lines.push('', '## Unknowns and exceptions', '', ...report.unknowns.map((value) => `- ${value}`), '',
    'No subjective winner was selected. B000 remains nonofficial and claim-ineligible.', '');
  await writeFile(resolve(markdownOutput), lines.join('\n'), 'utf8');
}
