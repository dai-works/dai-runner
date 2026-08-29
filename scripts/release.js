#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RELEASE_TYPES = new Set(['patch', 'minor', 'major']);

function calculateNextVersion(currentVersion, releaseType) {
  const match = currentVersion.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match || !RELEASE_TYPES.has(releaseType)) {
    throw new Error('バージョンと更新種別を確認してください');
  }

  const version = match.slice(1).map(Number);
  const index = { major: 0, minor: 1, patch: 2 }[releaseType];
  version[index] += 1;
  for (let i = index + 1; i < version.length; i += 1) {
    version[i] = 0;
  }
  return version.join('.');
}

function replaceUnreleasedSection(changelog, newVersion, date) {
  const headingPattern = /^## \[Unreleased\][ \t]*$/m;
  const match = headingPattern.exec(changelog);
  if (!match) {
    throw new Error(
      'CHANGELOG に `## [Unreleased]` を書いてから実行してください'
    );
  }

  const sectionStart = match.index;
  const contentStart = sectionStart + match[0].length;
  const nextHeading = changelog.slice(contentStart).search(/^## /m);
  const sectionEnd =
    nextHeading === -1 ? changelog.length : contentStart + nextHeading;
  const body = changelog.slice(contentStart, sectionEnd).trim();
  if (!body) {
    throw new Error(
      'CHANGELOG の `## [Unreleased]` に変更内容を書いてから実行してください'
    );
  }

  const heading = `## [${newVersion}] - ${date}`;
  const section = `${heading}\n\n${body}`;
  return {
    content: `${changelog.slice(0, sectionStart)}${section}${changelog.slice(sectionEnd)}`,
    section,
  };
}

function replaceReadmeVersion(readme, oldVersion, newVersion) {
  const pattern = new RegExp(`#v${oldVersion.replaceAll('.', '\\.')}`, 'g');
  const matches = readme.match(pattern) || [];
  return {
    content: readme.replace(pattern, `#v${newVersion}`),
    count: matches.length,
  };
}

function createCommitMessage(section, newVersion) {
  const lines = section.split('\n').map((line) => line.trim());
  const firstSubheading = lines.findIndex((line) => line.startsWith('### '));
  if (firstSubheading === -1) {
    throw new Error(
      'CHANGELOG の新版セクションに見出しと変更内容を書いてください'
    );
  }
  // 最初の箇条書きを、折り返された継続行（次の箇条書き・見出し・空行まで）ごと 1 行にまとめる
  const rest = lines.slice(firstSubheading + 1);
  const start = rest.findIndex((line) => line && !line.startsWith('#'));
  if (start === -1) {
    throw new Error(
      'CHANGELOG の新版セクションに見出しと変更内容を書いてください'
    );
  }
  const parts = [rest[start].replace(/^[-*]\s+/, '')];
  for (const line of rest.slice(start + 1)) {
    if (!line || /^([-*]\s|#|\d+\.\s)/.test(line)) break;
    parts.push(line);
  }
  return `v${newVersion}: ${parts.join(' ')}`;
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: options.cwd,
    encoding: 'utf8',
    stdio: options.inherit ? 'inherit' : 'pipe',
  });
}

function quoteCommand(command, args) {
  return [command, ...args]
    .map((value) =>
      /^[a-zA-Z0-9_./:@-]+$/.test(value)
        ? value
        : `'${value.replaceAll("'", "'\\''")}'`
    )
    .join(' ');
}

function assertRepositoryReady(cwd, runCommand = run, { dryRun = false } = {}) {
  const status = runCommand('git', ['status', '--porcelain'], { cwd }).trim();
  if (status) {
    if (!dryRun) {
      throw new Error('作業ツリーがクリーンではありません');
    }
    console.warn(
      'WARN 作業ツリーがクリーンではありません（dry-run なので続行）'
    );
  }
  const branch = runCommand('git', ['branch', '--show-current'], {
    cwd,
  }).trim();
  if (branch !== 'main') {
    throw new Error(
      `現在のブランチは ${branch || '(detached HEAD)'} です。main で実行してください`
    );
  }
}

function updatePackageVersions(packageJson, packageLock, newVersion) {
  const nextPackageJson = { ...packageJson, version: newVersion };
  const nextPackageLock = {
    ...packageLock,
    version: newVersion,
    packages: {
      ...packageLock.packages,
      '': { ...packageLock.packages[''], version: newVersion },
    },
  };
  return { nextPackageJson, nextPackageLock };
}

async function release({
  cwd = process.cwd(),
  args = process.argv.slice(2),
  runCommand = run,
  hasGhCommand,
} = {}) {
  const releaseType = args.find((arg) => RELEASE_TYPES.has(arg));
  const dryRun = args.includes('--dry-run');
  const skipCheck = args.includes('--skip-check');
  if (!releaseType) {
    throw new Error(
      '使い方: npm run release -- patch|minor|major [--dry-run] [--skip-check]'
    );
  }

  assertRepositoryReady(cwd, runCommand, { dryRun });
  if (skipCheck) {
    console.warn('WARN npm run check をスキップします');
  } else {
    runCommand('npm', ['run', 'check'], { cwd, inherit: true });
  }

  const packagePath = path.join(cwd, 'package.json');
  const packageLockPath = path.join(cwd, 'package-lock.json');
  const changelogPath = path.join(cwd, 'CHANGELOG.md');
  const readmePath = path.join(cwd, 'README.md');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const packageLock = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'));
  const changelog = fs.readFileSync(changelogPath, 'utf8');
  const readme = fs.readFileSync(readmePath, 'utf8');
  const newVersion = calculateNextVersion(packageJson.version, releaseType);
  const today = new Date().toLocaleDateString('sv-SE', {
    timeZone: 'Asia/Tokyo',
  });
  const changelogResult = replaceUnreleasedSection(
    changelog,
    newVersion,
    today
  );
  const readmeResult = replaceReadmeVersion(
    readme,
    packageJson.version,
    newVersion
  );
  const commitMessage = createCommitMessage(
    changelogResult.section,
    newVersion
  );
  const { nextPackageJson, nextPackageLock } = updatePackageVersions(
    packageJson,
    packageLock,
    newVersion
  );
  const gitCommands = [
    ['git', ['add', '-A']],
    ['git', ['commit', '-m', commitMessage, '-m', changelogResult.section]],
    ['git', ['tag', '-a', `v${newVersion}`, '-m', `v${newVersion}`]],
    ['git', ['push', 'origin', 'main']],
    ['git', ['push', 'origin', `v${newVersion}`]],
  ];
  const hasGh =
    hasGhCommand ??
    spawnSync('gh', ['--version'], { stdio: 'ignore' }).status === 0;

  if (dryRun) {
    console.log('DRY RUN: ファイルの書き換えとコマンド実行は行いません');
    console.log(`version: ${packageJson.version} -> ${newVersion}`);
    console.log(`README の置換行数: ${readmeResult.count}`);
    console.log(`コミットメッセージ: ${commitMessage}`);
    for (const [command, commandArgs] of gitCommands) {
      console.log(`実行予定: ${quoteCommand(command, commandArgs)}`);
    }
    if (hasGh) {
      console.log(
        `実行予定: gh release create v${newVersion} --title v${newVersion} --notes-file <一時ファイル>`
      );
    } else {
      console.log(
        '案内: gh コマンドがないため GitHub Release の作成はスキップします'
      );
    }
    return;
  }

  fs.writeFileSync(
    packagePath,
    `${JSON.stringify(nextPackageJson, null, 2)}\n`
  );
  fs.writeFileSync(
    packageLockPath,
    `${JSON.stringify(nextPackageLock, null, 2)}\n`
  );
  fs.writeFileSync(changelogPath, changelogResult.content);
  fs.writeFileSync(readmePath, readmeResult.content);
  for (const [command, commandArgs] of gitCommands) {
    runCommand(command, commandArgs, { cwd, inherit: true });
  }

  if (!hasGh) {
    console.log(
      'gh コマンドがないため GitHub Release の作成はスキップしました'
    );
    return;
  }
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dai-runner-release-'));
  const notesPath = path.join(tempDir, 'notes.md');
  try {
    fs.writeFileSync(notesPath, `${changelogResult.section}\n`);
    runCommand(
      'gh',
      [
        'release',
        'create',
        `v${newVersion}`,
        '--title',
        `v${newVersion}`,
        '--notes-file',
        notesPath,
      ],
      { cwd, inherit: true }
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

const isDirectRun =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  release().catch((error) => {
    console.error(`エラー: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  calculateNextVersion,
  createCommitMessage,
  release,
  replaceReadmeVersion,
  replaceUnreleasedSection,
};
