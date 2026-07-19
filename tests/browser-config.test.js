import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBrowserConfig, effectiveMode, DEFAULT_BROWSER_CONFIG } from '../src/browser/config.js';

test('default browser config has static mode', () => {
  assert.equal(DEFAULT_BROWSER_CONFIG.mode, 'static');
  assert.equal(DEFAULT_BROWSER_CONFIG.viewport, 'desktop');
  assert.equal(DEFAULT_BROWSER_CONFIG.concurrency, 2);
  assert.equal(DEFAULT_BROWSER_CONFIG.pageTimeout, 10000);
  assert.equal(DEFAULT_BROWSER_CONFIG.operationTimeout, 60000);
});

test('parseBrowserConfig accepts valid mode', () => {
  assert.equal(parseBrowserConfig({ mode: 'static' }).mode, 'static');
  assert.equal(parseBrowserConfig({ mode: 'auto' }).mode, 'auto');
  assert.equal(parseBrowserConfig({ mode: 'browser' }).mode, 'browser');
});

test('parseBrowserConfig rejects invalid mode', () => {
  assert.throws(() => parseBrowserConfig({ mode: 'invalid' }), /Invalid browser mode/);
});

test('parseBrowserConfig accepts valid viewport', () => {
  assert.equal(parseBrowserConfig({ viewport: 'desktop' }).viewport, 'desktop');
  assert.equal(parseBrowserConfig({ viewport: 'mobile' }).viewport, 'mobile');
});

test('parseBrowserConfig rejects invalid viewport', () => {
  assert.throws(() => parseBrowserConfig({ viewport: 'tablet' }), /Invalid viewport/);
});

test('parseBrowserConfig accepts boolean javaScriptEnabled', () => {
  assert.equal(parseBrowserConfig({ javaScriptEnabled: false }).javaScriptEnabled, false);
  assert.equal(parseBrowserConfig({ javaScriptEnabled: true }).javaScriptEnabled, true);
  assert.throws(() => parseBrowserConfig({ javaScriptEnabled: 'yes' }), /boolean/);
});

test('parseBrowserConfig accepts valid colorScheme', () => {
  assert.equal(parseBrowserConfig({ colorScheme: 'light' }).colorScheme, 'light');
  assert.equal(parseBrowserConfig({ colorScheme: 'dark' }).colorScheme, 'dark');
});

test('parseBrowserConfig rejects invalid colorScheme', () => {
  assert.throws(() => parseBrowserConfig({ colorScheme: 'auto' }), /Invalid color scheme/);
});

test('parseBrowserConfig validates concurrency bounds', () => {
  assert.equal(parseBrowserConfig({ concurrency: 1 }).concurrency, 1);
  assert.equal(parseBrowserConfig({ concurrency: 10 }).concurrency, 10);
  assert.throws(() => parseBrowserConfig({ concurrency: 0 }), /integer between 1 and 10/);
  assert.throws(() => parseBrowserConfig({ concurrency: 11 }), /integer between 1 and 10/);
});

test('parseBrowserConfig validates pageTimeout bounds', () => {
  assert.equal(parseBrowserConfig({ pageTimeout: 1000 }).pageTimeout, 1000);
  assert.equal(parseBrowserConfig({ pageTimeout: 120000 }).pageTimeout, 120000);
  assert.throws(() => parseBrowserConfig({ pageTimeout: 500 }), /integer between 1000 and 120000/);
});

test('parseBrowserConfig validates operationTimeout bounds', () => {
  assert.equal(parseBrowserConfig({ operationTimeout: 5000 }).operationTimeout, 5000);
  assert.equal(parseBrowserConfig({ operationTimeout: 300000 }).operationTimeout, 300000);
  assert.throws(() => parseBrowserConfig({ operationTimeout: 1000 }), /integer between 5000 and 300000/);
});

test('effectiveMode prioritizes CLI mode over config', () => {
  assert.equal(effectiveMode({ cliMode: 'browser', browserConfig: { mode: 'static' } }), 'browser');
});

test('effectiveMode falls back to config mode', () => {
  assert.equal(effectiveMode({ browserConfig: { mode: 'auto' } }), 'auto');
});

test('effectiveMode defaults to static', () => {
  assert.equal(effectiveMode(), 'static');
});
