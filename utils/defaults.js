// dai-runner 全体で共有する既定値
export const DEFAULTS = {
  css: { sourceMap: false, minify: false },
  js: { minify: false, sourceMap: false, bundle: true, dropConsole: false },
  images: {
    maxWidth: 3840,
    imageQuality: 80,
    convertToWebp: true,
    convertToAvif: false,
    avifQuality: 60,
    useCache: true,
    concurrency: 4, // 同時に処理する画像の数（sharp は CPU 負荷が高いのでコア数程度まで）
  },
  package: {
    include: [
      'assets/**',
      'includes/**',
      'template-parts/**',
      'page-parts/**',
      '*.php',
      'style.css',
      'screenshot.png',
    ],
    exclude: [
      'page-snippets.php',
      '**/.DS_Store',
      '**/Thumbs.db',
      '**/*:Zone.Identifier',
    ],
  },
};
