/**
 * dai-runner - WordPressテーマ開発ツール
 *
 * このパッケージは、WordPressテーマ開発のための
 * ビルドツールを提供します。
 *
 * @module dai-runner
 */

// 主要なユーティリティをエクスポート
export { default as Logger } from './utils/Logger.js';
export { default as BuildManager } from './utils/BuildManager.js';
export { default as TaskRunner } from './utils/TaskRunner.js';
export { default as CleanupManager } from './utils/CleanupManager.js';

// タスク関数をエクスポート
export { buildCss } from './tasks/css/buildCss.js';
export { watchCss } from './tasks/css/watchCss.js';
export { buildJs } from './tasks/js/buildJs.js';
export { watchJs } from './tasks/js/watchJs.js';
export { buildImages } from './tasks/images/buildImages.js';
export { watchImages } from './tasks/images/watchImages.js';
export { startServer } from './tasks/server/startServer.js';

// 設定オブジェクトをエクスポート
// ユーザーはプロジェクトルートにconfig.jsを配置する必要があります
export { config } from './config.js';

/**
 * パッケージのバージョン情報
 */
export const version = '1.0.0';

/**
 * デフォルトエクスポート
 * 主要な機能をまとめて提供
 */
export default {
  Logger,
  BuildManager,
  TaskRunner,
  CleanupManager,
  version,
};
