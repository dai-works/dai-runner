import path from 'path';
import { pathToFileURL } from 'url';
import Logger from '../utils/Logger.js';
import { watchImages } from '../tasks/images/watchImages.js';
import { watchJs } from '../tasks/js/watchJs.js';
import { watchCss } from '../tasks/css/watchCss.js';
import { startServer } from '../tasks/server/startServer.js';
import BuildManager from '../utils/BuildManager.js';
import TaskRunner from '../utils/TaskRunner.js';
import { setConfig } from '../utils/configLoader.js';

async function dev() {
  try {
    // プロジェクトルートのdai-runner.config.jsを動的にインポート
    const configPath = path.join(process.cwd(), 'dai-runner.config.js');
    const { config } = await import(pathToFileURL(configPath).href);

    // グローバルなconfigを設定（他のモジュールから参照可能にする）
    setConfig(config);

    const conf = config.get();

    // ログレベルを設定
    Logger.setLogLevel(conf.options.logLevel);

    Logger.log('INFO', '開発環境を起動します...');

    // 初期ビルド（フォーマット、クリーンアップ、ビルドを実行）
    await BuildManager.executeBuild(conf, '開発用');

    // ファイル変更の監視（フォーマットはVS Code拡張が担当）
    Logger.log(
      'INFO',
      'ファイル監視を開始します（フォーマットはVS Code Prettier拡張が処理）'
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

      // 開発サーバーの起動
      await startServer();
    });
  } catch (err) {
    Logger.log('ERROR', '開発環境の起動中にエラーが発生しました:', err);
    process.exit(1);
  }
}

dev();
