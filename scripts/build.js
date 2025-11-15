import { config } from '../config.js';
import Logger from '../utils/Logger.js';
import BuildManager from '../utils/BuildManager.js';

async function build() {
  try {
    Logger.log('INFO', '本番用ビルドを開始します...');
    const conf = config.get();

    await BuildManager.executeBuild(conf, '本番用');
  } catch (err) {
    Logger.log('ERROR', 'ビルド中にエラーが発生しました:', err);
    process.exit(1);
  }
}

build();
