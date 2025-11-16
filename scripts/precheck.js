#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import inquirer from 'inquirer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const localConfigPath = path.resolve(
  process.cwd(),
  'dai-runner.config.local.js'
);
const localConfigExamplePath = path.resolve(
  __dirname,
  '../dai-runner.config.local.js.example'
);

/**
 * dai-runner.config.local.jsを生成
 */
function generateLocalConfig(mode, targetOrHostname) {
  if (mode === 'traefik') {
    // Traefikモード：Hostヘッダーを設定
    const cleanHostname = targetOrHostname
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '');
    return `/**
 * ローカル環境設定ファイル（個人用）
 * このファイルはGit管理されません
 */
export default {
  mode: 'proxy',
  proxy: {
    target: 'http://127.0.0.1',
    proxyReq: [
      function (proxyReq) {
        proxyReq.setHeader('Host', '${cleanHostname}');
      },
    ],
  },
};
`;
  } else if (mode === 'external') {
    // 外部WordPressモード：targetのみ設定
    return `/**
 * ローカル環境設定ファイル（個人用）
 * このファイルはGit管理されません
 */
export default {
  mode: 'proxy',
  proxy: {
    target: '${targetOrHostname}',
    proxyReq: [],
  },
};
`;
  } else {
    // proxy不要モード（server）：デフォルト値
    return `/**
 * ローカル環境設定ファイル（個人用）
 * このファイルはGit管理されません
 */
export default {
  mode: 'server',
  proxy: {
    target: 'http://127.0.0.1',
    proxyReq: [],
  },
};
`;
  }
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
            name: 'dai-traefikを使用',
            value: 'traefik',
          },
          {
            name: '外部WordPress (Local, Dockerでdai-traefik未使用, XAMPP, etc.)',
            value: 'external',
          },
          {
            name: '静的ファイルのみ (server)',
            value: 'server',
          },
        ],
      },
    ]);

    let targetOrHostname;
    let configContent;

    if (modeAnswer.mode === 'traefik') {
      // Traefikモード：ホスト名を入力
      const hostAnswer = await inquirer.prompt([
        {
          type: 'input',
          name: 'hostname',
          message: 'Traefikで設定されているホスト名を入力してください:',
          default: 'sample-wp.localhost',
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
      // 外部WordPressモード：URLを入力
      const targetAnswer = await inquirer.prompt([
        {
          type: 'input',
          name: 'target',
          message: 'WordPressのURLを入力してください:',
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
    } else {
      // serverモード：proxy設定は不要
      targetOrHostname = 'デフォルト';
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
    } else {
      console.log(`   - proxy設定: デフォルト値`);
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
 * dai-runner.config.local.jsが存在しない場合は自動的に作成する
 */
async function precheck() {
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
  } else {
    console.log(
      '✅ dai-runner.config.local.js が存在します。dai-runnerを開始します...\n'
    );
  }
}

precheck();
