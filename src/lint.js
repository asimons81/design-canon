import { readFile, stat } from 'node:fs/promises';
import { relative } from 'node:path';
import {
  collectSourceFiles,
  loadCatalog,
  loadProfile,
  MAX_SOURCE_FILE_BYTES
} from './io.js';
import { selectRules } from './select.js';

const MAX_FINDINGS = 10000;

function lineNumber(text, index) {
  return text.slice(0, index).split('\n').length;
}

function compilePattern(pattern) {
  const flags = new Set(pattern.flags ?? 'gim');
  flags.add('g');
  return new RegExp(pattern.source, [...flags].join(''));
}

export async function lintPath({ path, profile: profileName }) {
  const [catalog, profile, files] = await Promise.all([
    loadCatalog(),
    loadProfile(profileName),
    collectSourceFiles(path)
  ]);
  const rules = selectRules(catalog, profile).filter(
    (rule) => rule.detect?.patterns?.length
  );
  const findings = [];
  const skipped = [];

  outer: for (const file of files) {
    const info = await stat(file);
    if (info.size > MAX_SOURCE_FILE_BYTES) {
      skipped.push({
        file: relative(process.cwd(), file),
        reason: `File exceeds ${MAX_SOURCE_FILE_BYTES} byte scan limit.`,
        bytes: info.size
      });
      continue;
    }

    const text = await readFile(file, 'utf8');
    for (const rule of rules) {
      for (const pattern of rule.detect.patterns) {
        const regex = compilePattern(pattern);
        for (const match of text.matchAll(regex)) {
          findings.push({
            file: relative(process.cwd(), file),
            line: lineNumber(text, match.index ?? 0),
            rule: rule.id,
            severity: rule.severity,
            message: rule.detect.message,
            evidence: String(match[0]).replace(/\s+/g, ' ').slice(0, 160)
          });
          if (findings.length >= MAX_FINDINGS) {
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
  }

  findings.sort(
    (a, b) =>
      a.file.localeCompare(b.file) ||
      a.line - b.line ||
      a.rule.localeCompare(b.rule)
  );

  return {
    profile: profile.id,
    filesDiscovered: files.length,
    filesScanned:
      files.length - skipped.filter((entry) => entry.file !== '*').length,
    skipped,
    findings,
    errors: findings.filter((finding) => finding.severity === 'error').length,
    warnings: findings.filter((finding) => finding.severity === 'warning').length,
    info: findings.filter((finding) => finding.severity === 'info').length
  };
}

export async function lintCommand({ path, profile, format }) {
  const result = await lintPath({ path, profile });
  if (format === 'json') {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return result;
  }

  if (!result.findings.length) {
    console.log(
      `Design Canon: no detectable violations in ${result.filesScanned} file(s).`
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
  console.log(
    `${result.errors} error(s), ${result.warnings} warning(s), ${result.info} info, ${result.filesScanned} file(s) scanned.`
  );
  return result;
}
