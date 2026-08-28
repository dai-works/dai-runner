import chokidar from 'chokidar';
import path from 'path';
import Logger from './Logger.js';

export function createWatcher(
  dir,
  { extensions = [], label, awaitWriteFinish, onAdd, onChange, onUnlink } = {}
) {
  const normalizedExtensions = extensions.map((extension) =>
    extension.toLowerCase()
  );
  const watcher = chokidar.watch(dir, {
    ignored: (filePath, stats) => {
      if (path.basename(filePath).startsWith('.')) {
        return true;
      }
      return Boolean(
        stats?.isFile() &&
        normalizedExtensions.length > 0 &&
        !normalizedExtensions.includes(path.extname(filePath).toLowerCase())
      );
    },
    persistent: true,
    ignoreInitial: true,
    ...(awaitWriteFinish ? { awaitWriteFinish } : {}),
  });

  const handle = (eventLabel, fn) => async (filePath) => {
    try {
      await fn(filePath);
    } catch (err) {
      Logger.log(
        'ERROR',
        `${label}${eventLabel}処理中にエラーが発生しました: ${filePath}`,
        err
      );
    }
  };

  if (onAdd) watcher.on('add', handle('追加', onAdd));
  if (onChange) watcher.on('change', handle('更新', onChange));
  if (onUnlink) watcher.on('unlink', handle('削除', onUnlink));
  watcher.on('error', (err) => {
    Logger.log('ERROR', `${label}監視でエラーが発生しました:`, err);
  });
  return watcher;
}
