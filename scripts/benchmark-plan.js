#!/usr/bin/env node
import { resolve } from 'node:path';
import {
  generateRunPlan,
  loadProtocol,
  parseCliArgs,
  writeJson
} from '../research/benchmark/harness/lib.js';

async function main() {
  const options = parseCliArgs(process.argv.slice(2), {
    '--output': {
      required: false,
      default: 'research/benchmark/protocol-v1/run-plan.json'
    }
  });
  const protocol = await loadProtocol();
  const plan = generateRunPlan(protocol);
  const output = resolve(options['--output']);
  await writeJson(output, plan);

  process.stdout.write(`${JSON.stringify({
    protocolId: plan.protocolId,
    output,
    runCount: plan.runs.length,
    cells: new Set(plan.runs.map((run) => run.cellId)).size,
    conditions: Object.fromEntries(
      protocol.conditions.map((condition) => [
        condition.id,
        plan.runs.filter((run) => run.condition === condition.id).length
      ])
    )
  }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(`benchmark-plan: ${error.message}`);
  process.exitCode = 1;
});
