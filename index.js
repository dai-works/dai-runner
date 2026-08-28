/**
 * dai-runner パッケージのメインエントリーポイント
 *
 * このファイルは、プログラマティックにdai-runnerを使用する場合のAPIを提供します。
 * 通常は、CLIツール（bin/dai-runner.js）を使用することを推奨します。
 */

// ユーティリティ
// （dai-runner.config.js はプロジェクト側のファイルなので、ここからは export しない）
export { default as Logger } from './utils/Logger.js';
export { default as BuildManager } from './utils/BuildManager.js';
export { default as TaskRunner } from './utils/TaskRunner.js';
export { default as CleanupManager } from './utils/CleanupManager.js';
export { default as CacheManager } from './utils/CacheManager.js';
export { loadConfig } from './utils/configLoader.js';

// タスク - CSS
export { buildCss } from './tasks/css/buildCss.js';
export { compileCss } from './tasks/css/compileCss.js';
export { initScss } from './tasks/css/initScss.js';
export { watchCss } from './tasks/css/watchCss.js';

// タスク - JavaScript
export { buildJs } from './tasks/js/buildJs.js';
export { bundleJs } from './tasks/js/bundleJs.js';
export { copyJs } from './tasks/js/copyJs.js';
export { minifyJs } from './tasks/js/minifyJs.js';
export { watchJs } from './tasks/js/watchJs.js';

// タスク - 画像
export { buildImages } from './tasks/images/buildImages.js';
export { optimizeImages } from './tasks/images/optimizeImages.js';
export { watchImages } from './tasks/images/watchImages.js';

// タスク - sitemap / パッケージング
export { buildSitemap } from './tasks/sitemap/buildSitemap.js';
export { generateSitemap } from './tasks/sitemap/generateSitemap.js';
export { packageTheme } from './tasks/package/packageTheme.js';

// タスク - サーバー
export { startServer } from './tasks/server/startServer.js';
export { setupLiveReload } from './tasks/server/livereload.js';
