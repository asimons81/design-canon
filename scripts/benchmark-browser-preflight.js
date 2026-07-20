#!/usr/bin/env node
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { captureRun } from '../research/benchmark/harness/capture.js';
import { parseCliArgs, sha256, writeJson } from '../research/benchmark/harness/lib.js';

async function main() {
  const options = parseCliArgs(process.argv.slice(2), { '--output': { required: true } });
  const root = resolve(options['--output']);
  for (const name of ['source', 'screenshots', 'reports']) await mkdir(join(root, name), { recursive: true });
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>B000 capture preflight</title><link rel="stylesheet" href="http://example.com/blocked.css"><script src="https://example.com/blocked.js"></script></head><body><main><h1>Local capture works</h1><img src="https://example.com/blocked.png" alt="Blocked external probe"></main></body></html>`;
  await Promise.all([
    writeFile(join(root, 'source', 'index.html'), html, { encoding: 'utf8', flag: 'wx' }),
    writeFile(join(root, 'source', 'styles.css'), 'body { color: #111; background: #fff; }\n', { encoding: 'utf8', flag: 'wx' }),
    writeFile(join(root, 'source', 'script.js'), 'void 0;\n', { encoding: 'utf8', flag: 'wx' }),
    writeJson(join(root, 'manifest.json'), { schemaVersion: 1, benchmarkId: 'B000', runId: 'B000-browser-preflight', profile: 'marketing', official: false, claimEligible: false, status: 'planned', environment: {}, limits: {} })
  ]);
  const result = await captureRun({ runDirectory: root });
  const metadata = result.renderMetadata;
  const screenshotPaths = metadata.viewportResults.flatMap((viewport) => [viewport.viewportScreenshot, viewport.fullPageScreenshot]);
  const screenshots = [];
  for (const path of screenshotPaths) {
    const absolute = join(root, path);
    const bytes = await readFile(absolute);
    screenshots.push({ path, bytes: (await stat(absolute)).size, sha256: sha256(bytes) });
  }
  const httpAttempted = metadata.attemptedExternalRequests.some((entry) => entry.url.startsWith('http://'));
  const httpsAttempted = metadata.attemptedExternalRequests.some((entry) => entry.url.startsWith('https://'));
  const evidence = {
    schemaVersion: 1, generatedAt: new Date().toISOString(), playwrightVersion: '1.61.1',
    chromiumVersion: metadata.browser, localPageLoaded: metadata.viewportResults.length === 2,
    viewportAndFullPageScreenshots: screenshots, attemptedExternalRequests: metadata.attemptedExternalRequests,
    acceptedExternalResponses: metadata.acceptedExternalResponses, httpAttempted, httpsAttempted,
    browserNetworkDenied: metadata.externalNetworkBlocked && httpAttempted && httpsAttempted && metadata.acceptedExternalResponses.length === 0,
    browserLintCompleted: Boolean(result.manifest.lintReportPath),
    accessibilityAuditCompleted: Boolean(result.manifest.accessibilityReportPath),
    artifactHashingCompleted: Boolean(result.manifest.artifactHashesPath)
  };
  evidence.passed = evidence.localPageLoaded && evidence.browserNetworkDenied && evidence.browserLintCompleted &&
    evidence.accessibilityAuditCompleted && evidence.artifactHashingCompleted && screenshots.every((entry) => entry.bytes > 0);
  await writeJson(join(root, 'browser-preflight.json'), evidence);
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
  if (!evidence.passed) process.exitCode = 2;
}

main().catch((error) => { console.error(`benchmark-browser-preflight: ${error.message}`); process.exitCode = 1; });
