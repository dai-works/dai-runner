import { test } from 'node:test';
import assert from 'node:assert/strict';

test('index.js が import でき、公開 API が揃っている（B-7 回帰）', async () => {
  const api = await import('../../index.js');
  for (const name of [
    'Logger',
    'BuildManager',
    'CleanupManager',
    'CacheManager',
    'buildCss',
    'compileCss',
    'initScss',
    'watchCss',
    'buildJs',
    'bundleJs',
    'minifyJs',
    'watchJs',
    'buildImages',
    'optimizeImages',
    'watchImages',
    'buildSitemap',
    'generateSitemap',
    'packageTheme',
    'startServer',
  ]) {
    assert.equal(
      typeof api[name],
      'function',
      `${name} が export されていない`
    );
  }
  assert.equal(
    'config' in api,
    false,
    'config はユーザー側のファイルなので export しない'
  );
});
