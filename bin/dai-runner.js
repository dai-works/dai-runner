#!/usr/bin/env node

/**
 * dai-runner CLI エントリーポイント
 *
 * このスクリプトは、dai-runnerをコマンドラインから実行するためのエントリーポイントです。
 * npm installでインストール後、`npx dai-runner <command>`で実行できます。
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * スクリプトを実行するヘルパー関数
 */
function runScript(scriptPath, scriptArgs = []) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('node', [scriptPath, ...scriptArgs], {
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    child.on('exit', (code, signal) => {
      if (code !== null) {
        resolvePromise(code);
        return;
      }

      const signalExitCodes = { SIGINT: 130, SIGTERM: 143 };
      const exitCode = signalExitCodes[signal] || 1;
      console.error(`スクリプトがシグナル ${signal} で終了しました`);
      resolvePromise(exitCode);
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * メイン処理
 */
async function main() {
  // コマンドライン引数を取得
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const subArgs = args.slice(1);

  // 実行するスクリプトのパスを決定
  let scriptPath;
  let needsPrecheck = false;
  let forwardArgs = [];

  switch (command) {
    case 'dev':
      scriptPath = resolve(__dirname, '../scripts/dev.js');
      needsPrecheck = true;
      break;
    case 'build':
      scriptPath = resolve(__dirname, '../scripts/build.js');
      needsPrecheck = true;
      break;
    case 'package':
      scriptPath = resolve(__dirname, '../scripts/package.js');
      // package は dai-runner.config.local.js（個人環境設定）を使わないので precheck 不要
      forwardArgs = subArgs;
      break;
    case 'precheck':
      scriptPath = resolve(__dirname, '../scripts/precheck.js');
      break;
    case 'doctor':
      scriptPath = resolve(__dirname, '../scripts/doctor.js');
      forwardArgs = subArgs;
      break;
    case 'help':
    case '--help':
    case '-h':
      console.log(`
dai-runner - WordPressテーマ開発ツール

使用方法:
  dai-runner dev            開発環境を起動（ファイル監視 + 自動リロード）
  dai-runner build          本番用ビルド（最適化）
  dai-runner package        本番アップロード用フォルダを生成（dist/theme/）
  dai-runner package --zip  上記に加えて zip も生成（dist/theme.zip）
  dai-runner precheck       設定ファイルの確認・作成
  dai-runner doctor         案件の設定・バージョン・パスを診断
  dai-runner help           このヘルプを表示

初回セットアップ:
  1. プロジェクトに dai-runner をインストール:
     npm install --save-dev @dai-works/dai-runner

  2. 開発を開始（設定ファイルは自動的に作成されます）:
     npm run dev

詳細は https://github.com/dai-works/dai-runner を参照してください。
`);
      process.exit(0);
      break;
    default:
      console.error(`エラー: 不明なコマンド "${command}"`);
      console.log(
        '使用可能なコマンド: dev, build, package, precheck, doctor, help'
      );
      process.exit(1);
  }

  try {
    // dev/build/package の前に毎回 precheck を通す：
    // 設定ファイルが無ければ作成（対話）、Node のバージョン確認、ソースパスの存在確認。
    // 以前は設定ファイルが無い時だけ実行していたため、後者 2 つが実案件で一度も動いていなかった
    if (needsPrecheck) {
      const precheckPath = resolve(__dirname, '../scripts/precheck.js');
      const precheckCode = await runScript(precheckPath);
      if (precheckCode !== 0) {
        process.exit(precheckCode);
      }
    }

    // メインスクリプトを実行
    const exitCode = await runScript(scriptPath, forwardArgs);
    process.exit(exitCode);
  } catch (err) {
    console.error('スクリプトの実行中にエラーが発生しました:', err.message);
    process.exit(1);
  }
}

// メイン処理を実行
main();
