import path from 'path';
import { pathToFileURL } from 'url';

/**
 * プロジェクトルートのconfig.jsを動的に読み込むユーティリティ
 * npmパッケージとして使用する際、config.jsはプロジェクトルートに配置される
 */

let cachedConfig = null;

/**
 * プロジェクトルートのconfig.jsを読み込む
 * @returns {Promise<Object>} config オブジェクト
 */
async function loadConfig() {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const configPath = path.join(process.cwd(), 'config.js');
    const { config } = await import(pathToFileURL(configPath).href);
    cachedConfig = config;
    return config;
  } catch (error) {
    throw new Error(
      `config.jsの読み込みに失敗しました: ${error.message}\n` +
      `プロジェクトルートにconfig.jsが存在することを確認してください。\n` +
      `初回セットアップ時は 'npx dai-runner precheck' を実行してください。`
    );
  }
}

/**
 * 読み込み済みのconfigを取得（同期的）
 * loadConfig()が先に呼ばれている必要がある
 * @returns {Object} config オブジェクト
 * @throws {Error} configが未読み込みの場合
 */
function getConfig() {
  if (!cachedConfig) {
    throw new Error(
      'configが読み込まれていません。先にloadConfig()を呼び出してください。'
    );
  }
  return cachedConfig;
}

/**
 * configを手動で設定（主にメインスクリプトから使用）
 * @param {Object} config - 設定するconfigオブジェクト
 */
function setConfig(config) {
  cachedConfig = config;
}

/**
 * キャッシュをクリア（主にテスト用）
 */
function clearCache() {
  cachedConfig = null;
}

export { loadConfig, getConfig, setConfig, clearCache };

