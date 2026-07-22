import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, stat } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { lintPath } from '../../../src/lint.js';
import { launchPinnedChromium, resolveBrowserExecutable } from './browser.js';
import { sha256, stableStringify, writeJson, writeJsonExclusive } from './lib.js';

export const CAPTURE_VIEWPORTS = Object.freeze([
  { id: 'desktop', width: 1440, height: 900, isMobile: false },
  { id: 'mobile', width: 390, height: 844, isMobile: true }
]);

export function validateRunManifestForCapture(manifest) {
  if (!manifest || typeof manifest !== 'object') throw new Error('Run manifest must be an object.');
  if (!manifest.runId || !manifest.profile) throw new Error('Run manifest lacks runId or profile.');
  if (!['planned', 'running', 'partial'].includes(manifest.status)) {
    throw new Error(`Run '${manifest.runId}' cannot be captured from status '${manifest.status}'.`);
  }
  return manifest;
}

export function isPathInside(parent, candidate) {
  const value = relative(resolve(parent), resolve(candidate));
  return value === '' || (!value.startsWith('..') && !isAbsolute(value));
}

export function summarizeAccessibilitySnapshots(snapshots) {
  const issueCounts = {};
  let issueTotal = 0;
  for (const snapshot of snapshots) {
    for (const issue of snapshot.issues) {
      issueCounts[issue.code] = (issueCounts[issue.code] ?? 0) + 1;
      issueTotal += 1;
    }
  }
  return {
    scanner: 'design-canon-dom-calibration-audit',
    conformanceClaim: false,
    issueTotal,
    issueCounts,
    snapshots
  };
}

function auditDocumentInPage() {
  function selectorFor(element) {
    if (element.id) return `#${CSS.escape(element.id)}`;
    const parts = [];
    let current = element;
    while (current && current.nodeType === Node.ELEMENT_NODE && parts.length < 5) {
      const tag = current.tagName.toLowerCase();
      const siblings = current.parentElement
        ? [...current.parentElement.children].filter((entry) => entry.tagName === current.tagName)
        : [];
      const suffix = siblings.length > 1 ? `:nth-of-type(${siblings.indexOf(current) + 1})` : '';
      parts.unshift(`${tag}${suffix}`);
      current = current.parentElement;
    }
    return parts.join(' > ');
  }

  function textAlternative(element) {
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
      const value = labelledBy
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
        .filter(Boolean)
        .join(' ');
      if (value) return value;
    }
    return (
      element.getAttribute('aria-label') ||
      element.getAttribute('alt') ||
      element.textContent ||
      ''
    ).trim();
  }

  const issues = [];
  const add = (code, message, element = document.documentElement) => {
    issues.push({ code, message, selector: selectorFor(element) });
  };

  if (!document.documentElement.lang.trim()) add('document-language-missing', 'The document has no language declaration.');
  if (!document.querySelector('main,[role="main"]')) add('main-landmark-missing', 'No main landmark was found.');
  if (!document.querySelector('h1')) add('h1-missing', 'No level-one heading was found.');

  const seenIds = new Set();
  for (const element of document.querySelectorAll('[id]')) {
    if (seenIds.has(element.id)) add('duplicate-id', `Duplicate id '${element.id}'.`, element);
    seenIds.add(element.id);
  }

  for (const image of document.querySelectorAll('img')) {
    if (!image.hasAttribute('alt')) add('image-alt-missing', 'Image lacks an alt attribute.', image);
  }

  for (const element of document.querySelectorAll('button,a[href],[role="button"],[role="link"]')) {
    if (!textAlternative(element)) add('interactive-name-missing', 'Interactive element has no detectable text alternative.', element);
  }

  for (const control of document.querySelectorAll('input:not([type="hidden"]),select,textarea')) {
    const labelled =
      Boolean(control.getAttribute('aria-label')?.trim()) ||
      Boolean(control.getAttribute('aria-labelledby')?.trim()) ||
      Boolean(control.id && document.querySelector(`label[for="${CSS.escape(control.id)}"]`)) ||
      Boolean(control.closest('label'));
    if (!labelled) add('form-name-missing', 'Form control has no supported label source.', control);
  }

  const root = document.documentElement;
  const body = document.body;
  const scrollWidth = Math.max(root.scrollWidth, body?.scrollWidth ?? 0);
  const clientWidth = root.clientWidth;
  return {
    title: document.title,
    url: location.href,
    documentWidth: scrollWidth,
    documentHeight: Math.max(root.scrollHeight, body?.scrollHeight ?? 0),
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    horizontalOverflow: scrollWidth > clientWidth + 1,
    focusableCount: document.querySelectorAll('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])').length,
    issues
  };
}

async function hashFile(path) {
  const data = await readFile(path);
  return createHash('sha256').update(data).digest('hex');
}

async function listRelativeFiles(root) {
  const output = [];
  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile()) output.push(relative(root, path).replaceAll('\\', '/'));
    }
  }
  await walk(root);
  return output;
}

export async function writeCaptureFailureReport({
  runDirectory,
  error,
  phase,
  browserIdentity,
  attemptedScreenshots = [],
  filesBefore = [],
  sourceHashes = null,
  diffSha256 = null
}) {
  const root = resolve(runDirectory);
  const filesAfter = await listRelativeFiles(root);
  const report = {
    schemaVersion: 1,
    status: 'failed',
    failureClass: error?.failureClass ?? 'capture-failure',
    safeErrorMessage: error?.message ?? String(error),
    phase,
    browserExecutablePath: browserIdentity?.executableRealPath ?? null,
    browserExecutableSha256: browserIdentity?.executableSha256 ?? null,
    playwrightVersion: browserIdentity?.playwrightVersion ?? null,
    chromiumVersion: browserIdentity?.chromiumVersion ?? null,
    filesAlreadyCreated: filesAfter.filter((path) => !filesBefore.includes(path)),
    attemptedScreenshots,
    sourceHashes,
    diffSha256,
    generatedAt: new Date().toISOString()
  };
  report.reportSha256 = sha256(stableStringify(report));
  await writeJsonExclusive(join(root, 'reports', 'capture-failure.json'), report);
  return report;
}

async function collectArtifactHashes(root) {
  const records = {};
  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const path = join(directory, entry.name);
      const rel = relative(root, path).replaceAll('\\', '/');
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile() && !['manifest.json', 'artifact-hashes.json'].includes(rel)) {
        records[rel] = { sha256: await hashFile(path), bytes: (await stat(path)).size };
      }
    }
  }
  await walk(root);
  return records;
}

export async function validateArtifactHashes(root, artifactHashesPath = 'artifact-hashes.json') {
  const report = JSON.parse(await readFile(join(root, artifactHashesPath), 'utf8'));
  for (const [path, expected] of Object.entries(report.artifacts ?? {})) {
    const bytes = await readFile(join(root, path));
    if (bytes.length !== expected.bytes || sha256(bytes) !== expected.sha256) {
      throw new Error(`Artifact hash mismatch: ${path}`);
    }
  }
  return true;
}

export async function captureRun({
  runDirectory,
  browserExecutablePath,
  entry = 'source/index.html',
  expectedChromiumVersion,
  sourceHashes = null,
  diffSha256 = null
}) {
  const root = resolve(runDirectory);
  const filesBefore = await listRelativeFiles(root);
  let phase = 'browser-identity';
  let browserIdentity = null;
  const attemptedScreenshots = [];
  const manifestPath = join(root, 'manifest.json');
  const manifest = validateRunManifestForCapture(JSON.parse(await readFile(manifestPath, 'utf8')));
  const entryPath = resolve(root, entry);
  const sourceRoot = join(root, 'source');
  if (!isPathInside(sourceRoot, entryPath)) {
    throw new Error('Capture entry must remain inside the run source directory.');
  }
  const entryInfo = await stat(entryPath).catch(() => null);
  if (!entryInfo?.isFile()) throw new Error(`Capture entry '${entry}' does not exist.`);
  const forbiddenExisting = [
    'artifact-hashes.json',
    'render-metadata.json',
    'reports/accessibility-calibration.json',
    'reports/design-canon-lint.json',
    'reports/browser-network.json',
    'reports/capture-failure.json',
    ...CAPTURE_VIEWPORTS.flatMap((viewport) => [
      `screenshots/${viewport.id}-viewport.png`,
      `screenshots/${viewport.id}-full-page.png`
    ])
  ];
  const collision = forbiddenExisting.find((path) => filesBefore.includes(path));
  if (collision) throw new Error(`Capture output already exists: ${collision}`);

  try {
    browserIdentity = await resolveBrowserExecutable(browserExecutablePath);
    phase = 'browser-launch';
    const launched = await launchPinnedChromium(browserExecutablePath, { expectedChromiumVersion });
    const { browser } = launched;
    browserIdentity = launched.identity;
    const browserVersion = browserIdentity.chromiumVersion;
    manifest.status = 'running';
    manifest.startedAt ??= new Date().toISOString();
    await writeJson(manifestPath, manifest);

  const viewportResults = [];
  const accessibilitySnapshots = [];
  const consoleMessages = [];
  const attemptedExternalRequests = [];
  const acceptedExternalResponses = [];
    try {
    for (const viewport of CAPTURE_VIEWPORTS) {
      phase = `viewport-${viewport.id}-context`;
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
        isMobile: viewport.isMobile,
        colorScheme: 'light',
        reducedMotion: 'reduce',
        serviceWorkers: 'block'
      });
      await context.route('**/*', async (route) => {
        const request = route.request();
        const url = request.url();
        if (url.startsWith('file:') || url.startsWith('data:') || url.startsWith('blob:')) await route.continue();
        else {
          attemptedExternalRequests.push({ viewport: viewport.id, url, method: request.method(), resourceType: request.resourceType(), disposition: 'aborted' });
          await route.abort('blockedbyclient');
        }
      });
      const page = await context.newPage();
      page.on('response', (response) => {
        const url = response.url();
        if (!url.startsWith('file:') && !url.startsWith('data:') && !url.startsWith('blob:')) acceptedExternalResponses.push({ viewport: viewport.id, url, status: response.status() });
      });
      page.on('console', (message) => {
        if (['error', 'warning'].includes(message.type())) {
          consoleMessages.push({ viewport: viewport.id, type: message.type(), text: message.text() });
        }
      });
      page.on('pageerror', (error) => {
        consoleMessages.push({ viewport: viewport.id, type: 'pageerror', text: error.message });
      });
      phase = `viewport-${viewport.id}-load`;
      await page.goto(pathToFileURL(entryPath).href, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await page.evaluate(() => new Promise((resolveFrame) => requestAnimationFrame(() => resolveFrame())));

      const viewportPath = join(root, 'screenshots', `${viewport.id}-viewport.png`);
      const fullPath = join(root, 'screenshots', `${viewport.id}-full-page.png`);
      await mkdir(join(root, 'screenshots'), { recursive: true });
      attemptedScreenshots.push(relative(root, viewportPath).replaceAll('\\', '/'));
      phase = `viewport-${viewport.id}-screenshot`;
      await page.screenshot({ path: viewportPath, fullPage: false });
      attemptedScreenshots.push(relative(root, fullPath).replaceAll('\\', '/'));
      await page.screenshot({ path: fullPath, fullPage: true });
      phase = `viewport-${viewport.id}-accessibility`;
      const audit = await page.evaluate(auditDocumentInPage);
      accessibilitySnapshots.push({ viewport: viewport.id, ...audit });
      viewportResults.push({
        viewport: viewport.id,
        width: viewport.width,
        height: viewport.height,
        horizontalOverflow: audit.horizontalOverflow,
        viewportScreenshot: relative(root, viewportPath).replaceAll('\\', '/'),
        fullPageScreenshot: relative(root, fullPath).replaceAll('\\', '/')
      });
      await context.close();
    }
    }
    finally {
    await browser.close();
    }
    phase = 'browser-network-report';
    const browserNetworkReport = {
      schemaVersion: 1,
      policy: 'local-file-only',
      attemptedExternalRequests,
      acceptedExternalResponses,
      externalResponsesAccepted: acceptedExternalResponses.length,
      passed: acceptedExternalResponses.length === 0
    };
    const browserNetworkPath = join(root, 'reports', 'browser-network.json');
    await writeJsonExclusive(browserNetworkPath, browserNetworkReport);
    if (!browserNetworkReport.passed) throw new Error('Capture accepted an external browser response.');

  phase = 'accessibility-report';
  const accessibilityReport = summarizeAccessibilitySnapshots(accessibilitySnapshots);
  accessibilityReport.consoleMessages = consoleMessages;
  const accessibilityPath = join(root, 'reports', 'accessibility-calibration.json');
  await mkdir(join(root, 'reports'), { recursive: true });
  await writeJson(accessibilityPath, accessibilityReport);

  phase = 'design-canon-lint';
  const lintReport = await lintPath({
    path: sourceRoot,
    profile: manifest.profile,
    mode: 'browser',
    browserExecutablePath: browserIdentity.executableRealPath
  });
  const lintPathName = join(root, 'reports', 'design-canon-lint.json');
  await writeJson(lintPathName, lintReport);

  phase = 'render-metadata';
  const renderMetadata = {
    schemaVersion: 1,
    entry: relative(root, entryPath).replaceAll('\\', '/'),
    captureTool: 'playwright',
    browser: browserVersion,
    browserExecutable: browserIdentity,
    networkPolicy: 'local-file-only',
    reducedMotion: 'reduce',
    colorScheme: 'light',
    consoleMessages,
    attemptedExternalRequests,
    acceptedExternalResponses,
    externalNetworkBlocked: acceptedExternalResponses.length === 0,
    viewportResults
  };
  await writeJson(join(root, 'render-metadata.json'), renderMetadata);

  phase = 'artifact-hashing';
  const hashes = await collectArtifactHashes(root);
  await writeJsonExclusive(join(root, 'artifact-hashes.json'), {
    schemaVersion: 1,
    excludes: ['manifest.json', 'artifact-hashes.json'],
    artifacts: hashes
  });
  await validateArtifactHashes(root);

  manifest.status = 'complete';
  manifest.completedAt = new Date().toISOString();
  manifest.environment = {
    ...manifest.environment,
    operatingSystem: process.platform,
    architecture: process.arch,
    nodeVersion: process.version,
    browser: browserVersion,
    browserExecutablePath: browserIdentity.executableRealPath,
    browserExecutableSha256: browserIdentity.executableSha256,
    playwrightVersion: browserIdentity.playwrightVersion,
    captureTool: 'playwright',
    accessibilityTool: accessibilityReport.scanner
  };
  manifest.limits = { ...manifest.limits, networkPolicy: 'local-file-only' };
  manifest.viewportResults = viewportResults;
  manifest.lintReportPath = relative(root, lintPathName).replaceAll('\\', '/');
  manifest.accessibilityReportPath = relative(root, accessibilityPath).replaceAll('\\', '/');
  manifest.browserNetworkReportPath = relative(root, browserNetworkPath).replaceAll('\\', '/');
  manifest.artifactHashesPath = 'artifact-hashes.json';
  await writeJson(manifestPath, manifest);
  return { manifest, renderMetadata, accessibilityReport, lintReport, browserIdentity };
  } catch (error) {
    if (!error.failureClass) {
      error.failureClass = phase === 'artifact-hashing'
        ? 'artifact-hash-failure'
        : 'capture-failure';
    }
    if (!error.captureFailureReport) {
      error.captureFailureReport = await writeCaptureFailureReport({
        runDirectory: root,
        error,
        phase,
        browserIdentity,
        attemptedScreenshots,
        filesBefore,
        sourceHashes,
        diffSha256
      }).catch(() => null);
    }
    throw error;
  }
}
