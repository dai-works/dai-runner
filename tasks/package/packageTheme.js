import path from 'path';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import { glob } from 'glob';
import picomatch from 'picomatch';
import archiver from 'archiver';
import Logger from '../../utils/Logger.js';

/**
 * 本番アップロード用にコピーするデフォルトの include パターン
 * （案件ごとの dai-runner.config.js で `package.include` を指定すれば上書きされる）
 */
const DEFAULT_INCLUDE = [
  'assets/**',
  'includes/**',
  'template-parts/**',
  'page-parts/**',
  '*.php',
  'style.css',
  'screenshot.png',
];

/**
 * include に該当しても削除する exclude パターンのデフォルト
 * （案件ごとの `package.exclude` は **追加** される — 上書きしない）
 */
const DEFAULT_EXCLUDE = [
  'page-snippets.php',
  '**/.DS_Store',
  '**/Thumbs.db',
  '**/*:Zone.Identifier',
];

const DEFAULT_OUTPUT_DIR = 'dist/theme';
const DEFAULT_ZIP_NAME = 'theme.zip';

/**
 * バイト数を人間に読みやすいサイズ表記に変換
 */
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/**
 * archiver を Promise でラップして zip を生成
 * @param {string} sourceDir - zip 化したいディレクトリ
 * @param {string} zipPath - 出力する zip ファイルのパス
 * @param {string} rootName - zip 内のルートフォルダ名
 */
function createZip(sourceDir, zipPath, rootName) {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', resolve);
    archive.on('error', reject);
    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        Logger.log('WARN', `zip 生成中の警告: ${err.message}`);
      } else {
        reject(err);
      }
    });

    archive.pipe(output);
    archive.directory(sourceDir, rootName);
    archive.finalize();
  });
}

/**
 * 本番アップロード用にテーマファイルをパッケージング
 *
 * include を glob で展開し exclude で除外したファイルを outputDir 配下に
 * 元のディレクトリ構造を保ったままコピーする。
 *
 * @param {Object} [packageConfig={}] - dai-runner.config.js の `package` 設定
 * @param {string} [packageConfig.outputDir]
 * @param {boolean} [packageConfig.zip]
 * @param {string} [packageConfig.zipName]
 * @param {Array<string>} [packageConfig.include] - 上書き
 * @param {Array<string>} [packageConfig.exclude] - 追加
 * @param {Object} [cliOptions={}]
 * @param {boolean} [cliOptions.zip] - CLI の --zip フラグ（config より優先）
 */
export async function packageTheme(packageConfig = {}, cliOptions = {}) {
  const include = packageConfig.include ?? DEFAULT_INCLUDE;
  const exclude = [...DEFAULT_EXCLUDE, ...(packageConfig.exclude ?? [])];
  const outputDir = packageConfig.outputDir ?? DEFAULT_OUTPUT_DIR;
  const zipName = packageConfig.zipName ?? DEFAULT_ZIP_NAME;
  const shouldZip = cliOptions.zip ?? packageConfig.zip ?? false;

  const cwd = process.cwd();
  const absOutputDir = path.resolve(cwd, outputDir);

  Logger.log('INFO', `${outputDir}/ にパッケージング中...`);
  Logger.log('INFO', '（事前に `dai-runner build` を実行済みか確認してください）');

  await fs.rm(absOutputDir, { recursive: true, force: true });
  await fs.mkdir(absOutputDir, { recursive: true });

  const matched = new Set();
  for (const pattern of include) {
    const files = await glob(pattern, {
      cwd,
      nodir: true,
      dot: false,
      posix: true,
    });
    for (const file of files) matched.add(file);
  }

  const isExcluded = picomatch(exclude, { dot: true });
  const targetFiles = [...matched].filter((rel) => !isExcluded(rel));

  let totalSize = 0;
  for (const rel of targetFiles) {
    const src = path.join(cwd, rel);
    const dst = path.join(absOutputDir, rel);
    await fs.mkdir(path.dirname(dst), { recursive: true });
    await fs.copyFile(src, dst);
    const stat = await fs.stat(src);
    totalSize += stat.size;
  }

  Logger.log(
    'SUCCESS',
    `Packaged to ${outputDir}/ (${targetFiles.length} files, ${formatSize(totalSize)})`
  );

  if (shouldZip) {
    const zipPath = path.join(path.dirname(absOutputDir), zipName);
    const rootName = path.basename(absOutputDir);
    await createZip(absOutputDir, zipPath, rootName);
    const zipStat = await fs.stat(zipPath);
    const zipRel = path.relative(cwd, zipPath) || zipName;
    Logger.log(
      'SUCCESS',
      `Zipped to ${zipRel} (${formatSize(zipStat.size)})`
    );
  }
}
