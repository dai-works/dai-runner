import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { bundleJs } from '../../tasks/js/bundleJs.js';
import { handleJsUnlink } from '../../tasks/js/watchJs.js';
import { makeTmpDir } from './helpers.js';

async function setup(t) {
  const dir = await makeTmpDir(t);
  const srcDir = path.join(dir, 'src');
  const distDir = path.join(dir, 'dist');
  const modulesDir = path.join(srcDir, 'modules');
  const mainPath = path.join(srcDir, 'main.js');
  const bPath = path.join(modulesDir, 'b.js');
  await fs.mkdir(modulesDir, { recursive: true });
  await fs.writeFile(
    path.join(modulesDir, 'a.js'),
    'export const moduleA = "MODULE_A";\n'
  );
  await fs.writeFile(bPath, 'export const moduleB = "MODULE_B";\n');
  await fs.writeFile(
    mainPath,
    'import { moduleA } from "./modules/a.js";\nimport { moduleB } from "./modules/b.js";\nwindow.result = moduleA + moduleB;\n'
  );
  await bundleJs(srcDir, distDir);
  return { srcDir, distDir, mainPath, bPath };
}

const bundleOptions = {
  bundle: true,
  minify: false,
  sourceMap: false,
  dropConsole: false,
};

test('モジュール削除時に残ったエントリーを再バンドルする', async (t) => {
  const { srcDir, distDir, mainPath, bPath } = await setup(t);
  const initial = await fs.readFile(path.join(distDir, 'main.js'), 'utf8');
  assert.match(initial, /MODULE_A/);
  assert.match(initial, /MODULE_B/);

  await fs.unlink(bPath);
  await fs.writeFile(
    mainPath,
    'import { moduleA } from "./modules/a.js";\nwindow.result = moduleA;\n'
  );
  await handleJsUnlink(bPath, {
    srcDir,
    distDir,
    options: bundleOptions,
  });

  const rebuilt = await fs.readFile(path.join(distDir, 'main.js'), 'utf8');
  assert.match(rebuilt, /MODULE_A/);
  assert.doesNotMatch(rebuilt, /MODULE_B/);
});

test('削除したモジュールのimportが残る場合はエラーオーバーレイを書く', async (t) => {
  const { srcDir, distDir, bPath } = await setup(t);
  await fs.unlink(bPath);

  await handleJsUnlink(bPath, {
    srcDir,
    distDir,
    options: bundleOptions,
  });

  const output = await fs.readFile(path.join(distDir, 'main.js'), 'utf8');
  assert.match(output, /JavaScript エラー/);
});
