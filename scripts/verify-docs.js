import assert from 'node:assert/strict';
import { lstat, readFile, readdir } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';

const ROOT = resolve(process.cwd());
const SKIP_DIRECTORIES = new Set(['.git', '.benchmark', 'node_modules']);
const REQUIRED_DOCS = [
  'README.md',
  'ROADMAP.md',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'docs/README.md',
  'docs/RELEASE_STATUS.md',
  'docs/RELEASING.md',
  'docs/MAINTENANCE.md',
  'docs/ARCHITECTURE.md',
  'docs/CONFIGURATION.md',
  'docs/ADAPTERS.md'
];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.github') continue;
    if (SKIP_DIRECTORIES.has(entry.name)) continue;

    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) files.push(path);
  }

  return files;
}

function stripFencedCode(content) {
  return content.replace(/```[\s\S]*?```/g, '');
}

function linkDestination(raw) {
  const value = raw.trim();
  if (value.startsWith('<')) {
    const end = value.indexOf('>');
    return end === -1 ? value : value.slice(1, end);
  }
  const match = value.match(/^(\S+?)(?:\s+["'(].*)?$/);
  return match?.[1] ?? value;
}

function isExternal(target) {
  return (
    target.startsWith('#') ||
    target.startsWith('/') ||
    /^[a-z][a-z0-9+.-]*:/i.test(target)
  );
}

function insideRoot(path) {
  const offset = relative(ROOT, path);
  return offset === '' || (!offset.startsWith(`..${sep}`) && offset !== '..' && !offset.startsWith(sep));
}

async function pathExists(path) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

for (const path of REQUIRED_DOCS) {
  assert.equal(await pathExists(resolve(ROOT, path)), true, `Missing required documentation: ${path}`);
}

const markdownFiles = (await walk(ROOT)).sort();
const failures = [];
let checkedLinks = 0;

for (const file of markdownFiles) {
  const source = await readFile(file, 'utf8');
  const content = stripFencedCode(source);
  const displayPath = relative(ROOT, file).split(sep).join('/');

  assert.doesNotMatch(source, /Tonight's boundary/i, `${displayPath} contains stale time-relative status language.`);

  for (const match of content.matchAll(/!?\[[^\]]*\]\(([^)\n]+)\)/g)) {
    const rawTarget = linkDestination(match[1]);
    if (!rawTarget || isExternal(rawTarget)) continue;

    const withoutFragment = rawTarget.split('#', 1)[0].split('?', 1)[0];
    if (!withoutFragment) continue;

    let decoded;
    try {
      decoded = decodeURIComponent(withoutFragment);
    } catch {
      failures.push(`${displayPath}: invalid encoded link '${rawTarget}'`);
      continue;
    }

    const resolvedTarget = resolve(dirname(file), decoded);
    checkedLinks += 1;

    if (!insideRoot(resolvedTarget)) {
      failures.push(`${displayPath}: link escapes repository '${rawTarget}'`);
      continue;
    }

    if (!(await pathExists(resolvedTarget))) {
      failures.push(`${displayPath}: missing internal link target '${rawTarget}'`);
    }
  }
}

const packageJson = JSON.parse(await readFile(resolve(ROOT, 'package.json'), 'utf8'));
const releaseStatus = await readFile(resolve(ROOT, 'docs/RELEASE_STATUS.md'), 'utf8');
const readme = await readFile(resolve(ROOT, 'README.md'), 'utf8');

assert.match(
  releaseStatus,
  new RegExp(`Package manifest[^\n]*\\\`${packageJson.version.replaceAll('.', '\\.') }\\\``),
  'Release status must name the current package manifest version.'
);
assert.match(readme, /docs\/RELEASE_STATUS\.md/, 'README must link to the authoritative release status.');

assert.deepEqual(failures, [], `Documentation verification failed:\n${failures.join('\n')}`);

console.log(
  `Documentation verification passed: ${markdownFiles.length} Markdown files, ${checkedLinks} internal links.`
);
