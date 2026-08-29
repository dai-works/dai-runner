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

test('キャッシュ済みファイルはstat一致時にハッシュを読まずスキップする', async (t) => {
  const dir = await makeTmpDir(t);
  const src = path.join(dir, 'image.png');
  const dist = path.join(dir, 'dist.png');
  await fs.writeFile(src, 'same');
  await fs.writeFile(dist, 'output');
  const manager = new CacheManager(dir);
  await manager.initialize();
  const options = { convertToWebp: false };
  await manager.markProcessed(src, dist, options);
  let reads = 0;
  manager.readFile = async (...args) => {
    reads++;
    return fs.readFile(...args);
  };
  assert.equal(await manager.shouldProcessFile(src, dist, options), false);
  assert.equal(reads, 0);
});

test('ファイル変更時は再処理し、旧形式manifestもハッシュで判定する', async (t) => {
  const dir = await makeTmpDir(t);
  const src = path.join(dir, 'image.png');
  const dist = path.join(dir, 'dist.png');
  await fs.writeFile(src, 'old');
  await fs.writeFile(dist, 'output');
  const manager = new CacheManager(dir);
  await manager.initialize();
  const options = { convertToWebp: false };
  await manager.markProcessed(src, dist, options);
  await fs.writeFile(src, 'new content');
  assert.equal(await manager.shouldProcessFile(src, dist, options), true);

  const oldManager = new CacheManager(path.join(dir, 'old-cache'));
  await oldManager.initialize();
  const hash = await oldManager.getFileHash(src);
  oldManager.manifest.optionsHash = oldManager.getOptionsHash(options);
  oldManager.manifest.files[src] = { hash, distPath: dist };
  assert.equal(await oldManager.shouldProcessFile(src, dist, options), false);
});

test('設定ハッシュはキー順に依存せず、値の違いを検出する', () => {
  const manager = new CacheManager();
  const first = { quality: 80, nested: { webp: true, avif: false } };
  const reordered = { nested: { avif: false, webp: true }, quality: 80 };
  const changed = { quality: 90, nested: { webp: true, avif: false } };

  assert.equal(
    manager.getOptionsHash(first),
    manager.getOptionsHash(reordered)
  );
  assert.notEqual(
    manager.getOptionsHash(first),
    manager.getOptionsHash(changed)
  );
});
