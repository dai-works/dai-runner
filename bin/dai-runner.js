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
import fs from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * スクリプトを実行するヘルパー関数
 */
function runScript(scriptPath) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(new Error(`スクリプトがコード ${code} で終了しました`));
      }
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

  // 実行するスクリプトのパスを決定
  let scriptPath;
  let needsPrecheck = false;

  switch (command) {
    case 'dev':
      scriptPath = resolve(__dirname, '../scripts/dev.js');
      needsPrecheck = true;
      break;
    case 'build':
      scriptPath = resolve(__dirname, '../scripts/build.js');
      needsPrecheck = true;
      break;
    case 'precheck':
      scriptPath = resolve(__dirname, '../scripts/precheck.js');
      break;
    case 'help':
    case '--help':
    case '-h':
      console.log(`
dai-runner - WordPressテーマ開発ツール

使用方法:
  dai-runner dev      開発環境を起動（ファイル監視 + 自動リロード）
  dai-runner build    本番用ビルド（最適化）
  dai-runner precheck 設定ファイルの確認・作成
  dai-runner help     このヘルプを表示

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
      console.log('使用可能なコマンド: dev, build, precheck, help');
      process.exit(1);
  }

  try {
    // dev/buildコマンドの場合、設定ファイルが無ければprecheckを先に実行
    if (needsPrecheck) {
      const configPath = path.join(process.cwd(), 'dai-runner.config.js');
      const localConfigPath = path.join(process.cwd(), 'dai-runner.config.local.js');

      // いずれかの設定ファイルが存在しない場合はprecheckを実行
      if (!fs.existsSync(configPath) || !fs.existsSync(localConfigPath)) {
        const precheckPath = resolve(__dirname, '../scripts/precheck.js');
        await runScript(precheckPath);
      }
    }

    // メインスクリプトを実行
    await runScript(scriptPath);
    process.exit(0);
  } catch (err) {
    console.error('スクリプトの実行中にエラーが発生しました:', err.message);
    process.exit(1);
  }
}

// メイン処理を実行
main();
