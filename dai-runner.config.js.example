/**
 * プロジェクトの設定を管理するコンフィグオブジェクト
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
} catch (_e) {
  // ローカル設定がない場合はデフォルト値を使用
}

export const config = {
  // パス設定（ソースとビルド後のディレクトリを定義）
  paths: {
    images: {
      src: 'source/images',
      dist: 'public/assets/images',
    },
    js: {
      src: 'source/js',
      dist: 'public/assets/js',
    },
    css: {
      src: 'source/scss',
      dist: 'public/assets/css',
    },
    documents: {
      src: 'source/documents',
      dist: 'public/assets/documents',
    },
    fonts: {
      src: 'source/fonts',
      dist: 'public/assets/fonts',
    },
    videos: {
      src: 'source/videos',
      dist: 'public/assets/videos',
    },
    vendor: {
      src: 'source/vendor',
      dist: 'public/assets/vendor',
    },
    // 例) 新しい静的カテゴリを追加したい場合
    // downloads: {
    //   src: 'source/downloads', // 手元の原本置き場
    //   dist: 'assets/downloads', // 本番配布用の出力先
    // },
  },

  // クリーンアップ設定
  cleanup: {
    // クリーンアップから除外するファイルやディレクトリを指定
    // テーマルートからの相対パスで指定（distディレクトリを含む完全なパス）
    excludeFiles: [
      // 'public/assets/images/keep-image.png',
      // 'public/assets/js/keep-js.js',
      // 'public/assets/css/keep-css.css',
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
    server: { baseDir: 'public' },
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
