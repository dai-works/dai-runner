import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { compileCss } from '../../tasks/css/compileCss.js';
import { setConfig, clearCache } from '../../utils/configLoader.js';
import { makeTmpDir, exists } from './helpers.js';

const SCSS = '$c: red;\n.a {\n  color: $c;\n  .b { margin: 0; }\n}\n';

async function setup(t) {
  const dir = await makeTmpDir(t);
  const src = path.join(dir, 'style.scss');
  await fs.writeFile(src, SCSS);
  const dist = path.join(dir, 'out', 'style.css');
  return { src, dist };
}

test('sourceMap: false → .map も sourceMappingURL も出ない（グローバル config 不要）', async (t) => {
  clearCache();
  const { src, dist } = await setup(t);
  await compileCss(src, dist, { sourceMap: false, minify: false });
  const css = await fs.readFile(dist, 'utf8');
  assert.match(css, /\.a \.b \{/);
  assert.doesNotMatch(css, /sourceMappingURL/);
  assert.equal(await exists(`${dist}.map`), false);
});

test('sourceMap: true → .map と sourceMappingURL が出る', async (t) => {
  clearCache();
  const { src, dist } = await setup(t);
  await compileCss(src, dist, { sourceMap: true, minify: false });
  const css = await fs.readFile(dist, 'utf8');
  assert.match(css, /\/\*# sourceMappingURL=style\.css\.map \*\/\n$/);
  assert.equal(await exists(`${dist}.map`), true);
});

test('minify: true → 圧縮される', async (t) => {
  clearCache();
  const { src, dist } = await setup(t);
  await compileCss(src, dist, { sourceMap: false, minify: true });
  const css = await fs.readFile(dist, 'utf8');
  assert.doesNotMatch(css, /\n.+\n/, '複数行に展開されていない');
  assert.match(css, /\.a \.b\{margin:0\}/);
});

test('グローバル config より引数の options が優先される（A-1 回帰）', async (t) => {
  // dev 側の設定が読み込まれていても、build から渡された options で動くこと
  setConfig({
    get: () => ({ options: { css: { sourceMap: true, minify: false } } }),
  });
  t.after(() => clearCache());
  const { src, dist } = await setup(t);
  await compileCss(src, dist, { sourceMap: false, minify: false });
  const css = await fs.readFile(dist, 'utf8');
  assert.doesNotMatch(css, /sourceMappingURL/);
  assert.equal(await exists(`${dist}.map`), false);
});
