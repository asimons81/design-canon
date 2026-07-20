#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseCliArgs, writeJson } from '../research/benchmark/harness/lib.js';

function increment(object, key) {
  object[key] = (object[key] ?? 0) + 1;
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2), {
    '--assignments': { required: true },
    '--key': { required: true },
    '--responses': { required: true },
    '--output': { required: true }
  });
  const assignments = JSON.parse(
    await readFile(resolve(options['--assignments']), 'utf8')
  );
  const confidential = JSON.parse(await readFile(resolve(options['--key']), 'utf8'));
  const responseFile = JSON.parse(
    await readFile(resolve(options['--responses']), 'utf8')
  );
  const assignmentById = new Map(
    assignments.assignments.map((assignment) => [assignment.assignmentId, assignment])
  );

  const totals = {};
  const byQuestion = {};
  const seen = new Set();
  for (const response of responseFile.responses ?? []) {
    const uniqueKey = `${response.evaluatorId}:${response.assignmentId}:${response.question}`;
    if (seen.has(uniqueKey)) {
      throw new Error(`Duplicate vote '${uniqueKey}'.`);
    }
    seen.add(uniqueKey);

    const assignment = assignmentById.get(response.assignmentId);
    if (!assignment) throw new Error(`Unknown assignment '${response.assignmentId}'.`);
    if (!assignment.questions.includes(response.question)) {
      throw new Error(`Unknown question for assignment '${response.assignmentId}'.`);
    }
    if (!assignment.allowedResponses.includes(response.response)) {
      throw new Error(`Unsupported response '${response.response}'.`);
    }

    const left = confidential.key[assignment.leftCandidateId];
    const right = confidential.key[assignment.rightCandidateId];
    if (!left || !right) throw new Error('Confidential candidate key is incomplete.');
    const pair = [left.condition, right.condition].sort().join('-vs-');
    totals[pair] ??= { votes: 0, noPreference: 0, wins: {} };
    byQuestion[response.question] ??= {};
    byQuestion[response.question][pair] ??= { votes: 0, noPreference: 0, wins: {} };

    const targets = [totals[pair], byQuestion[response.question][pair]];
    for (const target of targets) {
      target.votes += 1;
      if (response.response === 'no-preference') {
        target.noPreference += 1;
      } else {
        const winner = response.response === 'left' ? left.condition : right.condition;
        increment(target.wins, winner);
      }
    }
  }

  for (const group of [totals, ...Object.values(byQuestion)]) {
    for (const result of Object.values(group)) {
      result.noPreferenceRate = result.votes === 0 ? null : result.noPreference / result.votes;
      result.winRates = Object.fromEntries(
        Object.entries(result.wins).map(([condition, wins]) => [
          condition,
          result.votes === 0 ? null : wins / result.votes
        ])
      );
    }
  }

  const output = {
    schemaVersion: 1,
    responseCount: seen.size,
    totals,
    byQuestion,
    limitations: [
      'This analysis does not infer evaluator independence or expertise.',
      'Confidence intervals and inter-rater agreement require the finalized evaluator design.',
      'Condition identities are joined only during analysis through the confidential key.'
    ]
  };
  await writeJson(resolve(options['--output']), output);
  process.stdout.write(`${JSON.stringify({
    responseCount: seen.size,
    pairs: Object.keys(totals),
    output: resolve(options['--output'])
  }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(`benchmark-analyze-votes: ${error.message}`);
  process.exitCode = 1;
});
