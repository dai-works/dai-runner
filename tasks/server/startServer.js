import browserSync from 'browser-sync';
import { getConfig } from '../../utils/configLoader.js';
import Logger from '../../utils/Logger.js';
import { setupLiveReload } from './livereload.js';
import chalk from 'chalk';

const bs = browserSync.create();

/**
 * 開発用サーバーを起動するモジュール
 * - ブラウザシンク設定
 * - プロキシまたはスタティックサーバーモード
 * - ファイル変更の監視と自動リロード
 */

/**
 * 開発サーバーを起動
 * @param {Object} options - サーバー設定オプション
 */
export async function startServer(_options = {}) {
  try {
    // configを取得
    const currentConfig = getConfig().get();

    // config.pathsのdist設定から動的にJSとCSSの出力先パスを取得
    const cssDistPath = currentConfig.paths.css.dist;
    const jsDistPath = currentConfig.paths.js.dist;

    const serverConfig = {
      ...currentConfig.server,
      files: [
        {
          match: [`${cssDistPath}/**/*.css`],
          fn: function (event, file) {
            if (event === 'change') {
              console.log(
                chalk.white('[Browsersync]'),
                'CSSを更新します:',
                file
              );
              this.reload('*.css');
            }
          },
        },
        {
          match: [`${jsDistPath}/**/*.js`, '**/*.html', '**/*.php'],
          fn: function (event, file) {
            if (event === 'change') {
              console.log(
                chalk.white('[Browsersync]'),
                'ページをリロードします:',
                file
              );
              this.reload();
            }
          },
        },
      ],
      open: false,
      notify: false,
      ghostMode: false,
      // CSSファイルはインジェクション、その他は全体リロード
      injectChanges: false,
      // リロードの遅延を設定（連続変更時のリロード頻度を制御）
      reloadDelay: 0,
      reloadDebounce: 500,
    };

    // プロキシモードまたはサーバーモードの設定
    if (currentConfig.mode === 'proxy') {
      serverConfig.proxy = currentConfig.proxy;
      Logger.log(
        'INFO',
        `プロキシを設定しました: ${currentConfig.proxy.target}`
      );

      // HostヘッダーからTraefikのURLを動的に取得
      const hostHeader = currentConfig.proxy.proxyReq?.[0]?.toString();
      const hostMatch = hostHeader?.match(/setHeader\('Host',\s*'([^']+)'\)/);
      if (hostMatch) {
        console.log(
          chalk.white('[dev-tools]'),
          `Traefik URL: ${chalk.magenta(`http://${hostMatch[1]}`)}`
        );
      }
    } else if (currentConfig.mode === 'server') {
      // 静的サーバーモード
      serverConfig.server = currentConfig.server;
      Logger.log('INFO', '静的サーバーモードで起動します');
    }

    // LiveReloadの設定
    setupLiveReload(bs);

    // サーバー起動
    bs.init(serverConfig, (err, bs) => {
      if (err) {
        Logger.log('ERROR', '開発サーバーの起動に失敗しました:', err);
        return;
      }
      Logger.log(
        'DEBUG',
        `開発サーバーを起動しました: ${bs.options.get('urls').get('local')}`
      );
    });

    return bs;
  } catch (err) {
    Logger.log('ERROR', '開発サーバーの設定中にエラーが発生しました:', err);
    throw err;
  }
}
