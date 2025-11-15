#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import inquirer from 'inquirer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.resolve(process.cwd(), 'dai-runner.config.js');
const configExamplePath = path.resolve(__dirname, '../dai-runner.config.js.example');

/**
 * dai-runner.config.js.exampleをベースにdai-runner.config.jsを生成
 */
function generateConfigFromExample(mode, targetOrHostname) {
  // dai-runner.config.js.exampleを読み込み
  let configContent = fs.readFileSync(configExamplePath, 'utf8');

  if (mode === 'traefik') {
    // Traefikモード：modeをproxyに変更し、Hostヘッダーのみ変更
    // HTTP仕様に従い、Hostヘッダーからhttp://やhttps://を自動的に除去
    const cleanHostname = targetOrHostname
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '');
    configContent = configContent.replace(/mode: 'server',/g, `mode: 'proxy',`);
    configContent = configContent.replace(
      /proxyReq\.setHeader\('Host', 'sample-wp\.localhost'\)/g,
      `proxyReq.setHeader('Host', '${cleanHostname}')`,
    );
  } else if (mode === 'external') {
    // 外部WordPressモード：modeをproxyに変更し、targetを変更してproxyReqを削除
    configContent = configContent.replace(/mode: 'server',/g, `mode: 'proxy',`);
    configContent = configContent.replace(
      /proxy: \{\s*target: 'http:\/\/127\.0\.0\.1',\s*proxyReq: \[\s*function \(proxyReq\) \{\s*proxyReq\.setHeader\('Host', 'sample-wp\.localhost'\);\s*\}\s*\]\s*\}/gs,
      `proxy: { target: '${targetOrHostname}' }`,
    );
  } else if (mode === 'server') {
    // serverモードの場合は、modeをserverに変更し、proxy設定を削除
    configContent = configContent.replace(/mode: '[^']*',/g, `mode: 'server',`);
    // proxy設定を削除
    configContent = configContent.replace(
      /proxy: \{\s*target: 'http:\/\/127\.0\.0\.1',\s*proxyReq: \[\s*function \(proxyReq\) \{\s*proxyReq\.setHeader\('Host', 'sample-wp\.localhost'\);\s*\}\s*\]\s*\},/gs,
      '',
    );
    // baseDirを設定
    configContent = configContent.replace(
      /server: \{ baseDir: '\.\/' \},/g,
      `server: { baseDir: '${targetOrHostname}' },`,
    );
  }

  return configContent;
}

/**
 * インタラクティブモードでdai-runner.config.jsを作成
 */
async function createConfigInteractively() {
  try {
    console.log('\n🔧 dai-runner.config.jsの設定を行います...\n');

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
      configContent = generateConfigFromExample(
        modeAnswer.mode,
        targetOrHostname,
      );
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
      configContent = generateConfigFromExample(
        modeAnswer.mode,
        targetOrHostname,
      );
    } else {
      // serverモード：baseDirを設定
      const baseDirAnswer = await inquirer.prompt([
        {
          type: 'input',
          name: 'baseDir',
          message: 'server.baseDirを設定してください:',
          default: './',
        },
      ]);
      targetOrHostname = baseDirAnswer.baseDir;
      configContent = generateConfigFromExample(
        modeAnswer.mode,
        targetOrHostname,
      );
    }

    // dai-runner.config.jsを生成
    fs.writeFileSync(configPath, configContent);

    console.log('\n✅ dai-runner.config.jsを作成しました！');
    console.log(`📋 設定内容:`);

    if (modeAnswer.mode === 'traefik') {
      console.log(`   - mode: proxy`);
      console.log(`   - proxy.host: ${targetOrHostname}`);
      console.log(`   - proxy.target: http://127.0.0.1 (Traefik経由)`);
    } else if (modeAnswer.mode === 'external') {
      console.log(`   - mode: proxy`);
      console.log(`   - proxy.target: ${targetOrHostname}`);
    } else {
      console.log(`   - mode: server`);
      console.log(`   - server.baseDir: ${targetOrHostname}`);
    }

    console.log(
      '\n📍 必要に応じて、dai-runner.config.jsの設定を環境に合わせて調整してください。\n',
    );
  } catch (error) {
    console.error('❌ dai-runner.config.jsの作成に失敗しました:', error.message);
    console.error('\n手動でdai-runner.config.jsを作成してください:');
    console.error('   cp node_modules/@dai-works/dai-runner/dai-runner.config.js.example dai-runner.config.js\n');
    process.exit(1);
  }
}

/**
 * dai-runner実行前の事前チェック
 * dai-runner.config.jsが存在しない場合は自動的に作成する
 */
async function precheck() {
  if (!fs.existsSync(configPath)) {
    console.log(
      '\n📝 dai-runner.config.jsファイルが見つかりません。自動的に作成します...\n',
    );

    if (fs.existsSync(configExamplePath)) {
      await createConfigInteractively();
    } else {
      console.error('❌ dai-runner.config.js.exampleファイルも見つかりません。');
      console.error(
        'リポジトリから最新のdai-runner.config.js.exampleを取得してください。\n',
      );
      process.exit(1);
    }
  } else {
    console.log('✅ dai-runner.config.js が存在します。dai-runnerを開始します...\n');
  }
}

precheck();
