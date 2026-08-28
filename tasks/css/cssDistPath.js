import path from 'path';

export function cssDistPath(paths, srcPath) {
  const relativePath = path.relative(paths.src, srcPath);
  return path.join(paths.dist, relativePath.replace(/\.scss$/, '.css'));
}
