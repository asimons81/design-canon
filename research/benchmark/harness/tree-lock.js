import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { sha256, stableStringify } from './lib.js';

async function inventoryTree(root) {
  const files = [];
  let directories = 0;
  async function walk(directory) {
    directories += 1;
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile()) {
        const bytes = await readFile(path);
        files.push({
          path: relative(root, path).replaceAll('\\', '/'),
          bytes: (await stat(path)).size,
          sha256: sha256(bytes)
        });
      } else {
        throw new Error(`Locked evidence contains a non-file entry: ${path}`);
      }
    }
  }
  await walk(root);
  return { files, directories };
}

export async function verifyTreeInventoryLock(inventoryPath) {
  const absoluteInventory = resolve(inventoryPath);
  const inventoryBytes = await readFile(absoluteInventory);
  const inventory = JSON.parse(inventoryBytes.toString('utf8'));
  const lockText = await readFile(join(dirname(absoluteInventory), 'LOCK-SHA256'), 'utf8');
  const expectedInventorySha = lockText.trim().split(/\s+/)[0];
  if (sha256(inventoryBytes) !== expectedInventorySha) {
    throw new Error('r1 inventory lock digest mismatch.');
  }
  const actual = await inventoryTree(resolve(inventory.root));
  if (actual.files.length !== inventory.counts.files || actual.directories !== inventory.counts.directories) {
    throw new Error('r1 evidence tree counts differ from the immutable lock.');
  }
  if (stableStringify(actual.files) !== stableStringify(inventory.files)) {
    throw new Error('r1 evidence tree differs from the immutable file inventory.');
  }
  return {
    passed: true,
    inventorySha256: expectedInventorySha,
    root: inventory.root,
    files: actual.files.length,
    directories: actual.directories
  };
}
