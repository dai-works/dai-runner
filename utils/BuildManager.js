import { buildImages } from '../tasks/images/buildImages.js';
import { buildJs } from '../tasks/js/buildJs.js';
import { buildCss } from '../tasks/css/buildCss.js';
import CleanupManager from './CleanupManager.js';
import TaskRunner from './TaskRunner.js';
import Logger from './Logger.js';

/**
 * ビルド処理を管理するクラス
 */
export default class BuildManager {
  /**
   * 全アセットのビルドタスクを作成
   * @param {Object} config - 設定オブジェクト
   * @returns {Array} ビルドタスクの配列
   */
  static createBuildTasks(config) {
    return [
      buildImages({
        paths: config.paths.images,
        options: config.options.images,
      }),
      buildJs({
        paths: config.paths.js,
        options: config.options.js,
      }),
      buildCss({
        paths: config.paths.css,
        options: config.options.css,
      }),
    ];
  }

  /**
   * 共通のビルド処理（クリーンアップ → ビルド）
   * @param {Object} config - 設定オブジェクト
   * @param {string} buildType - ビルドタイプ（'開発用'/'本番用'）
   */
  static async executeBuild(config, buildType = '') {
    // フォーマットはVS Code拡張が担当するためスキップ

    // 除外ファイルリストを準備
    let excludeFiles = config.cleanup?.excludeFiles || [];

    // 画像キャッシュが有効な場合は画像ディレクトリを除外リストに追加
    if (config.options.images?.useCache) {
      const imagesDistPath = config.paths.images.dist;
      if (imagesDistPath) {
        excludeFiles = [...excludeFiles, `${imagesDistPath}/`];
        Logger.log(
          'INFO',
          '画像キャッシュが有効なため、画像ディレクトリをクリーンアップから除外します'
        );
      }
    }

    await CleanupManager.cleanBuildDirectories(config.paths, excludeFiles);

    const buildTasks = this.createBuildTasks(config);
    await TaskRunner.runParallelTasks(buildTasks);

    if (buildType) {
      Logger.log('SUCCESS', `${buildType}ビルドが完了しました`);
    }
  }
}
