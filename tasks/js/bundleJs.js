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

      // dropConsoleオプションが有効な場合、console.logを削除
      if (options.dropConsole) {
        const code = await fs.readFile(outputPath, 'utf-8');
        const result = await minify(code, {
          compress: {
            defaults: false, // すべてのデフォルト圧縮を無効化
            drop_console: true, // console.logを削除
            dead_code: true, // 到達不可能なコードを削除
            side_effects: true, // 副作用のない式（void 0など）を削除
          },
          mangle: false, // 変数名の短縮を無効化
          format: {
            beautify: true, // コードを整形して読みやすく保持
            indent_level: 2, // インデントレベル
          },
        });

        await fs.writeFile(outputPath, result.code);
        Logger.log(
          'SUCCESS',
          `console.logを削除しました: ${path.relative(
            process.cwd(),
            outputPath
          )}`
        );
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
