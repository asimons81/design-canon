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

/**
 * Separate selected rules into static pattern rules, structural static rules,
 * and browser rules (those with detect.browserAnalyzer).
 */
function classifyRules(rules) {
  const staticPatternRules = [];
  const structuralStaticRules = [];
  const browserRules = [];

  for (const rule of rules) {
    if (rule.detect?.browserAnalyzer) {
      browserRules.push(rule);
    } else if (rule.detect?.patterns) {
      staticPatternRules.push(rule);
    } else {
      // Rules without detect (editorial.reading-measure, marketing.single-primary-action, etc.)
      staticPatternRules.push(rule);
    }
  }

  return { staticPatternRules, structuralStaticRules, browserRules };
}

export async function lintPath({
  path,
  profile: requestedProfile = null,
  configPath = null,
  referenceDate = new Date(),
  mode: requestedMode = null,
  browserExecutablePath = null
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
  const rules = selectRules(catalog, profile);

  // Classify selected rules
  const { browserRules } = classifyRules(rules);

  const findings = [];
  const suppressedFindings = [];
  const skipped = [];
  const analysisRecords = [];
  const usedSuppressionIndexes = new Set();
  let observedFindings = 0;

  // Filter for static-only rules (rules that have patterns or no detect at all)
  const allStaticRules = rules.filter(
    (rule) => !(rule.detect?.browserAnalyzer)
  );

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

    // Static pattern matching (rules with detect.patterns)
    for (const rule of rules) {
      if (rule.detect?.browserAnalyzer) continue; // Skip browser-only rules
      if (!rule.detect?.patterns) continue;
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
    }

    // Structural analyzer (second pass for structural-only rules)
    for (const rule of allStaticRules) {
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
    const capability = await detectBrowserCapability({ executablePath: browserExecutablePath });
    const resolved = resolveMode(effectiveLintMode, capability);

    if (resolved.skipped) {
      // In auto mode without browser, record skipped records for each
      // eligible file × selected F019 rule
      for (const file of files) {
        if (file.endsWith('.html')) {
          for (const rule of browserRules) {
            const ba = rule.detect.browserAnalyzer;
            if (!ba.extensions.some(ext => file.endsWith(ext))) continue;
            const { createAnalysisRecord } = await import('./browser/schema.js');
            analysisRecords.push(
              createAnalysisRecord({
                status: 'skipped',
                file: normalizePath(relative(process.cwd(), file)),
                analyzerId: ba.id,
                ruleId: rule.id,
                message: 'Analysis skipped: browser runtime not available in auto mode.'
              })
            );
          }
        }
      }
    } else if (resolved.available) {
      const { launchBrowser, closeBrowser, createAnalysisPage, closeAnalysisPage } =
        await import('./browser/launcher.js');
      const { loadLocalPage } = await import('./browser/page.js');
      const { createAnalysisRecord } =
        await import('./browser/schema.js');
      const { runAnalyzer, listAnalyzers } = await import('./browser/analyzer.js');

      // Initialize production analyzers
      const { setupAnalyzers } = await import('./browser/analyzers/index.js');
      setupAnalyzers();

      let browserInstance;
      try {
        browserInstance = await launchBrowser({
          concurrency: browserConfig.concurrency,
          pageTimeout: browserConfig.pageTimeout,
          operationTimeout: browserConfig.operationTimeout,
          javaScriptEnabled: browserConfig.javaScriptEnabled,
          colorScheme: browserConfig.colorScheme,
          scanRoot: process.cwd(),
          executablePath: browserExecutablePath
        });

        const htmlFiles = files.filter(
          (file) => file.endsWith('.html')
        );

        for (const file of htmlFiles) {
          // Determine which browser rules apply to this file
          const applicableRules = browserRules.filter(rule => {
            const ba = rule.detect.browserAnalyzer;
            return ba.extensions.some(ext => file.endsWith(ext));
          });

          if (applicableRules.length === 0) continue;

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

            // Record page-loaded info record
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

            // Execute only analyzers referenced by selected browser rules
            const uniqueAnalyzerIds = new Set(
              applicableRules.map(r => r.detect.browserAnalyzer.id)
            );

            for (const analyzerId of uniqueAnalyzerIds) {
              if (Date.now() > browserInstance.deadline) break;

              // Get all rules that reference this analyzer
              const rulesForAnalyzer = applicableRules.filter(
                r => r.detect.browserAnalyzer.id === analyzerId
              );

              const result = await runAnalyzer(analyzerId, {
                filePath: file,
                scanRoot: process.cwd(),
                viewport: browserConfig.viewport,
                colorScheme: browserConfig.colorScheme,
                browserVersion,
                deadline: browserInstance.deadline,
                rule: {
                  id: rulesForAnalyzer[0]?.id || '',
                  title: rulesForAnalyzer[0]?.title || '',
                  severity: rulesForAnalyzer[0]?.severity || 'warning',
                  message: rulesForAnalyzer[0]?.detect?.message || '',
                  browserAnalyzer: rulesForAnalyzer[0]?.detect?.browserAnalyzer || {}
                },
                pageAdapters: {
                  evaluate: (fn, arg) => {
                    // fn can be a function (serialized by Playwright) or a string expression
                    if (typeof fn === 'function') {
                      // Playwright serializes functions to the browser
                      if (arg !== undefined) {
                        return page.evaluate(fn, arg);
                      }
                      return page.evaluate(fn);
                    }
                    // String expression evaluated directly
                    return page.evaluate(fn);
                  },
                  getComputedStyle: (sel, prop) =>
                    page.evaluate(({ s, p }) => {
                      const el = document.querySelector(s);
                      if (!el) return null;
                      return getComputedStyle(el).getPropertyValue(p);
                    }, { s: sel, p: prop })
                }
              });

              // Create analysis records for each rule that references this analyzer
              for (const rule of rulesForAnalyzer) {
                analysisRecords.push(
                  createAnalysisRecord({
                    status: result.status,
                    file: normalizePath(relative(process.cwd(), file)),
                    analyzerId,
                    ruleId: rule.id,
                    viewport: browserConfig.viewport,
                    browserEngine: 'chromium',
                    browserVersion: browserInstance.browserVersion,
                    measurements: result.measurements,
                    message: result.message,
                    confidence: result.confidence,
                    samples: result.samples
                  })
                );

                // Convert confirmed violation samples into findings
                if (result.samples && result.status === 'confirmed') {
                  for (const sample of result.samples) {
                    if (sample.status === 'confirmed' && sample.outcome === 'violation') {
                      const evidence = rule.id === 'mobile.touch-target-minimum'
                        ? buildTouchTargetEvidence(sample, browserConfig.viewport, browserConfig.colorScheme, browserVersion)
                        : buildContrastEvidence(sample, browserConfig.viewport, browserConfig.colorScheme, browserVersion);
                      const finding = {
                        file: normalizePath(relative(process.cwd(), file)),
                        line: 1,
                        rule: rule.id,
                        severity: rule.severity,
                        message: rule.detect?.message || 'Rendered text contrast measured below the configured minimum in the analyzed Chromium state.',
                        evidence
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
                        break;
                      }
                    }
                  }
                }
              }
            }
          } catch (err) {
            analysisRecords.push({
              status: 'failed',
              file: normalizePath(relative(process.cwd(), file)),
              analyzerId: '__runtime__',
              message: `Page analysis failed: ${err.message}`,
              error: { type: 'page_load_failed', message: err.message }
            });
          } finally {
            if (page) {
              await closeAnalysisPage(page);
            }
          }
        }
      } catch (err) {
        analysisRecords.push({
          status: 'failed',
          file: normalizePath(relative(process.cwd(), path)),
          analyzerId: '__runtime__',
          error: { type: 'browser_launch_failed', message: err.message }
        });
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

/**
 * Build a concise deterministic evidence string for a contrast violation.
 */
function buildContrastEvidence(sample, viewport, colorScheme, browserVersion) {
  const vp = typeof viewport === 'string' ? viewport : (viewport?.name || 'desktop');
  const scheme = colorScheme || 'light';
  const ver = browserVersion || 'unknown';
  return `selector="${sample.selector}"; text="${sample.text}"; foreground=${sample.foreground}; background=${sample.background}; ratio=${sample.displayRatio}:1; required=${sample.requiredRatio}:1; font=${sample.fontSizePx}px/${sample.fontWeight}; viewport=${vp}(${sample.viewportWidth || ''}x${sample.viewportHeight || ''}); scheme=${scheme}; chromium=${ver}`;
}

/**
 * Build a concise deterministic evidence string for a touch-target violation.
 */
function buildTouchTargetEvidence(sample, viewport, colorScheme, browserVersion) {
  const vp = typeof viewport === 'string' ? viewport : (viewport?.name || 'desktop');
  const scheme = colorScheme || 'light';
  const ver = browserVersion || 'unknown';
  const parts = [
    `selector="${sample.selector}"`,
    `target=${sample.targetType}`,
    `label="${sample.label || ''}"`,
    `size=${(sample.width || 0).toFixed(3)}x${(sample.height || 0).toFixed(3)}`,
    `required=24x24`
  ];

  if (sample.spacingProof) {
    parts.push(`spacing=${sample.spacingProof.passed ? 'passed' : 'failed'}`);
    if (sample.spacingProof.nearest) {
      parts.push(`nearest="${sample.spacingProof.nearest}"`);
    }
    if (sample.spacingProof.nearestDistance !== null && sample.spacingProof.nearestDistance !== undefined) {
      parts.push(`centerDistance=${sample.spacingProof.nearestDistance.toFixed(3)}`);
    }
  }

  parts.push(`viewport=${vp}(${sample.viewportWidth || ''}x${sample.viewportHeight || ''})`);
  parts.push(`scheme=${scheme}`);
  parts.push(`chromium=${ver}`);

  return parts.join('; ');
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
