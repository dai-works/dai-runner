import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { minify } from 'terser';
import Logger from '../../utils/Logger.js';
import { getConfig } from '../../utils/configLoader.js';

/**
 * JavaScriptファイルの圧縮を行うモジュール
 * - terserを使用した圧縮処理
 * - 開発環境では単純コピー
 * - 本番環境では圧縮とマングリング
 */

/**
 * JavaScriptファイルを圧縮
 * @param {string} srcDir - ソースディレクトリ
 * @param {string} distDir - 出力ディレクトリ
 * @param {string} [filePath] - 単一ファイル処理時のパス（省略時は全ファイル処理）
 */
export async function minifyJs(srcDir, distDir, filePath = null) {
  try {
    // configを取得
    const currentConfig = getConfig().get();

    // configから取得したデフォルト値を使用（引数が指定されていない場合）
    const sourcePath = srcDir || currentConfig.paths.js.src;
    const outputPath = distDir || currentConfig.paths.js.dist;

    const srcPaths = filePath
      ? [filePath]
      : await glob(path.join(sourcePath, '**', '*.js').replace(/\\/g, '/'), {
          nodir: true,
        });

    if (srcPaths.length === 0) {
      Logger.log(
        'WARN',
        `JavaScriptファイルが見つかりません: ${filePath || sourcePath}`
      );
      return;
    }

    await fs.mkdir(outputPath, { recursive: true });

    // dropConsoleオプションを取得（デフォルトはfalse）
    const dropConsole = currentConfig.options.js.dropConsole || false;

    for (const srcPath of srcPaths) {
      const relativePath = path.relative(sourcePath, srcPath);
      const distPath = path.join(outputPath, relativePath);

      await fs.mkdir(path.dirname(distPath), { recursive: true });
      const code = await fs.readFile(srcPath, 'utf-8');
      const result = await minify(code, {
        compress: dropConsole
          ? {
              drop_console: true, // console.log等を削除
            }
          : true,
        mangle: true,
      });
      await fs.writeFile(distPath, result.code);
      Logger.log(
        'SUCCESS',
        `JavaScriptを圧縮しました: ${path.relative(process.cwd(), filePath || srcPath)}`
      );
    }
  } catch (err) {
    Logger.log('ERROR', 'JavaScriptの圧縮中にエラーが発生しました:', err);
    throw err;
  }
}
