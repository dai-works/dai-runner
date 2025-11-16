import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { glob } from 'glob';
import Logger from '../../utils/Logger.js';
import { optimize } from 'svgo';
import CacheManager from '../../utils/CacheManager.js';

// デフォルトのオプション設定を直接定義
const defaultOptions = {
  maxWidth: 3840,
  imageQuality: 80,
  convertToWebp: true,
  useCache: true, // デフォルトでキャッシュを有効化
};

/**
 * 画像最適化を行うモジュール
 * - JPG/PNG: 品質調整と最大幅制限
 * - WebP: 自動変換（設定で有効時）
 * - SVG/GIF: そのままコピー
 *
 * @param {string} srcDir - 入力元ディレクトリのパス
 * @param {string} distDir - 出力先ディレクトリのパス
 * @param {Object} [options] - 画像処理オプション
 * @param {string} [options.filePath] - 単一ファイル処理時のパス（省略時は全ファイル処理）
 * @param {number} [options.maxWidth] - 画像の最大幅
 * @param {number} [options.imageQuality] - 画像の品質（0-100）
 * @param {boolean} [options.convertToWebp] - WebP形式への変換有無
 * @param {boolean} [options.useCache] - キャッシュの使用有無（デフォルト: true）
 * @param {string[]} [options.excludeFromOptimization] - 最適化から除外するファイル名のリスト
 */
export async function optimizeImages(srcDir, distDir, options = {}) {
  try {
    // 単一ファイルの処理か全ファイルの処理かを判断
    const srcPaths = options.filePath
      ? [options.filePath]
      : await glob(path.join(srcDir, '**', '*').replace(/\\/g, '/'), {
          nodir: true,
        });

    if (srcPaths.length === 0) {
      Logger.log(
        'WARN',
        `画像ファイルが見つかりません: ${options.filePath || srcDir}`
      );
      return;
    }

    // 出力ディレクトリを作成
    await fs.mkdir(distDir, { recursive: true });

    // filePath を除いた画像処理オプションを取得
    const { filePath: _filePath, ...imageSettings } = options;

    // 画像処理オプションの設定（デフォルト値とマージ）
    const imageOptions = {
      ...defaultOptions,
      ...imageSettings,
    };

    // キャッシュマネージャーの初期化
    let cache = null;
    if (imageOptions.useCache) {
      cache = new CacheManager();
      await cache.initialize();
    }

    // 除外ファイルのリスト
    const excludeList = imageOptions.excludeFromOptimization || [];

    // 処理したファイル数とスキップしたファイル数のカウンター
    let processedCount = 0;
    let skippedCount = 0;

    // 各画像ファイルを処理
    for (const srcPath of srcPaths) {
      const relativePath = path.relative(srcDir, srcPath);
      const distPath = path.join(distDir, relativePath);
      const fileName = path.basename(srcPath);

      // 出力先ディレクトリを作成
      await fs.mkdir(path.dirname(distPath), { recursive: true });

      // キャッシュチェック（キャッシュが有効な場合）
      if (cache) {
        const cacheOptions = {
          maxWidth: imageOptions.maxWidth,
          imageQuality: imageOptions.imageQuality,
          convertToWebp: imageOptions.convertToWebp,
          excludeFromOptimization: imageOptions.excludeFromOptimization,
        };

        const shouldProcess = await cache.shouldProcessFile(
          srcPath,
          distPath,
          cacheOptions
        );

        if (!shouldProcess) {
          Logger.log('INFO', `処理済みのためスキップ: ${relativePath}`);
          skippedCount++;
          continue;
        }
      }

      // 除外リストに含まれている場合は、圧縮せずにコピーのみ
      if (excludeList.includes(fileName)) {
        await fs.copyFile(srcPath, distPath);
        Logger.log(
          'INFO',
          `最適化から除外されたファイルをコピーしました: ${distPath}`
        );
        processedCount++;

        // キャッシュに記録
        if (cache) {
          await cache.markProcessed(srcPath, distPath, {
            maxWidth: imageOptions.maxWidth,
            imageQuality: imageOptions.imageQuality,
            convertToWebp: imageOptions.convertToWebp,
            excludeFromOptimization: imageOptions.excludeFromOptimization,
          });
        }
        continue;
      }

      // ファイル拡張子を取得
      const ext = path.extname(srcPath).toLowerCase();

      // 画像として処理する拡張子
      const imageExtensions = [
        '.jpg',
        '.jpeg',
        '.png',
        '.webp',
        '.svg',
        '.gif',
      ];

      // 画像ファイルでない場合はそのままコピー
      if (!imageExtensions.includes(ext)) {
        await fs.copyFile(srcPath, distPath);
        Logger.log('INFO', `ファイルをコピーしました: ${distPath}`);
        processedCount++;

        // キャッシュに記録
        if (cache) {
          await cache.markProcessed(srcPath, distPath, {
            maxWidth: imageOptions.maxWidth,
            imageQuality: imageOptions.imageQuality,
            convertToWebp: imageOptions.convertToWebp,
            excludeFromOptimization: imageOptions.excludeFromOptimization,
          });
        }
        continue;
      }

      // 画像を処理
      const image = sharp(srcPath);
      const metadata = await image.metadata();

      if (metadata.width > imageOptions.maxWidth) {
        image.resize(imageOptions.maxWidth);
      }

      // JPEGとPNGの処理
      if (['jpeg', 'jpg'].includes(metadata.format)) {
        await image
          .jpeg({ quality: imageOptions.imageQuality })
          .toFile(distPath);
        Logger.log('INFO', `JPEG画像を最適化しました: ${distPath}`);

        // WebP変換が有効な場合
        if (imageOptions.convertToWebp) {
          const webpPath = distPath.replace(/\.(jpg|jpeg)$/i, '.webp');
          await image
            .webp({ quality: imageOptions.imageQuality })
            .toFile(webpPath);
          Logger.log('INFO', `WebP画像を生成しました: ${webpPath}`);
        }

        processedCount++;

        // キャッシュに記録
        if (cache) {
          await cache.markProcessed(srcPath, distPath, {
            maxWidth: imageOptions.maxWidth,
            imageQuality: imageOptions.imageQuality,
            convertToWebp: imageOptions.convertToWebp,
            excludeFromOptimization: imageOptions.excludeFromOptimization,
          });
        }
      }
      // PNGの処理（透過対応）
      else if (metadata.format === 'png') {
        await image
          .png({ quality: imageOptions.imageQuality })
          .toFile(distPath);
        Logger.log('INFO', `PNG画像を最適化しました: ${distPath}`);

        // WebP変換が有効な場合
        if (imageOptions.convertToWebp) {
          const webpPath = distPath.replace(/\.png$/i, '.webp');
          await image
            .webp({ quality: imageOptions.imageQuality })
            .toFile(webpPath);
          Logger.log('INFO', `WebP画像を生成しました: ${webpPath}`);
        }

        processedCount++;

        // キャッシュに記録
        if (cache) {
          await cache.markProcessed(srcPath, distPath, {
            maxWidth: imageOptions.maxWidth,
            imageQuality: imageOptions.imageQuality,
            convertToWebp: imageOptions.convertToWebp,
            excludeFromOptimization: imageOptions.excludeFromOptimization,
          });
        }
      }
      // WebPの処理
      else if (metadata.format === 'webp') {
        // WebP画像も最適化して保存
        await image
          .webp({ quality: imageOptions.imageQuality })
          .toFile(distPath);
        Logger.log('INFO', `WebP画像を最適化しました: ${distPath}`);

        processedCount++;

        // キャッシュに記録
        if (cache) {
          await cache.markProcessed(srcPath, distPath, {
            maxWidth: imageOptions.maxWidth,
            imageQuality: imageOptions.imageQuality,
            convertToWebp: imageOptions.convertToWebp,
            excludeFromOptimization: imageOptions.excludeFromOptimization,
          });
        }
      }
      // SVGの処理
      else if (metadata.format === 'svg') {
        // SVGを最適化して保存
        const svgContent = await fs.readFile(srcPath, 'utf8');
        const optimizedSvg = optimize(svgContent, {
          multipass: true,
          plugins: [
            {
              name: 'preset-default',
              params: {
                overrides: {
                  // 必要に応じて特定の最適化を無効化
                  removeViewBox: false,
                },
              },
            },
            'removeDimensions',
          ],
        });

        await fs.writeFile(distPath, optimizedSvg.data);
        Logger.log('INFO', `SVGファイルを最適化しました: ${distPath}`);

        processedCount++;

        // キャッシュに記録
        if (cache) {
          await cache.markProcessed(srcPath, distPath, {
            maxWidth: imageOptions.maxWidth,
            imageQuality: imageOptions.imageQuality,
            convertToWebp: imageOptions.convertToWebp,
            excludeFromOptimization: imageOptions.excludeFromOptimization,
          });
        }
      }
      // その他のファイルはそのままコピー
      else {
        await fs.copyFile(srcPath, distPath);
        Logger.log('INFO', `ファイルをコピーしました: ${distPath}`);

        processedCount++;

        // キャッシュに記録
        if (cache) {
          await cache.markProcessed(srcPath, distPath, {
            maxWidth: imageOptions.maxWidth,
            imageQuality: imageOptions.imageQuality,
            convertToWebp: imageOptions.convertToWebp,
            excludeFromOptimization: imageOptions.excludeFromOptimization,
          });
        }
      }
    }

    // キャッシュを保存
    if (cache) {
      await cache.save();

      // 処理サマリーをログ出力
      if (skippedCount > 0) {
        Logger.log(
          'INFO',
          `画像処理完了: ${processedCount}件処理, ${skippedCount}件スキップ`
        );
      }
    }
  } catch (err) {
    Logger.log('ERROR', '画像の処理中にエラーが発生しました:', err);
    throw err;
  }
}
