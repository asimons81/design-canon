#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import {
  loadCatalogFreeze,
  loadProtocol,
  loadStrictProfile,
  measureText,
  parseCliArgs
} from '../research/benchmark/harness/lib.js';

function fail(message) {
  throw new Error(message);
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2), {
    '--bundle': { required: true },
    '--official': { required: false, default: 'false' }
  });
  const official = options['--official'] === 'true';
  if (!['true', 'false'].includes(options['--official'])) {
    fail("--official must be 'true' or 'false'.");
  }

  const manifestPath = resolve(options['--bundle'], 'guidance-manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const protocol = await loadProtocol();
  const freeze = await loadCatalogFreeze(protocol);
  const strictProfile = await loadStrictProfile(manifest.profile, protocol);

  if (manifest.protocolId !== protocol.protocolId) fail('Protocol ID mismatch.');
  if (manifest.protocolVersion !== protocol.protocolVersion) fail('Protocol version mismatch.');
  if (manifest.catalogCommit !== freeze.catalogCommit) fail('Catalog commit mismatch.');

  const expectedRuleIds = {
    A: [],
    B: [],
    C: freeze.ruleIds,
    D: strictProfile.ruleIds
  };
  for (const condition of ['A', 'B', 'C', 'D']) {
    const artifact = manifest.artifacts?.[condition];
    if (!artifact) fail(`Missing condition ${condition} artifact record.`);
    if (JSON.stringify(artifact.ruleIds) !== JSON.stringify(expectedRuleIds[condition])) {
      fail(`Condition ${condition} rule IDs do not match the frozen protocol.`);
    }
    if (condition === 'A') {
      if (artifact.path !== null || artifact.sha256 !== null) {
        fail('Condition A must not contain a guidance artifact.');
      }
      continue;
    }
    const path = join(dirname(manifestPath), artifact.path);
    const content = await readFile(path, 'utf8');
    const measured = measureText(content);
    for (const key of ['characters', 'utf8Bytes', 'sha256']) {
      if (artifact[key] !== measured[key]) {
        fail(`Condition ${condition} ${key} does not match '${artifact.path}'.`);
      }
    }
  }

  if (manifest.artifacts.B.sha256 !== protocol.genericGuidance.sha256) {
    fail('Condition B does not match the frozen generic baseline.');
  }
  if (manifest.artifacts.C.catalogCommit !== manifest.artifacts.D.catalogCommit) {
    fail('Conditions C and D were not generated from the same catalog commit.');
  }
  if (manifest.artifacts.D.utf8Bytes >= manifest.artifacts.C.utf8Bytes) {
    fail('Compiled guidance is not smaller than the full monolith for this profile.');
  }

  const officialBlockers = [];
  const executionFields = [
    'model',
    'modelVersion',
    'agentFramework',
    'agentVersion',
    'tokenizer',
    'contextWindowTokens',
    'timeBudgetSeconds',
    'actionBudget',
    'sampling'
  ];
  for (const field of executionFields) {
    if (protocol.execution[field] === null) officialBlockers.push(`protocol.execution.${field}`);
  }
  for (const condition of ['B', 'C', 'D']) {
    const artifact = manifest.artifacts[condition];
    if (!artifact.tokenizer) officialBlockers.push(`artifacts.${condition}.tokenizer`);
    if (!Number.isInteger(artifact.tokenCount)) {
      officialBlockers.push(`artifacts.${condition}.tokenCount`);
    }
  }
  if (official) {
    if (officialBlockers.length > 0) {
      fail(`Official admission blocked by: ${officialBlockers.join(', ')}.`);
    }
    fail('Official admission also requires assembled brief-plus-guidance context-fit validation per run.');
  }

  process.stdout.write(`${JSON.stringify({
    valid: true,
    officialReady: officialBlockers.length === 0,
    officialBlockers,
    profile: manifest.profile,
    catalogCommit: manifest.catalogCommit,
    monolithBytes: manifest.artifacts.C.utf8Bytes,
    compiledBytes: manifest.artifacts.D.utf8Bytes,
    byteReductionPercent: Number((
      (1 - manifest.artifacts.D.utf8Bytes / manifest.artifacts.C.utf8Bytes) * 100
    ).toFixed(2))
  }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(`benchmark-validate: ${error.message}`);
  process.exitCode = 1;
});
