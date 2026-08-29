import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import Logger from '../../utils/Logger.js';
import { toPosix } from '../../utils/paths.js';

export async function copyJs(srcDir, distDir, filePath) {
  try {
    const srcPaths = filePath
      ? [filePath]
      : await glob(toPosix(path.join(srcDir, '**', '*.js')), {
          nodir: true,
        });

    if (srcPaths.length === 0) {
      Logger.log(
        'WARN',
        `JavaScriptファイルが見つかりません: ${filePath || srcDir}`
      );
      return;
    }

    await fs.mkdir(distDir, { recursive: true });

    for (const srcPath of srcPaths) {
      const relativePath = path.relative(srcDir, srcPath);
      const distPath = path.join(distDir, relativePath);

      await fs.mkdir(path.dirname(distPath), { recursive: true });
      await fs.copyFile(srcPath, distPath);
      Logger.log(
        'INFO',
        `JavaScriptをコピーしました: ${path.relative(process.cwd(), srcPath)}`
      );
    }
  } catch (err) {
    Logger.log('ERROR', 'JavaScriptのコピー中にエラーが発生しました:', err);
    throw err;
  }
}
