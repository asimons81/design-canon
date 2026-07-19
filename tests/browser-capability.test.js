import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectBrowserCapability,
  resetCapabilityCache,
  resolveMode
} from '../src/browser/capability.js';

test('capability detection is deterministic', async () => {
  resetCapabilityCache();
  const first = await detectBrowserCapability();
  const second = await detectBrowserCapability();
  // Cached result must be identical
  assert.equal(first.playwrightAvailable, second.playwrightAvailable);
  assert.equal(first.chromiumAvailable, second.chromiumAvailable);
});

test('static mode resolves without checking capability', () => {
  const capability = {
    playwrightAvailable: false,
    chromiumAvailable: false,
    chromiumVersion: null,
    error: 'Not available.'
  };

  const resolved = resolveMode('static', capability);
  assert.equal(resolved.mode, 'static');
  assert.equal(resolved.available, true);
  assert.equal(resolved.skipped, false);
  assert.equal(resolved.error, null);
});

test('auto mode without Playwright skips silently', () => {
  const capability = {
    playwrightAvailable: false,
    chromiumAvailable: false,
    chromiumVersion: null,
    error: 'Not installed.'
  };

  const resolved = resolveMode('auto', capability);
  assert.equal(resolved.mode, 'auto');
  assert.equal(resolved.available, false);
  assert.equal(resolved.skipped, true);
  assert.equal(resolved.error, null);
});

test('browser mode without Playwright produces operation error', () => {
  const capability = {
    playwrightAvailable: false,
    chromiumAvailable: false,
    chromiumVersion: null,
    error: 'Playwright is not installed.'
  };

  const resolved = resolveMode('browser', capability);
  assert.equal(resolved.mode, 'browser');
  assert.equal(resolved.available, false);
  assert.equal(resolved.skipped, false);
  assert.ok(resolved.error);
});

test('auto mode with available Chromium proceeds', () => {
  const capability = {
    playwrightAvailable: true,
    chromiumAvailable: true,
    chromiumVersion: '130.0.6723.58',
    error: null
  };

  const resolved = resolveMode('auto', capability);
  assert.equal(resolved.mode, 'auto');
  assert.equal(resolved.available, true);
  assert.equal(resolved.skipped, false);
  assert.equal(resolved.error, null);
});

test('browser mode with available Chromium proceeds', () => {
  const capability = {
    playwrightAvailable: true,
    chromiumAvailable: true,
    chromiumVersion: '130.0.6723.58',
    error: null
  };

  const resolved = resolveMode('browser', capability);
  assert.equal(resolved.mode, 'browser');
  assert.equal(resolved.available, true);
  assert.equal(resolved.skipped, false);
  assert.equal(resolved.error, null);
});

test('deterministic capability result - same input same output', () => {
  const cap1 = {
    playwrightAvailable: true,
    chromiumAvailable: false,
    chromiumVersion: null,
    error: 'Chromium not found.'
  };

  const cap2 = {
    playwrightAvailable: true,
    chromiumAvailable: false,
    chromiumVersion: null,
    error: 'Chromium not found.'
  };

  const r1 = resolveMode('auto', cap1);
  const r2 = resolveMode('auto', cap2);
  assert.equal(r1.skipped, r2.skipped);
  assert.equal(r1.available, r2.available);
});
