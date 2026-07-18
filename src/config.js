import { relative, resolve } from 'node:path';
import { loadCatalog, readJson } from './io.js';
import { validateConfig } from './validate.js';

export const DEFAULT_CONFIG_FILE = 'design-canon.config.json';

function normalizePath(value) {
  return value.replaceAll('\\', '/');
}

function escapeRegexCharacter(character) {
  return /[|\\{}()[\]^$+?.]/.test(character) ? `\\${character}` : character;
}

export function globToRegExp(pattern) {
  const normalized = normalizePath(pattern);
  let source = '^';

  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index];
    if (character === '*') {
      if (normalized[index + 1] === '*') {
        index += 1;
        if (normalized[index + 1] === '/') {
          index += 1;
          source += '(?:.*/)?';
        } else {
          source += '.*';
        }
      } else {
        source += '[^/]*';
      }
      continue;
    }
    if (character === '?') {
      source += '[^/]';
      continue;
    }
    source += escapeRegexCharacter(character);
  }

  return new RegExp(`${source}$`);
}

export async function loadConfig(configPath = null, options = {}) {
  const {
    cwd = process.cwd(),
    referenceDate = new Date(),
    catalog: suppliedCatalog = null
  } = options;
  const requestedPath = configPath ?? DEFAULT_CONFIG_FILE;
  const absolutePath = resolve(cwd, requestedPath);
  let raw;

  try {
    raw = await readJson(absolutePath);
  } catch (error) {
    if (!configPath && error?.code === 'ENOENT') {
      return {
        path: null,
        config: { version: 1, suppressions: [] },
        suppressions: []
      };
    }
    throw error;
  }

  const catalog = suppliedCatalog ?? (await loadCatalog());
  const config = validateConfig(raw, catalog, { referenceDate });
  const suppressions = config.suppressions.map((suppression, index) => ({
    ...suppression,
    index,
    matchers: suppression.files.map(globToRegExp)
  }));

  return {
    path: normalizePath(relative(cwd, absolutePath) || requestedPath),
    config,
    suppressions
  };
}

export function findSuppression(suppressions, finding) {
  const file = normalizePath(finding.file);
  return suppressions.find(
    (suppression) =>
      suppression.rule === finding.rule &&
      suppression.matchers.some((matcher) => matcher.test(file))
  );
}
