import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { bundleJs } from '../../tasks/js/bundleJs.js';
import { makeTmpDir, exists } from './helpers.js';

async function setup(t) {
  const dir = await makeTmpDir(t);
  const src = path.join(dir, 'src');
  await fs.mkdir(path.join(src, 'modules'), { recursive: true });
  await fs.writeFile(
    path.join(src, 'modules', 'greet.js'),
    'export function greet(name) {\n  console.log("hello " + name);\n  return "hello " + name;\n}\n'
  );
  await fs.writeFile(
    path.join(src, 'main.js'),
    'import { greet } from "./modules/greet.js";\nwindow.__greeting = greet("world");\n'
  );
  return { src, dist: path.join(dir, 'dist') };
}

test('bundleJs: minify を渡すとバンドル済み IIFE が圧縮される（watchJs が bundle 後に minifyJs を掛けない前提）', async (t) => {
  const { src, dist } = await setup(t);
  await bundleJs(src, dist, { minify: true, sourcemap: false });
  const out = await fs.readFile(path.join(dist, 'main.js'), 'utf8');
  assert.doesNotMatch(out, /\bimport\b/, 'bare import が残っていない');
  assert.match(out, /hello /, 'モジュール側のコードが取り込まれている');
  assert.ok(out.split('\n').length <= 2, '圧縮されている');
  assert.equal(await exists(path.join(dist, 'main.js.map')), false);
});

test('bundleJs: dropConsole で console.* が消える', async (t) => {
  const { src, dist } = await setup(t);
  await bundleJs(src, dist, { minify: true, dropConsole: true });
  const out = await fs.readFile(path.join(dist, 'main.js'), 'utf8');
  assert.doesNotMatch(out, /console\./);
});
