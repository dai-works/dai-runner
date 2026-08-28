import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import CacheManager from '../../utils/CacheManager.js';
import { makeTmpDir } from './helpers.js';

test('CacheManager.sharedは同じmanifestパスで同一インスタンスを返す', async (t) => {
  const dir = await makeTmpDir(t);
  const manifest = path.join(dir, 'manifest.json');
  assert.strictEqual(
    CacheManager.shared(manifest),
    CacheManager.shared(manifest)
  );
});

test('CacheManagerは並行saveで両方のエントリを保持しremoveで削除する', async (t) => {
  const dir = await makeTmpDir(t);
  const manager = CacheManager.shared(path.join(dir, 'manifest.json'));
  const first = path.join(dir, 'first.png');
  const second = path.join(dir, 'second.png');
  await fs.writeFile(first, 'first');
  await fs.writeFile(second, 'second');
  await manager.initialize();

  await Promise.all([
    manager.markProcessed(first, `${first}.out`, {}),
    manager.markProcessed(second, `${second}.out`, {}),
  ]);
  await Promise.all([manager.save(), manager.save()]);
  let manifest = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json')));
  assert.deepEqual(Object.keys(manifest.files).sort(), [first, second].sort());

  manager.remove(first);
  await manager.save();
  manifest = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json')));
  assert.equal(first in manifest.files, false);
  assert.equal(second in manifest.files, true);
});
