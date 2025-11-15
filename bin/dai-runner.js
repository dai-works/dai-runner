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

// コマンドライン引数を取得
const args = process.argv.slice(2);
const command = args[0] || 'help';

// 実行するスクリプトのパスを決定
let scriptPath;

switch (command) {
  case 'dev':
    scriptPath = resolve(__dirname, '../scripts/dev.js');
    break;
  case 'build':
    scriptPath = resolve(__dirname, '../scripts/build.js');
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

  2. config.js を作成（自動的に対話形式で作成されます）:
     npx dai-runner precheck

  3. 開発を開始:
     npx dai-runner dev

詳細は https://github.com/dai-works/dai-runner を参照してください。
`);
    process.exit(0);
    break;
  default:
    console.error(`エラー: 不明なコマンド "${command}"`);
    console.log('使用可能なコマンド: dev, build, precheck, help');
    process.exit(1);
}

// スクリプトを実行
const child = spawn('node', [scriptPath], {
  stdio: 'inherit',
  cwd: process.cwd(),
});

child.on('exit', (code) => {
  process.exit(code || 0);
});

child.on('error', (err) => {
  console.error('スクリプトの実行中にエラーが発生しました:', err);
  process.exit(1);
});

