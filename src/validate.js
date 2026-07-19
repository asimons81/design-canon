export const PROFILE_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RULE_ID_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const ALLOWED_SEVERITIES = new Set(['error', 'warning', 'info']);
const ALLOWED_REGEX_FLAGS = new Set(['g', 'i', 'm', 's', 'u', 'y']);
const CONFIG_KEYS = new Set(['$schema', 'version', 'profile', 'browser', 'suppressions']);
const SUPPRESSION_KEYS = new Set([
  'rule',
  'files',
  'reason',
  'approvedBy',
  'expires'
]);

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

function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${label} must be an object.`);
  }
}

function rejectUnknownKeys(value, allowed, label) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      fail(`${label} contains unknown property '${key}'.`);
    }
  }
}

function validateRuleId(value, label) {
  requireString(value, label);
  if (!RULE_ID_PATTERN.test(value)) {
    fail(`${label} '${value}' contains unsupported characters.`);
  }
}

function normalizeReferenceDate(referenceDate) {
  const date = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError('referenceDate must be a valid date.');
  }
  return date.toISOString().slice(0, 10);
}

function validateIsoDate(value, label) {
  requireString(value, label);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    fail(`${label} must use YYYY-MM-DD.`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    fail(`${label} must be a real calendar date.`);
  }
}

function validateSuppressionFilePattern(pattern, label) {
  requireString(pattern, label);
  const normalized = pattern.replaceAll('\\', '/');
  if (normalized.startsWith('/') || /^[a-zA-Z]:\//.test(normalized)) {
    fail(`${label} must be relative to the project root.`);
  }
  if (normalized.split('/').includes('..')) {
    fail(`${label} must not escape the project root.`);
  }
  if (normalized.includes('\0')) {
    fail(`${label} must not contain null bytes.`);
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
  validateRuleId(rule.id, `rules[${index}].id`);
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
    requireObject(rule.detect, `rule '${rule.id}'.detect`);
    requireString(rule.detect.message, `rule '${rule.id}'.detect.message`);
    const hasPatterns = Array.isArray(rule.detect.patterns) && rule.detect.patterns.length > 0;
    const hasBrowser = rule.detect.browserAnalyzer !== undefined;

    if (!hasPatterns && !hasBrowser) {
      fail(`rule '${rule.id}'.detect must contain either patterns or browserAnalyzer.`);
    }
    if (hasPatterns && hasBrowser) {
      fail(`rule '${rule.id}'.detect must not contain both patterns and browserAnalyzer.`);
    }

    if (hasPatterns) {
      for (const [index, pattern] of rule.detect.patterns.entries()) {
        validatePattern(pattern, rule.id, index);
      }
    }

    if (hasBrowser) {
      const ba = rule.detect.browserAnalyzer;
      requireString(ba.id, `rule '${rule.id}'.detect.browserAnalyzer.id`);
      if (ba.id.trim().length === 0) {
        fail(`rule '${rule.id}'.detect.browserAnalyzer.id must be a non-empty string.`);
      }
      if (!Array.isArray(ba.extensions) || ba.extensions.length === 0) {
        fail(`rule '${rule.id}'.detect.browserAnalyzer.extensions must be a non-empty array.`);
      }
      for (const [extIndex, ext] of ba.extensions.entries()) {
        requireString(ext, `rule '${rule.id}'.detect.browserAnalyzer.extensions[${extIndex}]`);
        if (!/^\.[a-z0-9]+$/.test(ext)) {
          fail(`rule '${rule.id}'.detect.browserAnalyzer.extensions[${extIndex}] must start with a dot followed by lowercase alphanumeric characters.`);
        }
      }
      const allowedKeys = new Set(['id', 'extensions']);
      for (const key of Object.keys(ba)) {
        if (!allowedKeys.has(key)) {
          fail(`rule '${rule.id}'.detect.browserAnalyzer contains unknown property '${key}'.`);
        }
      }
    }
  }
  return rule;
}

export function validateCatalog(catalog) {
  requireObject(catalog, 'catalog');
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
  requireObject(profile, 'profile');
  requireString(profile.id, 'profile.id');
  assertSafeProfileName(profile.id);
  if (expectedId && profile.id !== expectedId) {
    fail(`profile id '${profile.id}' does not match filename '${expectedId}.json'.`);
  }
  requireString(profile.name, `profile '${profile.id}'.name`);
  requireString(profile.intent, `profile '${profile.id}'.intent`);
  for (const field of ['includeRules', 'excludeRules', 'includeCategories']) {
    if (profile[field] !== undefined) {
      requireStringArray(profile[field], `profile '${profile.id}'.${field}`, {
        allowEmpty: true
      });
    }
  }
  if (profile.overrides !== undefined) {
    requireObject(profile.overrides, `profile '${profile.id}'.overrides`);
  }
  return profile;
}

export function validateConfig(config, catalog, options = {}) {
  const { referenceDate = new Date() } = options;
  requireObject(config, 'config');
  rejectUnknownKeys(config, CONFIG_KEYS, 'config');

  if (config.version !== 1) {
    fail('config.version must be 1.');
  }
  if (config.$schema !== undefined) {
    requireString(config.$schema, 'config.$schema');
  }
  if (config.profile !== undefined) {
    assertSafeProfileName(config.profile);
  }
  if (config.suppressions !== undefined && !Array.isArray(config.suppressions)) {
    fail('config.suppressions must be an array.');
  }

  const ruleIds = new Set(catalog.rules.map((rule) => rule.id));
  const today = normalizeReferenceDate(referenceDate);
  const duplicateKeys = new Set();
  const suppressions = (config.suppressions ?? []).map((suppression, index) => {
    const label = `config.suppressions[${index}]`;
    requireObject(suppression, label);
    rejectUnknownKeys(suppression, SUPPRESSION_KEYS, label);
    validateRuleId(suppression.rule, `${label}.rule`);
    if (!ruleIds.has(suppression.rule)) {
      fail(`${label}.rule references unknown rule '${suppression.rule}'.`);
    }
    requireStringArray(suppression.files, `${label}.files`);
    suppression.files.forEach((pattern, patternIndex) => {
      validateSuppressionFilePattern(pattern, `${label}.files[${patternIndex}]`);
    });
    requireString(suppression.reason, `${label}.reason`);
    if (suppression.reason.trim().length < 12) {
      fail(`${label}.reason must contain at least 12 characters of rationale.`);
    }
    if (suppression.approvedBy !== undefined) {
      requireString(suppression.approvedBy, `${label}.approvedBy`);
    }
    if (suppression.expires !== undefined) {
      validateIsoDate(suppression.expires, `${label}.expires`);
      if (suppression.expires <= today) {
        fail(`${label} expired on ${suppression.expires}.`);
      }
    }

    const normalizedFiles = suppression.files.map((pattern) =>
      pattern.replaceAll('\\', '/')
    );
    if (new Set(normalizedFiles).size !== normalizedFiles.length) {
      fail(`${label}.files must not contain duplicate patterns.`);
    }
    const duplicateKey = JSON.stringify([suppression.rule, [...normalizedFiles].sort()]);
    if (duplicateKeys.has(duplicateKey)) {
      fail(`${label} duplicates an earlier suppression for '${suppression.rule}'.`);
    }
    duplicateKeys.add(duplicateKey);

    return {
      ...suppression,
      files: normalizedFiles,
      reason: suppression.reason.trim()
    };
  });

  return {
    ...config,
    suppressions
  };
}
