import { buildImages } from '../tasks/images/buildImages.js';
import { buildJs } from '../tasks/js/buildJs.js';
import { buildCss } from '../tasks/css/buildCss.js';
import { copyFiles } from '../tasks/misc/copyFiles.js';
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
    const tasks = [
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

    // 追加のコピー専用パス（images/js/css 以外）を自動的にタスク化
    for (const [label, p] of Object.entries(config.paths)) {
      if (['images', 'js', 'css'].includes(label)) continue;
      if (!p || !p.src || !p.dist) continue;
      tasks.push(copyFiles({ label, paths: p }));
    }

    return tasks;
  }

  /**
   * 共通のビルド処理（クリーンアップ → ビルド）
   * @param {Object} config - 設定オブジェクト
   * @param {string} buildType - ビルドタイプ（'開発用'/'本番用'）
   */
  static async executeBuild(config, buildType = '') {
    // フォーマットはVS Code拡張が担当するためスキップ
    await CleanupManager.cleanBuildDirectories(
      config.paths,
      config.cleanup?.excludeFiles || [],
    );

    const buildTasks = this.createBuildTasks(config);
    await TaskRunner.runParallelTasks(buildTasks);

    if (buildType) {
      Logger.log('SUCCESS', `${buildType}ビルドが完了しました`);
    }
  }
}
