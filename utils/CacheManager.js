import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import Logger from './Logger.js';

/**
 * ビルドキャッシュを管理するクラス
 * ファイルハッシュと設定ハッシュを使用してインクリメンタルビルドを実現
 */
export default class CacheManager {
  static instances = new Map();

  static shared(manifestPath = '.dai-runner/cache/manifest.json') {
    const resolvedPath = path.resolve(manifestPath);
    if (!this.instances.has(resolvedPath)) {
      this.instances.set(
        resolvedPath,
        new CacheManager(path.dirname(resolvedPath))
      );
    }
    return this.instances.get(resolvedPath);
  }

  constructor(cacheDir = '.dai-runner/cache') {
    this.cacheDir = cacheDir;
    this.manifestPath = path.join(cacheDir, 'manifest.json');
    this.manifest = null;
    this.initialization = null;
    this.saveQueue = Promise.resolve();
  }

  /**
   * キャッシュマニフェストを初期化（読み込み）
   */
  initialize() {
    if (this.initialization) return this.initialization;
    this.initialization = this.#initialize();
    return this.initialization;
  }

  async #initialize() {
    try {
      // キャッシュディレクトリを作成
      await fs.mkdir(this.cacheDir, { recursive: true });

      // マニフェストファイルを読み込み
      try {
        const data = await fs.readFile(this.manifestPath, 'utf-8');
        this.manifest = JSON.parse(data);
        Logger.log('INFO', 'キャッシュマニフェストを読み込みました');
      } catch (err) {
        if (err.code === 'ENOENT') {
          // ファイルが存在しない場合は新規作成
          this.manifest = {
            version: '1.0.0',
            files: {},
            optionsHash: null,
          };
          Logger.log('INFO', '新しいキャッシュマニフェストを作成しました');
        } else {
          throw err;
        }
      }
    } catch (err) {
      Logger.log('ERROR', 'キャッシュの初期化に失敗しました:', err);
      // エラーが発生しても続行（キャッシュなしで動作）
      this.manifest = {
        version: '1.0.0',
        files: {},
        optionsHash: null,
      };
    }
  }

  /**
   * ファイルの内容からハッシュを計算
   * @param {string} filePath - ファイルパス
   * @returns {Promise<string>} SHA256ハッシュ
   */
  async getFileHash(filePath) {
    try {
      const content = await fs.readFile(filePath);
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch (err) {
      if (err.code === 'ENOENT') {
        // 読む直前に消えた（削除・リネーム）。呼び出し元が「要処理」扱いで進み、実体チェックで弾かれる
        Logger.log(
          'DEBUG',
          `ハッシュ計算前にファイルが消えました: ${filePath}`
        );
      } else {
        Logger.log('WARN', `ファイルハッシュの計算に失敗: ${filePath}`, err);
      }
      return null;
    }
  }

  /**
   * 設定オブジェクトからハッシュを計算
   * @param {Object} options - 設定オブジェクト
   * @returns {string} SHA256ハッシュ
   */
  getOptionsHash(options) {
    // 設定を正規化してJSON文字列化
    const normalized = JSON.stringify(options, Object.keys(options).sort());
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * ファイルの存在確認
   * @param {string} filePath - ファイルパス
   * @returns {Promise<boolean>}
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * ファイルを処理すべきかチェック
   * @param {string} srcPath - ソースファイルパス
   * @param {string} distPath - 出力ファイルパス
   * @param {Object} options - 処理オプション
   * @returns {Promise<boolean>} 処理が必要ならtrue
   */
  async shouldProcessFile(srcPath, distPath, options) {
    if (!this.manifest) {
      // キャッシュが初期化されていない場合は処理が必要
      return true;
    }

    try {
      // 設定ハッシュをチェック
      const currentOptionsHash = this.getOptionsHash(options);
      if (this.manifest.optionsHash !== currentOptionsHash) {
        Logger.log(
          'INFO',
          '画像最適化の設定が変更されたため、全ファイルを再処理します'
        );
        // 設定が変更された場合は全ファイルを再処理
        this.manifest.optionsHash = currentOptionsHash;
        this.manifest.files = {};
        return true;
      }

      // 出力ファイルが存在するかチェック
      if (!(await this.fileExists(distPath))) {
        return true;
      }

      // ソースファイルのハッシュを計算
      const srcHash = await this.getFileHash(srcPath);
      if (!srcHash) {
        // ハッシュ計算に失敗した場合は処理が必要
        return true;
      }

      // キャッシュに記録されているハッシュと比較
      const cachedEntry = this.manifest.files[srcPath];
      if (!cachedEntry || cachedEntry.hash !== srcHash) {
        return true;
      }

      // WebPファイルの存在チェック
      // 生成時に記録した webpPath を信頼する（拡張子からの推測ではなく実態ベース）。
      // これにより、中身がSVG等でwebpを生成しないファイルや、拡張子と中身が
      // 食い違うファイルでも誤って再処理し続けることがなくなる。
      if (cachedEntry.webpPath !== undefined) {
        if (
          cachedEntry.webpPath &&
          !(await this.fileExists(cachedEntry.webpPath))
        ) {
          return true;
        }
      } else if (
        // 旧マニフェスト互換（webpPath未記録）: 拡張子から推測してチェック
        options.convertToWebp &&
        (srcPath.match(/\.(jpg|jpeg|png)$/i) ||
          distPath.match(/\.(jpg|jpeg|png)$/i))
      ) {
        const webpPath = distPath.replace(/\.[^.]+$/i, '.webp');
        if (!(await this.fileExists(webpPath))) {
          return true;
        }
      }

      // AVIFファイルの存在チェック（webpPath と同じく実態ベース）。
      // AVIF だけ欠けた場合も再生成させる。
      if (cachedEntry.avifPath !== undefined) {
        if (
          cachedEntry.avifPath &&
          !(await this.fileExists(cachedEntry.avifPath))
        ) {
          return true;
        }
      } else if (
        // 旧マニフェスト互換（avifPath未記録）: 拡張子から推測してチェック
        options.convertToAvif &&
        (srcPath.match(/\.(jpg|jpeg|png|webp)$/i) ||
          distPath.match(/\.(jpg|jpeg|png|webp)$/i))
      ) {
        const avifPath = distPath.replace(/\.[^.]+$/i, '.avif');
        if (!(await this.fileExists(avifPath))) {
          return true;
        }
      }

      // すべてのチェックをパスした場合は処理不要
      return false;
    } catch (err) {
      Logger.log('WARN', `キャッシュチェックでエラー: ${srcPath}`, err);
      // エラーが発生した場合は安全のため処理する
      return true;
    }
  }

  /**
   * ファイル処理完了をマークしてキャッシュを更新
   * @param {string} srcPath - ソースファイルパス
   * @param {string} distPath - 出力ファイルパス
   * @param {Object} options - 処理オプション
   * @param {string|null} [webpPath] - 生成したWebPファイルのパス（生成していない場合はnull）
   * @param {string|null} [avifPath] - 生成したAVIFファイルのパス（生成していない場合はnull）
   */
  async markProcessed(
    srcPath,
    distPath,
    options,
    webpPath = null,
    avifPath = null
  ) {
    if (!this.manifest) {
      return;
    }

    try {
      // ソースファイルのハッシュを計算
      const srcHash = await this.getFileHash(srcPath);
      if (!srcHash) {
        return;
      }

      // 設定ハッシュを更新
      const currentOptionsHash = this.getOptionsHash(options);
      this.manifest.optionsHash = currentOptionsHash;

      // ファイルエントリを更新（生成したwebp/avifパスも保存）
      this.manifest.files[srcPath] = {
        hash: srcHash,
        distPath: distPath,
        webpPath: webpPath,
        avifPath: avifPath,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      Logger.log('WARN', `キャッシュ更新でエラー: ${srcPath}`, err);
    }
  }

  /**
   * キャッシュマニフェストをディスクに保存
   */
  async save() {
    this.saveQueue = this.saveQueue.then(async () => {
      if (!this.manifest) return;
      try {
        await fs.mkdir(this.cacheDir, { recursive: true });
        await fs.writeFile(
          this.manifestPath,
          JSON.stringify(this.manifest, null, 2),
          'utf-8'
        );
        Logger.log('INFO', 'キャッシュマニフェストを保存しました');
      } catch (err) {
        Logger.log('ERROR', 'キャッシュの保存に失敗しました:', err);
      }
    });
    return this.saveQueue;
  }

  remove(srcPath) {
    if (this.manifest) delete this.manifest.files[srcPath];
  }

  /**
   * キャッシュをクリア
   */
  async clear() {
    try {
      await fs.rm(this.cacheDir, { recursive: true, force: true });
      this.manifest = {
        version: '1.0.0',
        files: {},
        optionsHash: null,
      };
      Logger.log('SUCCESS', 'キャッシュをクリアしました');
    } catch (err) {
      Logger.log('ERROR', 'キャッシュのクリアに失敗しました:', err);
    }
  }

  /**
   * キャッシュ統計情報を取得
   * @returns {Object} キャッシュの統計情報
   */
  getStats() {
    if (!this.manifest) {
      return { totalFiles: 0 };
    }

    return {
      totalFiles: Object.keys(this.manifest.files).length,
      optionsHash: this.manifest.optionsHash,
      version: this.manifest.version,
    };
  }
}
