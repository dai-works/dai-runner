/**
 * 開発環境用の画像処理タスク
 * 画像の最適化、リサイズ、変換などを行います
 */

import path from 'path';
import chokidar from 'chokidar';
import fs from 'fs/promises';
import { optimizeImages } from './optimizeImages.js';
import Logger from '../../utils/Logger.js';

/**
 * 画像ファイルの監視と自動最適化を行うモジュール
 */
export function watchImages({ paths, options = {} } = {}) {
  try {
    if (!paths || !paths.src || !paths.dist) {
      throw new Error('paths.srcとpaths.distは必須パラメータです');
    }

    const srcDir = paths.src;
    const distDir = paths.dist;

    // 画像ファイルの監視を開始
    const watcher = chokidar.watch(
      [path.join(srcDir, '**/*.{jpg,jpeg,png,gif,svg,webp}')],
      {
        ignored: /(^|[/\\])\../,
        persistent: true,
        ignoreInitial: true,
      },
    );

    watcher
      .on('add', async (filePath) => {
        try {
          Logger.log(
            'INFO',
            `新しい画像ファイルが追加されました: ${path.relative(process.cwd(), filePath)}`,
          );

          // 画像を最適化
          await optimizeImages(srcDir, distDir, {
            filePath,
            ...options,
          });
        } catch (err) {
          Logger.log(
            'ERROR',
            `画像の追加処理中にエラーが発生しました: ${filePath}`,
            err,
          );
        }
      })
      .on('change', async (filePath) => {
        try {
          Logger.log(
            'INFO',
            `画像ファイルが更新されました: ${path.relative(process.cwd(), filePath)}`,
          );

          // 画像を最適化
          await optimizeImages(srcDir, distDir, {
            filePath,
            ...options,
          });
        } catch (err) {
          Logger.log(
            'ERROR',
            `画像の更新処理中にエラーが発生しました: ${filePath}`,
            err,
          );
        }
      })
      .on('unlink', async (filePath) => {
        try {
          Logger.log(
            'INFO',
            `画像ファイルが削除されました: ${path.relative(process.cwd(), filePath)}`,
          );

          const relativePath = path.relative(srcDir, filePath);
          const distPath = path.join(distDir, relativePath);

          // 対応する出力ファイルを削除
          await fs.unlink(distPath).catch(() => {});

          // WebP版も削除
          const webpPath = distPath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
          await fs.unlink(webpPath).catch(() => {});
        } catch (err) {
          Logger.log(
            'ERROR',
            `画像の削除処理中にエラーが発生しました: ${filePath}`,
            err,
          );
        }
      });

    Logger.log('DEBUG', `画像ファイルの監視を開始しました: ${srcDir}`);
    return watcher; // 監視オブジェクトを返して、必要に応じて停止できるようにする
  } catch (err) {
    Logger.log('ERROR', '画像の監視中にエラーが発生しました:', err);
    throw err;
  }
}

// スクリプトが直接実行された場合に実行
if (import.meta.url === `file://${process.argv[1]}`) {
  watchImages();
}

export default watchImages;
