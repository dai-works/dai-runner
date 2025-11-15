import Logger from '../utils/Logger.js';
import { config } from '../config.js';
import { watchImages } from '../tasks/images/watchImages.js';
import { watchJs } from '../tasks/js/watchJs.js';
import { watchCss } from '../tasks/css/watchCss.js';
import { startServer } from '../tasks/server/startServer.js';
import BuildManager from '../utils/BuildManager.js';
import TaskRunner from '../utils/TaskRunner.js';
import { watchCopy } from '../tasks/misc/watchCopy.js';

async function dev() {
  try {
    Logger.log('INFO', '開発環境を起動します...');

    const conf = config.get();

    // 初期ビルド（フォーマット、クリーンアップ、ビルドを実行）
    await BuildManager.executeBuild(conf, '開発用');

    // ファイル変更の監視（フォーマットはVS Code拡張が担当）
    Logger.log(
      'INFO',
      'ファイル監視を開始します（フォーマットはVS Code Prettier拡張が処理）',
    );

    // 各監視タスクと開発サーバーを開始
    await TaskRunner.runTask('監視タスクの開始', async () => {
      // SCSSの監視を開始
      await watchCss({
        paths: conf.paths.css,
        options: conf.options.css,
      });

      // JavaScriptの監視を開始
      await watchJs({
        paths: conf.paths.js,
        options: conf.options.js,
      });

      // 画像の監視を開始
      await watchImages({
        paths: conf.paths.images,
        options: conf.options.images,
      });

      // その他（コピーのみ）の監視を開始
      for (const [label, p] of Object.entries(conf.paths)) {
        if (['images', 'js', 'css'].includes(label)) continue;
        if (!p || !p.src || !p.dist) continue;
        await watchCopy({ label, paths: p });
      }

      // 開発サーバーの起動
      await startServer();
    });
  } catch (err) {
    Logger.log('ERROR', '開発環境の起動中にエラーが発生しました:', err);
    process.exit(1);
  }
}

dev();
