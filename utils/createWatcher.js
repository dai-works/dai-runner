import chokidar from 'chokidar';
import Logger from './Logger.js';

export function createWatcher(
  globs,
  { label, awaitWriteFinish, onAdd, onChange, onUnlink } = {}
) {
  const watcher = chokidar.watch(globs, {
    ignored: /(^|[/\\])\../,
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
