import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import BuildManager from '../../utils/BuildManager.js';
import CacheManager from '../../utils/CacheManager.js';
import { makeTmpDir, exists } from './helpers.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function setupProject(t) {
  const dir = await makeTmpDir(t);
  const cwd = process.cwd();
  process.chdir(dir);
  CacheManager.instances.clear();
  t.after(() => {
    process.chdir(cwd);
    CacheManager.instances.clear();
  });

  await fs.mkdir('source/scss/modules', { recursive: true });
  await fs.mkdir('source/js/modules', { recursive: true });
  await fs.mkdir('source/images', { recursive: true });
  await fs.writeFile('source/scss/style.scss', '@use "./modules";\n');
  await fs.writeFile('source/scss/modules/_a.scss', '.a { color: red; }\n');
  await fs.writeFile(
    'source/js/main.js',
    'import { a } from "./modules/a.js";\nwindow.__a = a;\n'
  );
  await fs.writeFile('source/js/modules/a.js', 'export const a = "A";\n');
  await fs.writeFile('dai-runner.config.js', '// 設定ファイル\n');

  const config = {
    paths: {
      css: { src: 'source/scss', dist: 'public/assets/css' },
      js: { src: 'source/js', dist: 'public/assets/js' },
      images: { src: 'source/images', dist: 'public/assets/images' },
    },
    cleanup: { excludeFiles: [] },
    options: {
      css: { sourceMap: true, minify: false },
      js: { bundle: true, sourceMap: false, minify: false, dropConsole: false },
      images: { useCache: true },
    },
  };
  return { dir, config };
}

const CSS = 'public/assets/css/style.css';
const MAP = 'public/assets/css/style.css.map';
const JS = 'public/assets/js/main.js';

async function mtimes() {
  const out = {};
  for (const f of [CSS, MAP, JS]) out[f] = (await fs.stat(f)).mtimeMs;
  return out;
}

// mtime の分解能より確実に長く待ってから次の操作をする（実時間で前後関係を作る）
const tick = () => sleep(30);

test('incremental: source も設定も変わらなければ dev 起動時のビルドを飛ばす', async (t) => {
  const { config } = await setupProject(t);
  await BuildManager.executeBuild(config, '', { incremental: true });
  assert.equal(await exists(MAP), true);
  const first = await mtimes();

  await tick();
  await BuildManager.executeBuild(config, '', { incremental: true });
  assert.deepEqual(
    await mtimes(),
    first,
    '2 回目は CSS も JS もスキップされる'
  );
});

test('incremental: パーシャル変更で CSS だけ作り直し、JS はスキップ', async (t) => {
  const { config } = await setupProject(t);
  await BuildManager.executeBuild(config, '', { incremental: true });
  const first = await mtimes();

  await tick();
  await fs.writeFile('source/scss/modules/_a.scss', '.a { color: blue; }\n');
  await BuildManager.executeBuild(config, '', { incremental: true });
  const second = await mtimes();
  assert.ok(second[CSS] > first[CSS], 'CSS は再生成される');
  assert.match(await fs.readFile(CSS, 'utf8'), /blue/);
  assert.equal(second[JS], first[JS], 'JS はスキップされる');
});

test('incremental: エントリ削除の残骸とオプション変更を検知して作り直す', async (t) => {
  const { config } = await setupProject(t);
  await BuildManager.executeBuild(config, '', { incremental: true });

  // 2 つ目のエントリを足して消す → 余分な dist が残っていれば作り直してクリーンアップする
  await tick();
  await fs.writeFile('source/scss/extra.scss', '.x { color: red; }\n');
  await BuildManager.executeBuild(config, '', { incremental: true });
  assert.equal(await exists('public/assets/css/extra.css'), true);
  await fs.rm('source/scss/extra.scss');
  await BuildManager.executeBuild(config, '', { incremental: true });
  assert.equal(
    await exists('public/assets/css/extra.css'),
    false,
    '削除したエントリの残骸が消える'
  );

  // オプション変更（sourceMap: false）→ .map が消えて作り直される
  const noMap = {
    ...config,
    options: { ...config.options, css: { sourceMap: false, minify: false } },
  };
  await BuildManager.executeBuild(noMap, '', { incremental: true });
  assert.equal(await exists(MAP), false);
  assert.doesNotMatch(await fs.readFile(CSS, 'utf8'), /sourceMappingURL/);

  // 設定ファイルを触る → 作り直される
  const jsBefore = (await fs.stat(JS)).mtimeMs;
  await tick();
  await fs.writeFile('dai-runner.config.js', '// 変更\n');
  await BuildManager.executeBuild(noMap, '', { incremental: true });
  assert.ok(
    (await fs.stat(JS)).mtimeMs > jsBefore,
    '設定ファイルの更新で JS も作り直される'
  );
});

test('incremental: 本番ビルド（incremental なし）は常にフルビルド', async (t) => {
  const { config } = await setupProject(t);
  await BuildManager.executeBuild(config, '', { incremental: true });
  const first = await mtimes();
  await tick();
  await BuildManager.executeBuild(config, '');
  const second = await mtimes();
  assert.ok(
    second[CSS] > first[CSS] && second[JS] > first[JS],
    'フルビルドでは書き直される'
  );
});
