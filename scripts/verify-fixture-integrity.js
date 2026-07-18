#!/usr/bin/env node
/**
 * verify-fixture-integrity.js
 *
 * Checks that every fixture manifest's sourceFiles[].bytes and .sha256
 * match the actual committed source file on disk.
 *
 * Usage: node scripts/verify-fixture-integrity.js [root]
 *
 * Exits 0 if all fixtures pass, 1 on any mismatch.
 */
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const MANIFEST_NAME = 'manifest.json';

async function findManifests(root) {
  const found = [];
  async function walk(current) {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile() && entry.name === MANIFEST_NAME) found.push(path);
    }
  }
  await walk(root);
  return found.sort();
}

async function verifyManifest(manifestPath) {
  const base = resolve(manifestPath, '..');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const errors = [];

  for (const [index, file] of manifest.sourceFiles.entries()) {
    const sourcePath = join(base, file.path);
    let actualBytes;
    let actualHash;
    try {
      const content = await readFile(sourcePath);
      actualBytes = content.length;
      actualHash = createHash('sha256').update(content).digest('hex');
    } catch (err) {
      errors.push(`  sourceFiles[${index}]: missing source file "${file.path}" (${err.message})`);
      continue;
    }

    if (actualBytes !== file.bytes) {
      errors.push(`  sourceFiles[${index}]: byte count mismatch for "${file.path}" — declared ${file.bytes}, actual ${actualBytes}`);
    }
    if (actualHash !== file.sha256) {
      errors.push(`  sourceFiles[${index}]: SHA-256 mismatch for "${file.path}" — declared ${file.sha256.slice(0, 12)}..., actual ${actualHash.slice(0, 12)}...`);
    }
  }

  return { manifestPath, errors, fixtureId: manifest.fixtureId };
}

async function main() {
  const args = process.argv.slice(2);
  const root = resolve(args[0] || process.cwd(), 'fixtures', 'candidates');

  const manifests = await findManifests(root);
  if (manifests.length === 0) {
    console.error('No fixture manifests found.');
    process.exit(1);
  }

  let totalErrors = 0;
  for (const manifestPath of manifests) {
    const { errors, fixtureId } = await verifyManifest(manifestPath);
    if (errors.length > 0) {
      console.error(`\u2716 ${fixtureId || manifestPath}`);
      for (const err of errors) console.error(err);
      totalErrors += errors.length;
    } else {
      console.log(`\u2713 ${fixtureId || manifestPath}`);
    }
  }

  if (totalErrors > 0) {
    console.error(`\n${totalErrors} integrity error(s) found.`);
    process.exit(1);
  }
  console.log(`\nAll ${manifests.length} fixture(s) pass integrity check.`);
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  main().catch((err) => {
    console.error('Verification failed:', err.message);
    process.exit(1);
  });
}
