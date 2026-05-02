import { buildImages } from '../tasks/images/buildImages.js';
import { buildJs } from '../tasks/js/buildJs.js';
import { buildCss } from '../tasks/css/buildCss.js';
import { buildSitemap } from '../tasks/sitemap/buildSitemap.js';
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
   * 共通のビルド処理（クリーンアップ → ビルド → sitemap生成）
   * @param {Object} config - 設定オブジェクト
   * @param {string} buildType - ビルドタイプ（'開発用'/'本番用'）
   */
  static async executeBuild(config, buildType = '') {
    // フォーマットはVS Code拡張が担当するためスキップ

    // 除外ファイルリストを準備
    const userExcludeFiles = config.cleanup?.excludeFiles || [];
    let excludeFiles = userExcludeFiles;

    // 画像キャッシュが有効な場合は画像ディレクトリを除外リストに追加
    // （Sharp 再処理を避けるため。孤立ファイル削除は cleanOrphans オプションで対応）
    const imagesUseCache = !!config.options.images?.useCache;
    const imagesDistPath = config.paths.images?.dist;
    if (imagesUseCache && imagesDistPath) {
      excludeFiles = [...excludeFiles, `${imagesDistPath}/`];
      Logger.log(
        'INFO',
        '画像キャッシュが有効なため、画像ディレクトリをクリーンアップから除外します'
      );
    }

    await CleanupManager.cleanBuildDirectories(config.paths, excludeFiles);

    // キャッシュ ON のままでも source に存在しない dist 画像（孤立ファイル）を削除する
    // useCache=false の場合はクリーンアップで dist が空になるため不要
    if (
      config.cleanup?.cleanOrphans &&
      imagesUseCache &&
      imagesDistPath &&
      config.paths.images?.src
    ) {
      Logger.log('INFO', '画像の孤立ファイルをチェックします...');
      await CleanupManager.cleanImageOrphans({
        srcDir: config.paths.images.src,
        distDir: imagesDistPath,
        convertToWebp: !!config.options.images?.convertToWebp,
        excludeFiles: userExcludeFiles,
      });
    }

    const buildTasks = this.createBuildTasks(config);
    await TaskRunner.runParallelTasks(buildTasks);

    // sitemap.xmlを生成（ビルドタスク完了後）
    if (config.sitemap) {
      await buildSitemap(config.sitemap);
    }

    if (buildType) {
      Logger.log('SUCCESS', `${buildType}ビルドが完了しました`);
    }
  }
}
