/**
 * JavaScriptファイルの監視と自動ビルドを行うモジュール
 * - ファイルの追加・変更・削除を監視
 * - buildJsと同じ経路（bundleJs / minifyJs / copyJs）で処理する
 */

import path from 'path';
import Logger from '../../utils/Logger.js';
import { copyJs } from './copyJs.js';
import { minifyJs } from './minifyJs.js';
import { bundleJs } from './bundleJs.js';
import fs from 'fs/promises';
import { DEFAULTS } from '../../utils/defaults.js';
import { createWatcher } from '../../utils/createWatcher.js';
import { errorOverlayJs } from './errorOverlay.js';

/**
 * 追加・変更されたJavaScriptファイルを処理する
 * @param {string} filePath - 変更されたファイル
 * @param {Object} config - 処理設定
 * @param {string} config.srcDir - 入力元ディレクトリ
 * @param {string} config.distDir - 出力先ディレクトリ
 * @param {Object} config.options - JavaScriptビルドオプション
 */
async function processJs(filePath, { srcDir, distDir, options = {} }) {
  const mergedOptions = { ...DEFAULTS.js, ...options };

  if (mergedOptions.bundle) {
    try {
      await bundleJs(srcDir, distDir, {
        sourcemap: mergedOptions.sourceMap,
        dropConsole: mergedOptions.dropConsole,
        minify: mergedOptions.minify,
      });
    } catch (err) {
      const failedEntry = err.entryPoint || filePath;
      const distPath = path.join(distDir, path.basename(failedEntry));
      await fs.mkdir(path.dirname(distPath), { recursive: true });
      await fs.writeFile(
        distPath,
        errorOverlayJs({
          file: path.relative(process.cwd(), filePath),
          message: err.message,
        })
      );
    }
    return;
  }

  if (mergedOptions.minify) {
    await minifyJs(srcDir, distDir, filePath, {
      dropConsole: mergedOptions.dropConsole,
    });
  } else {
    await copyJs(srcDir, distDir, filePath);
    // フォーマットはVS Code Prettier拡張が担当
  }
}

/**
 * 削除されたJavaScriptファイルの成果物を整理する
 * bundleモードでは残ったエントリーポイントを再バンドルする
 * @param {string} filePath - 削除されたファイル
 * @param {Object} config - 処理設定
 * @param {string} config.srcDir - 入力元ディレクトリ
 * @param {string} config.distDir - 出力先ディレクトリ
 * @param {Object} config.options - JavaScriptビルドオプション
 */
async function handleJsUnlink(filePath, { srcDir, distDir, options = {} }) {
  const mergedOptions = { ...DEFAULTS.js, ...options };
  const distPath = path.join(distDir, path.relative(srcDir, filePath));

  // エントリーポイント削除時に残る同名ファイルとソースマップも含めて削除する
  await fs.unlink(distPath).catch(() => {});
  await fs.unlink(`${distPath}.map`).catch(() => {});

  if (mergedOptions.bundle) {
    await processJs(filePath, { srcDir, distDir, options: mergedOptions });
  }
}

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
    const mergedOptions = { ...DEFAULTS.js, ...options };

    const srcDir = paths.src;
    const distDir = paths.dist;

    // 非同期リスナ内の例外は誰も拾わないので、ここで必ず握って監視を継続する
    const watcher = createWatcher(srcDir, {
      extensions: ['.js'],
      label: 'JSファイルの',
      onAdd: async (filePath) => {
        Logger.log(
          'INFO',
          `新しいJSファイルが追加されました: ${path.relative(process.cwd(), filePath)}`
        );
        const distPath = path.join(distDir, path.relative(srcDir, filePath));
        await fs.mkdir(path.dirname(distPath), { recursive: true });
        await processJs(filePath, {
          srcDir,
          distDir,
          options: mergedOptions,
        });
      },
      onChange: async (filePath) => {
        Logger.log(
          'INFO',
          `JSファイルが更新されました: ${path.relative(process.cwd(), filePath)}`
        );
        await processJs(filePath, {
          srcDir,
          distDir,
          options: mergedOptions,
        });
      },
      onUnlink: async (filePath) => {
        Logger.log(
          'INFO',
          `JSファイルが削除されました: ${path.relative(process.cwd(), filePath)}`
        );

        await handleJsUnlink(filePath, {
          srcDir,
          distDir,
          options: mergedOptions,
        });
      },
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

export { handleJsUnlink, processJs };
