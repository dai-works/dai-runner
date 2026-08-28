import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { processScss } from '../../tasks/css/watchCss.js';
import { makeTmpDir } from './helpers.js';

test('SCSSエラー時はoverlayを書き、修正後は通常のCSSで上書きする', async (t) => {
  const dir = await makeTmpDir(t);
  const src = path.join(dir, 'source');
  const dist = path.join(dir, 'dist');
  const source = path.join(src, 'style.scss');
  const output = path.join(dist, 'style.css');
  await fs.mkdir(src, { recursive: true });
  await fs.writeFile(source, '.broken { color: red;\n');
  await processScss(source, { src, dist }, { sourceMap: false });
  assert.match(await fs.readFile(output, 'utf8'), /SCSS エラー/);

  await fs.writeFile(source, '.smoke-a { color: red; }\n');
  await processScss(source, { src, dist }, { sourceMap: false });
  const css = await fs.readFile(output, 'utf8');
  assert.doesNotMatch(css, /SCSS エラー/);
  assert.match(css, /\.smoke-a/);
});
