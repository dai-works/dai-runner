/**
 * 開発サーバー起動時の差分判定
 *
 * `npm run dev` は毎回 CSS / JS を消して作り直していた。source も設定も変わっていなければ
 * 成果物は同じになるので、次の条件がすべて揃う時だけクリーンアップとビルドを飛ばす：
 *
 *   1. 前回ビルドの記録（.dai-runner/last-build.json）があり、そのオプションのハッシュと
 *      dai-runner のバージョンが今回と一致する（minify / sourceMap の切り替えや更新を検知）
 *   2. エントリから導出した「あるべき成果物」（entry.css と、sourceMap 時は .map）が
 *      すべて存在し、dist にそれ以外の同種ファイルが無い（削除したエントリの残骸を検知）
 *   3. 成果物の最古の更新時刻が、source 配下すべて・dai-runner.config.js・
 *      dai-runner.config.local.js の最新の更新時刻より新しい
 *
 * 判定は保守的で、迷ったら「作り直す」側に倒す。本番ビルドでは使わない。
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { glob } from 'glob';
import { toPosix } from './paths.js';
import { DEFAULTS } from './defaults.js';

const STAMP_PATH = '.dai-runner/last-build.json';

function optionsHash(options) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(options, Object.keys(options).sort()))
    .digest('hex');
}

async function statOrNull(filePath) {
  try {
    return await fs.stat(filePath);
  } catch {
    return null;
  }
}

/** ディレクトリ配下（再帰）の指定拡張子ファイルの最新 mtime（ファイルが無ければ null） */
async function newestMtime(dir, extensions) {
  const pattern = toPosix(path.join(dir, '**', '*'));
  const files = await glob(pattern, { nodir: true, dot: false });
  let newest = null;
  for (const file of files) {
    if (!extensions.includes(path.extname(file).toLowerCase())) continue;
    const stat = await statOrNull(file);
    if (stat && (newest === null || stat.mtimeMs > newest)) {
      newest = stat.mtimeMs;
    }
  }
  return newest;
}

/** 成果物の集合が「期待どおり」か確認し、最古の mtime を返す（欠け・余分があれば null） */
async function outputsState(distDir, expected, extension) {
  const pattern = toPosix(path.join(distDir, '**', `*${extension}`));
  const actual = (await glob(pattern, { nodir: true })).map((file) =>
    toPosix(path.relative(distDir, file))
  );
  const expectedSet = new Set(expected.map(toPosix));
  if (actual.length !== expectedSet.size) return null;
  if (actual.some((file) => !expectedSet.has(file))) return null;

  let oldest = null;
  for (const file of expected) {
    const stat = await statOrNull(path.join(distDir, file));
    if (!stat) return null;
    if (oldest === null || stat.mtimeMs < oldest) oldest = stat.mtimeMs;
  }
  return oldest;
}

async function readStamp(cwd) {
  try {
    return JSON.parse(await fs.readFile(path.join(cwd, STAMP_PATH), 'utf8'));
  } catch {
    return null;
  }
}

/**
 * 直前のビルド内容を記録する（dev / build の両方で呼ぶ）
 * @param {{ css?: object, js?: object }} options - 実際に使った options
 * @param {string} version - dai-runner のバージョン
 * @param {string} [cwd]
 */
export async function writeBuildStamp(options, version, cwd = process.cwd()) {
  const stamp = {
    version,
    css: optionsHash({ ...DEFAULTS.css, ...(options.css || {}) }),
    js: optionsHash({ ...DEFAULTS.js, ...(options.js || {}) }),
    at: new Date().toISOString(),
  };
  const stampPath = path.join(cwd, STAMP_PATH);
  await fs.mkdir(path.dirname(stampPath), { recursive: true });
  await fs.writeFile(stampPath, JSON.stringify(stamp, null, 2));
}

/**
 * 設定ファイルの最新 mtime（無ければ null）
 */
async function configMtime(cwd) {
  let newest = null;
  for (const name of ['dai-runner.config.js', 'dai-runner.config.local.js']) {
    const stat = await statOrNull(path.join(cwd, name));
    if (stat && (newest === null || stat.mtimeMs > newest)) {
      newest = stat.mtimeMs;
    }
  }
  return newest;
}

/**
 * CSS の成果物が最新か
 * @param {{ src: string, dist: string }} paths
 * @param {object} options - css options（sourceMap を見る）
 * @param {{ version: string, cwd?: string }} context
 */
export async function isCssUpToDate(paths, options, { version, cwd }) {
  const base = cwd || process.cwd();
  const stamp = await readStamp(base);
  const merged = { ...DEFAULTS.css, ...(options || {}) };
  if (
    !stamp ||
    stamp.version !== version ||
    stamp.css !== optionsHash(merged)
  ) {
    return false;
  }

  const entries = await glob(toPosix(path.join(paths.src, '[!_]*.scss')), {
    nodir: true,
  });
  if (entries.length === 0) return false;
  const expected = entries.flatMap((entry) => {
    const name = path.basename(entry).replace(/\.scss$/, '.css');
    return merged.sourceMap ? [name, `${name}.map`] : [name];
  });

  const oldestCss = await outputsState(
    paths.dist,
    expected.filter((f) => f.endsWith('.css')),
    '.css'
  );
  if (oldestCss === null) return false;
  if (merged.sourceMap) {
    const oldestMap = await outputsState(
      paths.dist,
      expected.filter((f) => f.endsWith('.map')),
      '.map'
    );
    if (oldestMap === null) return false;
  }

  const newestSource = await newestMtime(paths.src, ['.scss', '.css']);
  const newestConfig = await configMtime(base);
  const newestInput = Math.max(newestSource ?? 0, newestConfig ?? 0);
  return oldestCss > newestInput;
}

/**
 * JS の成果物が最新か（bundle モードのみ。非バンドルは常に false＝作り直す）
 */
export async function isJsUpToDate(paths, options, { version, cwd }) {
  const base = cwd || process.cwd();
  const merged = { ...DEFAULTS.js, ...(options || {}) };
  if (!merged.bundle) return false;
  const stamp = await readStamp(base);
  if (!stamp || stamp.version !== version || stamp.js !== optionsHash(merged)) {
    return false;
  }

  const entries = await glob(toPosix(path.join(paths.src, '*.js')), {
    nodir: true,
  });
  if (entries.length === 0) return false;
  const names = entries.map((entry) => path.basename(entry));
  const oldestJs = await outputsState(paths.dist, names, '.js');
  if (oldestJs === null) return false;
  if (merged.sourceMap) {
    const oldestMap = await outputsState(
      paths.dist,
      names.map((n) => `${n}.map`),
      '.map'
    );
    if (oldestMap === null) return false;
  }

  const newestSource = await newestMtime(paths.src, ['.js', '.mjs', '.json']);
  const newestConfig = await configMtime(base);
  const newestInput = Math.max(newestSource ?? 0, newestConfig ?? 0);
  return oldestJs > newestInput;
}
