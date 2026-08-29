import { buildImages } from '../tasks/images/buildImages.js';
import { buildJs } from '../tasks/js/buildJs.js';
import { buildCss } from '../tasks/css/buildCss.js';
import { buildSitemap } from '../tasks/sitemap/buildSitemap.js';
import CleanupManager from './CleanupManager.js';
import TaskRunner from './TaskRunner.js';
import Logger from './Logger.js';
import { isCssUpToDate, isJsUpToDate, writeBuildStamp } from './incremental.js';
import { createRequire } from 'module';

const { version: RUNNER_VERSION } = createRequire(import.meta.url)(
  '../package.json'
);

/**
 * ビルド処理を管理するクラス
 */
export default class BuildManager {
  /**
   * 全アセットのビルドタスクを作成
   * @param {Object} config - 設定オブジェクト
   * @returns {Array} ビルドタスクの配列
   */
  static createBuildTasks(config, { skipCss = false, skipJs = false } = {}) {
    const tasks = [
      buildImages({
        paths: config.paths.images,
        options: config.options.images,
      }),
    ];
    if (!skipJs) {
      tasks.push(
        buildJs({
          paths: config.paths.js,
          options: config.options.js,
        })
      );
    }
    if (!skipCss) {
      tasks.push(
        buildCss({
          paths: config.paths.css,
          options: config.options.css,
        })
      );
    }
    return tasks;
  }

  /**
   * 共通のビルド処理（クリーンアップ → ビルド → 必要時のみsitemap生成）
   * @param {Object} config - 設定オブジェクト
   * @param {string} buildType - ビルドタイプ（'開発用'/'本番用'）
   * @param {Object} [options] - ビルドの追加オプション
   * @param {boolean} [options.generateSitemap=false] - sitemapを生成するか
   * @param {boolean} [options.incremental=false] - source・設定・dai-runner に変更が無ければ
   *   CSS / JS のクリーンアップとビルドを飛ばす（開発サーバー起動時のみ使う）
   */
  static async executeBuild(
    config,
    buildType = '',
    { generateSitemap = false, incremental = false } = {}
  ) {
    // フォーマットはVS Code拡張が担当するためスキップ

    // 除外ファイルリストを準備
    const userExcludeFiles = config.cleanup?.excludeFiles || [];
    let excludeFiles = userExcludeFiles;

    // 差分起動：最新なら CSS / JS はクリーンアップ対象からも外してそのまま使う
    let skipCss = false;
    let skipJs = false;
    if (incremental) {
      const context = { version: RUNNER_VERSION };
      [skipCss, skipJs] = await Promise.all([
        isCssUpToDate(config.paths.css, config.options.css, context),
        isJsUpToDate(config.paths.js, config.options.js, context),
      ]);
      if (skipCss) {
        excludeFiles = [...excludeFiles, `${config.paths.css.dist}/`];
        Logger.log(
          'INFO',
          'CSS は最新のためビルドをスキップします（source・設定に変更なし）'
        );
      }
      if (skipJs) {
        excludeFiles = [...excludeFiles, `${config.paths.js.dist}/`];
        Logger.log(
          'INFO',
          'JavaScript は最新のためビルドをスキップします（source・設定に変更なし）'
        );
      }
    }

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
        convertToAvif: !!config.options.images?.convertToAvif,
        excludeFiles: userExcludeFiles,
      });
    }

    const buildTasks = this.createBuildTasks(config, { skipCss, skipJs });
    await TaskRunner.runParallelTasks(buildTasks);

    // 次回の差分判定のために、今回使ったオプションと dai-runner のバージョンを記録
    await writeBuildStamp(config.options, RUNNER_VERSION);

    // sitemap.xmlを生成（ビルドタスク完了後）
    if (generateSitemap && config.sitemap) {
      await buildSitemap(config.sitemap);
    }

    if (buildType) {
      Logger.log('SUCCESS', `${buildType}ビルドが完了しました`);
    }
  }
}
