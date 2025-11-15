import fs from 'fs/promises';
import path from 'path';
import chokidar from 'chokidar';
import Logger from '../../utils/Logger.js';
import { initScss } from './initScss.js';
import { compileCss } from './compileCss.js';
import { glob } from 'glob';

// メインのSCSSファイル（_で始まらないファイル）を保持
const mainFiles = new Set();

// デバウンス用のタイマー
let recompileTimer = null;

/**
 * SCSSファイルの監視と自動ビルドを行うモジュール
 * - ファイルの追加・変更・削除を監視
 * - buildCssを使用したビルド処理
 */

/**
 * 単一のSCSSファイルを処理
 * @param {string} srcPath - ソースファイルのパス
 * @param {Object} paths - パス設定
 * @param {Object} options - コンパイルオプション
 */
async function processScss(srcPath, paths, options) {
  try {
    const relativePath = path.relative(paths.src, srcPath);
    const distPath = path.join(
      paths.dist,
      relativePath.replace('.scss', '.css'),
    );

    // 出力ディレクトリを作成
    await fs.mkdir(path.dirname(distPath), { recursive: true });

    try {
      // SCSSをコンパイルして最適化（1ステップで完結）
      await compileCss(srcPath, distPath, options);
    } catch (compileErr) {
      Logger.log(
        'ERROR',
        `SCSSコンパイルエラー: ${path.relative(process.cwd(), srcPath)}`,
        compileErr,
      );
      // エラーを上位に伝播させない（監視を継続するため）
      return;
    }
  } catch (err) {
    Logger.log('ERROR', `SCSSの処理中にエラーが発生しました: ${srcPath}`, err);
    // エラーを上位に伝播させない（監視を継続するため）
    return;
  }
}

/**
 * パーシャルファイルが変更された場合に影響を受けるメインファイルのみを再コンパイル
 * @param {string} partialPath - 変更されたパーシャルファイルのパス
 * @param {Object} paths - パス設定
 * @param {Object} options - コンパイルオプション
 */
async function recompileAffectedFiles(partialPath, paths, options) {
  // デバウンス処理：短時間での連続実行を防ぐ
  if (recompileTimer) {
    clearTimeout(recompileTimer);
  }

  recompileTimer = setTimeout(async () => {
    try {
      Logger.log(
        'DEBUG',
        `パーシャルファイル変更の影響を分析中: ${path.relative(process.cwd(), partialPath)}`,
      );

      // 全てのメインファイルを順次処理（並行処理による競合状態を回避）
      for (const mainFile of mainFiles) {
        await processScss(mainFile, paths, options);
      }

      Logger.log(
        'INFO',
        `パーシャルファイル変更による再コンパイルが完了しました: ${mainFiles.size}ファイル`,
      );
    } catch (err) {
      Logger.log(
        'ERROR',
        `パーシャルファイル変更による再コンパイル中にエラーが発生しました`,
        err,
      );
    }
  }, 300); // 300ms待機してから実行
}

/**
 * SCSSファイルの監視を開始
 *
 * @param {Object} config - 設定オブジェクト
 * @param {Object} config.paths - パス設定
 * @param {Object} config.options - コンパイルオプション
 */
export async function watchCss({ paths, options = {} } = {}) {
  try {
    if (!paths || !paths.src || !paths.dist) {
      throw new Error('paths.srcとpaths.distは必須パラメータです');
    }

    const srcDir = paths.src;

    // 初期状態でメインファイルを収集（初期コンパイルは行わない）
    // ルート直下の非アンダースコア .scss のみをメインとみなす
    const initialFiles = await glob('[!_]*.scss', {
      cwd: srcDir,
    });

    initialFiles.forEach((file) => {
      mainFiles.add(path.join(srcDir, file));
    });

    Logger.log('DEBUG', `メインSCSSファイル数: ${mainFiles.size}`);

    // ファイル監視を開始
    const watcher = chokidar.watch(path.join(srcDir, '**', '*.scss'), {
      ignored: /(^|[/\\])\../,
      persistent: true,
      ignoreInitial: true, // 初期ファイルに対してイベントを発生させない
    });

    watcher
      .on('add', async (filePath) => {
        const isPartial = path.basename(filePath).startsWith('_');
        const isRootLevel = path.dirname(filePath) === path.resolve(srcDir);
        if (!isPartial && isRootLevel) {
          Logger.log(
            'INFO',
            `新しいSCSSファイルが追加されました: ${path.relative(process.cwd(), filePath)}`,
          );
          // メインファイルリストに追加
          mainFiles.add(filePath);
          await processScss(filePath, paths, options);
        } else {
          // パーシャルファイルが追加された場合は_index.scssを更新
          await initScss(srcDir);
          // 関連するメインファイルを再コンパイル
          await recompileAffectedFiles(filePath, paths, options);
        }
      })
      .on('change', async (filePath) => {
        const isPartial = path.basename(filePath).startsWith('_');
        const isRootLevel = path.dirname(filePath) === path.resolve(srcDir);
        if (isPartial || !isRootLevel) {
          Logger.log(
            'INFO',
            `インポートファイル（${path.basename(filePath)}）が更新されました。関連ファイルを再コンパイルします。`,
          );
          // パーシャルファイルが変更された場合は影響を受けるファイルのみ再コンパイル
          await recompileAffectedFiles(filePath, paths, options);
        } else {
          // 通常のSCSSファイルの場合は、そのファイルだけを処理
          Logger.log(
            'INFO',
            `SCSSファイルが更新されました: ${path.relative(process.cwd(), filePath)}`,
          );
          await processScss(filePath, paths, options);
        }
      })
      .on('unlink', async (filePath) => {
        const isPartial = path.basename(filePath).startsWith('_');
        const isRootLevel = path.dirname(filePath) === path.resolve(srcDir);
        if (!isPartial && isRootLevel) {
          // メインファイルが削除された場合はリストから削除
          mainFiles.delete(filePath);
          Logger.log(
            'INFO',
            `SCSSファイルが削除されました: ${path.relative(process.cwd(), filePath)}`,
          );

          // 対応するCSSファイルも削除
          const relativePath = path.relative(paths.src, filePath);
          const distPath = path.join(
            paths.dist,
            relativePath.replace('.scss', '.css'),
          );

          try {
            await fs.unlink(distPath).catch(() => {});
            await fs.unlink(`${distPath}.map`).catch(() => {});
            Logger.log(
              'DEBUG',
              `削除されたSCSSに対応するCSSファイルを削除しました: ${path.relative(process.cwd(), distPath)}`,
            );
          } catch (err) {
            Logger.log(
              'DEBUG',
              `CSSファイル削除中にエラーが発生しました: ${distPath}`,
              err,
            );
          }
        } else {
          // パーシャルファイルやサブディレクトリ内のファイルが削除された場合は_index.scssを更新
          await initScss(srcDir);
          // 影響を受けるファイルを再コンパイル
          Logger.log(
            'INFO',
            `パーシャルファイルが削除されました: ${path.relative(process.cwd(), filePath)}`,
          );
          await recompileAffectedFiles(filePath, paths, options);
        }
      });

    Logger.log('DEBUG', `SCSSファイルの監視を開始しました: ${srcDir}`);
    return watcher; // 監視オブジェクトを返して、必要に応じて停止できるようにする
  } catch (err) {
    Logger.log('ERROR', 'SCSSの監視中にエラーが発生しました:', err);
    throw err;
  }
}

// スクリプトが直接実行された場合に実行
if (import.meta.url === `file://${process.argv[1]}`) {
  watchCss();
}

export default watchCss;
