import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import Logger from '../../utils/Logger.js';

// テスト中はエラー以外のログを出さない
Logger.setLogLevel('error');

/**
 * 一時ディレクトリを作り、テスト終了時に削除する
 * @param {import('node:test').TestContext} t
 * @returns {Promise<string>}
 */
export async function makeTmpDir(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dai-runner-test-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return dir;
}

export async function exists(p) {
  return fs.access(p).then(
    () => true,
    () => false
  );
}
