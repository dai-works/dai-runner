/**
 * テスト用設定ファイル
 * dai-runnerパッケージ自体の動作確認用
 */
export const config = {
  // パス設定
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
  },

  // クリーンアップ設定
  cleanup: {
    excludeFiles: [],
  },

  // 画像最適化設定
  images: {
    convertToWebp: true,
    imageQuality: 80,
    maxWidth: 3840,
    excludeFromOptimization: [],
  },

  // 開発環境設定（サーバーモード）
  dev: {
    mode: 'server',
    server: { baseDir: './test/public' },
    proxy: {
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
