import { initScss } from './initScss.js';
import { compileCss } from './compileCss.js';
import TaskRunner from '../../utils/TaskRunner.js';
import path from 'path';
import { glob } from 'glob';
import { DEFAULTS } from '../../utils/defaults.js';
import { cssDistPath } from './cssDistPath.js';
import { toPosix } from '../../utils/paths.js';

export async function buildCss({ paths, options = {} } = {}) {
  TaskRunner.validateRequiredParams({ paths }, ['paths']);
  TaskRunner.validateRequiredParams(paths, ['src', 'dist']);

  // デフォルトオプションとconfig.jsからの設定をマージ
  const mergedOptions = TaskRunner.mergeOptions(DEFAULTS.css, options);

  return TaskRunner.runTask('SCSSのビルド', async () => {
    await initScss(paths.src);

    // ルート直下の非アンダースコア .scss のみをエントリとしてビルド
    const srcGlob = toPosix(path.join(paths.src, '[!_]*.scss'));
    const srcPaths = await glob(srcGlob, { nodir: true });

    for (const srcPath of srcPaths) {
      const distPath = cssDistPath(paths, srcPath);

      // SCSSをコンパイルして最適化（1ステップで完結）
      await compileCss(srcPath, distPath, mergedOptions);
    }
  });
}
