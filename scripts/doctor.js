#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadConfig, clearCache } from '../utils/configLoader.js';
import { DEFAULTS } from '../utils/defaults.js';
import { isNodeVersionSupported } from './precheck.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '..');

const KNOWN_CONFIG_KEYS = {
  topLevel: new Set([
    'paths',
    'cleanup',
    'watchOptions',
    'package',
    'images',
    'sitemap',
    'dev',
    'build',
    'get',
  ]),
  paths: new Set(['css', 'js', 'images']),
  pathEntry: new Set(['src', 'dist']),
  cleanup: new Set(['excludeFiles', 'cleanOrphans']),
  watchOptions: new Set(['ignored']),
  package: new Set([
    ...Object.keys(DEFAULTS.package),
    'outputDir',
    'zip',
    'zipName',
  ]),
  images: new Set([...Object.keys(DEFAULTS.images), 'excludeFromOptimization']),
  sitemap: new Set([
    'enabled',
    'productionUrl',
    'sourceDir',
    'outputPath',
    'excludePatterns',
    'defaultPriority',
    'defaultChangefreq',
    'customPriorities',
  ]),
  environment: new Set(['mode', 'server', 'proxy', 'options', 'sitemap']),
  server: new Set(['baseDir']),
  proxy: new Set(['target', 'proxyReq']),
  options: new Set(['css', 'js', 'images', 'logLevel', 'incremental']),
  css: new Set(Object.keys(DEFAULTS.css)),
  js: new Set(Object.keys(DEFAULTS.js)),
  optionImages: new Set(Object.keys(DEFAULTS.images)),
};

function extractPinnedVersion(specifier) {
  if (typeof specifier !== 'string') return null;
  return specifier.match(/#v(\d+\.\d+\.\d+)(?:$|[^\d])/u)?.[1] || null;
}

function compareVersions(left, right) {
  const parse = (version) => {
    const match = String(version).match(/^(\d+)\.(\d+)\.(\d+)$/);
    if (!match) throw new Error(`比較できないバージョンです: ${version}`);
    return match.slice(1).map(Number);
  };
  const leftParts = parse(left);
  const rightParts = parse(right);
  for (let i = 0; i < leftParts.length; i += 1) {
    if (leftParts[i] !== rightParts[i]) {
      return leftParts[i] < rightParts[i] ? -1 : 1;
    }
  }
  return 0;
}

function unknownAt(value, knownKeys, prefix) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.keys(value)
    .filter((key) => !knownKeys.has(key))
    .map((key) => `${prefix}.${key}`);
}

function detectUnknownKeys(config) {
  const unknown = unknownAt(config, KNOWN_CONFIG_KEYS.topLevel, 'config');
  unknown.push(...unknownAt(config.paths, KNOWN_CONFIG_KEYS.paths, 'paths'));
  for (const asset of ['css', 'js', 'images']) {
    unknown.push(
      ...unknownAt(
        config.paths?.[asset],
        KNOWN_CONFIG_KEYS.pathEntry,
        `paths.${asset}`
      )
    );
  }
  unknown.push(
    ...unknownAt(config.cleanup, KNOWN_CONFIG_KEYS.cleanup, 'cleanup'),
    ...unknownAt(
      config.watchOptions,
      KNOWN_CONFIG_KEYS.watchOptions,
      'watchOptions'
    ),
    ...unknownAt(config.package, KNOWN_CONFIG_KEYS.package, 'package'),
    ...unknownAt(config.images, KNOWN_CONFIG_KEYS.images, 'images'),
    ...unknownAt(config.sitemap, KNOWN_CONFIG_KEYS.sitemap, 'sitemap')
  );

  for (const env of ['dev', 'build']) {
    const environment = config[env];
    unknown.push(
      ...unknownAt(environment, KNOWN_CONFIG_KEYS.environment, env),
      ...unknownAt(
        environment?.server,
        KNOWN_CONFIG_KEYS.server,
        `${env}.server`
      ),
      ...unknownAt(environment?.proxy, KNOWN_CONFIG_KEYS.proxy, `${env}.proxy`),
      ...unknownAt(
        environment?.options,
        KNOWN_CONFIG_KEYS.options,
        `${env}.options`
      ),
      ...unknownAt(
        environment?.options?.css,
        KNOWN_CONFIG_KEYS.css,
        `${env}.options.css`
      ),
      ...unknownAt(
        environment?.options?.js,
        KNOWN_CONFIG_KEYS.js,
        `${env}.options.js`
      ),
      ...unknownAt(
        environment?.options?.images,
        KNOWN_CONFIG_KEYS.optionImages,
        `${env}.options.images`
      ),
      ...unknownAt(
        environment?.sitemap,
        KNOWN_CONFIG_KEYS.sitemap,
        `${env}.sitemap`
      )
    );
  }
  return unknown;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseLatest(args) {
  const index = args.indexOf('--latest');
  return index === -1 ? null : args[index + 1] || null;
}

async function doctor({
  cwd = process.cwd(),
  args = process.argv.slice(2),
} = {}) {
  let hasProblem = false;
  const report = (level, message) => {
    if (level === 'NG') hasProblem = true;
    const color = { ok: chalk.green, WARN: chalk.yellow, NG: chalk.red }[level];
    console.log(`${color(level)} ${message}`);
  };

  const ownPackage = readJson(path.join(packageRoot, 'package.json'));
  const requiredNode = ownPackage.engines?.node || '>=20.19.0';
  const nodeOk = isNodeVersionSupported(process.versions.node, requiredNode);
  report(
    nodeOk ? 'ok' : 'NG',
    `Node.js ${process.versions.node}（必要: ${requiredNode}）`
  );

  const installedPackagePath = path.join(
    cwd,
    'node_modules/@dai-works/dai-runner/package.json'
  );
  const runnerPackage = fs.existsSync(installedPackagePath)
    ? readJson(installedPackagePath)
    : ownPackage;
  report('ok', `dai-runner ${runnerPackage.version}`);

  const projectPackagePath = path.join(cwd, 'package.json');
  let pinnedVersion = null;
  if (!fs.existsSync(projectPackagePath)) {
    report('WARN', 'package.json がありません');
  } else {
    const projectPackage = readJson(projectPackagePath);
    const specifier =
      projectPackage.devDependencies?.['@dai-works/dai-runner'] ||
      projectPackage.dependencies?.['@dai-works/dai-runner'];
    pinnedVersion = extractPinnedVersion(specifier);
    report(
      pinnedVersion ? 'ok' : 'WARN',
      pinnedVersion
        ? `package.json の pin: ${specifier}（v${pinnedVersion}）`
        : `package.json の pin を確認できません: ${specifier || '指定なし'}`
    );
  }

  const latest = parseLatest(args);
  if (args.includes('--latest') && !latest) {
    report('NG', '--latest には x.y.z 形式のバージョンが必要です');
  } else if (latest) {
    try {
      const targetVersion = pinnedVersion || runnerPackage.version;
      const comparison = compareVersions(targetVersion, latest);
      report(
        comparison < 0 ? 'WARN' : 'ok',
        comparison < 0
          ? `v${targetVersion} は指定された最新版 v${latest} より古いです`
          : `バージョン比較: v${targetVersion} / 最新 v${latest}`
      );
    } catch (error) {
      report('NG', error.message);
    }
  }

  const mainConfigPath = path.join(cwd, 'dai-runner.config.js');
  const localConfigPath = path.join(cwd, 'dai-runner.config.local.js');
  report(
    fs.existsSync(mainConfigPath) ? 'ok' : 'NG',
    `dai-runner.config.js: ${fs.existsSync(mainConfigPath) ? 'あり' : 'なし'}`
  );
  report(
    fs.existsSync(localConfigPath) ? 'ok' : 'WARN',
    `dai-runner.config.local.js: ${fs.existsSync(localConfigPath) ? 'あり' : 'なし'}`
  );

  if (fs.existsSync(localConfigPath)) {
    try {
      await import(
        `${pathToFileURL(localConfigPath).href}?doctor=${Date.now()}`
      );
      report('ok', 'dai-runner.config.local.js を読み込めます');
    } catch (error) {
      report(
        'NG',
        `dai-runner.config.local.js の読み込み失敗: ${error.message}`
      );
    }
  }

  let rawConfig = null;
  if (fs.existsSync(mainConfigPath)) {
    try {
      rawConfig = (
        await import(
          `${pathToFileURL(mainConfigPath).href}?doctor=${Date.now()}`
        )
      ).config;
      report('ok', 'dai-runner.config.js を読み込めます');
    } catch (error) {
      report('NG', `dai-runner.config.js の読み込み失敗: ${error.message}`);
    }
  }

  const resolvedConfigs = {};
  for (const env of ['dev', 'build']) {
    try {
      clearCache();
      resolvedConfigs[env] = await loadConfig({ env, cwd });
      report('ok', `${env} 設定を解決できます`);
    } catch (error) {
      report('NG', `${env} 設定の解決失敗: ${error.message.split('\n')[0]}`);
    }
  }

  if (rawConfig) {
    const unknown = detectUnknownKeys(rawConfig);
    report(
      unknown.length ? 'WARN' : 'ok',
      unknown.length
        ? `未知の設定キー: ${unknown.join(', ')}`
        : '未知の設定キーはありません'
    );
  }

  const paths = resolvedConfigs.build?.paths || resolvedConfigs.dev?.paths;
  if (paths) {
    for (const asset of ['css', 'js', 'images']) {
      for (const direction of ['src', 'dist']) {
        const configuredPath = paths[asset]?.[direction];
        const exists =
          configuredPath && fs.existsSync(path.resolve(cwd, configuredPath));
        report(
          exists ? 'ok' : 'NG',
          `paths.${asset}.${direction}: ${configuredPath || '未設定'}${exists ? '' : '（見つかりません）'}`
        );
      }
    }
  }

  const manifestPath = path.join(cwd, '.dai-runner/cache/manifest.json');
  if (!fs.existsSync(manifestPath)) {
    report('WARN', '.dai-runner/cache/manifest.json: なし');
  } else {
    try {
      const manifest = readJson(manifestPath);
      const entries = manifest.files ?? manifest;
      const count = Array.isArray(entries)
        ? entries.length
        : Object.keys(entries).length;
      report('ok', `.dai-runner/cache/manifest.json: ${count} エントリ`);
    } catch (error) {
      report('NG', `manifest.json の読み込み失敗: ${error.message}`);
    }
  }

  return hasProblem ? 1 : 0;
}

const isDirectRun =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  doctor().then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      console.error(
        `${chalk.red('NG')} 診断中にエラーが発生しました: ${error.message}`
      );
      process.exitCode = 1;
    }
  );
}

export {
  KNOWN_CONFIG_KEYS,
  compareVersions,
  detectUnknownKeys,
  doctor,
  extractPinnedVersion,
};
