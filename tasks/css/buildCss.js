import { initScss } from './initScss.js';
import { compileCss } from './compileCss.js';
import TaskRunner from '../../utils/TaskRunner.js';
import path from 'path';
import { glob } from 'glob';

// デフォルトのオプション設定
const DEFAULT_OPTIONS = {
  sourceMap: false,
  minify: false,
};

export async function buildCss({ paths, options = {} } = {}) {
  TaskRunner.validateRequiredParams({ paths }, ['paths']);
  TaskRunner.validateRequiredParams(paths, ['src', 'dist']);

  // デフォルトオプションとconfig.jsからの設定をマージ
  const mergedOptions = TaskRunner.mergeOptions(DEFAULT_OPTIONS, options);

  return TaskRunner.runTask('SCSSのビルド', async () => {
    await initScss(paths.src);

    // ルート直下の非アンダースコア .scss のみをエントリとしてビルド
    const srcGlob = path.join(paths.src, '[!_]*.scss').replace(/\\/g, '/');
    const srcPaths = await glob(srcGlob, { nodir: true });

    for (const srcPath of srcPaths) {
      const relativePath = path.relative(paths.src, srcPath);
      const distPath = path.join(
        paths.dist,
        relativePath.replace('.scss', '.css'),
      );

      // SCSSをコンパイルして最適化（1ステップで完結）
      await compileCss(srcPath, distPath, mergedOptions);
    }
  });
}
