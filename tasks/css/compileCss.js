import fs from 'fs/promises';
import path from 'path';
import * as sass from 'sass';
import postcss from 'postcss';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
import sortMediaQueries from 'postcss-sort-media-queries';
import discardDuplicates from 'postcss-discard-duplicates';
import normalizeCharset from 'postcss-normalize-charset';
import Logger from '../../utils/Logger.js';
import { getConfig } from '../../utils/configLoader.js';

/**
 * SCSSファイルをCSSにコンパイルして最適化する（統合版）
 *
 * 処理の流れ：
 * 1. Sassコンパイル（SCSS → CSS + SourceMap）
 * 2. PostCSS処理（autoprefixer, メディアクエリ整理, 重複削除など）
 * 3. Prettierフォーマット（minify無効時のみ）
 * 4. ファイル出力
 *
 * メモリ上で一貫して処理することで、ソースマップの正確性を保証します。
 *
 * @param {string} srcPath - コンパイル対象のSCSSファイルパス
 * @param {string} distPath - 出力先のCSSファイルパス
 * @param {Object} options - コンパイルオプション（config.jsから自動的に取得されます）
 * @throws {Error} コンパイルエラーや書き込みエラー時
 */
export async function compileCss(srcPath, distPath, options = {}) {
  try {
    // configを取得
    const currentConfig = getConfig().get();

    Logger.log('DEBUG', `SCSSのコンパイルを開始: ${srcPath}`);

    // 出力ディレクトリの作成
    await fs.mkdir(path.dirname(distPath), { recursive: true });

    // ========================================
    // ステップ1: Sassコンパイル
    // ========================================
    const sassResult = await sass.compileAsync(srcPath, {
      sourceMap: currentConfig.options.css.sourceMap,
      style: 'expanded', // PostCSS/cssnanoで圧縮するため、ここは常にexpanded
      loadPaths: [path.dirname(srcPath)],
      sourceMapIncludeSources: true,
    });

    Logger.log('DEBUG', 'Sassコンパイルが完了');

    // ========================================
    // ステップ2: ソースマップのパス修正
    // ========================================
    let previousSourceMap = null;

    if (currentConfig.options.css.sourceMap && sassResult.sourceMap) {
      previousSourceMap = JSON.parse(JSON.stringify(sassResult.sourceMap));

      // fileフィールドを設定
      previousSourceMap.file = path.basename(distPath);

      // file://プロトコルを除去し、相対パスに変換
      if (previousSourceMap.sources) {
        previousSourceMap.sources = previousSourceMap.sources.map((source) => {
          const cleanSource = source
            .replace(/^file:\/\//, '')
            .replace(/^file:/, '');

          if (path.isAbsolute(cleanSource)) {
            const projectRoot = process.cwd();
            const scssRelativePath = path.relative(projectRoot, cleanSource);

            // source/scss/で始まる場合、CSSファイルからの相対パスに変換
            // assets/css/style.css から source/scss/xxx.scss へは ../../source/scss/xxx.scss
            if (
              scssRelativePath.startsWith('source/scss/') ||
              scssRelativePath.startsWith('source\\scss\\')
            ) {
              return `../../${scssRelativePath.replace(/\\/g, '/')}`;
            }

            return scssRelativePath.replace(/\\/g, '/');
          }

          return cleanSource;
        });
      }

      Logger.log('DEBUG', 'ソースマップのパスを修正');
    }

    // ========================================
    // ステップ3: PostCSS処理（最適化）
    // ========================================
    const plugins = [
      normalizeCharset(), // @charsetを先頭で正規化
      autoprefixer(),
      sortMediaQueries(),
      discardDuplicates(),
    ];

    // 圧縮が有効な場合、cssnanoを追加
    if (currentConfig.options.css.minify) {
      plugins.push(
        cssnano({
          preset: [
            'default',
            {
              discardComments: { removeAll: true },
            },
          ],
        }),
      );
      Logger.log('DEBUG', 'PostCSS処理を開始（圧縮あり）');
    } else {
      Logger.log('DEBUG', 'PostCSS処理を開始（圧縮なし）');
    }

    const postcssResult = await postcss(plugins).process(sassResult.css, {
      from: srcPath, // 入力元はSCSSの実パス
      to: distPath, // 出力先はCSSの実パス
      map: currentConfig.options.css.sourceMap
        ? {
            prev: previousSourceMap,
            inline: false,
            annotation: false,
          }
        : false,
    });

    Logger.log('DEBUG', 'PostCSS処理が完了');

    // ========================================
    // ステップ4: ソースマップの書き込み（Prettier前）
    // ========================================
    if (postcssResult.map && currentConfig.options.css.sourceMap) {
      const finalSourceMap = postcssResult.map.toJSON();
      await fs.writeFile(`${distPath}.map`, JSON.stringify(finalSourceMap));
      Logger.log(
        'DEBUG',
        `ソースマップを出力: ${path.relative(process.cwd(), distPath)}.map`,
      );
    }

    // ========================================
    // ステップ5: ファイル出力
    // ========================================
    // 出力CSSは常にPostCSSの結果をそのまま使用（Prettierは未適用）
    // 理由：
    // - Prettierはソースマップをサポートしないため、行番号がずれる
    // - ソースマップの有無で出力が変わるのは一貫性がない
    // - PostCSSのexpanded出力で十分な可読性がある
    // - コードスタイルの統一はSCSS側で行う
    let finalCss = postcssResult.css;

    // ソースマップコメントを追加
    if (currentConfig.options.css.sourceMap) {
      if (!finalCss.endsWith('\n')) finalCss += '\n';
      finalCss += `/*# sourceMappingURL=${path.basename(distPath)}.map */\n`;
    }

    // CSSファイルの書き込み
    await fs.writeFile(distPath, finalCss);
    Logger.log(
      'DEBUG',
      `CSSファイルを出力: ${path.relative(process.cwd(), distPath)}`,
    );

    Logger.log(
      'INFO',
      `SCSSをコンパイルしました: ${path.relative(process.cwd(), distPath)}`,
    );
  } catch (err) {
    Logger.log(
      'ERROR',
      `SCSSのコンパイル中にエラーが発生しました: ${srcPath}`,
      err,
    );
    throw err;
  }
}
