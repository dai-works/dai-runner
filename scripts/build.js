import path from 'path';
import { pathToFileURL } from 'url';
import Logger from '../utils/Logger.js';
import BuildManager from '../utils/BuildManager.js';
import { setConfig } from '../utils/configLoader.js';

async function build() {
  try {
    // プロジェクトルートのdai-runner.config.jsを動的にインポート
    const configPath = path.join(process.cwd(), 'dai-runner.config.js');
    const { config } = await import(pathToFileURL(configPath).href);

    // グローバルなconfigを設定（他のモジュールから参照可能にする）
    setConfig(config);

    const conf = config.get();

    // ログレベルを設定
    Logger.setLogLevel(conf.options.logLevel);

    Logger.log('INFO', '本番用ビルドを開始します...');

    await BuildManager.executeBuild(conf, '本番用');
  } catch (err) {
    Logger.log('ERROR', 'ビルド中にエラーが発生しました:', err);
    process.exit(1);
  }
}

build();
