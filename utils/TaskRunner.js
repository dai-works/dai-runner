import Logger from './Logger.js';

/**
 * タスク実行の共通ロジックを提供するクラス
 */
export default class TaskRunner {
  /**
   * デフォルトオプションとユーザーオプションをマージ
   * @param {Object} defaultOptions - デフォルトオプション
   * @param {Object} userOptions - ユーザー指定オプション
   * @returns {Object} マージされたオプション
   */
  static mergeOptions(defaultOptions = {}, userOptions = {}) {
    return { ...defaultOptions, ...userOptions };
  }

  /**
   * タスクを実行し、統一されたエラーハンドリングとログ出力を行う
   * @param {string} taskName - タスク名（ログ表示用）
   * @param {Function} taskFn - 実行するタスク関数
   * @param {Object} options - タスクのオプション
   * @returns {Promise} タスクの実行結果
   */
  static async runTask(taskName, taskFn, options = {}) {
    try {
      Logger.log('INFO', `${taskName}を開始します...`);
      const result = await taskFn(options);
      Logger.log('SUCCESS', `${taskName}が完了しました`);
      return result;
    } catch (err) {
      Logger.log('ERROR', `${taskName}中にエラーが発生しました:`, err);
      throw err;
    }
  }

  /**
   * 複数のタスクを並列実行
   * @param {Array} tasks - 実行するタスクの配列
   * @returns {Promise} 全タスクの実行結果
   */
  static async runParallelTasks(tasks) {
    return Promise.all(tasks);
  }

  /**
   * パラメータの必須チェック
   * @param {Object} params - チェックするパラメータ
   * @param {Array} requiredKeys - 必須キーの配列
   * @throws {Error} 必須パラメータが不足している場合
   */
  static validateRequiredParams(params, requiredKeys) {
    for (const key of requiredKeys) {
      if (!params[key]) {
        throw new Error(`${key} は必須パラメータです`);
      }
    }
  }
}
