import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  calculateNextVersion,
  createCommitMessage,
  release,
  replaceReadmeVersion,
  replaceUnreleasedSection,
} from '../../scripts/release.js';
import { makeTmpDir } from './helpers.js';

const projectRoot = path.resolve(import.meta.dirname, '../..');

test('次のセマンティックバージョンを計算する', () => {
  assert.equal(calculateNextVersion('2.0.1', 'patch'), '2.0.2');
  assert.equal(calculateNextVersion('2.0.1', 'minor'), '2.1.0');
  assert.equal(calculateNextVersion('2.0.1', 'major'), '3.0.0');
});

test('Unreleasedを新版へ置換し、コミットメッセージを作る', () => {
  const changelog =
    '# 変更履歴\n\n## [Unreleased]\n\n### 追加\n\n- doctor を追加\n\n## [2.0.1]\n';
  const result = replaceUnreleasedSection(changelog, '2.1.0', '2026-08-29');
  assert.match(result.content, /## \[2\.1\.0\] - 2026-08-29/);
  assert.equal(
    createCommitMessage(result.section, '2.1.0'),
    'v2.1.0: doctor を追加'
  );
  // prettier で折り返された箇条書きは継続行を結合する
  assert.equal(
    createCommitMessage(
      '## [2.1.0] - 2026-08-29\n\n### 追加\n\n- 長い説明の\n  続き\n- 次の項目\n',
      '2.1.0'
    ),
    'v2.1.0: 長い説明の 続き'
  );
  assert.throws(
    () => replaceUnreleasedSection('# 変更履歴\n', '2.1.0', '2026-08-29'),
    /Unreleased/
  );
  assert.throws(
    () =>
      replaceUnreleasedSection(
        '# 変更履歴\n\n## [Unreleased]\n\n## [2.0.1]\n',
        '2.1.0',
        '2026-08-29'
      ),
    /変更内容/
  );
});

test('READMEの旧バージョン参照をすべて置換する', () => {
  const result = replaceReadmeVersion(
    'github:repo#v2.0.1\nrepo.git#v2.0.1\n',
    '2.0.1',
    '2.1.0'
  );
  assert.equal(result.count, 2);
  assert.equal(result.content, 'github:repo#v2.1.0\nrepo.git#v2.1.0\n');
});

test('リリース対象ファイルのバージョンが一致する', async () => {
  const packageJson = JSON.parse(
    await fs.readFile(path.join(projectRoot, 'package.json'), 'utf8')
  );
  const packageLock = JSON.parse(
    await fs.readFile(path.join(projectRoot, 'package-lock.json'), 'utf8')
  );
  const changelog = await fs.readFile(
    path.join(projectRoot, 'CHANGELOG.md'),
    'utf8'
  );
  const readme = await fs.readFile(path.join(projectRoot, 'README.md'), 'utf8');
  const changelogVersion = changelog.match(/^## \[(\d+\.\d+\.\d+)\]/m)?.[1];
  const readmeVersions = [...readme.matchAll(/#v(\d+\.\d+\.\d+)/g)].map(
    (match) => match[1]
  );

  assert.equal(changelogVersion, packageJson.version);
  assert.ok(readmeVersions.length > 0);
  assert.deepEqual(new Set(readmeVersions), new Set([packageJson.version]));
  assert.equal(packageLock.version, packageJson.version);
  assert.equal(packageLock.packages[''].version, packageJson.version);
});

test('dry-runは差分と実行予定コマンドだけを表示する', async (t) => {
  const dir = await makeTmpDir(t);
  const fixturePackage = {
    name: 'release-fixture',
    version: '1.2.3',
    scripts: {},
  };
  await fs.writeFile(
    path.join(dir, 'package.json'),
    `${JSON.stringify(fixturePackage, null, 2)}\n`
  );
  await fs.writeFile(
    path.join(dir, 'package-lock.json'),
    `${JSON.stringify({ ...fixturePackage, lockfileVersion: 3, packages: { '': fixturePackage } }, null, 2)}\n`
  );
  await fs.writeFile(
    path.join(dir, 'CHANGELOG.md'),
    '# 変更履歴\n\n## [Unreleased]\n\n### 修正\n\n- dry-run を確認\n'
  );
  await fs.writeFile(path.join(dir, 'README.md'), 'repo#v1.2.3\n');
  const output = [];
  const originalLog = console.log;
  const originalWarn = console.warn;
  console.log = (message) => output.push(message);
  console.warn = (message) => output.push(message);
  try {
    await release({
      cwd: dir,
      args: ['patch', '--dry-run', '--skip-check'],
      runCommand(command, args) {
        if (command === 'git' && args[0] === 'status') return '';
        if (command === 'git' && args[0] === 'branch') return 'main\n';
        throw new Error(`想定外のコマンドです: ${command} ${args.join(' ')}`);
      },
      hasGhCommand: false,
    });
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
  }
  const result = output.join('\n');
  assert.match(result, /version: 1\.2\.3 -> 1\.2\.4/);
  assert.match(result, /README の置換行数: 1/);
  assert.match(result, /実行予定: git push origin main/);
  assert.equal(
    JSON.parse(await fs.readFile(path.join(dir, 'package.json'), 'utf8'))
      .version,
    '1.2.3'
  );
});
