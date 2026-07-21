import { createRequire } from 'node:module';
import { access, readFile, realpath, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { sha256 } from './lib.js';

export const PINNED_BROWSER_ROOT = '/opt/dcbench/ms-playwright';
export const PINNED_PLAYWRIGHT_VERSION = '1.61.1';
export const PINNED_CHROMIUM_VERSION = '149.0.7827.55';

function isInside(parent, candidate) {
  const value = relative(resolve(parent), resolve(candidate));
  return value === '' || (!value.startsWith('..') && !value.startsWith('/'));
}

export async function playwrightVersion() {
  const require = createRequire(import.meta.url);
  const packagePath = require.resolve('playwright/package.json');
  return JSON.parse(await readFile(packagePath, 'utf8')).version;
}

export async function resolveBrowserExecutable(browserExecutablePath, {
  pinnedRoot = PINNED_BROWSER_ROOT
} = {}) {
  if (!browserExecutablePath) throw new Error('An explicit browser executable path is required.');
  const pinnedRootRealPath = await realpath(pinnedRoot);
  const executableRealPath = await realpath(resolve(browserExecutablePath));
  if (!isInside(pinnedRootRealPath, executableRealPath)) {
    throw new Error(`Browser executable must remain beneath '${pinnedRootRealPath}'.`);
  }
  const info = await stat(executableRealPath);
  if (!info.isFile()) throw new Error('Browser executable is not a regular file.');
  await access(executableRealPath, constants.R_OK | constants.X_OK);
  const version = await playwrightVersion();
  if (version !== PINNED_PLAYWRIGHT_VERSION) {
    throw new Error(`Playwright version '${version}' does not match '${PINNED_PLAYWRIGHT_VERSION}'.`);
  }
  return {
    executableRealPath,
    executableSha256: sha256(await readFile(executableRealPath)),
    executableDirectory: dirname(executableRealPath),
    pinnedRootRealPath,
    playwrightVersion: version
  };
}

export async function launchPinnedChromium(browserExecutablePath, {
  expectedChromiumVersion = PINNED_CHROMIUM_VERSION
} = {}) {
  const identity = await resolveBrowserExecutable(browserExecutablePath);
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    throw new Error('Playwright is required for benchmark capture.');
  }
  const browser = await chromium.launch({
    executablePath: identity.executableRealPath,
    headless: true
  });
  const chromiumVersion = browser.version();
  if (expectedChromiumVersion && chromiumVersion !== expectedChromiumVersion) {
    await browser.close();
    throw new Error(
      `Chromium version '${chromiumVersion}' does not match '${expectedChromiumVersion}'.`
    );
  }
  return { browser, identity: { ...identity, chromiumVersion } };
}

export function assertBrowserIdentityMatches(actual, expected) {
  for (const field of ['executableRealPath', 'executableSha256', 'playwrightVersion', 'chromiumVersion']) {
    if (actual?.[field] !== expected?.[field]) {
      throw new Error(`Browser identity mismatch for '${field}'.`);
    }
  }
  return true;
}
