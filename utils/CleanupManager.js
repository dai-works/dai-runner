import fs from 'fs/promises';
import path from 'path';
import Logger from './Logger.js';

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
      const normalizedPath = filePath.replace(/^\/+/, '');
      const normalizedPattern = pattern.replace(/^\/+/, '');

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
}
