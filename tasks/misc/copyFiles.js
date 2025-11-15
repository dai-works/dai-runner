import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import TaskRunner from '../../utils/TaskRunner.js';
import Logger from '../../utils/Logger.js';

async function copyOne(srcRoot, distRoot, filePath) {
  const relative = path.relative(srcRoot, filePath);
  const outPath = path.join(distRoot, relative);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.copyFile(filePath, outPath);
}

export async function copyFiles({ label = 'files', paths } = {}) {
  TaskRunner.validateRequiredParams({ paths }, ['paths']);
  const srcDir = paths.src;
  const distDir = paths.dist;
  return TaskRunner.runTask(`${label} のコピー`, async () => {
    const files = await glob('**/*', {
      cwd: srcDir,
      nodir: true,
      dot: false,
    });
    for (const rel of files) {
      const abs = path.join(srcDir, rel);
      await copyOne(srcDir, distDir, abs);
    }
    Logger.log('DEBUG', `${label}: ${files.length} 件コピーしました`);
  });
}

export default copyFiles;
