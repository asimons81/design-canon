import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  collectSourceFiles,
  listProfiles,
  loadProfile
} from '../src/io.js';

test('profile list is discovered and sorted', async () => {
  assert.deepEqual(await listProfiles(), [
    'editorial',
    'marketing',
    'product-app'
  ]);
});

test('unknown and unsafe profiles fail distinctly', async () => {
  await assert.rejects(() => loadProfile('does-not-exist'), /Unknown profile/);
  await assert.rejects(() => loadProfile('../secret'), /Invalid profile name/);
});

test('source discovery is deterministic and ignores generated directories', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'design-canon-'));
  try {
    await mkdir(join(directory, 'src'));
    await mkdir(join(directory, 'node_modules'));
    await mkdir(join(directory, 'dist'));
    await writeFile(join(directory, 'src', 'z.js'), 'export const z = 1;\n');
    await writeFile(join(directory, 'src', 'a.ts'), 'export const a = 1;\n');
    await writeFile(join(directory, 'node_modules', 'ignored.js'), '');
    await writeFile(join(directory, 'dist', 'ignored.js'), '');

    const files = await collectSourceFiles(directory);
    assert.deepEqual(
      files.map((file) => file.replaceAll('\\', '/').split('/').slice(-2).join('/')),
      ['src/a.ts', 'src/z.js']
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
