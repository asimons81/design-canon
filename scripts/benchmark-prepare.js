#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  loadCatalogFreeze,
  parseCliArgs,
  writeGuidanceBundle
} from '../research/benchmark/harness/lib.js';

async function main() {
  const options = parseCliArgs(process.argv.slice(2), {
    '--profile': { required: true },
    '--output': { required: true },
    '--catalog-commit': { required: false, default: null },
    '--token-counts': { required: false, default: null }
  });
  const freeze = await loadCatalogFreeze();
  const catalogCommit = options['--catalog-commit'] ?? freeze.catalogCommit;
  const tokenCounts = options['--token-counts']
    ? JSON.parse(await readFile(resolve(options['--token-counts']), 'utf8'))
    : null;

  const result = await writeGuidanceBundle({
    outputDirectory: resolve(options['--output']),
    profileName: options['--profile'],
    catalogCommit,
    tokenCounts
  });

  const summary = {
    protocolId: result.manifest.protocolId,
    profile: result.manifest.profile,
    catalogCommit,
    output: resolve(options['--output']),
    artifacts: Object.fromEntries(
      Object.entries(result.manifest.artifacts).map(([id, artifact]) => [
        id,
        {
          ruleCount: artifact.ruleIds.length,
          characters: artifact.characters,
          utf8Bytes: artifact.utf8Bytes,
          sha256: artifact.sha256,
          tokenCount: artifact.tokenCount
        }
      ])
    )
  };
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => {
  console.error(`benchmark-prepare: ${error.message}`);
  process.exitCode = 1;
});
