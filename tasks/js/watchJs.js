/**
 * JavaScriptファイルの監視と自動ビルドを行うモジュール
 * - ファイルの追加・変更・削除を監視
 * - buildJsと同じ経路（bundleJs / minifyJs / copyJs）で処理する
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

    /**
     * 追加・変更されたファイルを処理する（add と change で共通）
     * バンドル時は minify も bundleJs に渡す。バンドル後に minifyJs を別途かけると、
     * 未バンドルの source/js を圧縮したもので dist のバンドルを上書きしてしまう。
     * @param {string} filePath
     */
    async function processJs(filePath) {
      if (mergedOptions.bundle) {
        await bundleJs(srcDir, distDir, {
          sourcemap: mergedOptions.sourceMap,
          dropConsole: mergedOptions.dropConsole,
          minify: mergedOptions.minify,
        });
        return;
      }

      // 従来の処理（バンドルなし）
      if (mergedOptions.minify) {
        await minifyJs(srcDir, distDir, filePath, {
          dropConsole: mergedOptions.dropConsole,
        });
      } else {
        await copyJs(srcDir, distDir, filePath);
        // フォーマットはVS Code Prettier拡張が担当
      }
    }

    // 非同期リスナ内の例外は誰も拾わないので、ここで必ず握って監視を継続する
    const handle = (label, fn) => async (filePath) => {
      try {
        await fn(filePath);
      } catch (err) {
        Logger.log(
          'ERROR',
          `JSファイルの${label}処理中にエラーが発生しました: ${filePath}`,
          err
        );
      }
    };

    // ファイル監視を開始
    const watcher = chokidar.watch(path.join(srcDir, '**', '*.js'), {
      ignored: /(^|[/\\])\../,
      persistent: true,
      ignoreInitial: true,
    });

    watcher
      .on(
        'add',
        handle('追加', async (filePath) => {
          Logger.log(
            'INFO',
            `新しいJSファイルが追加されました: ${path.relative(process.cwd(), filePath)}`
          );
          const distPath = path.join(distDir, path.relative(srcDir, filePath));
          await fs.mkdir(path.dirname(distPath), { recursive: true });
          await processJs(filePath);
        })
      )
      .on(
        'change',
        handle('更新', async (filePath) => {
          Logger.log(
            'INFO',
            `JSファイルが更新されました: ${path.relative(process.cwd(), filePath)}`
          );
          await processJs(filePath);
        })
      )
      .on(
        'unlink',
        handle('削除', async (filePath) => {
          Logger.log(
            'INFO',
            `JSファイルが削除されました: ${path.relative(process.cwd(), filePath)}`
          );

          const distPath = path.join(distDir, path.relative(srcDir, filePath));

          // 対応する出力ファイルとソースマップを削除
          await fs.unlink(distPath).catch(() => {});
          await fs.unlink(`${distPath}.map`).catch(() => {});
        })
      )
      .on('error', (err) => {
        Logger.log('ERROR', 'JavaScriptの監視でエラーが発生しました:', err);
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
