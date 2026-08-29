import fs from 'fs/promises';
import path from 'path';
import Logger from './Logger.js';
import { toPosix } from './paths.js';

/**
 * ディレクトリのクリーンアップを管理するクラス
 */
export default class CleanupManager {
  /**
   * パスが除外ファイルに一致するかチェック
   * @param {string} filePath - チェックするファイルパス
   * @param {Array<string>} excludeFiles - 除外ファイルの配列
   * @returns {boolean} 除外すべき場合はtrue
   */
  static shouldExclude(filePath, excludeFiles) {
    if (!excludeFiles || excludeFiles.length === 0) {
      return false;
    }

    return excludeFiles.some((pattern) => {
      // パスの正規化（先頭のスラッシュを削除）
      const normalizedPath = toPosix(filePath).replace(/^\/+/, '');
      const normalizedPattern = toPosix(pattern).replace(/^\/+/, '');

      // 完全一致チェック
      if (normalizedPath === normalizedPattern) {
        return true;
      }

      // ディレクトリパターンの場合（末尾が/）
      if (normalizedPattern.endsWith('/')) {
        return normalizedPath.startsWith(normalizedPattern);
      }

      // 親ディレクトリチェック
      return normalizedPath.startsWith(normalizedPattern + '/');
    });
  }

  /**
   * ディレクトリ内のファイルを再帰的に削除（除外ファイルを考慮）
   * @param {string} dir - 削除するディレクトリパス
   * @param {string} baseDir - ベースディレクトリパス（除外ファイルの相対パス計算用）
   * @param {Array<string>} excludeFiles - 除外ファイルの配列
   */
  static async cleanDirectoryRecursive(dir, baseDir, excludeFiles) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(baseDir, fullPath);

        // 除外ファイルに一致する場合はスキップ
        if (this.shouldExclude(relativePath, excludeFiles)) {
          Logger.log('INFO', `除外: ${relativePath}`);
          continue;
        }

        if (entry.isDirectory()) {
          // ディレクトリの場合は再帰的に処理
          await this.cleanDirectoryRecursive(fullPath, baseDir, excludeFiles);

          // ディレクトリが空になった場合は削除
          const remainingEntries = await fs.readdir(fullPath);
          if (remainingEntries.length === 0) {
            await fs.rmdir(fullPath);
          }
        } else {
          // ファイルの場合は削除
          await fs.unlink(fullPath);
        }
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
  }

  /**
   * 指定されたディレクトリをクリーンアップ
   * @param {string} dir - 削除するディレクトリパス
   * @param {string} baseDir - ベースディレクトリパス
   * @param {Array<string>} excludeFiles - 除外ファイルの配列
   */
  static async cleanDirectory(dir, baseDir, excludeFiles) {
    if (excludeFiles && excludeFiles.length > 0) {
      // 除外ファイルがある場合は選択的に削除
      await this.cleanDirectoryRecursive(dir, baseDir, excludeFiles);
      Logger.log('INFO', `ディレクトリをクリーンアップしました: ${dir}`);
    } else {
      // 除外ファイルがない場合は全削除
      await fs.rm(dir, { recursive: true, force: true });
      Logger.log('INFO', `ディレクトリを削除しました: ${dir}`);
    }
  }

  /**
   * 複数のディレクトリを一括クリーンアップ
   * @param {Array<string>} dirs - 削除するディレクトリパスの配列
   * @param {string} baseDir - ベースディレクトリパス
   * @param {Array<string>} excludeFiles - 除外ファイルの配列
   */
  static async cleanDirectories(dirs, baseDir, excludeFiles) {
    Logger.log('INFO', 'クリーンアップを開始します...');

    if (excludeFiles && excludeFiles.length > 0) {
      Logger.log('INFO', `除外ファイル: ${excludeFiles.join(', ')}`);
    }

    for (const dir of dirs) {
      await this.cleanDirectory(dir, baseDir, excludeFiles);
    }

    Logger.log('SUCCESS', 'クリーンアップが完了しました');
  }

  /**
   * 設定から出力ディレクトリを取得してクリーンアップ
   * @param {Object} paths - パス設定オブジェクト
   * @param {Array<string>} excludeFiles - 除外ファイルの配列
   */
  static async cleanBuildDirectories(paths, excludeFiles = []) {
    const dirsToClean = [
      paths.images.dist,
      paths.js.dist,
      paths.css.dist,
    ].filter(Boolean);

    // ベースディレクトリはテーマルート（カレントディレクトリ）
    // excludeFilesは 'assets/images/file.png' のような形式で指定
    const baseDir = '.';

    await this.cleanDirectories(dirsToClean, baseDir, excludeFiles);
  }

  /**
   * src 配下を再帰的に走査して相対パス一覧を返す
   * @param {string} dir - 走査するディレクトリ
   * @param {string} [baseDir=dir] - 相対パス基準ディレクトリ
   * @returns {Promise<Array<string>>} 相対パスの配列
   */
  static async listFilesRecursive(dir, baseDir = dir) {
    const result = [];
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (err) {
      if (err.code === 'ENOENT') return result;
      throw err;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const nested = await this.listFilesRecursive(fullPath, baseDir);
        result.push(...nested);
      } else {
        result.push(path.relative(baseDir, fullPath));
      }
    }
    return result;
  }

  /**
   * src 側のファイルから dist 側で生成されるべきファイルパスのセットを構築する
   *
   * 画像処理の生成規則（optimizeImages.js と同じロジック）:
   *   - .jpg/.jpeg → 同名 + (convertToWebp の場合) .webp + (convertToAvif の場合) .avif
   *   - .png       → 同名 + (convertToWebp の場合) .webp + (convertToAvif の場合) .avif
   *   - .webp      → 同名 + (convertToAvif の場合) .avif
   *   - その他     → 同名のみ（svg/コピーのみのファイル）
   *
   * @param {Array<string>} srcRelativePaths - src からの相対パス配列
   * @param {boolean} convertToWebp - WebP 変換が有効か
   * @param {boolean} [convertToAvif=false] - AVIF 生成が有効か
   * @returns {Set<string>} dist 側で生成されるべき相対パスの Set
   */
  static buildExpectedDistSet(
    srcRelativePaths,
    convertToWebp,
    convertToAvif = false
  ) {
    const expected = new Set();
    for (const relPath of srcRelativePaths) {
      expected.add(relPath);
      const ext = path.extname(relPath).toLowerCase();
      const isJpgPng = ext === '.jpg' || ext === '.jpeg' || ext === '.png';
      if (convertToWebp && isJpgPng) {
        expected.add(relPath.replace(/\.(jpg|jpeg|png)$/i, '.webp'));
      }
      if (convertToAvif && (isJpgPng || ext === '.webp')) {
        expected.add(relPath.replace(/\.(jpg|jpeg|png|webp)$/i, '.avif'));
      }
    }
    return expected;
  }

  /**
   * 画像 dist ディレクトリから src に対応していない孤立ファイルだけを削除する
   * （キャッシュ有効時でも source 削除と dist 同期を取れるようにするための仕組み）
   *
   * @param {Object} options
   * @param {string} options.srcDir - src ディレクトリ
   * @param {string} options.distDir - dist ディレクトリ
   * @param {boolean} [options.convertToWebp=false] - WebP 変換有無
   * @param {boolean} [options.convertToAvif=false] - AVIF 生成有無
   * @param {Array<string>} [options.excludeFiles=[]] - 削除対象から除外する相対パス
   */
  static async cleanImageOrphans({
    srcDir,
    distDir,
    convertToWebp = false,
    convertToAvif = false,
    excludeFiles = [],
  }) {
    const srcFiles = await this.listFilesRecursive(srcDir);
    const expected = this.buildExpectedDistSet(
      srcFiles,
      convertToWebp,
      convertToAvif
    );
    const distFiles = await this.listFilesRecursive(distDir);

    let removedCount = 0;
    for (const distRelPath of distFiles) {
      if (expected.has(distRelPath)) continue;

      const fullDistPath = path.posix.join(
        toPosix(distDir),
        toPosix(distRelPath)
      );
      // excludeFiles はテーマルートからの相対パス想定なので distDir と結合して比較
      if (this.shouldExclude(fullDistPath, excludeFiles)) {
        Logger.log('INFO', `孤立画像（除外設定により保持）: ${fullDistPath}`);
        continue;
      }

      const absoluteDistPath = path.join(distDir, distRelPath);
      await fs.unlink(absoluteDistPath);
      Logger.log('INFO', `孤立画像を削除: ${fullDistPath}`);
      removedCount++;
    }

    if (removedCount > 0) {
      await this.removeEmptySubdirs(distDir);
      Logger.log('SUCCESS', `孤立画像を ${removedCount} 件削除しました`);
    } else {
      Logger.log('INFO', '孤立画像はありませんでした');
    }
  }

  /**
   * 指定ディレクトリ「配下」の空サブディレクトリを再帰的に削除する
   * 起点となる dir そのものは削除しない（既存の cleanDirectoryRecursive と同じ振る舞い）
   * @param {string} dir - 起点ディレクトリ
   */
  static async removeEmptySubdirs(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (err) {
      if (err.code === 'ENOENT') return;
      throw err;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const subdir = path.join(dir, entry.name);
      await this.removeEmptySubdirs(subdir);

      const remaining = await fs.readdir(subdir);
      if (remaining.length === 0) {
        await fs.rmdir(subdir);
      }
    }
  }
}
