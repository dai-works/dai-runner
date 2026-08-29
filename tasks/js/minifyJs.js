import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { minify } from 'terser';
import Logger from '../../utils/Logger.js';
import { toPosix } from '../../utils/paths.js';

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
 * @param {Object} [options] - 圧縮オプション（呼び出し元が dev/build を解決して渡す）
 * @param {boolean} [options.dropConsole=false] - console.* を削除するか
 */
export async function minifyJs(srcDir, distDir, filePath = null, options = {}) {
  try {
    if (!srcDir || !distDir) {
      throw new Error('srcDirとdistDirは必須パラメータです');
    }
    const sourcePath = srcDir;
    const outputPath = distDir;

    const srcPaths = filePath
      ? [filePath]
      : await glob(toPosix(path.join(sourcePath, '**', '*.js')), {
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

    const dropConsole = options.dropConsole || false;

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
