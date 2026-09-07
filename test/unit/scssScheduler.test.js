import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers.js';
import { createScssScheduler } from '../../tasks/css/scssScheduler.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * 記録付きの偽 compile / reindex を持つスケジューラを作る
 * @param {Object} [opts]
 * @param {number} [opts.compileMs=0] - compile 1 本にかける時間
 * @param {string[]} [opts.written=[]] - reindex が「書いた」と報告するパス
 */
function makeScheduler({ compileMs = 0, written = [], ...rest } = {}) {
  const mainFiles = new Set(['/src/style.scss', '/src/admin.scss']);
  const log = [];
  const scheduler = createScssScheduler({
    srcDir: '/src',
    paths: { src: '/src', dist: '/dist' },
    options: {},
    mainFiles,
    compile: async (file) => {
      log.push(`compile:${file}`);
      if (compileMs) await sleep(compileMs);
    },
    reindex: async () => {
      log.push('reindex');
      return written;
    },
    debounceMs: 20,
    maxWaitMs: 200,
    ...rest,
  });
  return { scheduler, log, mainFiles };
}

test('パーシャル追加のバーストは reindex 1 回・全メインのコンパイル 1 回にまとまる', async () => {
  const { scheduler, log } = makeScheduler();
  for (let i = 0; i < 50; i++) {
    scheduler.request({ reindex: true });
  }
  await sleep(60);
  await scheduler.flush();
  assert.deepEqual(log, [
    'reindex',
    'compile:/src/style.scss',
    'compile:/src/admin.scss',
  ]);
  assert.equal(scheduler.runs, 1);
});

test('コンパイル中に届いた依頼は次の 1 回に合流し、重なって走らない', async () => {
  const { scheduler, log } = makeScheduler({ compileMs: 40 });
  scheduler.request({ all: true });
  await sleep(30); // 1 回目が走り始める
  assert.equal(scheduler.running, true);
  // 走っている間に何度も依頼する
  scheduler.request({ all: true });
  scheduler.request({ files: ['/src/style.scss'] });
  scheduler.request({ reindex: true });
  assert.equal(scheduler.coalesced, 3);
  await scheduler.flush();
  // 1 回目（all）→ 2 回目（reindex + all）の 2 回だけ。3 回目は無い
  assert.deepEqual(log, [
    'compile:/src/style.scss',
    'compile:/src/admin.scss',
    'reindex',
    'compile:/src/style.scss',
    'compile:/src/admin.scss',
  ]);
  assert.equal(scheduler.runs, 2);
});

test('メインファイル個別の依頼は重複を除いてまとめ、全体の依頼があれば全体に吸収される', async () => {
  const { scheduler, log } = makeScheduler();
  scheduler.request({ files: ['/src/style.scss'] });
  scheduler.request({ files: ['/src/style.scss'] });
  await scheduler.flush();
  assert.deepEqual(log, ['compile:/src/style.scss']);

  log.length = 0;
  scheduler.request({ files: ['/src/style.scss'] });
  scheduler.request({ all: true });
  await scheduler.flush();
  assert.deepEqual(log, ['compile:/src/style.scss', 'compile:/src/admin.scss']);
});

test('自分が書いた _index.scss のイベントは 1 回だけ無視し、それ以降の編集は拾う', async () => {
  const { scheduler } = makeScheduler({
    written: ['/src/modules/_index.scss'],
  });
  scheduler.request({ reindex: true });
  await scheduler.flush();
  assert.equal(scheduler.consumeSelfWrite('/src/modules/_index.scss'), true);
  // 消費済みなので 2 回目は無視しない
  assert.equal(scheduler.consumeSelfWrite('/src/modules/_index.scss'), false);
  // 書いていないファイルは無視しない
  assert.equal(scheduler.consumeSelfWrite('/src/modules/_foo.scss'), false);
});

test('reindex の途中で届いたイベントでも自己書き込みと分かる（書き込み前に登録）', async () => {
  const seenDuringReindex = [];
  const scheduler = createScssScheduler({
    srcDir: '/src',
    paths: {},
    mainFiles: new Set(['/src/style.scss']),
    compile: async () => {},
    reindex: async (_srcDir, { onWrite }) => {
      onWrite('/src/modules/m-new/_index.scss');
      // 実際の監視ではここ（書き込み直後、reindex 完了前）で add イベントが届く
      seenDuringReindex.push(
        scheduler.consumeSelfWrite('/src/modules/m-new/_index.scss')
      );
      await sleep(10);
      return ['/src/modules/m-new/_index.scss'];
    },
    debounceMs: 5,
  });
  scheduler.request({ reindex: true });
  await scheduler.flush();
  assert.deepEqual(seenDuringReindex, [true]);
  // 消費済みなので、戻り値から再登録されない
  assert.equal(
    scheduler.consumeSelfWrite('/src/modules/m-new/_index.scss'),
    false
  );
});

test('猶予を過ぎた自己書き込みは無視しない', async () => {
  const { scheduler } = makeScheduler({
    written: ['/src/modules/_index.scss'],
    selfWriteGraceMs: 10,
  });
  scheduler.request({ reindex: true });
  await scheduler.flush();
  await sleep(30);
  assert.equal(scheduler.consumeSelfWrite('/src/modules/_index.scss'), false);
});

test('依頼が途切れなくても maxWaitMs を超えたら一度は走る', async () => {
  let ticker = null;
  let ranAt = null;
  const start = Date.now();
  const scheduler = createScssScheduler({
    srcDir: '/src',
    paths: {},
    mainFiles: new Set(['/src/style.scss']),
    compile: async () => {
      // 走った瞬間に依頼を止める（2 回目が混ざらないように）
      ranAt ??= Date.now();
      clearInterval(ticker);
    },
    reindex: async () => [],
    debounceMs: 20,
    maxWaitMs: 100,
  });
  // 10ms ごとに依頼し続ける（debounce だけなら静かにならず永遠に走らない）
  ticker = setInterval(() => scheduler.request({ all: true }), 10);
  while (ranAt === null && Date.now() - start < 2000) {
    await sleep(5);
  }
  clearInterval(ticker);
  await scheduler.flush();
  assert.notEqual(ranAt, null, '2 秒待っても走らなかった');
  const elapsed = ranAt - start;
  assert.ok(elapsed >= 20, `${elapsed}ms で走った（debounce を待っていない）`);
  assert.ok(
    elapsed < 1000,
    `${elapsed}ms かかった（maxWaitMs が効いていない）`
  );
});

test('削除されたメインファイルは保留中でもコンパイルしない', async () => {
  const { scheduler, log, mainFiles } = makeScheduler();
  scheduler.request({ files: ['/src/admin.scss'] });
  mainFiles.delete('/src/admin.scss');
  scheduler.forget('/src/admin.scss');
  scheduler.request({ files: ['/src/style.scss'] });
  await scheduler.flush();
  assert.deepEqual(log, ['compile:/src/style.scss']);
});

test('compile が例外を投げても監視は続き、次の依頼を処理できる', async () => {
  const mainFiles = new Set(['/src/style.scss']);
  let fail = true;
  const log = [];
  const scheduler = createScssScheduler({
    srcDir: '/src',
    paths: {},
    mainFiles,
    compile: async (file) => {
      if (fail) throw new Error('boom');
      log.push(file);
    },
    reindex: async () => [],
    debounceMs: 5,
  });
  scheduler.request({ all: true });
  await scheduler.flush();
  fail = false;
  scheduler.request({ all: true });
  await scheduler.flush();
  assert.deepEqual(log, ['/src/style.scss']);
});
