import fs from 'fs/promises';
import path from 'path';
import Logger from '../../utils/Logger.js';
import { initScss } from './initScss.js';
import { compileCss } from './compileCss.js';
import { glob } from 'glob';
import { createWatcher } from '../../utils/createWatcher.js';
import { cssDistPath } from './cssDistPath.js';
import { errorOverlayCss } from './errorOverlay.js';
import { createScssScheduler } from './scssScheduler.js';

/**
 * SCSSファイルの監視と自動ビルドを行うモジュール
 * - ファイルの追加・変更・削除を監視
 * - イベントはスケジューラでまとめ、コンパイルは同時に 1 本だけ走らせる（scssScheduler.js）
 */

/**
 * 単一のSCSSファイルを処理
 * @param {string} srcPath - ソースファイルのパス
 * @param {Object} paths - パス設定
 * @param {Object} options - コンパイルオプション
 */
export async function processScss(srcPath, paths, options) {
  try {
    const distPath = cssDistPath(paths, srcPath);

    // 出力ディレクトリを作成
    await fs.mkdir(path.dirname(distPath), { recursive: true });

    try {
      // SCSSをコンパイルして最適化（1ステップで完結）
      await compileCss(srcPath, distPath, options);
    } catch (compileErr) {
      Logger.log(
        'ERROR',
        `SCSSコンパイルエラー: ${path.relative(process.cwd(), srcPath)}`,
        compileErr
      );
      await fs.writeFile(
        distPath,
        errorOverlayCss({
          file: path.relative(process.cwd(), srcPath),
          message: compileErr.message,
        })
      );
      // エラーを上位に伝播させない（監視を継続するため）
      return;
    }
  } catch (err) {
    Logger.log('ERROR', `SCSSの処理中にエラーが発生しました: ${srcPath}`, err);
    // エラーを上位に伝播させない（監視を継続するため）
    return;
  }
}

/**
 * SCSSファイルの監視を開始
 *
 * @param {Object} config - 設定オブジェクト
 * @param {Object} config.paths - パス設定
 * @param {Object} config.options - コンパイルオプション
 */
export async function watchCss({ paths, options = {} } = {}) {
  try {
    if (!paths || !paths.src || !paths.dist) {
      throw new Error('paths.srcとpaths.distは必須パラメータです');
    }

    const srcDir = paths.src;
    const rel = (p) => path.relative(process.cwd(), p);

    // メインのSCSSファイル（ルート直下の _ で始まらないファイル）を保持
    // 初期状態でメインファイルを収集（初期コンパイルは行わない）
    const mainFiles = new Set();
    const initialFiles = await glob('[!_]*.scss', {
      cwd: srcDir,
    });

    initialFiles.forEach((file) => {
      mainFiles.add(path.resolve(srcDir, file));
    });

    Logger.log('DEBUG', `メインSCSSファイル数: ${mainFiles.size}`);

    const scheduler = createScssScheduler({
      srcDir,
      paths,
      options,
      mainFiles,
      compile: processScss,
      reindex: initScss,
    });

    const classify = (filePath) => ({
      isPartial: path.basename(filePath).startsWith('_'),
      isRootLevel:
        path.resolve(path.dirname(filePath)) === path.resolve(srcDir),
    });

    // ファイル監視を開始
    const watcher = createWatcher(srcDir, {
      extensions: ['.scss'],
      label: 'SCSSの',
      onAdd: async (filePath) => {
        const { isPartial, isRootLevel } = classify(filePath);

        if (!isPartial && isRootLevel) {
          Logger.log(
            'INFO',
            `新しいSCSSファイルが追加されました: ${rel(filePath)}`
          );
          const main = path.resolve(filePath);
          mainFiles.add(main);
          scheduler.request({ files: [main] });
          return;
        }

        // 自分が書いた _index.scss は直後のコンパイルに含まれているので無視
        if (scheduler.consumeSelfWrite(filePath)) {
          Logger.log(
            'DEBUG',
            `自動生成した _index.scss の追加を無視: ${rel(filePath)}`
          );
          return;
        }

        // パーシャルが追加された場合は _index.scss を更新してから再コンパイル
        Logger.log(
          'INFO',
          `パーシャルファイルが追加されました: ${rel(filePath)}`
        );
        scheduler.request({ reindex: true });
      },
      onChange: async (filePath) => {
        const { isPartial, isRootLevel } = classify(filePath);

        if (isPartial || !isRootLevel) {
          if (scheduler.consumeSelfWrite(filePath)) {
            Logger.log(
              'DEBUG',
              `自動生成した _index.scss の更新を無視: ${rel(filePath)}`
            );
            return;
          }
          Logger.log(
            'INFO',
            `インポートファイル（${path.basename(
              filePath
            )}）が更新されました。関連ファイルを再コンパイルします。`
          );
          // パーシャルの変更は全メインに影響しうる
          scheduler.request({ all: true });
          return;
        }

        // 通常のSCSSファイルの場合は、そのファイルだけを処理
        Logger.log('INFO', `SCSSファイルが更新されました: ${rel(filePath)}`);
        scheduler.request({ files: [path.resolve(filePath)] });
      },
      onUnlink: async (filePath) => {
        const { isPartial, isRootLevel } = classify(filePath);

        if (!isPartial && isRootLevel) {
          // メインファイルが削除された場合はリストから削除
          const main = path.resolve(filePath);
          mainFiles.delete(main);
          scheduler.forget(main);
          Logger.log('INFO', `SCSSファイルが削除されました: ${rel(filePath)}`);

          // 対応するCSSファイルも削除
          const distPath = cssDistPath(paths, filePath);

          try {
            await fs.unlink(distPath).catch(() => {});
            await fs.unlink(`${distPath}.map`).catch(() => {});
            Logger.log(
              'DEBUG',
              `削除されたSCSSに対応するCSSファイルを削除しました: ${rel(
                distPath
              )}`
            );
          } catch (err) {
            Logger.log(
              'DEBUG',
              `CSSファイル削除中にエラーが発生しました: ${distPath}`,
              err
            );
          }
          return;
        }

        // パーシャルやサブディレクトリ内のファイルが削除された場合は _index.scss を更新してから再コンパイル
        Logger.log(
          'INFO',
          `パーシャルファイルが削除されました: ${rel(filePath)}`
        );
        scheduler.request({ reindex: true });
      },
    });

    // 監視を閉じる時はタイマーも止める
    const close = watcher.close.bind(watcher);
    watcher.close = async (...args) => {
      scheduler.stop();
      return close(...args);
    };

    Logger.log('DEBUG', `SCSSファイルの監視を開始しました: ${srcDir}`);
    return watcher; // 監視オブジェクトを返して、必要に応じて停止できるようにする
  } catch (err) {
    Logger.log('ERROR', 'SCSSの監視中にエラーが発生しました:', err);
    throw err;
  }
}

// スクリプトが直接実行された場合に実行
if (import.meta.url === `file://${process.argv[1]}`) {
  watchCss();
}

export default watchCss;
