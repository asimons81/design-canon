/**
 * validate-research.js
 *
 * Validates research artifacts (proposals, source records, audits, fixtures)
 * against their respective schemas and clean-room policies.
 *
 * Usage: node scripts/validate-research.js
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { createHash } from 'node:crypto';

const SCHEMAS = {
  proposal: null,
  source: null,
  fixture: null
};

const ERRORS = [];
const WARNINGS = [];

function error(msg) { ERRORS.push(msg); }
function warn(msg) { WARNINGS.push(msg); }

async function loadSchemas() {
  SCHEMAS.proposal = JSON.parse(
    await readFile('./schema/rule-proposal.schema.json', 'utf8')
  );
  SCHEMAS.source = JSON.parse(
    await readFile('./schema/research-source.schema.json', 'utf8')
  );
  SCHEMAS.fixture = JSON.parse(
    await readFile('./schema/candidate-fixture.schema.json', 'utf8')
  );
}

function validateAgainstSchema(data, schema, label) {
  // Structural validation without a full JSON Schema validator
  // Checks required fields, enum values, and patterns

  if (schema.required) {
    for (const field of schema.required) {
      if (!(field in data)) {
        error(`${label}: missing required field "${field}"`);
      }
    }
  }

  if (schema.properties) {
    for (const [key, def] of Object.entries(schema.properties)) {
      if (data[key] === undefined) continue;
      const val = data[key];

      if (def.enum && !def.enum.includes(val)) {
        error(`${label}: "${key}" value "${val}" not in enum [${def.enum.join(', ')}]`);
      }

      if (def.type === 'array' && def.items?.enum) {
        for (const item of val) {
          if (!def.items.enum.includes(item)) {
            error(`${label}: "${key}" item "${item}" not in enum [${def.items.enum.join(', ')}]`);
          }
        }
      }

      if (def.pattern && typeof val === 'string' && !new RegExp(def.pattern).test(val)) {
        error(`${label}: "${key}" value "${val}" does not match pattern ${def.pattern}`);
      }

      if (def.minLength && typeof val === 'string' && val.length < def.minLength) {
        error(`${label}: "${key}" too short (${val.length} < ${def.minLength})`);
      }

      if (def.minItems && Array.isArray(val) && val.length < def.minItems) {
        error(`${label}: "${key}" has ${val.length} items, minimum ${def.minItems}`);
      }

      if (def.type === 'object' && def.required) {
        for (const subField of def.required) {
          if (!(subField in val)) {
            error(`${label}: "${key}" missing required field "${subField}"`);
          }
        }
      }
    }
  }
}

async function validateProposalFile(filePath) {
  const content = JSON.parse(await readFile(filePath, 'utf8'));
  const label = `Proposal ${content.proposalId || filePath}`;

  validateAgainstSchema(content, SCHEMAS.proposal, label);

  // Additional checks
  if (content.status === 'review-ready' && content.claimType !== 'general-knowledge') {
    if (!content.sourceRefs || content.sourceRefs.length === 0) {
      warn(`${label}: review-ready with claim type "${content.claimType}" has no source refs`);
    }
  }

  if (content.violations && content.controls) {
    const vSet = new Set(content.violations);
    const cSet = new Set(content.controls);
    const overlap = [...vSet].filter(x => cSet.has(x));
    if (overlap.length > 0) {
      error(`${label}: violation and control share identical examples`);
    }
  }

  if (content.overlapNotes && content.overlapNotes.length < 5) {
    warn(`${label}: overlap notes seem incomplete`);
  }
}

async function validateSourceFile(filePath) {
  const content = JSON.parse(await readFile(filePath, 'utf8'));
  const label = `Source ${content.sourceId || filePath}`;

  validateAgainstSchema(content, SCHEMAS.source, label);

  if (content.cleanRoomAttestation === 'independently-discovered' && !content.publicLocation) {
    error(`${label}: independently-discovered source missing publicLocation`);
  }
}

async function validateFixtureManifest(manifestPath) {
  const content = JSON.parse(await readFile(manifestPath, 'utf8'));
  const label = `Fixture ${content.fixtureId || manifestPath}`;

  validateAgainstSchema(content, SCHEMAS.fixture, label);

  // Verify declared source files exist and match hashes
  if (content.sourceFiles) {
    for (const sf of content.sourceFiles) {
      const fullPath = join('fixtures', 'candidates', sf.path);
      try {
        const bytes = await readFile(fullPath);
        const actualHash = createHash('sha256').update(bytes).digest('hex');
        const actualBytes = bytes.length;

        if (actualBytes !== sf.byteCount) {
          error(`${label}: ${sf.path} byte count mismatch (expected ${sf.byteCount}, got ${actualBytes})`);
        }
        if (actualHash !== sf.sha256) {
          error(`${label}: ${sf.path} SHA-256 mismatch`);
        }
      } catch {
        error(`${label}: source file ${fullPath} not found`);
      }
    }
  }

  // Check deterministicFindings do not claim nonexistent detectors
  if (content.deterministicFindings) {
    for (const finding of content.deterministicFindings) {
      if (finding.toLowerCase().includes('linter') || finding.toLowerCase().includes('detector')) {
        warn(`${label}: deterministicFinding may claim a nonexistent detector: "${finding}"`);
      }
    }
  }
}

async function findFiles(dir, pattern) {
  const results = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...await findFiles(fullPath, pattern));
      } else if (entry.name.endsWith(pattern)) {
        results.push(fullPath);
      }
    }
  } catch {
    // Directory may not exist
  }
  return results;
}

async function validateAllProposals() {
  const proposalDirs = [
    './research/candidates/proposals'
  ];

  for (const dir of proposalDirs) {
    const files = await findFiles(dir, '.json');
    for (const file of files) {
      try {
        await validateProposalFile(file);
      } catch (e) {
        error(`Error validating ${file}: ${e.message}`);
      }
    }
  }
}

async function validateAllSources() {
  const files = await findFiles('./research/sources', '.json');
  for (const file of files) {
    try {
      await validateSourceFile(file);
    } catch (e) {
      error(`Error validating source ${file}: ${e.message}`);
    }
  }
}

async function validateAllFixtures() {
  const manifests = await findFiles('./fixtures/candidates', 'manifest.json');
  for (const file of manifests) {
    try {
      await validateFixtureManifest(file);
    } catch (e) {
      error(`Error validating fixture ${file}: ${e.message}`);
    }
  }
}

async function validateCleanRoomPolicy() {
  // Verify no proposals claim knowledge of proprietary systems
  const proposalDirs = [
    './research/candidates/proposals'
  ];

  for (const dir of proposalDirs) {
    const files = await findFiles(dir, '.json');
    for (const file of files) {
      try {
        const content = JSON.parse(await readFile(file, 'utf8'));
        const text = JSON.stringify(content).toLowerCase();

        const bannedTerms = ['epstein', 'prophet prompts', 'leaked corpus', 'private prompt'];
        for (const term of bannedTerms) {
          if (text.includes(term)) {
            warn(`File ${file} mentions potentially proprietary term "${term}"`);
          }
        }

        if (content.cleanRoomAttestations) {
          if (!Array.isArray(content.cleanRoomAttestations) || content.cleanRoomAttestations.length === 0) {
            error(`File ${file}: missing clean-room attestations`);
          }
        }
      } catch {
        // Skip files that can't be parsed
      }
    }
  }
}

async function main() {
  console.log('Validating research artifacts...\n');

  await loadSchemas();

  await validateAllProposals();
  await validateAllSources();
  await validateAllFixtures();
  await validateCleanRoomPolicy();

  console.log(`Errors:   ${ERRORS.length}`);
  console.log(`Warnings: ${WARNINGS.length}\n`);

  for (const err of ERRORS) {
    console.error(`  ERROR: ${err}`);
  }
  for (const warn of WARNINGS) {
    console.log(`  WARN:  ${warn}`);
  }

  if (ERRORS.length > 0) {
    process.exit(1);
  }

  console.log('\nValidation passed: all research artifacts conform to schemas and clean-room policy.');
}

main().catch((e) => {
  console.error('Validation script failed:', e);
  process.exit(1);
});
