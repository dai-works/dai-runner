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
