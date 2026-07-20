import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertSafeProfileName, validateCatalog, validateProfile } from './validate.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CATALOG_PACKS = Object.freeze(['core.json', 'guidance.json']);
const SOURCE_EXTENSIONS = new Set([
  '.css',
  '.html',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.vue',
  '.svelte'
]);
const IGNORED_DIRECTORIES = new Set([
  '.git',
  '.next',
  '.nuxt',
  '.svelte-kit',
  '.cache',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'vendor'
]);

export const MAX_SOURCE_FILE_BYTES = 1024 * 1024;

export function rootPath(...parts) {
  return join(ROOT, ...parts);
}

export async function readJson(path) {
  let text;
  try {
    text = await readFile(path, 'utf8');
  } catch (error) {
    error.message = `Unable to read JSON file '${path}': ${error.message}`;
    throw error;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON in '${path}': ${error.message}`);
  }
}

export async function loadCatalog() {
  const packs = await Promise.all(
    CATALOG_PACKS.map(async (name) => {
      const path = rootPath('rules', name);
      return validateCatalog(await readJson(path));
    })
  );
  const versions = new Set(packs.map((pack) => pack.version));
  if (versions.size !== 1) {
    throw new Error('Rule packs must use the same catalog version.');
  }
  return validateCatalog({
    version: packs[0].version,
    rules: packs.flatMap((pack) => pack.rules)
  });
}

export async function listProfiles() {
  const entries = await readdir(rootPath('profiles'), { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === '.json')
    .map((entry) => entry.name.slice(0, -5))
    .filter((name) => {
      try {
        assertSafeProfileName(name);
        return true;
      } catch {
        return false;
      }
    })
    .sort();
}

export async function loadProfile(name) {
  assertSafeProfileName(name);
  const path = rootPath('profiles', `${name}.json`);
  try {
    return validateProfile(await readJson(path), name);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error(`Unknown profile '${name}'. Run 'design-canon profiles' to list profiles.`);
    }
    throw error;
  }
}

export async function collectSourceFiles(inputPath) {
  const absolute = resolve(inputPath);
  let info;
  try {
    info = await stat(absolute);
  } catch (error) {
    error.message = `Unable to inspect '${inputPath}': ${error.message}`;
    throw error;
  }

  if (info.isFile()) {
    return SOURCE_EXTENSIONS.has(extname(absolute).toLowerCase()) ? [absolute] : [];
  }
  if (!info.isDirectory()) {
    throw new Error(`Input path '${inputPath}' is not a regular file or directory.`);
  }

  const files = [];
  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(path);
      } else if (
        entry.isFile() &&
        SOURCE_EXTENSIONS.has(extname(entry.name).toLowerCase())
      ) {
        files.push(path);
      }
    }
  }

  await walk(absolute);
  return files;
}
