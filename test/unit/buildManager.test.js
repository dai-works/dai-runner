import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import BuildManager from '../../utils/BuildManager.js';
import { makeTmpDir, exists } from './helpers.js';

function createConfig(dir) {
  return {
    paths: {
      images: {
        src: path.join(dir, 'images'),
        dist: path.join(dir, 'dist/images'),
      },
      js: { src: path.join(dir, 'js'), dist: path.join(dir, 'dist/js') },
      css: { src: path.join(dir, 'scss'), dist: path.join(dir, 'dist/css') },
    },
    cleanup: { excludeFiles: [] },
    options: {
      images: { useCache: false },
      js: { bundle: false },
      css: { sourceMap: false, minify: false },
    },
    sitemap: {
      enabled: true,
      productionUrl: 'https://example.com',
      sourceDir: path.join(dir, 'html'),
      outputPath: path.join(dir, 'html/sitemap.xml'),
    },
  };
}

test('sitemapはgenerateSitemapがtrueの本番相当時だけ生成する', async (t) => {
  const dir = await makeTmpDir(t);
  const config = createConfig(dir);
  await fs.mkdir(config.sitemap.sourceDir, { recursive: true });
  await fs.writeFile(
    path.join(config.sitemap.sourceDir, 'index.html'),
    '<h1>test</h1>'
  );

  await BuildManager.executeBuild(config, '', { generateSitemap: false });
  assert.equal(await exists(config.sitemap.outputPath), false);

  await BuildManager.executeBuild(config, '', { generateSitemap: true });
  assert.equal(await exists(config.sitemap.outputPath), true);
});
