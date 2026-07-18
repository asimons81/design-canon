export const PROFILE_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RULE_ID_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const ALLOWED_SEVERITIES = new Set(['error', 'warning', 'info']);
const ALLOWED_REGEX_FLAGS = new Set(['g', 'i', 'm', 's', 'u', 'y']);

function fail(message) {
  throw new Error(`Invalid Design Canon data: ${message}`);
}

function requireString(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    fail(`${label} must be a non-empty string.`);
  }
}

function requireStringArray(value, label, { allowEmpty = false } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    fail(`${label} must be ${allowEmpty ? 'an' : 'a non-empty'} array.`);
  }
  for (const [index, entry] of value.entries()) {
    requireString(entry, `${label}[${index}]`);
  }
}

export function assertSafeProfileName(name) {
  if (typeof name !== 'string' || !PROFILE_NAME_PATTERN.test(name)) {
    throw new Error(
      `Invalid profile name '${String(name)}'. Use lowercase letters, numbers, and single hyphens only.`
    );
  }
  return name;
}

export function validatePattern(pattern, ruleId, index) {
  if (!pattern || typeof pattern !== 'object' || Array.isArray(pattern)) {
    fail(`rule '${ruleId}' detector pattern ${index} must be an object.`);
  }
  requireString(pattern.source, `rule '${ruleId}' detector pattern ${index}.source`);
  if (pattern.flags !== undefined) {
    requireString(pattern.flags, `rule '${ruleId}' detector pattern ${index}.flags`);
    const seen = new Set();
    for (const flag of pattern.flags) {
      if (!ALLOWED_REGEX_FLAGS.has(flag)) {
        fail(`rule '${ruleId}' uses unsupported regex flag '${flag}'.`);
      }
      if (seen.has(flag)) {
        fail(`rule '${ruleId}' repeats regex flag '${flag}'.`);
      }
      seen.add(flag);
    }
  }
  if (pattern.multiple !== undefined && typeof pattern.multiple !== 'boolean') {
    fail(`rule '${ruleId}' detector pattern ${index}.multiple must be boolean.`);
  }
  try {
    new RegExp(pattern.source, pattern.flags ?? 'gim');
  } catch (error) {
    fail(`rule '${ruleId}' has an invalid detector regex: ${error.message}`);
  }
}

export function validateRule(rule, index) {
  if (!rule || typeof rule !== 'object' || Array.isArray(rule)) {
    fail(`rules[${index}] must be an object.`);
  }
  requireString(rule.id, `rules[${index}].id`);
  if (!RULE_ID_PATTERN.test(rule.id)) {
    fail(`rule id '${rule.id}' contains unsupported characters.`);
  }
  requireString(rule.category, `rule '${rule.id}'.category`);
  requireString(rule.title, `rule '${rule.id}'.title`);
  requireString(rule.instruction, `rule '${rule.id}'.instruction`);
  if (!ALLOWED_SEVERITIES.has(rule.severity)) {
    fail(`rule '${rule.id}' has unsupported severity '${rule.severity}'.`);
  }
  requireStringArray(rule.appliesTo, `rule '${rule.id}'.appliesTo`);
  if (rule.rationale !== undefined) {
    requireString(rule.rationale, `rule '${rule.id}'.rationale`);
  }
  if (rule.verify !== undefined) {
    requireStringArray(rule.verify, `rule '${rule.id}'.verify`, { allowEmpty: true });
  }
  if (rule.detect !== undefined) {
    if (!rule.detect || typeof rule.detect !== 'object' || Array.isArray(rule.detect)) {
      fail(`rule '${rule.id}'.detect must be an object.`);
    }
    requireString(rule.detect.message, `rule '${rule.id}'.detect.message`);
    if (!Array.isArray(rule.detect.patterns) || rule.detect.patterns.length === 0) {
      fail(`rule '${rule.id}'.detect.patterns must be a non-empty array.`);
    }
    rule.detect.patterns.forEach((pattern, patternIndex) => {
      validatePattern(pattern, rule.id, patternIndex);
    });
  }
  return rule;
}

export function validateCatalog(catalog) {
  if (!catalog || typeof catalog !== 'object' || Array.isArray(catalog)) {
    fail('catalog must be an object.');
  }
  if (!Number.isInteger(catalog.version) || catalog.version < 1) {
    fail('catalog.version must be a positive integer.');
  }
  if (!Array.isArray(catalog.rules) || catalog.rules.length === 0) {
    fail('catalog.rules must be a non-empty array.');
  }
  const ids = new Set();
  catalog.rules.forEach((rule, index) => {
    validateRule(rule, index);
    if (ids.has(rule.id)) {
      fail(`duplicate rule id '${rule.id}'.`);
    }
    ids.add(rule.id);
  });
  return catalog;
}

export function validateProfile(profile, expectedId) {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    fail('profile must be an object.');
  }
  requireString(profile.id, 'profile.id');
  assertSafeProfileName(profile.id);
  if (expectedId && profile.id !== expectedId) {
    fail(`profile id '${profile.id}' does not match filename '${expectedId}.json'.`);
  }
  requireString(profile.name, `profile '${profile.id}'.name`);
  requireString(profile.intent, `profile '${profile.id}'.intent`);
  for (const field of ['includeRules', 'excludeRules', 'includeCategories']) {
    if (profile[field] !== undefined) {
      requireStringArray(profile[field], `profile '${profile.id}'.${field}`, { allowEmpty: true });
    }
  }
  if (
    profile.overrides !== undefined &&
    (!profile.overrides || typeof profile.overrides !== 'object' || Array.isArray(profile.overrides))
  ) {
    fail(`profile '${profile.id}'.overrides must be an object.`);
  }
  return profile;
}
