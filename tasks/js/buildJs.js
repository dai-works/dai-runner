import { minifyJs } from './minifyJs.js';
import { copyJs } from './copyJs.js';
import { bundleJs } from './bundleJs.js';
import TaskRunner from '../../utils/TaskRunner.js';
import { DEFAULTS } from '../../utils/defaults.js';

export async function buildJs({ paths, options = {} } = {}) {
  TaskRunner.validateRequiredParams({ paths }, ['paths']);

  // デフォルトオプションとconfig.jsからの設定をマージ
  const mergedOptions = TaskRunner.mergeOptions(DEFAULTS.js, options);

  return TaskRunner.runTask('JavaScriptのビルド', async () => {
    if (mergedOptions.bundle) {
      // バンドル処理を実行（minify、sourceMap、dropConsoleを統合）
      await bundleJs(paths.src, paths.dist, {
        sourcemap: mergedOptions.sourceMap,
        dropConsole: mergedOptions.dropConsole,
        minify: mergedOptions.minify,
      });
    } else {
      // 従来の処理（バンドルなし）
      if (mergedOptions.minify) {
        await minifyJs(paths.src, paths.dist, null, {
          dropConsole: mergedOptions.dropConsole,
        });
      } else {
        await copyJs(paths.src, paths.dist);
        // フォーマットはVS Code Prettier拡張が担当
      }
    }
  });
}
