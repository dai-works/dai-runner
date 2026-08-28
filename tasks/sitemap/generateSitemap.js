import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import Logger from '../../utils/Logger.js';

/**
 * HTMLファイルからURLのリストを生成
 * @param {string} sourceDir - HTMLファイルの検索元ディレクトリ
 * @param {Array<string>} excludePatterns - 除外パターンの配列
 * @returns {Promise<Array<string>>} - URLパスのリスト
 */
async function collectHtmlFiles(sourceDir, excludePatterns = []) {
  const pattern = path.join(sourceDir, '**/*.html');

  try {
    // HTMLファイルを検索
    const files = await glob(pattern, {
      ignore: excludePatterns.map((pattern) => path.join(sourceDir, pattern)),
    });

    // ソースディレクトリからの相対パスに変換
    const urls = files.map((file) => {
      const relativePath = path.relative(sourceDir, file);
      // URLパスに変換（Windows対応）
      let urlPath = '/' + relativePath.split(path.sep).join('/');

      // index.htmlは省略
      if (urlPath.endsWith('/index.html')) {
        urlPath = urlPath.replace('/index.html', '/');
      } else if (urlPath === '/index.html') {
        urlPath = '/';
      }

      return urlPath;
    });

    return urls.sort();
  } catch (error) {
    Logger.log('ERROR', 'HTMLファイルの収集に失敗しました:', error);
    throw error;
  }
}

/**
 * sitemap.xmlの内容を生成
 * @param {string} productionUrl - 本番環境のURL
 * @param {Array<string>} urls - URLパスのリスト
 * @param {Object} options - オプション設定
 * @returns {string} - sitemap.xmlの内容
 */
function generateSitemapXml(productionUrl, urls, options = {}) {
  const {
    defaultPriority = 0.5,
    defaultChangefreq = 'weekly',
    customPriorities = {},
  } = options;

  // 末尾のスラッシュを削除
  const baseUrl = productionUrl.replace(/\/$/, '');

  const urlEntries = urls
    .map((url) => {
      // 優先度を決定（カスタム > トップページ > デフォルト）
      let priority = defaultPriority;
      if (customPriorities[url] !== undefined) {
        priority = customPriorities[url];
      } else if (url === '/') {
        priority = 1.0;
      }

      return `  <url>
    <loc>${baseUrl}${url}</loc>
    <changefreq>${defaultChangefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>
`;
}

/**
 * sitemap.xmlを生成して保存
 * @param {Object} config - sitemap設定
 */
export async function generateSitemap(config) {
  const {
    productionUrl,
    sourceDir,
    outputPath,
    excludePatterns = [],
    defaultPriority = 0.5,
    defaultChangefreq = 'weekly',
    customPriorities = {},
  } = config;

  try {
    Logger.log('INFO', 'sitemap.xmlを生成しています...');

    // 必須パラメータチェック
    if (!productionUrl) {
      Logger.log(
        'WARN',
        'sitemap.productionUrlが設定されていません。sitemap生成をスキップします'
      );
      return;
    }

    if (!sourceDir) {
      Logger.log(
        'WARN',
        'sitemap.sourceDirが設定されていません。sitemap生成をスキップします'
      );
      return;
    }

    // ソースディレクトリの存在確認
    if (!fs.existsSync(sourceDir)) {
      Logger.log(
        'WARN',
        `ソースディレクトリ '${sourceDir}' が見つかりません。sitemap生成をスキップします`
      );
      return;
    }

    // HTMLファイルを収集
    const urls = await collectHtmlFiles(sourceDir, excludePatterns);

    if (urls.length === 0) {
      Logger.log(
        'WARN',
        `HTMLファイルが見つかりませんでした。sitemap生成をスキップします`
      );
      return;
    }

    // sitemap.xmlを生成
    const sitemapContent = generateSitemapXml(productionUrl, urls, {
      defaultPriority,
      defaultChangefreq,
      customPriorities,
    });

    // 出力先ディレクトリを作成
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // ファイルに書き込み
    fs.writeFileSync(outputPath, sitemapContent, 'utf-8');

    Logger.log('SUCCESS', `sitemap.xmlを生成しました: ${outputPath}`);
    Logger.log('INFO', `  URL数: ${urls.length}`);
    Logger.log('INFO', `  本番URL: ${productionUrl}`);
  } catch (error) {
    Logger.log('ERROR', 'sitemap.xml生成中にエラーが発生しました:', error);
    throw error;
  }
}
