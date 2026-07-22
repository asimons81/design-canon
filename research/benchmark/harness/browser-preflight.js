import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { assertBrowserIdentityMatches, resolveBrowserExecutable } from './browser.js';
import { captureRun } from './capture.js';
import { sha256, stableStringify, writeJsonExclusive } from './lib.js';

function unsignedPreflight(report) {
  const { reportSha256: _discard, ...unsigned } = report;
  return unsigned;
}

export function browserPreflightSha256(report) {
  return sha256(stableStringify(unsignedPreflight(report)));
}

export async function runBrowserPreflight({ output, browserExecutablePath }) {
  const root = resolve(output);
  for (const name of ['source', 'screenshots', 'reports']) {
    await mkdir(join(root, name), { recursive: true });
  }
  const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>B000 capture preflight</title><link rel="stylesheet" href="http://example.com/blocked.css"><script src="https://example.com/blocked.js"></script></head><body><main><h1>Local capture works</h1><img src="https://example.com/blocked.png" alt="Blocked external probe"></main></body></html>';
  await Promise.all([
    writeFile(join(root, 'source', 'index.html'), html, { encoding: 'utf8', flag: 'wx' }),
    writeFile(join(root, 'source', 'styles.css'), 'body { color: #111; background: #fff; }\n', { encoding: 'utf8', flag: 'wx' }),
    writeFile(join(root, 'source', 'script.js'), 'void 0;\n', { encoding: 'utf8', flag: 'wx' }),
    writeJsonExclusive(join(root, 'manifest.json'), {
      schemaVersion: 1,
      benchmarkId: 'B000',
      runId: 'B000-browser-preflight',
      profile: 'marketing',
      official: false,
      claimEligible: false,
      status: 'planned',
      environment: {},
      limits: {}
    })
  ]);
  const result = await captureRun({ runDirectory: root, browserExecutablePath });
  const metadata = result.renderMetadata;
  const screenshotPaths = metadata.viewportResults.flatMap(
    (viewport) => [viewport.viewportScreenshot, viewport.fullPageScreenshot]
  );
  const screenshots = [];
  for (const path of screenshotPaths) {
    const absolute = join(root, path);
    const bytes = await readFile(absolute);
    screenshots.push({ path, bytes: (await stat(absolute)).size, sha256: sha256(bytes) });
  }
  const httpAttempted = metadata.attemptedExternalRequests.some(
    (entry) => entry.url.startsWith('http://')
  );
  const httpsAttempted = metadata.attemptedExternalRequests.some(
    (entry) => entry.url.startsWith('https://')
  );
  const evidence = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    browserExecutable: result.browserIdentity,
    playwrightVersion: result.browserIdentity.playwrightVersion,
    chromiumVersion: result.browserIdentity.chromiumVersion,
    localPageLoaded: metadata.viewportResults.length === 2,
    viewportAndFullPageScreenshots: screenshots,
    attemptedExternalRequests: metadata.attemptedExternalRequests,
    acceptedExternalResponses: metadata.acceptedExternalResponses,
    httpAttempted,
    httpsAttempted,
    browserNetworkDenied:
      metadata.externalNetworkBlocked &&
      httpAttempted &&
      httpsAttempted &&
      metadata.acceptedExternalResponses.length === 0,
    browserLintCompleted: Boolean(result.manifest.lintReportPath),
    accessibilityAuditCompleted: Boolean(result.manifest.accessibilityReportPath),
    artifactHashingCompleted: Boolean(result.manifest.artifactHashesPath)
  };
  evidence.passed =
    evidence.localPageLoaded &&
    evidence.browserNetworkDenied &&
    evidence.browserLintCompleted &&
    evidence.accessibilityAuditCompleted &&
    evidence.artifactHashingCompleted &&
    screenshots.every((entry) => entry.bytes > 0);
  evidence.reportSha256 = browserPreflightSha256(evidence);
  await writeJsonExclusive(join(root, 'browser-preflight.json'), evidence);
  return evidence;
}

export async function verifyBrowserPreflight({
  preflightPath,
  browserExecutablePath,
  requirePassed = true
}) {
  const report = JSON.parse(await readFile(resolve(preflightPath), 'utf8'));
  if (report.reportSha256 !== browserPreflightSha256(report)) {
    throw new Error('Browser preflight report hash mismatch.');
  }
  if (requirePassed && report.passed !== true) throw new Error('Browser preflight did not pass.');
  const current = await resolveBrowserExecutable(browserExecutablePath);
  assertBrowserIdentityMatches(
    { ...current, chromiumVersion: report.chromiumVersion },
    report.browserExecutable
  );
  return report;
}
