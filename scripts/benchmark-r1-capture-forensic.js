#!/usr/bin/env node
import { constants } from 'node:fs';
import {
  copyFile, lstat, mkdir, readFile, readdir, stat, writeFile
} from 'node:fs/promises';
import { basename, join, relative, resolve } from 'node:path';
import { captureRun } from '../research/benchmark/harness/capture.js';
import { parseCliArgs, sha256, stableStringify, writeJsonExclusive } from '../research/benchmark/harness/lib.js';

const RUN_IDS = Object.freeze(['B000-A-r1', 'B000-B-r1', 'B000-D-r1', 'B000-C-r1']);
const SOURCE_FILES = Object.freeze(['index.html', 'styles.css', 'script.js']);

async function collect(root) {
  const records = [];
  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile()) {
        const bytes = await readFile(path);
        records.push({
          path: relative(root, path).replaceAll('\\', '/'),
          bytes: bytes.length,
          sha256: sha256(bytes)
        });
      }
    }
  }
  await walk(root);
  return records;
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2), {
    '--r1-root': { required: true },
    '--output': { required: true },
    '--browser-executable': { required: true },
    '--diagnostic-id': { required: false, default: '' }
  });
  const r1Root = resolve(options['--r1-root']);
  const output = resolve(options['--output']);
  const diagnosticId = options['--diagnostic-id'] || basename(output);
  if (output === r1Root || output.startsWith(`${r1Root}/`)) {
    throw new Error('Forensic output must remain outside immutable r1 evidence.');
  }
  if (await lstat(output).catch(() => null)) throw new Error('Forensic output already exists.');
  await mkdir(output, { recursive: false });
  const results = [];
  for (const runId of RUN_IDS) {
    const source = join(r1Root, 'runs', runId, 'source');
    const names = (await readdir(source)).sort();
    if (JSON.stringify(names) !== JSON.stringify([...SOURCE_FILES].sort())) {
      throw new Error(`r1 source allowlist mismatch for ${runId}.`);
    }
    const target = join(output, runId);
    for (const name of ['source', 'screenshots', 'reports']) {
      await mkdir(join(target, name), { recursive: true });
    }
    for (const name of SOURCE_FILES) {
      if (!(await stat(join(source, name))).isFile()) throw new Error(`r1 source is not regular: ${runId}/${name}`);
      await copyFile(join(source, name), join(target, 'source', name), constants.COPYFILE_EXCL);
    }
    const sourceHashes = Object.fromEntries(await Promise.all(SOURCE_FILES.map(async (name) => {
      const bytes = await readFile(join(target, 'source', name));
      return [name, { bytes: bytes.length, sha256: sha256(bytes) }];
    })));
    await writeJsonExclusive(join(target, 'manifest.json'), {
      schemaVersion: 1,
      diagnosticId,
      sourceRunId: runId,
      runId: `${diagnosticId}-${basename(runId)}`,
      profile: 'marketing',
      official: false,
      claimEligible: false,
      captureOnly: true,
      benchmarkAttempt: false,
      measuredB000Evidence: false,
      providerUsageIncluded: false,
      status: 'planned',
      environment: {},
      limits: {},
      sourceHashes
    });
    const capture = await captureRun({
      runDirectory: target,
      browserExecutablePath: options['--browser-executable'],
      sourceHashes
    });
    results.push({
      sourceRunId: runId,
      status: capture.manifest.status,
      browserExecutable: capture.browserIdentity,
      captureStatus: 'complete',
      externalResponsesAccepted: capture.renderMetadata.acceptedExternalResponses.length,
      artifactHashesPath: capture.manifest.artifactHashesPath
    });
  }
  const artifacts = await collect(output);
  const aggregate = {
    schemaVersion: 1,
    diagnosticId,
    official: false,
    claimEligible: false,
    captureOnly: true,
    benchmarkAttempt: false,
    measuredB000Evidence: false,
    generatedAt: new Date().toISOString(),
    results,
    artifacts
  };
  aggregate.aggregateSha256 = sha256(stableStringify(aggregate));
  await writeJsonExclusive(join(output, 'forensic-aggregate.json'), aggregate);
  await writeFile(
    join(output, 'FORENSIC-SHA256'),
    `${aggregate.aggregateSha256}  forensic-aggregate.json\n`,
    { encoding: 'utf8', flag: 'wx' }
  );
  process.stdout.write(`${JSON.stringify(aggregate, null, 2)}\n`);
}

main().catch((error) => {
  console.error(`benchmark-r1-capture-forensic: ${error.message}`);
  process.exitCode = 1;
});
