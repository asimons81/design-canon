import test from 'node:test';
import assert from 'node:assert/strict';
import {
  registerAnalyzer,
  getAnalyzer,
  hasAnalyzer,
  listAnalyzers,
  unregisterAnalyzer,
  clearAnalyzers,
  runAnalyzer
} from '../src/browser/analyzer.js';

test('register and retrieve an analyzer', () => {
  clearAnalyzers();
  const fn = async () => ({ status: 'confirmed', measurements: {}, message: '', confidence: 'high' });

  registerAnalyzer('test.evidence', fn);
  assert.equal(hasAnalyzer('test.evidence'), true);
  assert.equal(typeof getAnalyzer('test.evidence'), 'function');
});

test('register rejects duplicate analyzer ids', () => {
  clearAnalyzers();
  const fn = async () => ({ status: 'confirmed', measurements: {}, message: '', confidence: 'high' });

  registerAnalyzer('test.unique', fn);
  assert.throws(() => registerAnalyzer('test.unique', fn), /already registered/);
});

test('listAnalyzers returns registered ids', () => {
  clearAnalyzers();
  registerAnalyzer('test.one', async () => ({ status: 'confirmed', measurements: {}, message: '', confidence: 'high' }));
  registerAnalyzer('test.two', async () => ({ status: 'confirmed', measurements: {}, message: '', confidence: 'high' }));

  const ids = listAnalyzers();
  assert.ok(ids.includes('test.one'));
  assert.ok(ids.includes('test.two'));
});

test('runAnalyzer returns failed for unknown analyzer', async () => {
  clearAnalyzers();
  const context = { deadline: Date.now() + 60000 };
  const result = await runAnalyzer('does.not.exist', context);
  assert.equal(result.status, 'failed');
  assert.match(result.message, /Unknown analyzer/);
});

test('runAnalyzer returns the analyzer result', async () => {
  clearAnalyzers();
  registerAnalyzer('test.success', async (ctx) => ({
    status: 'confirmed',
    measurements: { value: 42 },
    message: 'Analysis complete.',
    confidence: 'high'
  }));

  const context = { deadline: Date.now() + 60000 };
  const result = await runAnalyzer('test.success', context);
  assert.equal(result.status, 'confirmed');
  assert.deepEqual(result.measurements, { value: 42 });
  assert.equal(result.message, 'Analysis complete.');
});

test('runAnalyzer returns failed on exception', async () => {
  clearAnalyzers();
  registerAnalyzer('test.error', async () => {
    throw new Error('Something went wrong.');
  });

  const context = { deadline: Date.now() + 60000 };
  const result = await runAnalyzer('test.error', context);
  assert.equal(result.status, 'failed');
  assert.match(result.message, /Something went wrong/);
});

test('runAnalyzer returns failed when deadline exceeded', async () => {
  clearAnalyzers();
  registerAnalyzer('test.slow', async () => ({
    status: 'confirmed',
    measurements: {},
    message: 'Too late.',
    confidence: 'high'
  }));

  const context = { deadline: 0 }; // Already expired
  const result = await runAnalyzer('test.slow', context);
  assert.equal(result.status, 'failed');
  assert.match(result.message, /deadline exceeded/);
});

test('unregisterAnalyzer removes an analyzer', () => {
  clearAnalyzers();
  registerAnalyzer('test.temp', async () => ({ status: 'confirmed', measurements: {}, message: '', confidence: 'high' }));
  assert.equal(hasAnalyzer('test.temp'), true);
  unregisterAnalyzer('test.temp');
  assert.equal(hasAnalyzer('test.temp'), false);
});

test('clearAnalyzers removes all analyzers', () => {
  registerAnalyzer('test.a', async () => ({ status: 'confirmed', measurements: {}, message: '', confidence: 'high' }));
  registerAnalyzer('test.b', async () => ({ status: 'confirmed', measurements: {}, message: '', confidence: 'high' }));
  clearAnalyzers();
  assert.equal(listAnalyzers().length, 0);
});
