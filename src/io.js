import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_EXTENSIONS = new Set(['.css', '.html', '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte']);

export function rootPath(...parts) {
  return join(ROOT, ...parts);
}

export async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

export async function loadCatalog() {
  return readJson(rootPath('rules', 'core.json'));
}

export async function loadProfile(name) {
  try {
    return await readJson(rootPath('profiles', `${name}.json`));
  } catch {
    throw new Error(`Unknown profile '${name}'. Run 'design-canon profiles' to list profiles.`);
  }
}

export async function collectSourceFiles(inputPath) {
  const absolute = resolve(inputPath);
  const info = await stat(absolute);
  if (info.isFile()) return SOURCE_EXTENSIONS.has(extname(absolute)) ? [absolute] : [];

  const files = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (SOURCE_EXTENSIONS.has(extname(entry.name))) files.push(path);
    }
  }
  await walk(absolute);
  return files;
}
