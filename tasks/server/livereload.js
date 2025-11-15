import Logger from '../../utils/Logger.js';

/**
 * ライブリロード機能を提供するモジュール
 * - ファイル変更の監視
 * - 拡張子に応じた更新方法の選択
 * - CSS: インジェクション
 * - JS/HTML: ページ全体リロード
 * - 画像: 関連ページリロード
 */

export function setupLiveReload(bs) {
  try {
    // Browsersyncのfilesオプションで自動監視されるため、
    // ここでは追加の設定は不要
    Logger.log('INFO', 'LiveReloadを設定しました');
  } catch (err) {
    Logger.log('ERROR', 'LiveReloadの設定中にエラーが発生しました:', err);
    throw err;
  }
}
