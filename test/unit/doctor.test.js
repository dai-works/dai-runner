import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  KNOWN_CONFIG_KEYS,
  compareVersions,
  detectUnknownKeys,
  doctor,
  extractPinnedVersion,
} from '../../scripts/doctor.js';
import { DEFAULTS } from '../../utils/defaults.js';
import { makeTmpDir } from './helpers.js';

const projectRoot = path.resolve(import.meta.dirname, '../..');

test('package.jsonの指定文字列からpinを抽出する', () => {
  assert.equal(
    extractPinnedVersion('github:dai-works/dai-runner#v2.1.0'),
    '2.1.0'
  );
  assert.equal(
    extractPinnedVersion('https://github.com/dai-works/dai-runner.git#v2.1.0'),
    '2.1.0'
  );
  assert.equal(extractPinnedVersion('github:dai-works/dai-runner'), null);
});

test('バージョンを比較する', () => {
  assert.equal(compareVersions('2.0.1', '2.1.0'), -1);
  assert.equal(compareVersions('2.1.0', '2.1.0'), 0);
  assert.equal(compareVersions('3.0.0', '2.1.0'), 1);
});

test('未知の設定キーを階層ごとに検出する', () => {
  assert.deepEqual(
    detectUnknownKeys({
      paths: { css: { src: 'source', dst: 'public' } },
      images: { convertToWebP: true },
      dev: { options: { js: { minify: false, typo: true } } },
    }),
    ['paths.css.dst', 'images.convertToWebP', 'dev.options.js.typo']
  );
});

test('exampleの有効な設定キーは既知キー表にすべて含まれる', async (t) => {
  const dir = await makeTmpDir(t);
  const examplePath = path.join(dir, 'dai-runner.config.js');
  await fs.copyFile(
    path.join(projectRoot, 'dai-runner.config.js.example'),
    examplePath
  );
  const { config } = await import(
    `${new URL(`file://${examplePath}`).href}?test=${Date.now()}`
  );
  assert.deepEqual(detectUnknownKeys(config), []);
  for (const key of Object.keys(DEFAULTS.package)) {
    assert.equal(KNOWN_CONFIG_KEYS.package.has(key), true);
  }
  for (const key of Object.keys(DEFAULTS.images)) {
    assert.equal(KNOWN_CONFIG_KEYS.images.has(key), true);
  }
});

test('doctorコマンドは正常な案件を診断できる', async (t) => {
  const dir = await makeTmpDir(t);
  const paths = [
    'source/images',
    'source/js',
    'source/scss',
    'public/assets/images',
    'public/assets/js',
    'public/assets/css',
    '.dai-runner/cache',
  ];
  await Promise.all(
    paths.map((relativePath) =>
      fs.mkdir(path.join(dir, relativePath), { recursive: true })
    )
  );
  await fs.copyFile(
    path.join(projectRoot, 'dai-runner.config.js.example'),
    path.join(dir, 'dai-runner.config.js')
  );
  await fs.copyFile(
    path.join(projectRoot, 'dai-runner.config.local.js.example'),
    path.join(dir, 'dai-runner.config.local.js')
  );
  await fs.writeFile(
    path.join(dir, 'package.json'),
    JSON.stringify({
      type: 'module',
      devDependencies: {
        '@dai-works/dai-runner': 'github:dai-works/dai-runner#v2.1.0',
      },
    })
  );
  await fs.writeFile(
    path.join(dir, '.dai-runner/cache/manifest.json'),
    JSON.stringify({ version: '1.0.0', files: {} })
  );

  const output = [];
  const originalLog = console.log;
  console.log = (message) => output.push(message);
  try {
    assert.equal(await doctor({ cwd: dir, args: [] }), 0);
  } finally {
    console.log = originalLog;
  }
  const result = output.join('\n');
  assert.match(result, /ok Node\.js/);
  assert.match(result, /ok 未知の設定キーはありません/);
  assert.match(result, /ok \.dai-runner\/cache\/manifest\.json: 0 エントリ/);
});
