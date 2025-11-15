import path from 'path';
import chokidar from 'chokidar';
import fs from 'fs/promises';
import Logger from '../../utils/Logger.js';

export async function watchCopy({ label = 'files', paths } = {}) {
  if (!paths || !paths.src || !paths.dist) return;

  const srcDir = paths.src;
  const distDir = paths.dist;

  const watcher = chokidar.watch(path.join(srcDir, '**', '*'), {
    ignored: /(^|[/\\])\../,
    persistent: true,
    ignoreInitial: true,
  });

  async function copy(filePath) {
    const relative = path.relative(srcDir, filePath);
    const outPath = path.join(distDir, relative);
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.copyFile(filePath, outPath);
  }

  watcher
    .on('add', async (filePath) => {
      try {
        await copy(filePath);
        Logger.log(
          'INFO',
          `${label}: 追加 -> ${path.relative(process.cwd(), filePath)}`,
        );
      } catch (e) {
        Logger.log('ERROR', `${label}: 追加時に失敗`, e);
      }
    })
    .on('change', async (filePath) => {
      try {
        await copy(filePath);
        Logger.log(
          'INFO',
          `${label}: 更新 -> ${path.relative(process.cwd(), filePath)}`,
        );
      } catch (e) {
        Logger.log('ERROR', `${label}: 更新時に失敗`, e);
      }
    })
    .on('unlink', async (filePath) => {
      try {
        const relative = path.relative(srcDir, filePath);
        const outPath = path.join(distDir, relative);
        await fs.unlink(outPath).catch(() => {});
        Logger.log(
          'INFO',
          `${label}: 削除 -> ${path.relative(process.cwd(), filePath)}`,
        );
      } catch (e) {
        Logger.log('ERROR', `${label}: 削除時に失敗`, e);
      }
    });

  Logger.log('DEBUG', `${label}: 監視を開始しました -> ${srcDir}`);
  return watcher;
}

export default watchCopy;
