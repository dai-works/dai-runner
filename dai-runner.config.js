/**
 * テスト用設定ファイル
 * dai-runnerパッケージ自体の動作確認用
 *
 * @property {Object} paths - アセットの入出力パス設定
 * @property {Object} dev - 開発環境の設定
 * @property {Object} build - 本番環境の設定
 */

// ローカル設定を読み込み（個人環境依存の設定）
let localConfig = {};
try {
  const module = await import('./dai-runner.config.local.js');
  localConfig = module.default || {};
} catch (e) {
  // ローカル設定がない場合はデフォルト値を使用
}

export const config = {
  // パス設定（ソースとビルド後のディレクトリを定義）
  paths: {
    images: {
      src: 'test/source/images',
      dist: 'test/public/assets/images',
    },
    js: {
      src: 'test/source/js',
      dist: 'test/public/assets/js',
    },
    css: {
      src: 'test/source/scss',
      dist: 'test/public/assets/css',
    },
    documents: {
      src: 'test/source/documents',
      dist: 'test/public/assets/documents',
    },
    fonts: {
      src: 'test/source/fonts',
      dist: 'test/public/assets/fonts',
    },
    videos: {
      src: 'test/source/videos',
      dist: 'test/public/assets/videos',
    },
    vendor: {
      src: 'test/source/vendor',
      dist: 'test/public/assets/vendor',
    },
    // 例) 新しい静的カテゴリを追加したい場合
    // downloads: {
    //   src: 'test/source/downloads', // 手元の原本置き場
    //   dist: 'test/public/assets/downloads', // 本番配布用の出力先
    // },
  },

  // クリーンアップ設定
  cleanup: {
    // クリーンアップから除外するファイルやディレクトリを指定
    // テーマルートからの相対パスで指定（distディレクトリを含む完全なパス）
    excludeFiles: [
      // 'test/public/assets/images/keep-image.png',
      // 'test/public/assets/js/keep-js.js',
      // 'test/public/assets/css/keep-css.css',
    ],
  },

  // 画像最適化設定（開発・本番共通）
  images: {
    convertToWebp: true,
    imageQuality: 80,
    maxWidth: 3840,
    // キャッシュを使用して処理済み画像をスキップ（高速化）
    // 開発時はtrue、本番ビルド時はfalseが推奨
    useCache: true,
    // 最適化から除外したいファイルがある場合は以下のコメントのように設定
    // （例：動くpng画像など）
    excludeFromOptimization: [
      // 'sample.png',
      // 'sample.jpg',
    ],
  },

  // 開発環境設定
  dev: {
    // mode と proxy は dai-runner.config.local.js で設定されます
    // 初回実行時に自動的に作成されます
    mode: localConfig.mode || 'server',
    server: { baseDir: './test/public' },
    proxy: localConfig.proxy || {
      target: 'http://127.0.0.1',
      proxyReq: [],
    },
    options: {
      js: {
        minify: false,
        sourceMap: true,
      },
      css: {
        minify: false,
        sourceMap: true,
      },
      logLevel: 'info',
    },
  },

  // 本番環境設定
  build: {
    options: {
      js: {
        minify: false,
        sourceMap: false,
      },
      css: {
        minify: false,
        sourceMap: false,
      },
      logLevel: 'info',
    },
  },

  /**
   * 指定された環境の設定を取得
   * @param {string} env - 環境名（dev or build）
   * @returns {Object} 環境設定
   */
  get(env = process.env.NODE_ENV || 'dev') {
    const conf = this[env] || this.dev;
    return {
      ...conf,
      paths: this.paths,
      cleanup: this.cleanup,
      options: {
        ...conf.options,
        images: this.images,
      },
    };
  },
};
