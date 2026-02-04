import { generateSitemap } from './generateSitemap.js';
import TaskRunner from '../../utils/TaskRunner.js';

/**
 * sitemap.xmlのビルドタスク
 * @param {Object} config - sitemap設定
 * @returns {Promise} タスクの実行結果
 */
export async function buildSitemap(config) {
  if (!config || !config.enabled) {
    return Promise.resolve();
  }

  return TaskRunner.runTask('sitemap.xmlの生成', () =>
    generateSitemap(config)
  );
}
