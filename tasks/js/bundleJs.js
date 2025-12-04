import { rollup } from 'rollup';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { minify } from 'terser';
import path from 'path';
import fs from 'fs/promises';
import { glob } from 'glob';
import Logger from '../../utils/Logger.js';

/**
 * JavaScriptファイルをバンドルする関数
 * @param {string} srcDir - ソースディレクトリ
 * @param {string} distDir - 出力ディレクトリ
 * @param {Object} options - バンドルオプション
 * @param {boolean} options.sourcemap - sourceMapを生成するか
 * @param {boolean} options.dropConsole - console.logを削除するか
 * @param {boolean} options.minify - コードを圧縮するか
 */
export async function bundleJs(srcDir, distDir, options = {}) {
  try {
    // エントリーポイントファイルを探す
    const entryPoints = await glob(
      path.join(srcDir, '*.js').replace(/\\/g, '/'),
      {
        nodir: true,
      }
    );

    if (entryPoints.length === 0) {
      Logger.log('WARN', `エントリーポイントが見つかりません: ${srcDir}`);
      return;
    }

    await fs.mkdir(distDir, { recursive: true });

    for (const entryPoint of entryPoints) {
      const fileName = path.basename(entryPoint);
      const outputPath = path.join(distDir, fileName);

      Logger.log(
        'INFO',
        `バンドル中: ${path.relative(process.cwd(), entryPoint)}`
      );

      // Rollupでバンドル
      const bundle = await rollup({
        input: entryPoint,
        plugins: [
          nodeResolve({
            preferBuiltins: false,
          }),
        ],
        onwarn: (warning, warn) => {
          // ES6モジュールの警告を抑制
          if (warning.code === 'THIS_IS_UNDEFINED') return;
          warn(warning);
        },
      });

      // バンドル結果を出力
      await bundle.write({
        file: outputPath,
        format: 'iife', // WordPressで動作するようにIIFE形式
        sourcemap: options.sourcemap || false,
      });

      await bundle.close();

      // minifyまたはdropConsoleオプションが有効な場合、後処理を実行
      if (options.minify || options.dropConsole) {
        const code = await fs.readFile(outputPath, 'utf-8');

        // sourceMapファイルが存在する場合は読み込む
        const mapPath = `${outputPath}.map`;
        let sourceMapContent = null;
        try {
          sourceMapContent = await fs.readFile(mapPath, 'utf-8');
        } catch {
          // sourceMapファイルが存在しない場合は無視
        }

        // minifyオプションに応じた設定
        const minifyOptions = {
          compress: options.minify
            ? {
                drop_console: options.dropConsole || false,
              }
            : {
                defaults: false, // minifyしない場合は圧縮を無効化
                drop_console: options.dropConsole || false,
                dead_code: true,
                side_effects: true,
              },
          mangle: options.minify || false, // minifyの場合のみ変数名を短縮
          format: options.minify
            ? undefined // minifyの場合はデフォルトの圧縮形式
            : {
                beautify: true, // minifyしない場合は整形して読みやすく保持
                indent_level: 2,
              },
          sourceMap: sourceMapContent
            ? {
                content: sourceMapContent,
                url: `${fileName}.map`,
              }
            : false,
        };

        const result = await minify(code, minifyOptions);

        await fs.writeFile(outputPath, result.code);

        // sourceMapが生成されている場合は保存
        if (result.map) {
          await fs.writeFile(mapPath, result.map);
        }

        if (options.dropConsole) {
          Logger.log(
            'SUCCESS',
            `console.logを削除しました: ${path.relative(
              process.cwd(),
              outputPath
            )}`
          );
        }

        if (options.minify) {
          Logger.log(
            'SUCCESS',
            `JavaScriptを圧縮しました: ${path.relative(
              process.cwd(),
              outputPath
            )}`
          );
        }
      }

      Logger.log(
        'INFO',
        `バンドル完了: ${path.relative(process.cwd(), outputPath)}`
      );
    }
  } catch (err) {
    Logger.log('ERROR', 'JavaScriptバンドル中にエラーが発生しました:', err);
    throw err;
  }
}
