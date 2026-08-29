import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import CleanupManager from '../../utils/CleanupManager.js';
import { makeTmpDir, exists } from './helpers.js';

test('cleanBuildDirectoriesは除外ファイルだけを残す', async (t) => {
  const dir = await makeTmpDir(t);
  const cwd = process.cwd();
  process.chdir(dir);
  t.after(() => process.chdir(cwd));

  const paths = {
    images: { dist: 'public/assets/images' },
    js: { dist: 'public/assets/js' },
    css: { dist: 'public/assets/css' },
  };
  await fs.mkdir(paths.images.dist, { recursive: true });
  await fs.mkdir(paths.js.dist, { recursive: true });
  await fs.mkdir(paths.css.dist, { recursive: true });
  await fs.writeFile(path.join(paths.images.dist, 'keep.png'), 'keep');
  await fs.writeFile(path.join(paths.images.dist, 'remove.png'), 'remove');
  await fs.writeFile(path.join(paths.js.dist, 'main.js'), 'remove');
  await fs.writeFile(path.join(paths.css.dist, 'style.css'), 'remove');

  await CleanupManager.cleanBuildDirectories(paths, [
    'public/assets/images/keep.png',
  ]);

  assert.equal(await exists(path.join(paths.images.dist, 'keep.png')), true);
  assert.equal(await exists(path.join(paths.images.dist, 'remove.png')), false);
  assert.equal(await exists(path.join(paths.js.dist, 'main.js')), false);
  assert.equal(await exists(path.join(paths.css.dist, 'style.css')), false);
});

test('cleanImageOrphansはsourceに無い元画像とWebPだけを削除する', async (t) => {
  const dir = await makeTmpDir(t);
  const srcDir = path.join(dir, 'source');
  const distDir = path.join(dir, 'dist');
  await fs.mkdir(srcDir, { recursive: true });
  await fs.mkdir(distDir, { recursive: true });
  await fs.writeFile(path.join(srcDir, 'keep.png'), 'source');
  for (const name of ['keep.png', 'keep.webp', 'orphan.png', 'orphan.webp']) {
    await fs.writeFile(path.join(distDir, name), name);
  }

  await CleanupManager.cleanImageOrphans({
    srcDir,
    distDir,
    convertToWebp: true,
  });

  assert.equal(await exists(path.join(distDir, 'keep.png')), true);
  assert.equal(await exists(path.join(distDir, 'keep.webp')), true);
  assert.equal(await exists(path.join(distDir, 'orphan.png')), false);
  assert.equal(await exists(path.join(distDir, 'orphan.webp')), false);
});
