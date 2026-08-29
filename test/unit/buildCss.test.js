import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { buildCss } from '../../tasks/css/buildCss.js';
import { makeTmpDir, exists } from './helpers.js';

test('buildCssはパーシャルのindexを生成してCSSとソースマップを出力する', async (t) => {
  const dir = await makeTmpDir(t);
  const src = path.join(dir, 'source/scss');
  const modules = path.join(src, 'modules');
  const dist = path.join(dir, 'dist');
  await fs.mkdir(modules, { recursive: true });
  await fs.writeFile(path.join(src, 'style.scss'), '@use "./modules";\n');
  await fs.writeFile(
    path.join(modules, '_a.scss'),
    '.module-a { color: red; }\n'
  );

  await buildCss({
    paths: { src, dist },
    options: { sourceMap: false, minify: false },
  });

  const cssPath = path.join(dist, 'style.css');
  assert.match(await fs.readFile(cssPath, 'utf8'), /\.module-a/);
  assert.equal(await exists(path.join(modules, '_index.scss')), true);
  assert.equal(await exists(`${cssPath}.map`), false);

  await buildCss({
    paths: { src, dist },
    options: { sourceMap: true, minify: false },
  });
  assert.equal(await exists(`${cssPath}.map`), true);
});
