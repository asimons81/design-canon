import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
export const PROTOCOL_PATH = 'research/benchmark/protocol-v1/protocol.json';

export function repositoryPath(...parts) {
  return join(REPOSITORY_ROOT, ...parts);
}

export async function readJson(relativePath) {
  const text = await readFile(repositoryPath(relativePath), 'utf8');
  return JSON.parse(text);
}

export async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, stableStringify(value), 'utf8');
}

export function stableStringify(value) {
  function normalize(input) {
    if (Array.isArray(input)) return input.map(normalize);
    if (!input || typeof input !== 'object') return input;
    return Object.fromEntries(
      Object.keys(input)
        .sort()
        .map((key) => [key, normalize(input[key])])
    );
  }
  return `${JSON.stringify(normalize(value), null, 2)}\n`;
}

export function sha256(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value, 'utf8');
  return createHash('sha256').update(bytes).digest('hex');
}

export function measureText(content) {
  return {
    characters: [...content].length,
    utf8Bytes: Buffer.byteLength(content, 'utf8'),
    sha256: sha256(content)
  };
}

export async function loadProtocol() {
  return readJson(PROTOCOL_PATH);
}

export async function loadCatalogFreeze(protocol = null) {
  const resolved = protocol ?? await loadProtocol();
  return readJson(resolved.catalogFreezePath);
}

export async function loadFrozenGuidanceCatalog(freeze = null) {
  const resolved = freeze ?? await loadCatalogFreeze();
  if (!resolved.guidanceCatalogPath) {
    throw new Error('Catalog freeze does not identify an immutable guidance snapshot.');
  }
  return readJson(resolved.guidanceCatalogPath);
}

export async function loadStrictProfile(profileName, protocol = null) {
  const resolved = protocol ?? await loadProtocol();
  const path = resolved.profiles?.[profileName];
  if (!path) {
    throw new Error(`Unknown benchmark profile '${profileName}'.`);
  }
  const profile = await readJson(path);
  if (profile.sourceProfile !== profileName) {
    throw new Error(`Benchmark profile '${profile.id}' does not match '${profileName}'.`);
  }
  return profile;
}

export function validateFrozenCatalog(catalog, freeze) {
  if (catalog.sourceCatalogVersion !== freeze.catalogVersion) {
    throw new Error(
      `Guidance snapshot version ${catalog.sourceCatalogVersion} does not match frozen version ${freeze.catalogVersion}.`
    );
  }
  if (catalog.sourceCatalogCommit !== freeze.catalogCommit) {
    throw new Error('Guidance snapshot commit does not match the catalog freeze.');
  }
  const actualIds = catalog.rules.map((rule) => rule.id);
  if (actualIds.length !== freeze.acceptedRuleCount) {
    throw new Error(
      `Guidance snapshot contains ${actualIds.length} rules; freeze expects ${freeze.acceptedRuleCount}.`
    );
  }
  if (JSON.stringify(actualIds) !== JSON.stringify(freeze.ruleIds)) {
    throw new Error('Guidance snapshot rule order or membership differs from protocol v1.');
  }
  return true;
}

export function rulesFromIds(catalog, ruleIds) {
  const byId = new Map(catalog.rules.map((rule) => [rule.id, rule]));
  const rules = ruleIds.map((id) => {
    const rule = byId.get(id);
    if (!rule) throw new Error(`Frozen profile references unknown rule '${id}'.`);
    return rule;
  });
  if (new Set(ruleIds).size !== ruleIds.length) {
    throw new Error('Frozen profile contains duplicate rule IDs.');
  }
  return rules;
}

function renderRule(rule) {
  const lines = [
    `### ${rule.id}: ${rule.title}`,
    '',
    rule.instruction
  ];
  if (rule.rationale) lines.push('', `**Why:** ${rule.rationale}`);
  if (rule.verify?.length) {
    lines.push('', '**Verify:**');
    for (const check of rule.verify) lines.push(`- ${check}`);
  }
  return lines.join('\n');
}

export function renderBenchmarkGuidance({
  condition,
  catalogCommit,
  profile,
  rules
}) {
  if (!['C', 'D'].includes(condition)) {
    throw new Error(`Benchmark guidance renderer supports conditions C and D, not '${condition}'.`);
  }
  const profileLabel = condition === 'C' ? 'all-accepted-rules' : profile.id;
  const intent = condition === 'C'
    ? 'Apply the entire accepted clean-room catalog. Resolve contextual tension using the benchmark brief, but do not omit rules from this artifact.'
    : profile.intent;
  const mode = condition === 'C' ? 'full-monolith' : 'profile-compiled';

  return `# Design Canon Benchmark Guidance\n\n> Generated artifact. Do not edit manually.\n> Condition: ${condition} (${mode})\n> Catalog commit: ${catalogCommit}\n> Profile: ${profileLabel}\n> Selected rules: ${rules.length}\n\n## Intent\n\n${intent}\n\n## Working method\n\n1. Read the benchmark brief before choosing a visual direction.\n2. Apply the rules below using their exact accepted wording.\n3. Treat contextual exceptions as explicit design decisions, not silent omissions.\n4. Verify the finished interface at every required viewport and interaction state.\n\n## Rules\n\n${rules.map(renderRule).join('\n\n')}\n\n## Completion gate\n\n- Every explicit brief requirement is implemented.\n- The interface is reviewed at desktop and mobile viewports.\n- Keyboard focus, control names, text contrast, reduced motion, and touch targets are checked.\n- Intentional exceptions are documented rather than hidden.\n`;
}

export function buildArtifactRecord({
  condition,
  content,
  catalogCommit,
  profile,
  ruleIds,
  tokenizer = null,
  tokenCount = null
}) {
  return {
    condition,
    catalogCommit,
    profile,
    ruleIds,
    ...measureText(content),
    tokenizer,
    tokenCount
  };
}

export async function buildGuidanceArtifacts({
  profileName,
  catalogCommit,
  tokenCounts = null
}) {
  const protocol = await loadProtocol();
  const freeze = await loadCatalogFreeze(protocol);
  if (catalogCommit !== freeze.catalogCommit) {
    throw new Error(
      `Catalog commit '${catalogCommit}' does not match frozen commit '${freeze.catalogCommit}'.`
    );
  }

  const [catalog, strictProfile, genericContent] = await Promise.all([
    loadFrozenGuidanceCatalog(freeze),
    loadStrictProfile(profileName, protocol),
    readFile(repositoryPath(protocol.genericGuidance.path), 'utf8')
  ]);
  validateFrozenCatalog(catalog, freeze);

  const genericMeasure = measureText(genericContent);
  if (genericMeasure.sha256 !== protocol.genericGuidance.sha256) {
    throw new Error('Generic guidance hash differs from the frozen protocol manifest.');
  }
  if (
    genericMeasure.characters !== protocol.genericGuidance.characters ||
    genericMeasure.utf8Bytes !== protocol.genericGuidance.utf8Bytes
  ) {
    throw new Error('Generic guidance size differs from the frozen protocol manifest.');
  }

  const monolithRules = rulesFromIds(catalog, freeze.ruleIds);
  const compiledRules = rulesFromIds(catalog, strictProfile.ruleIds);
  const monolithContent = renderBenchmarkGuidance({
    condition: 'C',
    catalogCommit,
    profile: strictProfile,
    rules: monolithRules
  });
  const compiledContent = renderBenchmarkGuidance({
    condition: 'D',
    catalogCommit,
    profile: strictProfile,
    rules: compiledRules
  });

  const tokenizer = tokenCounts?.tokenizer ?? null;
  const counts = tokenCounts?.counts ?? {};
  const records = {
    A: {
      condition: 'A',
      catalogCommit: null,
      profile: profileName,
      ruleIds: [],
      characters: 0,
      utf8Bytes: 0,
      sha256: null,
      tokenizer,
      tokenCount: 0
    },
    B: buildArtifactRecord({
      condition: 'B',
      content: genericContent,
      catalogCommit: null,
      profile: 'generic',
      ruleIds: [],
      tokenizer,
      tokenCount: counts.B ?? null
    }),
    C: buildArtifactRecord({
      condition: 'C',
      content: monolithContent,
      catalogCommit,
      profile: 'all-accepted-rules',
      ruleIds: freeze.ruleIds,
      tokenizer,
      tokenCount: counts.C ?? null
    }),
    D: buildArtifactRecord({
      condition: 'D',
      content: compiledContent,
      catalogCommit,
      profile: strictProfile.id,
      ruleIds: strictProfile.ruleIds,
      tokenizer,
      tokenCount: counts.D ?? null
    })
  };

  return {
    protocol,
    freeze,
    strictProfile,
    contents: {
      B: genericContent,
      C: monolithContent,
      D: compiledContent
    },
    records
  };
}

export async function writeGuidanceBundle({
  outputDirectory,
  profileName,
  catalogCommit,
  tokenCounts = null
}) {
  const bundle = await buildGuidanceArtifacts({ profileName, catalogCommit, tokenCounts });
  const guidanceDirectory = join(outputDirectory, 'guidance');
  await mkdir(guidanceDirectory, { recursive: true });

  const paths = {
    B: join(guidanceDirectory, 'generic-guidance.md'),
    C: join(guidanceDirectory, 'full-monolith.md'),
    D: join(guidanceDirectory, 'compiled-design-canon.md')
  };
  await Promise.all([
    writeFile(paths.B, bundle.contents.B, 'utf8'),
    writeFile(paths.C, bundle.contents.C, 'utf8'),
    writeFile(paths.D, bundle.contents.D, 'utf8')
  ]);

  const manifest = {
    schemaVersion: 1,
    protocolId: bundle.protocol.protocolId,
    protocolVersion: bundle.protocol.protocolVersion,
    profile: profileName,
    catalogCommit,
    artifacts: {
      A: { ...bundle.records.A, path: null },
      B: { ...bundle.records.B, path: 'guidance/generic-guidance.md' },
      C: { ...bundle.records.C, path: 'guidance/full-monolith.md' },
      D: { ...bundle.records.D, path: 'guidance/compiled-design-canon.md' }
    },
    admission: {
      tokenizerPinned: Boolean(bundle.records.B.tokenizer),
      tokenCountsComplete: ['B', 'C', 'D'].every(
        (id) => Number.isInteger(bundle.records[id].tokenCount)
      ),
      officialReady: false
    }
  };
  await writeJson(join(outputDirectory, 'guidance-manifest.json'), manifest);
  return { ...bundle, manifest, paths };
}

function seedToUint32(seed) {
  const digest = createHash('sha256').update(seed).digest();
  return digest.readUInt32LE(0);
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function deterministicShuffle(values, seed) {
  const output = [...values];
  const random = mulberry32(seedToUint32(seed));
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
  }
  return output;
}

export function generateRunPlan(protocol) {
  const conditionIds = protocol.conditions.map((condition) => condition.id);
  const runs = [];
  for (const benchmark of protocol.benchmarks) {
    for (let repetition = 1; repetition <= protocol.repetitionsPerCondition; repetition += 1) {
      const cellId = `${benchmark.id}-r${repetition}`;
      const order = deterministicShuffle(
        conditionIds,
        `${protocol.conditionOrderSeed}:${cellId}`
      );
      for (const [executionIndex, condition] of order.entries()) {
        runs.push({
          runId: `${benchmark.id}-${condition}-r${repetition}`,
          cellId,
          benchmarkId: benchmark.id,
          profile: benchmark.profile,
          condition,
          repetition,
          executionOrder: executionIndex + 1,
          status: 'planned'
        });
      }
    }
  }
  if (runs.length !== protocol.minimumRunCount) {
    throw new Error(
      `Generated ${runs.length} runs; protocol requires ${protocol.minimumRunCount}.`
    );
  }
  return {
    schemaVersion: 1,
    protocolId: protocol.protocolId,
    protocolVersion: protocol.protocolVersion,
    conditionOrderSeed: protocol.conditionOrderSeed,
    runs
  };
}

export async function findBenchmarkBrief(benchmarkId) {
  const directory = repositoryPath('research', 'benchmarks');
  const matches = (await readdir(directory))
    .filter((entry) => entry.startsWith(`${benchmarkId}-`) && entry.endsWith('.md'));
  if (matches.length !== 1) {
    throw new Error(
      `Expected one benchmark brief for '${benchmarkId}', found ${matches.length}.`
    );
  }
  return join(directory, matches[0]);
}

export function parseCliArgs(args, specification) {
  const result = {};
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    if (!Object.hasOwn(specification, key)) {
      throw new Error(`Unknown option '${key}'.`);
    }
    const value = args[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Option '${key}' requires a value.`);
    }
    if (Object.hasOwn(result, key)) {
      throw new Error(`Option '${key}' may only be specified once.`);
    }
    result[key] = value;
    index += 1;
  }
  for (const [key, config] of Object.entries(specification)) {
    if (result[key] === undefined) {
      if (config.required) throw new Error(`Missing required option '${key}'.`);
      result[key] = config.default ?? null;
    }
  }
  return result;
}
