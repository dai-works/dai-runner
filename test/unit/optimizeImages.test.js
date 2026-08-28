import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { optimizeImages } from '../../tasks/images/optimizeImages.js';
import { makeTmpDir, exists } from './helpers.js';

test('監視中に処理前へ消えたファイルはエラーにせずスキップする', async (t) => {
  const dir = await makeTmpDir(t);
  const src = path.join(dir, 'src');
  const dist = path.join(dir, 'dist');
  await fs.mkdir(src, { recursive: true });
  const gone = path.join(src, 'gone.png');

  for (const useCache of [false, true]) {
    await assert.doesNotReject(
      optimizeImages(src, dist, {
        filePath: gone,
        useCache,
        convertToWebp: true,
      })
    );
    assert.equal(await exists(path.join(dist, 'gone.png')), false);
    assert.equal(await exists(path.join(dist, 'gone.webp')), false);
  }
});
