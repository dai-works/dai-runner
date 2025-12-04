#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import inquirer from 'inquirer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// メイン設定ファイルのパス
const mainConfigPath = path.resolve(process.cwd(), 'dai-runner.config.js');
const mainConfigExamplePath = path.resolve(
  __dirname,
  '../dai-runner.config.js.example'
);

// ローカル設定ファイルのパス
const localConfigPath = path.resolve(
  process.cwd(),
  'dai-runner.config.local.js'
);
const localConfigExamplePath = path.resolve(
  __dirname,
  '../dai-runner.config.local.js.example'
);

/**
 * .envファイルから環境変数を読み取る
 * @returns {Object} 環境変数のkey-valueオブジェクト
 */
function readEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    return {};
  }

  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};

    envContent.split('\n').forEach((line) => {
      // コメント行や空行をスキップ
      line = line.trim();
      if (!line || line.startsWith('#')) {
        return;
      }

      // KEY=VALUE の形式をパース
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        // クォートを除去
        value = value.replace(/^['"]|['"]$/g, '');
        envVars[key] = value;
      }
    });

    return envVars;
  } catch (_error) {
    // .envファイルの読み取りに失敗しても続行
    return {};
  }
}

/**
 * デフォルトのホスト名を推測する
 * 優先順位: .envのCOMPOSE_PROJECT_NAME > ディレクトリ名.localhost
 * @returns {string} デフォルトのホスト名
 */
function guessDefaultHostname() {
  // .envファイルから読み取り
  const envVars = readEnvFile();

  // COMPOSE_PROJECT_NAMEをチェック
  if (envVars.COMPOSE_PROJECT_NAME) {
    return `${envVars.COMPOSE_PROJECT_NAME}.localhost`;
  }

  // ディレクトリ名から推測
  const currentDir = path.basename(process.cwd());
  return `${currentDir}.localhost`;
}

/**
 * dai-runner.config.local.jsを生成
 * example ファイルをコピーして必要な部分を置換
 */
function generateLocalConfig(mode, targetOrHostname) {
  // example ファイルを読み込み
  let configContent = fs.readFileSync(localConfigExamplePath, 'utf8');

  if (mode === 'traefik') {
    // Traefikモード：modeをproxyに変更し、Hostヘッダーを変更
    const cleanHostname = targetOrHostname
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '');
    configContent = configContent.replace(/mode: 'server'/, `mode: 'proxy'`);
    // コメントアウトされた関数を有効化して、Hostヘッダーを変更
    configContent = configContent.replace(
      /\/\/ 例: Hostヘッダーを変更（Traefik等を使用する場合）\s*\n\s*\/\/ function \(proxyReq\) \{\s*\n\s*\/\/\s*proxyReq\.setHeader\('Host', 'sample-wp\.localhost'\);\s*\n\s*\/\/ \},?/,
      `function (proxyReq) {\n        proxyReq.setHeader('Host', '${cleanHostname}');\n      },`
    );
  } else if (mode === 'external') {
    // 外部サーバーモード：modeをproxyに変更し、targetを変更
    configContent = configContent.replace(/mode: 'server'/, `mode: 'proxy'`);
    configContent = configContent.replace(
      /target: 'http:\/\/127\.0\.0\.1'/,
      `target: '${targetOrHostname}'`
    );
    // proxyReqはコメントのまま（空配列）
  }

  return configContent;
}

/**
 * インタラクティブモードでdai-runner.config.local.jsを作成
 */
async function createLocalConfigInteractively() {
  try {
    console.log('\n🔧 dai-runner.config.local.jsの設定を行います...\n');

    // 開発環境のタイプを選択
    const modeAnswer = await inquirer.prompt([
      {
        type: 'list',
        name: 'mode',
        message: '開発環境のタイプを選択してください:',
        choices: [
          {
            name: '静的ファイルのみ (server)',
            value: 'server',
          },
          {
            name: 'dai-traefikを使用',
            value: 'traefik',
          },
          {
            name: '外部サーバー (Local, Dockerでdai-traefik未使用, XAMPP, etc.)',
            value: 'external',
          },
        ],
      },
    ]);

    // serverモードの場合はexampleをそのままコピー
    if (modeAnswer.mode === 'server') {
      fs.copyFileSync(localConfigExamplePath, localConfigPath);
      console.log(
        '\n✅ 静的ファイルモードのため、デフォルト設定ファイルを作成しました。'
      );
      console.log('📋 すべての設定は dai-runner.config.js で共有されます。\n');
      return;
    }

    let targetOrHostname;
    let configContent;

    if (modeAnswer.mode === 'traefik') {
      // Traefikモード：ホスト名を入力
      const defaultHostname = guessDefaultHostname();
      const hostAnswer = await inquirer.prompt([
        {
          type: 'input',
          name: 'hostname',
          message: 'Traefikで設定されているホスト名を入力してください:',
          default: defaultHostname,
          validate: (input) => {
            if (!input.trim()) {
              return 'ホスト名を入力してください';
            }
            return true;
          },
        },
      ]);
      targetOrHostname = hostAnswer.hostname;
      configContent = generateLocalConfig(modeAnswer.mode, targetOrHostname);
    } else if (modeAnswer.mode === 'external') {
      // 外部サーバーモード：URLを入力
      const targetAnswer = await inquirer.prompt([
        {
          type: 'input',
          name: 'target',
          message: 'サーバーのURLを入力してください:',
          default: 'http://localhost:8080',
          validate: (input) => {
            if (!input.trim()) {
              return 'URLを入力してください';
            }
            if (!input.startsWith('http://') && !input.startsWith('https://')) {
              return 'http:// または https:// で始まるURLを入力してください';
            }
            return true;
          },
        },
      ]);
      targetOrHostname = targetAnswer.target;
      configContent = generateLocalConfig(modeAnswer.mode, targetOrHostname);
    }

    // dai-runner.config.local.jsを生成
    fs.writeFileSync(localConfigPath, configContent);

    console.log('\n✅ dai-runner.config.local.jsを作成しました！');
    console.log(`📋 設定内容:`);

    if (modeAnswer.mode === 'traefik') {
      console.log(`   - proxy.target: http://127.0.0.1 (Traefik経由)`);
      console.log(`   - proxy.host: ${targetOrHostname}`);
    } else if (modeAnswer.mode === 'external') {
      console.log(`   - proxy.target: ${targetOrHostname}`);
    }

    console.log(
      '\n📍 必要に応じて、dai-runner.config.local.jsの設定を環境に合わせて調整してください。\n'
    );
  } catch (error) {
    console.error(
      '❌ dai-runner.config.local.jsの作成に失敗しました:',
      error.message
    );
    console.error('\n手動でdai-runner.config.local.jsを作成してください:');
    console.error(
      '   cp dai-runner.config.local.js.example dai-runner.config.local.js\n'
    );
    process.exit(1);
  }
}

/**
 * dai-runner実行前の事前チェック
 * dai-runner.config.jsとdai-runner.config.local.jsが存在しない場合は自動的に作成する
 */
async function precheck() {
  // 1. まずメイン設定ファイル (dai-runner.config.js) をチェック
  if (!fs.existsSync(mainConfigPath)) {
    console.log(
      '\n📝 dai-runner.config.jsファイルが見つかりません。自動的に作成します...\n'
    );

    if (fs.existsSync(mainConfigExamplePath)) {
      try {
        fs.copyFileSync(mainConfigExamplePath, mainConfigPath);
        console.log('✅ dai-runner.config.jsを作成しました。\n');
      } catch (error) {
        console.error(
          '❌ dai-runner.config.jsの作成に失敗しました:',
          error.message
        );
        console.error('\n手動でdai-runner.config.jsを作成してください:');
        console.error(
          '   cp dai-runner.config.js.example dai-runner.config.js\n'
        );
        process.exit(1);
      }
    } else {
      console.error(
        '❌ dai-runner.config.js.exampleファイルも見つかりません。'
      );
      console.error(
        'リポジトリから最新のdai-runner.config.js.exampleを取得してください。\n'
      );
      process.exit(1);
    }
  }

  // 2. 次にローカル設定ファイル (dai-runner.config.local.js) をチェック
  if (!fs.existsSync(localConfigPath)) {
    console.log(
      '\n📝 dai-runner.config.local.jsファイルが見つかりません。自動的に作成します...\n'
    );

    if (fs.existsSync(localConfigExamplePath)) {
      await createLocalConfigInteractively();
    } else {
      console.error(
        '❌ dai-runner.config.local.js.exampleファイルも見つかりません。'
      );
      console.error(
        'リポジトリから最新のdai-runner.config.local.js.exampleを取得してください。\n'
      );
      process.exit(1);
    }
  }

  console.log(
    '✅ 設定ファイルの確認が完了しました。dai-runnerを開始します...\n'
  );
}

precheck();
