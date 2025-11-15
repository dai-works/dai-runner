import { optimizeImages } from './optimizeImages.js';
import TaskRunner from '../../utils/TaskRunner.js';

export async function buildImages({ paths, options }) {
  TaskRunner.validateRequiredParams({ paths }, ['paths']);

  const srcDir = paths.src;
  const distDir = paths.dist;

  return TaskRunner.runTask('画像のビルド', () =>
    optimizeImages(srcDir, distDir, options),
  );
}
