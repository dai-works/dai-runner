import Logger from '../utils/Logger.js';
import BuildManager from '../utils/BuildManager.js';
import { loadConfig } from '../utils/configLoader.js';

async function build() {
  try {
    const conf = await loadConfig({ env: 'build' });

    // ログレベルを設定
    Logger.setLogLevel(conf.options.logLevel);

    Logger.log('INFO', '本番用ビルドを開始します...');

    await BuildManager.executeBuild(conf, '本番用', { generateSitemap: true });
  } catch (err) {
    Logger.log('ERROR', 'ビルド中にエラーが発生しました:', err);
    process.exit(1);
  }
}

build();
