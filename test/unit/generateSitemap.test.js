import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { generateSitemap } from '../../tasks/sitemap/generateSitemap.js';
import { makeTmpDir } from './helpers.js';

test('generateSitemapはHTMLからURLを生成し優先度と除外設定を反映する', async (t) => {
  const dir = await makeTmpDir(t);
  const sourceDir = path.join(dir, 'source');
  const aboutDir = path.join(sourceDir, 'about');
  const outputPath = path.join(dir, 'dist/sitemap.xml');
  await fs.mkdir(aboutDir, { recursive: true });
  await fs.writeFile(path.join(sourceDir, 'index.html'), '<h1>top</h1>');
  await fs.writeFile(path.join(aboutDir, 'index.html'), '<h1>about</h1>');

  const config = {
    productionUrl: 'https://example.com/',
    sourceDir,
    outputPath,
    customPriorities: { '/about/': 0.8 },
  };
  await generateSitemap(config);
  const xml = await fs.readFile(outputPath, 'utf8');
  assert.equal((xml.match(/<loc>/g) || []).length, 2);
  assert.match(xml, /<loc>https:\/\/example\.com\/<\/loc>/);
  assert.match(
    xml,
    /<loc>https:\/\/example\.com\/about\/<\/loc>[\s\S]*?<priority>0\.8<\/priority>/
  );

  await generateSitemap({
    ...config,
    excludePatterns: ['about/**'],
  });
  const excludedXml = await fs.readFile(outputPath, 'utf8');
  assert.equal((excludedXml.match(/<loc>/g) || []).length, 1);
  assert.doesNotMatch(excludedXml, /\/about\//);
});
