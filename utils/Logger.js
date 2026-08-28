import chalk from 'chalk';

// デフォルトのログレベル（config.jsが利用可能な場合は後で更新される）
let logLevel = 'INFO';

// ログレベルごとの色を定義
const logColors = {
  ERROR: chalk.red.bold,
  WARN: chalk.yellow,
  INFO: chalk.white,
  DEBUG: chalk.blue,
  SUCCESS: chalk.green,
};

// ログレベルの優先度を定義
const logLevelValues = {
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  SUCCESS: 3,
  DEBUG: 4,
};

/**
 * アプリケーション全体で使用するロガー
 * - ログレベルに応じた色分け表示
 * - 環境設定に基づくログレベルフィルタリング
 */
export default class Logger {
  /**
   * ログレベルを設定
   * @param {string} level - 設定するログレベル
   */
  static setLogLevel(level) {
    logLevel = level?.toUpperCase() || 'INFO';
  }
  /**
   * 現在の設定ログレベルで出力可能かチェック
   * @param {string} messageLevel - チェックするログレベル
   * @returns {boolean} 出力可能な場合はtrue
   */
  static isLevelEnabled(messageLevel) {
    const currentLevelValue = logLevelValues[logLevel];
    const messageLevelValue = logLevelValues[messageLevel];
    return messageLevelValue <= currentLevelValue;
  }

  /**
   * ログを出力
   * @param {'DEBUG'|'INFO'|'WARN'|'ERROR'|'SUCCESS'} level - ログレベル
   * @param {...any} messages - 出力メッセージ
   */
  static log(level, ...messages) {
    const upperLevel = level.toUpperCase();
    if (!this.isLevelEnabled(upperLevel)) return;

    const prefix = chalk.white('[dai-runner]');

    const color = logColors[upperLevel] || chalk.white;
    const logMethod = upperLevel === 'ERROR' ? console.error : console.log;
    const formattedMessages = messages.map((message) =>
      message instanceof Error ? message.stack || message.message : message
    );

    logMethod(prefix, color(...formattedMessages));
  }
}
