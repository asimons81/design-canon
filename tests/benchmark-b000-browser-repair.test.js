import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  launchPinnedChromium,
  resolveBrowserExecutable
} from '../research/benchmark/harness/browser.js';
import {
  runBrowserPreflight,
  verifyBrowserPreflight
} from '../research/benchmark/harness/browser-preflight.js';
import { captureRun } from '../research/benchmark/harness/capture.js';
import { writeJson } from '../research/benchmark/harness/lib.js';

const browserExecutablePath = process.env.DESIGN_CANON_BROWSER_EXECUTABLE;

async function temp(t, prefix = 'dc-browser-repair-') {
  const path = await mkdtemp(join(tmpdir(), prefix));
  t.after(() => rm(path, { recursive: true, force: true }));
  return path;
}

test('explicit pinned browser identity and capture readiness are reproducible', {
  skip: !browserExecutablePath
}, async (t) => {
  const identity = await resolveBrowserExecutable(browserExecutablePath);
  assert.match(identity.executableRealPath, /^\/opt\/dcbench\/ms-playwright\//);
  assert.equal(identity.playwrightVersion, '1.61.1');
  const root = await temp(t);
  const report = await runBrowserPreflight({ output: root, browserExecutablePath });
  assert.equal(report.passed, true);
  assert.equal(report.chromiumVersion, '149.0.7827.55');
  assert.equal(report.acceptedExternalResponses.length, 0);
  assert.equal(report.viewportAndFullPageScreenshots.length, 4);
  const verified = await verifyBrowserPreflight({
    preflightPath: join(root, 'browser-preflight.json'),
    browserExecutablePath
  });
  assert.equal(verified.reportSha256, report.reportSha256);
});

test('incompatible Chromium version fails closed', {
  skip: !browserExecutablePath
}, async () => {
  await assert.rejects(
    launchPinnedChromium(browserExecutablePath, { expectedChromiumVersion: '0.0.0.0' }),
    /does not match/
  );
});

test('post-launch capture failure records exact browser identity and no completeness hash', {
  skip: !browserExecutablePath
}, async (t) => {
  const root = await temp(t, 'dc-capture-failure-');
  for (const name of ['source', 'reports', 'screenshots']) await mkdir(join(root, name));
  await Promise.all([
    writeFile(join(root, 'source', 'index.html'), '<!doctype html><html lang="en"><body><main><h1>test</h1></main></body></html>'),
    writeFile(join(root, 'source', 'styles.css'), ''),
    writeFile(join(root, 'source', 'script.js'), ''),
    writeJson(join(root, 'manifest.json'), {
      runId: 'capture-failure-browser-test',
      profile: 'not-a-real-profile',
      status: 'planned',
      environment: {},
      limits: {}
    })
  ]);
  await assert.rejects(captureRun({
    runDirectory: root,
    browserExecutablePath,
    sourceHashes: { fixture: 'source-hash' },
    diffSha256: 'a'.repeat(64)
  }));
  const failure = JSON.parse(await readFile(join(root, 'reports', 'capture-failure.json'), 'utf8'));
  const identity = await resolveBrowserExecutable(browserExecutablePath);
  assert.equal(failure.browserExecutablePath, identity.executableRealPath);
  assert.equal(failure.browserExecutableSha256, identity.executableSha256);
  assert.equal(failure.playwrightVersion, '1.61.1');
  assert.equal(failure.attemptedScreenshots.length, 4);
  await assert.rejects(readFile(join(root, 'artifact-hashes.json')));
});
