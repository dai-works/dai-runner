/**
 * JavaScriptファイルの監視と自動ビルドを行うモジュール
 * - ファイルの追加・変更・削除を監視
 * - buildJsを使用したビルド処理
 */

import path from 'path';
import chokidar from 'chokidar';
import Logger from '../../utils/Logger.js';
import { copyJs } from './copyJs.js';
import { minifyJs } from './minifyJs.js';
import { bundleJs } from './bundleJs.js';
import fs from 'fs/promises';

// デフォルトオプションを定義
const DEFAULT_OPTIONS = {
  minify: false,
  sourceMap: false,
  bundle: true, // デフォルトでバンドルを有効化
  dropConsole: false, // true: console.log等を削除, false: console.logを残す
};

/**
 * JavaScriptファイルの監視を開始
 *
 * @param {Object} config - 設定オブジェクト
 * @param {Object} config.paths - パス設定
 * @param {Object} config.options - ビルドオプション
 */
export function watchJs({ paths, options = {} } = {}) {
  try {
    if (!paths || !paths.src || !paths.dist) {
      throw new Error('paths.srcとpaths.distは必須パラメータです');
    }

    // デフォルトオプションとconfig.jsからの設定をマージ
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    const srcDir = paths.src;
    const distDir = paths.dist;

    // ファイル監視を開始
    const watcher = chokidar.watch(path.join(srcDir, '**', '*.js'), {
      ignored: /(^|[/\\])\../,
      persistent: true,
      ignoreInitial: true,
    });

    watcher
      .on('add', async (filePath) => {
        try {
          Logger.log(
            'INFO',
            `新しいJSファイルが追加されました: ${path.relative(process.cwd(), filePath)}`,
          );

          const relativePath = path.relative(srcDir, filePath);
          const distPath = path.join(distDir, relativePath);

          // 出力ディレクトリを作成
          await fs.mkdir(path.dirname(distPath), { recursive: true });

          // JSファイルを処理
          if (mergedOptions.bundle) {
            // バンドル処理を実行
            await bundleJs(srcDir, distDir, {
              sourcemap: mergedOptions.sourceMap,
              dropConsole: mergedOptions.dropConsole,
            });

            // バンドル後に圧縮が必要な場合
            if (mergedOptions.minify) {
              await minifyJs(srcDir, distDir);
            }
          } else {
            // 従来の処理（バンドルなし）
            if (mergedOptions.minify) {
              await minifyJs(srcDir, distDir, filePath);
            } else {
              await copyJs(srcDir, distDir, filePath);
              // フォーマットはVS Code Prettier拡張が担当
            }
          }
        } catch (err) {
          Logger.log(
            'ERROR',
            `JSファイルの追加処理中にエラーが発生しました: ${filePath}`,
            err,
          );
        }
      })
      .on('change', async (filePath) => {
        try {
          Logger.log(
            'INFO',
            `JSファイルが更新されました: ${path.relative(process.cwd(), filePath)}`,
          );

          // JSファイルを処理
          if (mergedOptions.bundle) {
            // バンドル処理を実行
            await bundleJs(srcDir, distDir, {
              sourcemap: mergedOptions.sourceMap,
              dropConsole: mergedOptions.dropConsole,
            });

            // バンドル後に圧縮が必要な場合
            if (mergedOptions.minify) {
              await minifyJs(srcDir, distDir);
            }
          } else {
            // 従来の処理（バンドルなし）
            if (mergedOptions.minify) {
              await minifyJs(srcDir, distDir, filePath);
            } else {
              await copyJs(srcDir, distDir, filePath);
              // フォーマットはVS Code Prettier拡張が担当
            }
          }
        } catch (err) {
          Logger.log(
            'ERROR',
            `JSファイルの更新処理中にエラーが発生しました: ${filePath}`,
            err,
          );
        }
      })
      .on('unlink', async (filePath) => {
        try {
          Logger.log(
            'INFO',
            `JSファイルが削除されました: ${path.relative(process.cwd(), filePath)}`,
          );

          const relativePath = path.relative(srcDir, filePath);
          const distPath = path.join(distDir, relativePath);

          // 対応する出力ファイルを削除
          await fs.unlink(distPath).catch(() => {});

          // ソースマップファイルも削除
          const mapPath = distPath + '.map';
          await fs.unlink(mapPath).catch(() => {});
        } catch (err) {
          Logger.log(
            'ERROR',
            `JSファイルの削除処理中にエラーが発生しました: ${filePath}`,
            err,
          );
        }
      });

    Logger.log('DEBUG', `JavaScriptファイルの監視を開始しました: ${srcDir}`);
    return watcher; // 監視オブジェクトを返して、必要に応じて停止できるようにする
  } catch (err) {
    Logger.log('ERROR', 'JavaScriptの監視中にエラーが発生しました:', err);
    throw err;
  }
}

// スクリプトが直接実行された場合に実行
if (import.meta.url === `file://${process.argv[1]}`) {
  watchJs();
}

export default watchJs;
