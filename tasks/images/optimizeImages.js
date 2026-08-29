import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { glob } from 'glob';
import Logger from '../../utils/Logger.js';
import { optimize } from 'svgo';
import CacheManager from '../../utils/CacheManager.js';
import { DEFAULTS } from '../../utils/defaults.js';
import { toPosix } from '../../utils/paths.js';

/**
 * 画像最適化を行うモジュール
 * - JPG/PNG: 品質調整と最大幅制限
 * - WebP: 自動変換（設定で有効時）
 * - AVIF: 自動生成（設定で有効時。JPG/PNG/WebP から生成）
 * - SVG/GIF: そのままコピー
 *
 * @param {string} srcDir - 入力元ディレクトリのパス
 * @param {string} distDir - 出力先ディレクトリのパス
 * @param {Object} [options] - 画像処理オプション
 * @param {string} [options.filePath] - 単一ファイル処理時のパス（省略時は全ファイル処理）
 * @param {number} [options.maxWidth] - 画像の最大幅
 * @param {number} [options.imageQuality] - 画像の品質（0-100 / JPEG・PNG・WebP）
 * @param {boolean} [options.convertToWebp] - WebP形式への変換有無
 * @param {boolean} [options.convertToAvif] - AVIF形式の生成有無
 * @param {number} [options.avifQuality] - AVIFの品質（WebP80と同等の見た目基準）
 * @param {boolean} [options.useCache] - キャッシュの使用有無（デフォルト: true）
 * @param {string[]} [options.excludeFromOptimization] - 最適化から除外するファイル名のリスト
 */
export async function optimizeImages(srcDir, distDir, options = {}) {
  try {
    // 単一ファイルの処理か全ファイルの処理かを判断
    const srcPaths = options.filePath
      ? [options.filePath]
      : await glob(toPosix(path.join(srcDir, '**', '*')), {
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
      ...DEFAULTS.images,
      ...imageSettings,
    };

    // キャッシュ差分判定に使う設定（全ファイル共通なのでループ外で一度だけ構築）。
    // ここに convertToAvif / avifQuality を含めることで、AVIF 設定を変えたときに
    // optionsHash が変わり全ファイルが再処理される。
    const cacheOptions = {
      maxWidth: imageOptions.maxWidth,
      imageQuality: imageOptions.imageQuality,
      convertToWebp: imageOptions.convertToWebp,
      convertToAvif: imageOptions.convertToAvif,
      avifQuality: imageOptions.avifQuality,
      excludeFromOptimization: imageOptions.excludeFromOptimization,
    };

    // キャッシュマネージャーの初期化
    let cache = null;
    if (imageOptions.useCache) {
      cache = CacheManager.shared();
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

      // 監視中は「追加 → 直後に削除／リネーム」で、イベント処理が始まる前にファイルが
      // 消えていることがある（エディタの一時ファイルや保存直後の改名）。エラーにせず飛ばす
      if (
        !(await fs.access(srcPath).then(
          () => true,
          () => false
        ))
      ) {
        Logger.log('DEBUG', `処理前に削除されたためスキップ: ${relativePath}`);
        continue;
      }

      // 出力先ディレクトリを作成
      await fs.mkdir(path.dirname(distPath), { recursive: true });

      // キャッシュチェック（キャッシュが有効な場合）
      if (cache) {
        const shouldProcess = await cache.shouldProcessFile(
          srcPath,
          distPath,
          cacheOptions
        );

        if (!shouldProcess) {
          Logger.log('DEBUG', `処理済みのためスキップ: ${relativePath}`);
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
          await cache.markProcessed(srcPath, distPath, cacheOptions);
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
          await cache.markProcessed(srcPath, distPath, cacheOptions);
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
        // 拡張子非依存でwebpパスを導出する（中身がJPEGでも拡張子が.png等の
        // ファイルに対応。拡張子を限定すると置換が効かず、webpが元ファイルと
        // 同じパスに書かれてキャッシュが毎回再処理する不具合になる）
        let webpPath = null;
        if (imageOptions.convertToWebp) {
          webpPath = distPath.replace(/\.[^.]+$/i, '.webp');
          await image
            .webp({ quality: imageOptions.imageQuality })
            .toFile(webpPath);
          Logger.log('INFO', `WebP画像を生成しました: ${webpPath}`);
        }

        // AVIF生成が有効な場合（webpと同じく拡張子非依存でパスを導出）
        let avifPath = null;
        if (imageOptions.convertToAvif) {
          avifPath = distPath.replace(/\.[^.]+$/i, '.avif');
          await image
            .avif({ quality: imageOptions.avifQuality })
            .toFile(avifPath);
          Logger.log('INFO', `AVIF画像を生成しました: ${avifPath}`);
        }

        processedCount++;

        // キャッシュに記録（生成したwebp/avifパスも保存し、存在確認の根拠にする）
        if (cache) {
          await cache.markProcessed(
            srcPath,
            distPath,
            cacheOptions,
            webpPath,
            avifPath
          );
        }
      }
      // PNGの処理（透過対応）
      else if (metadata.format === 'png') {
        await image
          .png({ quality: imageOptions.imageQuality })
          .toFile(distPath);
        Logger.log('INFO', `PNG画像を最適化しました: ${distPath}`);

        // WebP変換が有効な場合（拡張子非依存でパスを導出）
        let webpPath = null;
        if (imageOptions.convertToWebp) {
          webpPath = distPath.replace(/\.[^.]+$/i, '.webp');
          await image
            .webp({ quality: imageOptions.imageQuality })
            .toFile(webpPath);
          Logger.log('INFO', `WebP画像を生成しました: ${webpPath}`);
        }

        // AVIF生成が有効な場合
        let avifPath = null;
        if (imageOptions.convertToAvif) {
          avifPath = distPath.replace(/\.[^.]+$/i, '.avif');
          await image
            .avif({ quality: imageOptions.avifQuality })
            .toFile(avifPath);
          Logger.log('INFO', `AVIF画像を生成しました: ${avifPath}`);
        }

        processedCount++;

        // キャッシュに記録（生成したwebp/avifパスも保存）
        if (cache) {
          await cache.markProcessed(
            srcPath,
            distPath,
            cacheOptions,
            webpPath,
            avifPath
          );
        }
      }
      // WebPの処理
      else if (metadata.format === 'webp') {
        // WebP画像も最適化して保存
        await image
          .webp({ quality: imageOptions.imageQuality })
          .toFile(distPath);
        Logger.log('INFO', `WebP画像を最適化しました: ${distPath}`);

        // AVIF生成が有効な場合（WebP ソースからも AVIF を生成する）
        let avifPath = null;
        if (imageOptions.convertToAvif) {
          avifPath = distPath.replace(/\.[^.]+$/i, '.avif');
          await image
            .avif({ quality: imageOptions.avifQuality })
            .toFile(avifPath);
          Logger.log('INFO', `AVIF画像を生成しました: ${avifPath}`);
        }

        processedCount++;

        // キャッシュに記録（webpは生成しないので null、avifパスを保存）
        if (cache) {
          await cache.markProcessed(
            srcPath,
            distPath,
            cacheOptions,
            null,
            avifPath
          );
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
            // svgo 4 は preset-default から removeTitle を外した。従来どおり <title> を除去する
            'removeTitle',
          ],
        });

        await fs.writeFile(distPath, optimizedSvg.data);
        Logger.log('INFO', `SVGファイルを最適化しました: ${distPath}`);

        processedCount++;

        // キャッシュに記録
        if (cache) {
          await cache.markProcessed(srcPath, distPath, cacheOptions);
        }
      }
      // その他のファイルはそのままコピー
      else {
        await fs.copyFile(srcPath, distPath);
        Logger.log('INFO', `ファイルをコピーしました: ${distPath}`);

        processedCount++;

        // キャッシュに記録
        if (cache) {
          await cache.markProcessed(srcPath, distPath, cacheOptions);
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
