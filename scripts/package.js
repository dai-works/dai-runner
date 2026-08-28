import Logger from '../utils/Logger.js';
import { packageTheme } from '../tasks/package/packageTheme.js';
import { loadConfig } from '../utils/configLoader.js';

async function runPackage() {
  try {
    const args = process.argv.slice(2);
    const cliZip = args.includes('--zip');

    const conf = await loadConfig({ env: 'build' });
    Logger.setLogLevel(conf.options.logLevel);

    await packageTheme(conf.package, { zip: cliZip || undefined });
  } catch (err) {
    Logger.log('ERROR', 'パッケージング中にエラーが発生しました:', err);
    process.exit(1);
  }
}

runPackage();
