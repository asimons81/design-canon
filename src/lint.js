import { readFile } from 'node:fs/promises';
import { relative } from 'node:path';
import { collectSourceFiles, loadCatalog, loadProfile } from './io.js';
import { selectRules } from './select.js';

function lineNumber(text, index) {
  return text.slice(0, index).split('\n').length;
}

function compilePattern(pattern) {
  return new RegExp(pattern.source, pattern.flags ?? 'gim');
}

export async function lintPath({ path, profile: profileName }) {
  const [catalog, profile, files] = await Promise.all([
    loadCatalog(),
    loadProfile(profileName),
    collectSourceFiles(path)
  ]);
  const rules = selectRules(catalog, profile).filter((rule) => rule.detect?.patterns?.length);
  const findings = [];

  for (const file of files) {
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
            evidence: String(match[0]).slice(0, 120)
          });
          if (!pattern.multiple) break;
        }
      }
    }
  }

  return {
    profile: profile.id,
    filesScanned: files.length,
    findings,
    errors: findings.filter((finding) => finding.severity === 'error').length,
    warnings: findings.filter((finding) => finding.severity !== 'error').length
  };
}

export async function lintCommand({ path, profile, format }) {
  const result = await lintPath({ path, profile });
  if (format === 'json') {
    console.log(JSON.stringify(result, null, 2));
    return result;
  }
  if (!result.findings.length) {
    console.log(`Design Canon: no detectable violations in ${result.filesScanned} file(s).`);
    return result;
  }
  for (const finding of result.findings) {
    console.log(`${finding.file}:${finding.line}  ${finding.severity.toUpperCase()}  ${finding.rule}`);
    console.log(`  ${finding.message}`);
    console.log(`  ${finding.evidence}\n`);
  }
  console.log(`${result.errors} error(s), ${result.warnings} warning(s), ${result.filesScanned} file(s) scanned.`);
  return result;
}
