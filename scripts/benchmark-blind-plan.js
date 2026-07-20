#!/usr/bin/env node
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  deterministicShuffle,
  parseCliArgs,
  sha256,
  writeJson
} from '../research/benchmark/harness/lib.js';

const DEFAULT_PAIRS = [['A', 'D'], ['B', 'D'], ['C', 'D']];
const QUESTIONS = [
  'Which output communicates the brief more clearly?',
  'Which output has stronger hierarchy and scanability?',
  'Which output uses typography more appropriately?',
  'Which output uses color and depth more intentionally?',
  'Which output appears more usable for the stated task?',
  'Which output feels less template-derived?',
  'Overall preference'
];

async function loadRuns(root) {
  const manifests = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifest = JSON.parse(
      await readFile(join(root, entry.name, 'manifest.json'), 'utf8')
    );
    if (manifest.status === 'complete') manifests.push(manifest);
  }
  return manifests;
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2), {
    '--runs': { required: true },
    '--output': { required: true },
    '--key-output': { required: true },
    '--seed': { required: false, default: 'design-canon-blind-v1' }
  });
  const runs = await loadRuns(resolve(options['--runs']));
  if (runs.length === 0) throw new Error('No completed runs were found.');

  const byCellAndCondition = new Map(
    runs.map((run) => [`${run.benchmarkId}:r${run.repetition}:${run.condition}`, run])
  );
  const cells = [...new Set(runs.map((run) => `${run.benchmarkId}:r${run.repetition}`))].sort();
  const assignments = [];
  const key = {};

  for (const cell of cells) {
    const [benchmarkId, repetitionLabel] = cell.split(':');
    const repetition = Number(repetitionLabel.slice(1));
    for (const pair of DEFAULT_PAIRS) {
      const candidates = pair.map((condition) =>
        byCellAndCondition.get(`${benchmarkId}:r${repetition}:${condition}`)
      );
      if (candidates.some((candidate) => !candidate)) continue;

      const ordered = deterministicShuffle(
        candidates,
        `${options['--seed']}:${benchmarkId}:${repetition}:${pair.join('')}`
      );
      const candidateIds = ordered.map((run) =>
        `candidate-${sha256(`${options['--seed']}:${run.runId}`).slice(0, 16)}`
      );
      ordered.forEach((run, index) => {
        key[candidateIds[index]] = {
          runId: run.runId,
          condition: run.condition,
          benchmarkId: run.benchmarkId,
          repetition: run.repetition
        };
      });
      assignments.push({
        assignmentId: `pair-${sha256(`${cell}:${pair.join('-')}`).slice(0, 16)}`,
        benchmarkId,
        repetition,
        leftCandidateId: candidateIds[0],
        rightCandidateId: candidateIds[1],
        allowedResponses: ['left', 'right', 'no-preference'],
        questions: QUESTIONS
      });
    }
  }

  if (assignments.length === 0) {
    throw new Error('No complete comparison pairs could be assembled.');
  }

  await writeJson(resolve(options['--output']), {
    schemaVersion: 1,
    blinded: true,
    seed: options['--seed'],
    assignments
  });
  await writeJson(resolve(options['--key-output']), {
    schemaVersion: 1,
    confidential: true,
    key
  });

  process.stdout.write(`${JSON.stringify({
    assignments: assignments.length,
    candidates: Object.keys(key).length,
    publicOutput: resolve(options['--output']),
    confidentialKeyOutput: resolve(options['--key-output'])
  }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(`benchmark-blind-plan: ${error.message}`);
  process.exitCode = 1;
});
