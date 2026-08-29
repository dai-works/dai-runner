import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { buildImages } from '../../tasks/images/buildImages.js';
import CacheManager from '../../utils/CacheManager.js';
import Logger from '../../utils/Logger.js';
import { makeTmpDir, exists } from './helpers.js';

test('buildImagesは画像を最適化し、2回目はキャッシュ済みとしてスキップする', async (t) => {
  const dir = await makeTmpDir(t);
  const src = path.join(dir, 'source/images');
  const dist = path.join(dir, 'dist/images');
  await fs.mkdir(src, { recursive: true });
  const png = await sharp({
    create: {
      width: 2,
      height: 2,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
  await fs.writeFile(path.join(src, 'image.png'), png);
  await fs.writeFile(path.join(src, 'photo.jpg'), png);
  await fs.writeFile(
    path.join(src, 'icon.svg'),
    '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><!-- 削除対象 --><path d="M0 0h2v2H0z"/></svg>'
  );

  const cwd = process.cwd();
  process.chdir(dir);
  CacheManager.instances.clear();
  t.after(() => {
    process.chdir(cwd);
    CacheManager.instances.clear();
  });
  Logger.setLogLevel('error');

  const config = {
    paths: { src, dist },
    options: { convertToWebp: true, useCache: true },
  };
  await buildImages(config);

  const distPng = path.join(dist, 'image.png');
  assert.equal(await exists(distPng), true);
  assert.equal(await exists(path.join(dist, 'image.webp')), true);
  assert.equal(await exists(path.join(dist, 'photo.webp')), true);
  assert.doesNotMatch(
    await fs.readFile(path.join(dist, 'icon.svg'), 'utf8'),
    /削除対象/
  );
  const manifestPath = path.join(dir, '.dai-runner/cache/manifest.json');
  assert.equal(await exists(manifestPath), true);

  const past = new Date('2020-01-01T00:00:00Z');
  await fs.utimes(distPng, past, past);
  await buildImages(config);
  assert.equal((await fs.stat(distPng)).mtime.getTime(), past.getTime());
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  assert.equal(Object.keys(manifest.files).length, 3);
});
