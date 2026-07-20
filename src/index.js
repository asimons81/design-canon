export {
  ADAPTER_TARGETS,
  applyAdapterPlan,
  formatAdapterPlan,
  planAdapter,
  runAdapterCommand
} from './adapters.js';
export { compileCommand, renderCompiled } from './compile.js';
export {
  DEFAULT_CONFIG_FILE,
  findSuppression,
  globToRegExp,
  loadConfig
} from './config.js';
export { lintCommand, lintPath } from './lint.js';
export { selectRules } from './select.js';
export {
  assertSafeProfileName,
  validateCatalog,
  validateConfig,
  validatePattern,
  validateProfile,
  validateRule
} from './validate.js';

// Browser-assisted analysis (optional, requires Playwright)
export * from './browser/index.js';
