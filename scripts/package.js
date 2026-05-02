import path from 'path';
import { pathToFileURL } from 'url';
import Logger from '../utils/Logger.js';
import { packageTheme } from '../tasks/package/packageTheme.js';
import { setConfig } from '../utils/configLoader.js';

async function runPackage() {
  try {
    const args = process.argv.slice(2);
    const cliZip = args.includes('--zip');

    const configPath = path.join(process.cwd(), 'dai-runner.config.js');
    const { config } = await import(pathToFileURL(configPath).href);

    setConfig(config);

    const logLevel = config.build?.options?.logLevel || 'INFO';
    Logger.setLogLevel(logLevel);

    await packageTheme(config.package, { zip: cliZip || undefined });
  } catch (err) {
    Logger.log('ERROR', 'パッケージング中にエラーが発生しました:', err);
    process.exit(1);
  }
}

runPackage();
