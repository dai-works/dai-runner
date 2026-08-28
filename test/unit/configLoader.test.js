import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { loadConfig, clearCache } from '../../utils/configLoader.js';
import { makeTmpDir } from './helpers.js';

test('loadConfigはcwdとenvに応じた解決済み設定を返す', async (t) => {
  const dir = await makeTmpDir(t);
  await fs.writeFile(
    path.join(dir, 'dai-runner.config.js'),
    `export const config = {
      get(env) { return { options: { css: { sourceMap: env === 'build' } } }; }
    };\n`
  );

  clearCache();
  assert.equal(
    (await loadConfig({ env: 'build', cwd: dir })).options.css.sourceMap,
    true
  );
  assert.equal(
    (await loadConfig({ env: 'dev', cwd: dir })).options.css.sourceMap,
    false
  );
});

test('loadConfigは読み込み失敗時に日本語の案内を返す', async (t) => {
  const dir = await makeTmpDir(t);
  clearCache();
  await assert.rejects(
    loadConfig({ env: 'dev', cwd: dir }),
    /dai-runner\.config\.jsの読み込みに失敗しました.*プロジェクトルートにdai-runner\.config\.jsが存在することを確認してください/s
  );
});
