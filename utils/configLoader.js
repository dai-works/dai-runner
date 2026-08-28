import path from 'path';
import { pathToFileURL } from 'url';

/**
 * プロジェクトルートのdai-runner.config.jsを動的に読み込むユーティリティ
 * npmパッケージとして使用する際、dai-runner.config.jsはプロジェクトルートに配置される
 */

let cachedConfig = null;
let cachedConfigPath = null;

/**
 * プロジェクトルートのdai-runner.config.jsを読み込む
 * @returns {Promise<Object>} config オブジェクト
 */
async function loadConfig({ env, cwd = process.cwd() } = {}) {
  const configPath = path.join(cwd, 'dai-runner.config.js');

  try {
    if (!cachedConfig || cachedConfigPath !== configPath) {
      const module = await import(pathToFileURL(configPath).href);
      cachedConfig = module.config;
      cachedConfigPath = configPath;
    }
    setConfig(cachedConfig);
    const resolvedConfig = cachedConfig.get(
      env || process.env.NODE_ENV || 'dev'
    );
    return { ...resolvedConfig, package: cachedConfig.package };
  } catch (error) {
    throw new Error(
      `dai-runner.config.jsの読み込みに失敗しました: ${error.message}\n` +
        `プロジェクトルートにdai-runner.config.jsが存在することを確認してください。\n` +
        `初回セットアップ時は 'npx dai-runner precheck' を実行してください。`,
      { cause: error }
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
  cachedConfigPath = null;
}

/**
 * キャッシュをクリア（主にテスト用）
 */
function clearCache() {
  cachedConfig = null;
  cachedConfigPath = null;
}

export { loadConfig, getConfig, setConfig, clearCache };
