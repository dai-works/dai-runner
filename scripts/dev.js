import Logger from '../utils/Logger.js';
import { watchImages } from '../tasks/images/watchImages.js';
import { watchJs } from '../tasks/js/watchJs.js';
import { watchCss } from '../tasks/css/watchCss.js';
import { startServer } from '../tasks/server/startServer.js';
import BuildManager from '../utils/BuildManager.js';
import TaskRunner from '../utils/TaskRunner.js';
import { loadConfig } from '../utils/configLoader.js';

let shuttingDown = false;
const watchers = [];
let browserSync = null;

async function shutdown(signal) {
  if (shuttingDown) {
    process.exit(0);
  }
  shuttingDown = true;
  Logger.log('INFO', `${signal}を受信したため開発環境を終了します...`);
  await Promise.all(watchers.map((watcher) => watcher?.close()));
  if (browserSync) {
    // Browsersync の exit() は同期処理でコールバックを取らない（events.emit + cleanup のみ）
    browserSync.exit();
  }
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

async function dev() {
  try {
    const conf = await loadConfig({ env: 'dev' });

    // ログレベルを設定
    Logger.setLogLevel(conf.options.logLevel);

    Logger.log('INFO', '開発環境を起動します...');

    // 初期ビルド（フォーマット、クリーンアップ、ビルドを実行）
    await BuildManager.executeBuild(conf, '開発用', {
      generateSitemap: false,
    });

    // ファイル変更の監視（フォーマットはVS Code拡張が担当）
    Logger.log(
      'INFO',
      'ファイル監視を開始します（フォーマットはVS Code Prettier拡張が処理）'
    );

    // 各監視タスクと開発サーバーを開始
    await TaskRunner.runTask('監視タスクの開始', async () => {
      // SCSSの監視を開始
      watchers.push(
        await watchCss({
          paths: conf.paths.css,
          options: conf.options.css,
        })
      );

      // JavaScriptの監視を開始
      watchers.push(
        await watchJs({
          paths: conf.paths.js,
          options: conf.options.js,
        })
      );

      // 画像の監視を開始
      watchers.push(
        await watchImages({
          paths: conf.paths.images,
          options: conf.options.images,
        })
      );

      // 開発サーバーの起動
      browserSync = await startServer(conf);
    });
  } catch (err) {
    Logger.log('ERROR', '開発環境の起動中にエラーが発生しました:', err);
    process.exit(1);
  }
}

dev();
