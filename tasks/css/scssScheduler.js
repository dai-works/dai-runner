import path from 'path';
import Logger from '../../utils/Logger.js';

/**
 * SCSS 監視のスケジューラ
 *
 * chokidar のイベントを直接コンパイルに結び付けず、ここで一度まとめてから実行する。
 * 狙いは 2 つ：
 *
 * 1. バーストをまとめる
 *    ブランチ切替や一括生成では追加・変更・削除が数十〜数百件まとめて届く。
 *    以前はパーシャル追加のたびに _index.scss を作り直し（ツリー全体を glob）、
 *    さらに 300ms 後にメインを全部コンパイルしていたので、バースト中は
 *    「index 再生成 → コンパイル → 次の index 再生成 → …」が延々と続いていた。
 *    ここでは静かになるまで（debounceMs）待ち、index 再生成は 1 回、コンパイルも 1 回にする。
 *    書き込みが途切れない場合でも maxWaitMs で必ず一度は走らせる。
 *
 * 2. コンパイルを重ねない
 *    コンパイル中に届いたイベントは「次に走らせる 1 回」に合流させる（pending）。
 *    同じ CSS を 2 つのコンパイルが同時に書くことが無くなり、
 *    最後に走る 1 回が必ず最新のソースを反映する。
 *
 * initScss が書いた _index.scss は chokidar から add / change として返ってくるが、
 * その内容は直後のコンパイルに既に含まれているので、無駄な 2 周目を避けるため無視する。
 *
 * @param {Object} deps
 * @param {string} deps.srcDir - SCSS のソースディレクトリ
 * @param {Object} deps.paths - パス設定（compile にそのまま渡す）
 * @param {Object} [deps.options] - コンパイルオプション（compile にそのまま渡す）
 * @param {Set<string>} deps.mainFiles - メインファイルの集合（watchCss が管理）
 * @param {(file: string, paths: Object, options: Object) => Promise<void>} deps.compile
 * @param {(srcDir: string) => Promise<string[]|void>} deps.reindex - _index.scss を作り直し、書いたパスを返す
 * @param {number} [deps.debounceMs=300] - 最後のイベントからこの時間静かになったら走らせる
 * @param {number} [deps.maxWaitMs=2000] - 最初の依頼からこの時間が過ぎたら静かでなくても走らせる
 * @param {number} [deps.selfWriteGraceMs=5000] - 自分が書いた _index.scss のイベントを無視する猶予
 */
export function createScssScheduler({
  srcDir,
  paths,
  options = {},
  mainFiles,
  compile,
  reindex,
  debounceMs = 300,
  maxWaitMs = 2000,
  selfWriteGraceMs = 5000,
}) {
  const state = {
    // 次に走らせる内容
    reindexPending: false,
    allPending: false,
    filesPending: new Set(),
    firstRequestAt: null,
    // タイマーと実行状態
    timer: null,
    running: false,
    runPromise: null,
    // 自分が書いた _index.scss（絶対パス → 書いた時刻）
    selfWrites: new Map(),
    // 統計（ログとテスト用）
    runs: 0,
    coalesced: 0,
  };

  function hasPending() {
    return (
      state.reindexPending || state.allPending || state.filesPending.size > 0
    );
  }

  function clearTimer() {
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }
  }

  /** 静かになったら 1 回だけ走らせる（maxWaitMs を超えたら待たずに走らせる） */
  function arm() {
    clearTimer();
    const elapsed = Date.now() - (state.firstRequestAt ?? Date.now());
    const delay = Math.max(0, Math.min(debounceMs, maxWaitMs - elapsed));
    state.timer = setTimeout(() => {
      state.timer = null;
      void run();
    }, delay);
  }

  /**
   * コンパイルを依頼する
   * @param {Object} req
   * @param {boolean} [req.reindex] - 先に _index.scss を作り直す（パーシャルの追加・削除）
   * @param {boolean} [req.all] - すべてのメインファイルをコンパイルする（パーシャルの変更）
   * @param {string[]} [req.files] - 特定のメインファイルだけをコンパイルする
   */
  function request({ reindex = false, all = false, files = [] } = {}) {
    if (reindex) {
      state.reindexPending = true;
      // index が変わると @forward の解決が変わるので全メインを対象にする
      state.allPending = true;
    }
    if (all) {
      state.allPending = true;
    }
    for (const file of files) {
      state.filesPending.add(path.resolve(file));
    }
    if (!hasPending()) {
      return;
    }
    if (state.firstRequestAt === null) {
      state.firstRequestAt = Date.now();
    }
    if (state.running) {
      // 実行中は積むだけ。終わり際に run() が拾って次の 1 回に合流させる
      state.coalesced += 1;
      return;
    }
    arm();
  }

  /** メインファイルが消えたので対象から外す */
  function forget(file) {
    state.filesPending.delete(path.resolve(file));
  }

  /**
   * add / change イベントが「自分が書いた _index.scss」由来なら true を返して消費する
   * @param {string} filePath
   */
  function consumeSelfWrite(filePath) {
    const key = path.resolve(filePath);
    const wroteAt = state.selfWrites.get(key);
    if (wroteAt === undefined) {
      return false;
    }
    state.selfWrites.delete(key);
    return Date.now() - wroteAt <= selfWriteGraceMs;
  }

  async function runOnce() {
    // 今回の分を取り出し、pending を空にする（実行中に届いた分は次回へ）
    const reindexNow = state.reindexPending;
    const allNow = state.allPending;
    const filesNow = [...state.filesPending];
    state.reindexPending = false;
    state.allPending = false;
    state.filesPending.clear();
    state.firstRequestAt = null;

    if (reindexNow) {
      const written = (await reindex(srcDir)) || [];
      const now = Date.now();
      for (const file of written) {
        state.selfWrites.set(path.resolve(file), now);
      }
    }

    const targets = allNow ? [...mainFiles] : filesNow;
    const compiled = [];
    for (const file of targets) {
      // 実行中に削除されたメインは飛ばす
      if (!mainFiles.has(file)) continue;
      await compile(file, paths, options);
      compiled.push(file);
    }
    state.runs += 1;
    return { reindex: reindexNow, all: allNow, files: compiled };
  }

  async function run() {
    if (state.running) {
      return state.runPromise;
    }
    clearTimer();
    state.running = true;
    state.runPromise = (async () => {
      try {
        const done = await runOnce();
        Logger.log(
          'INFO',
          `SCSSの再コンパイルが完了しました: ${done.files.length}ファイル${
            done.reindex ? '（_index.scss を更新）' : ''
          }`
        );
      } catch (err) {
        Logger.log('ERROR', 'SCSSの再コンパイル中にエラーが発生しました', err);
      } finally {
        state.running = false;
        state.runPromise = null;
        // 実行中に届いた分は、また静かになるのを待ってから 1 回で流す
        if (hasPending()) {
          arm();
        }
      }
    })();
    return state.runPromise;
  }

  /** 保留中のものを今すぐ流して、実行完了まで待つ（テストと停止時用） */
  async function flush() {
    if (state.running) {
      await state.runPromise;
    }
    while (hasPending()) {
      clearTimer();
      await run();
    }
  }

  function stop() {
    clearTimer();
  }

  return {
    request,
    forget,
    consumeSelfWrite,
    flush,
    stop,
    get running() {
      return state.running;
    },
    get runs() {
      return state.runs;
    },
    get coalesced() {
      return state.coalesced;
    },
  };
}
