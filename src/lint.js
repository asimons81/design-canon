import { open } from 'node:fs/promises';
import { relative } from 'node:path';
import { findSuppression, loadConfig } from './config.js';
import {
  collectSourceFiles,
  loadCatalog,
  loadProfile,
  MAX_SOURCE_FILE_BYTES
} from './io.js';
import { selectRules } from './select.js';
import { detectUnlabeledControls, detectSkipLink } from './html-scanner.js';
import { detectUnprotectedMotion, detectUnprotectedMotionInHtml, extractStyleBlocks } from './css-reduced-motion.js';
import {
  detectBrowserCapability,
  resolveMode,
  effectiveMode,
  parseBrowserConfig,
  DEFAULT_BROWSER_CONFIG
} from './browser/index.js';

const MAX_FINDINGS = 10000;

function normalizePath(value) {
  return value.replaceAll('\\', '/');
}

function lineNumber(text, index) {
  return text.slice(0, index).split('\n').length;
}

function compilePattern(pattern) {
  const flags = new Set(pattern.flags ?? 'gim');
  flags.add('g');
  return new RegExp(pattern.source, [...flags].join(''));
}

function publicSuppression(suppression) {
  const publicFields = { ...suppression };
  delete publicFields.matchers;
  delete publicFields.index;
  return publicFields;
}

async function readBoundedFile(file) {
  const handle = await open(file, 'r');
  try {
    const info = await handle.stat();
    if (!info.isFile()) {
      return {
        info,
        text: null,
        reason: 'Path is no longer a regular file.'
      };
    }
    if (info.size > MAX_SOURCE_FILE_BYTES) {
      return {
        info,
        text: null,
        reason: `File exceeds ${MAX_SOURCE_FILE_BYTES} byte scan limit.`
      };
    }
    return {
      info,
      text: await handle.readFile({ encoding: 'utf8' }),
      reason: null
    };
  } finally {
    await handle.close();
  }
}

export async function lintPath({
  path,
  profile: requestedProfile = null,
  configPath = null,
  referenceDate = new Date(),
  mode: requestedMode = null
}) {
  const catalog = await loadCatalog();
  const loadedConfig = await loadConfig(configPath, { catalog, referenceDate });
  const profileName = requestedProfile ?? loadedConfig.config.profile ?? 'product-app';
  const browserConfig = loadedConfig.browserConfig ?? DEFAULT_BROWSER_CONFIG;
  const effectiveLintMode = effectiveMode({ cliMode: requestedMode, browserConfig });
  const [profile, files] = await Promise.all([
    loadProfile(profileName),
    collectSourceFiles(path)
  ]);
  const rules = selectRules(catalog, profile).filter(
    (rule) => rule.detect?.patterns?.length
  );
  const findings = [];
  const suppressedFindings = [];
  const skipped = [];
  const analysisRecords = [];
  const usedSuppressionIndexes = new Set();
  let observedFindings = 0;

  outer: for (const file of files) {
    const { info, text, reason } = await readBoundedFile(file);
    if (reason) {
      skipped.push({
        file: normalizePath(relative(process.cwd(), file)),
        reason,
        bytes: info.size
      });
      continue;
    }

    for (const rule of rules) {
      for (const pattern of rule.detect.patterns) {
        const regex = compilePattern(pattern);
        for (const match of text.matchAll(regex)) {
          const finding = {
            file: normalizePath(relative(process.cwd(), file)),
            line: lineNumber(text, match.index ?? 0),
            rule: rule.id,
            severity: rule.severity,
            message: rule.detect.message,
            evidence: String(match[0]).replace(/\s+/g, ' ').slice(0, 160)
          };
          const suppression = findSuppression(loadedConfig.suppressions, finding);
          if (suppression) {
            usedSuppressionIndexes.add(suppression.index);
            suppressedFindings.push({
              ...finding,
              suppression: publicSuppression(suppression)
            });
          } else {
            findings.push(finding);
          }

          observedFindings += 1;
          if (observedFindings >= MAX_FINDINGS) {
            skipped.push({
              file: '*',
              reason: `Finding limit of ${MAX_FINDINGS} reached.`
            });
            break outer;
          }
          if (!pattern.multiple) break;
        }
      }

      // Structural analyzer for rules that require HTML-level understanding.
      // This runs INSTEAD of regex pattern matching for these rules.
      if (
        rule.id === 'forms.input-labels-required' &&
        file.endsWith('.html')
      ) {
        // Skip the generic regex pattern matching for structural rules
        // to avoid false positives from literal sentinel text.
        continue;
      }
      if (
        rule.id === 'motion.respect-reduced-motion' &&
        (file.endsWith('.css') || file.endsWith('.html'))
      ) {
        continue;
      }
      if (
        rule.id === 'accessibility.skip-link' &&
        file.endsWith('.html')
      ) {
        continue;
      }
    }

    // Structural analyzer (second pass for structural-only rules)
    for (const rule of rules) {
      if (
        rule.id === 'forms.input-labels-required' &&
        file.endsWith('.html')
      ) {
        const structuralFindings = detectUnlabeledControls(
          normalizePath(relative(process.cwd(), file)),
          text,
          rule.id,
          rule.severity
        );
        for (const finding of structuralFindings) {
          const suppression = findSuppression(loadedConfig.suppressions, finding);
          if (suppression) {
            usedSuppressionIndexes.add(suppression.index);
            suppressedFindings.push({
              ...finding,
              suppression: publicSuppression(suppression)
            });
          } else {
            findings.push(finding);
          }

          observedFindings += 1;
          if (observedFindings >= MAX_FINDINGS) {
            skipped.push({
              file: '*',
              reason: `Finding limit of ${MAX_FINDINGS} reached.`
            });
            break outer;
          }
        }
      }

      if (
        rule.id === 'motion.respect-reduced-motion'
      ) {
        let structuralFindings;
        if (file.endsWith('.css')) {
          structuralFindings = detectUnprotectedMotion(text, 0).map(f => ({
            file: normalizePath(relative(process.cwd(), file)),
            line: f.line,
            rule: rule.id,
            severity: rule.severity,
            message: f.message,
            evidence: f.evidence
          }));
        } else if (file.endsWith('.html')) {
          structuralFindings = detectUnprotectedMotionInHtml(
            text,
            normalizePath(relative(process.cwd(), file)),
            rule.id,
            rule.severity
          );
        }
        if (structuralFindings && structuralFindings.length > 0) {
          for (const finding of structuralFindings) {
            const suppression = findSuppression(loadedConfig.suppressions, finding);
            if (suppression) {
              usedSuppressionIndexes.add(suppression.index);
              suppressedFindings.push({
                ...finding,
                suppression: publicSuppression(suppression)
              });
            } else {
              findings.push(finding);
            }

            observedFindings += 1;
            if (observedFindings >= MAX_FINDINGS) {
              skipped.push({
                file: '*',
                reason: `Finding limit of ${MAX_FINDINGS} reached.`
              });
              break outer;
            }
          }
        }
      }

      if (
        rule.id === 'accessibility.skip-link' &&
        file.endsWith('.html')
      ) {
        const structuralFindings = detectSkipLink(
          normalizePath(relative(process.cwd(), file)),
          text,
          rule.id,
          rule.severity
        );
        for (const finding of structuralFindings) {
          const suppression = findSuppression(loadedConfig.suppressions, finding);
          if (suppression) {
            usedSuppressionIndexes.add(suppression.index);
            suppressedFindings.push({
              ...finding,
              suppression: publicSuppression(suppression)
            });
          } else {
            findings.push(finding);
          }

          observedFindings += 1;
          if (observedFindings >= MAX_FINDINGS) {
            skipped.push({
              file: '*',
              reason: `Finding limit of ${MAX_FINDINGS} reached.`
            });
            break outer;
          }
        }
      }
    }
  }

  // Browser-assisted analysis when mode is auto or browser
  if (effectiveLintMode === 'auto' || effectiveLintMode === 'browser') {
    const capability = await detectBrowserCapability();
    const resolved = resolveMode(effectiveLintMode, capability);

    if (resolved.skipped) {
      // In auto mode without browser, record skipped records for each HTML file
      for (const file of files) {
        if (file.endsWith('.html')) {
          const { createAnalysisRecord } = await import('./browser/schema.js');
          analysisRecords.push(
            createAnalysisRecord({
              status: 'skipped',
              file: normalizePath(relative(process.cwd(), file)),
              analyzerId: '__runtime__',
              message: 'Analysis skipped: browser runtime not available in auto mode.'
            })
          );
        }
      }
    } else if (resolved.available) {
      const { launchBrowser, closeBrowser, createAnalysisPage, closeAnalysisPage } =
        await import('./browser/launcher.js');
      const { loadLocalPage } = await import('./browser/page.js');
      const { createAnalysisRecord, confirmedRecord, failedRecord } =
        await import('./browser/schema.js');
      const { runAnalyzer, listAnalyzers } = await import('./browser/analyzer.js');

      let browserInstance;
      try {
        browserInstance = await launchBrowser({
          concurrency: browserConfig.concurrency,
          pageTimeout: browserConfig.pageTimeout,
          operationTimeout: browserConfig.operationTimeout,
          javaScriptEnabled: browserConfig.javaScriptEnabled,
          colorScheme: browserConfig.colorScheme,
          scanRoot: process.cwd()
        });

        const htmlFiles = files.filter(
          (file) => file.endsWith('.html')
        );

        for (const file of htmlFiles) {
          let page;
          try {
            page = await createAnalysisPage(browserInstance);

            await loadLocalPage(
              page,
              file,
              browserConfig.viewport,
              browserConfig.pageTimeout
            );

            // Get browser version for metadata
            const browserVersion = browserInstance.browserVersion;

            // Record browser version metadata as a runtime info record
            analysisRecords.push(
              createAnalysisRecord({
                status: 'indeterminate',
                file: normalizePath(relative(process.cwd(), file)),
                analyzerId: '__runtime__',
                viewport: browserConfig.viewport,
                browserEngine: 'chromium',
                browserVersion,
                message: 'Page loaded successfully in browser context.'
              })
            );
            // Execute every registered analyzer against this page
            const analyzerIds = listAnalyzers();
            for (const analyzerId of analyzerIds) {
              if (Date.now() > browserInstance.deadline) break;

              const result = await runAnalyzer(analyzerId, {
                filePath: file,
                scanRoot: process.cwd(),
                viewport: browserConfig.viewport,
                deadline: browserInstance.deadline,
                rule: {},
                getComputedStyle: (sel, prop) =>
                  import('./browser/page.js').then((m) =>
                    m.getComputedStyle(page, sel, prop)
                  ),
                getBoundingBox: (sel) =>
                  import('./browser/page.js').then((m) =>
                    m.getBoundingBox(page, sel)
                  ),
                getTextContent: (sel) =>
                  import('./browser/page.js').then((m) =>
                    m.getTextContent(page, sel)
                  ),
                elementExists: (sel) =>
                  import('./browser/page.js').then((m) =>
                    m.elementExists(page, sel)
                  ),
                captureScreenshot: () =>
                  import('./browser/page.js').then((m) =>
                    m.captureScreenshot(page)
                  ),
                page: null
              });

              analysisRecords.push(
                createAnalysisRecord({
                  status: result.status,
                  file: normalizePath(relative(process.cwd(), file)),
                  analyzerId,
                  viewport: browserConfig.viewport,
                  browserEngine: 'chromium',
                  browserVersion: browserInstance.browserVersion,
                  measurements: result.measurements,
                  message: result.message,
                  confidence: result.confidence
                })
              );
            }
          } catch (err) {
            analysisRecords.push(
              failedRecord({
                file: normalizePath(relative(process.cwd(), file)),
                analyzerId: '__runtime__',
                message: `Page analysis failed: ${err.message}`,
                errorType: 'page_load_failed'
              })
            );
          } finally {
            if (page) {
              await closeAnalysisPage(page);
            }
          }
        }
      } catch (err) {
        analysisRecords.push(
          createAnalysisRecord({
            status: 'failed',
            file: normalizePath(relative(process.cwd(), path)),
            analyzerId: '__runtime__',
            error: { type: 'browser_launch_failed', message: err.message }
          })
        );
      } finally {
        if (browserInstance) {
          await closeBrowser(browserInstance);
        }
      }
    } else if (resolved.error) {
      // In browser mode without availability, produce operation error
      if (effectiveLintMode === 'browser') {
        const err = new Error(resolved.error);
        err.browserError = true;
        err.exitCode = 3;
        throw err;
      }
    }
  }

  const sortFindings = (a, b) =>
    a.file.localeCompare(b.file) ||
    a.line - b.line ||
    a.rule.localeCompare(b.rule);
  findings.sort(sortFindings);
  suppressedFindings.sort(sortFindings);

  const unusedSuppressions = loadedConfig.suppressions
    .filter((suppression) => !usedSuppressionIndexes.has(suppression.index))
    .map(publicSuppression);

  return {
    profile: profile.id,
    config: loadedConfig.path,
    mode: effectiveLintMode,
    filesDiscovered: files.length,
    filesScanned:
      files.length - skipped.filter((entry) => entry.file !== '*').length,
    skipped,
    findings,
    suppressedFindings,
    suppressions: {
      configured: loadedConfig.suppressions.length,
      used: usedSuppressionIndexes.size,
      unused: unusedSuppressions
    },
    analysisRecords,
    errors: findings.filter((finding) => finding.severity === 'error').length,
    warnings: findings.filter((finding) => finding.severity === 'warning').length,
    info: findings.filter((finding) => finding.severity === 'info').length
  };
}

export async function lintCommand({ path, profile, format, configPath = null, mode = null }) {
  const result = await lintPath({ path, profile, configPath, mode });
  if (format === 'json') {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return result;
  }

  if (!result.findings.length) {
    console.log(
      `Design Canon: no unsuppressed detectable violations in ${result.filesScanned} file(s).`
    );
  } else {
    for (const finding of result.findings) {
      console.log(
        `${finding.file}:${finding.line}  ${finding.severity.toUpperCase()}  ${finding.rule}`
      );
      console.log(`  ${finding.message}`);
      console.log(`  ${finding.evidence}\n`);
    }
  }

  for (const entry of result.skipped) {
    console.error(`SKIPPED ${entry.file}: ${entry.reason}`);
  }
  for (const suppression of result.suppressions.unused) {
    console.error(
      `UNUSED SUPPRESSION ${suppression.rule}: ${suppression.files.join(', ')}`
    );
  }
  if (result.suppressedFindings.length) {
    console.log(
      `${result.suppressedFindings.length} finding(s) suppressed by ${result.suppressions.used} justified exception(s).`
    );
  }
  if (result.analysisRecords && result.analysisRecords.length > 0) {
    const confirmed = result.analysisRecords.filter((r) => r.status === 'confirmed').length;
    const skippedCount = result.analysisRecords.filter((r) => r.status === 'skipped').length;
    const failed = result.analysisRecords.filter((r) => r.status === 'failed').length;
    const indeterminate = result.analysisRecords.filter((r) => r.status === 'indeterminate').length;
    console.log(
      `Browser analysis: ${confirmed} confirmed, ${indeterminate} indeterminate, ${skippedCount} skipped, ${failed} failed.`
    );
  }
  console.log(
    `${result.errors} error(s), ${result.warnings} warning(s), ${result.info} info, ${result.filesScanned} file(s) scanned.`
  );
  return result;
}
