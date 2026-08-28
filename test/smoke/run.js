/**
 * smoke テスト
 *
 * test/dai-html を使って dai-runner を「実際に」動かし、成果物とログで検証する。
 * 単体テストでは拾えない、プロセス起動・設定解決・ファイル監視・Browsersync の
 * つなぎ目を確認するのが目的。リリース（タグ）前に必ず通す（npm run check）。
 *
 * 流れ：
 *   1. 本番ビルド（npm run build）→ build 設定どおりの成果物か
 *   2. 開発サーバー（npm run dev）を起動し、SCSS 変更／パーシャル追加／JS 変更／画像追加／削除を
 *      順に発生させ、成果物が追従するか
 *   3. 触ったファイルを元に戻し、test/dai-html の git 作業ツリーがクリーンか
 *
 * 使い方：npm run smoke（CI でも同じ）
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);
const PROJ = path.join(ROOT, 'test/dai-html');
const rel = (p) => path.relative(ROOT, p);

// ---------------------------------------------------------------- helpers
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(
    `${ok ? '  ok ' : ' NG  '} ${name}${detail && !ok ? `  — ${detail}` : ''}`
  );
  return ok;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function exists(p) {
  return fs.access(p).then(
    () => true,
    () => false
  );
}

async function readOr(p, fallback = '') {
  return fs.readFile(p, 'utf8').catch(() => fallback);
}

/** 条件が true になるまで待つ（タイムアウトで false） */
async function waitFor(cond, { timeout = 20000, interval = 250 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await cond()) {
      return true;
    }
    await sleep(interval);
  }
  return false;
}

/** コマンドを実行して終了を待つ（stdout/stderr は結合して返す） */
function run(cmd, args, { cwd = PROJ } = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd,
      env: { ...process.env, FORCE_COLOR: '0' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (out += d));
    child.on('close', (code) => resolve({ code, out }));
  });
}

/** 長時間走るコマンドを別プロセスグループで起動し、ログを溜める */
function start(cmd, args, { cwd = PROJ } = {}) {
  const child = spawn(cmd, args, {
    cwd,
    env: { ...process.env, FORCE_COLOR: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });
  const state = { child, log: '' };
  child.stdout.on('data', (d) => (state.log += d));
  child.stderr.on('data', (d) => (state.log += d));
  /** プロセスグループに生きているプロセスが残っているか */
  const groupAlive = () => {
    try {
      process.kill(-child.pid, 0);
      return true;
    } catch {
      return false;
    }
  };
  state.stop = async () => {
    // npm → bin → scripts/dev.js の親子をまとめて止める。
    // SIGTERM で自力終了できるか（後始末がハングしないか）を記録し、残っていれば SIGKILL
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      /* 既に終了 */
    }
    state.exitedGracefully = !(await waitFor(() => !groupAlive(), {
      timeout: 3000,
      interval: 100,
    }))
      ? false
      : true;
    if (!state.exitedGracefully) {
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch {
        /* 既に終了 */
      }
    }
  };
  return state;
}

// ---------------------------------------------------------------- 対象ファイル
const files = {
  css: path.join(PROJ, 'public/assets/css/style.css'),
  cssMap: path.join(PROJ, 'public/assets/css/style.css.map'),
  js: path.join(PROJ, 'public/assets/js/main.js'),
  webp: path.join(PROJ, 'public/assets/images/top/sample-mv.webp'),
  svg: path.join(PROJ, 'public/assets/images/test-optimization.svg'),
  // dev シナリオで触るもの
  partial: path.join(PROJ, 'source/scss/modules/_m-title.scss'),
  index: path.join(PROJ, 'source/scss/modules/_index.scss'),
  newPartial: path.join(PROJ, 'source/scss/modules/_smoke-b.scss'),
  mainJs: path.join(PROJ, 'source/js/main.js'),
  srcPng: path.join(PROJ, 'source/images/top/sample-mv.png'),
  newPng: path.join(PROJ, 'source/images/top/smoke-d.png'),
  newWebp: path.join(PROJ, 'public/assets/images/top/smoke-d.webp'),
  newPngDist: path.join(PROJ, 'public/assets/images/top/smoke-d.png'),
};

// ---------------------------------------------------------------- 1. 本番ビルド
async function ensureDeps() {
  if (await exists(path.join(PROJ, 'node_modules/@dai-works/dai-runner'))) {
    return;
  }
  console.log('test/dai-html の依存をインストールします（初回のみ）...');
  const { code, out } = await run('npm', [
    'ci',
    '--no-audit',
    '--no-fund',
    '--ignore-scripts',
  ]);
  if (code !== 0) {
    console.error(out);
    throw new Error('test/dai-html の依存インストールに失敗しました');
  }
}

async function smokeBuild(buildConf) {
  console.log('\n[1/3] 本番ビルド');
  const { code, out } = await run('npm', ['run', 'build']);
  check(
    'npm run build が成功する',
    code === 0,
    out.split('\n').slice(-15).join('\n')
  );
  if (code !== 0) {
    return;
  }

  const css = await readOr(files.css);
  const cssOpt = buildConf.options.css;
  check('style.css が生成される', css.length > 0);
  if (cssOpt.sourceMap) {
    check(
      'build.css.sourceMap=true → .map と sourceMappingURL がある',
      (await exists(files.cssMap)) && /sourceMappingURL/.test(css)
    );
  } else {
    check(
      'build.css.sourceMap=false → .map も sourceMappingURL も無い',
      !(await exists(files.cssMap)) && !/sourceMappingURL/.test(css),
      `map=${await exists(files.cssMap)} annotation=${/sourceMappingURL/.test(css)}`
    );
  }
  if (cssOpt.minify) {
    check(
      'build.css.minify=true → CSS が圧縮されている',
      css.split('\n').length <= 2,
      `${css.split('\n').length} 行`
    );
  } else {
    check(
      'build.css.minify=false → CSS が展開されている',
      css.split('\n').length > 2
    );
  }

  const js = await readOr(files.js);
  check(
    'main.js がバンドルされる（bare import が無い）',
    js.length > 0 && !/^\s*import\s/m.test(js)
  );
  if (buildConf.options.js.dropConsole) {
    check(
      'build.js.dropConsole=true → console.* が無い',
      !/console\./.test(js)
    );
  }

  if (buildConf.options.images.convertToWebp) {
    check('画像: PNG から WebP が生成される', await exists(files.webp));
  }
  check('画像: SVG がコピーされる', await exists(files.svg));
}

// ---------------------------------------------------------------- 2. 開発サーバー
async function smokeDev() {
  console.log('\n[2/3] 開発サーバー（ファイル監視）');
  const dev = start('npm', ['run', 'dev']);
  try {
    const ready = await waitFor(() => /Browsersync|Local:|UI:/.test(dev.log), {
      timeout: 90000,
    });
    check(
      'npm run dev が起動し Browsersync が待ち受ける',
      ready,
      dev.log.split('\n').slice(-15).join('\n')
    );
    if (!ready) {
      return;
    }
    await sleep(3000); // watcher が落ち着くまで

    // A. 既存パーシャルの変更 → 再コンパイル
    await fs.appendFile(files.partial, '\n.smoke-a {\n  color: red;\n}\n');
    check(
      'A. パーシャル変更 → style.css に反映',
      await waitFor(async () => (await readOr(files.css)).includes('.smoke-a'))
    );

    // F. パーシャルを壊す → エラーオーバーレイ → 修正で通常のCSSへ戻る
    // （この区間のコンパイルエラーは意図したものなので、最後の「ログにエラーが無い」判定から除外する）
    const fStart = dev.log.length;
    const brokenPartial = await fs.readFile(files.partial, 'utf8');
    const braceIndex = brokenPartial.lastIndexOf('}');
    await fs.writeFile(
      files.partial,
      braceIndex >= 0
        ? `${brokenPartial.slice(0, braceIndex)}${brokenPartial.slice(braceIndex + 1)}`
        : `${brokenPartial}\n.invalid {`
    );
    check(
      'F. 壊れたパーシャル → style.css に SCSS エラーが表示される',
      await waitFor(async () =>
        (await readOr(files.css)).includes('SCSS エラー')
      )
    );
    await fs.writeFile(files.partial, brokenPartial);
    check(
      'F. パーシャル修正 → SCSS エラーが消え .smoke-a が戻る',
      await waitFor(async () => {
        const css = await readOr(files.css);
        return !css.includes('SCSS エラー') && css.includes('.smoke-a');
      })
    );
    await sleep(500); // 遅れて出るスタックトレース行まで F の区間に含める
    const fEnd = dev.log.length;

    // B. パーシャル追加 → _index.scss が更新され、CSS に反映
    await fs.writeFile(files.newPartial, '.smoke-b {\n  color: blue;\n}\n');
    check(
      'B. パーシャル追加 → _index.scss に @forward が追加される',
      await waitFor(async () =>
        (await readOr(files.index)).includes('@forward "smoke-b"')
      )
    );
    check(
      'B. パーシャル追加 → style.css に反映',
      await waitFor(async () => (await readOr(files.css)).includes('.smoke-b'))
    );

    // C. JS の変更 → 再バンドル
    await fs.appendFile(files.mainJs, '\nwindow.__smokeC = 1;\n');
    check(
      'C. JS 変更 → main.js が再バンドルされる',
      await waitFor(async () => (await readOr(files.js)).includes('__smokeC'))
    );

    // D. 画像の追加 → WebP 生成
    await fs.copyFile(files.srcPng, files.newPng);
    check(
      'D. 画像追加 → WebP が生成される',
      await waitFor(() => exists(files.newWebp), { timeout: 30000 })
    );

    // E. 削除 → 生成物も消える
    await fs.rm(files.newPartial);
    await fs.rm(files.newPng);
    check(
      'E. パーシャル削除 → _index.scss と style.css から消える',
      await waitFor(
        async () =>
          !(await readOr(files.index)).includes('smoke-b') &&
          !(await readOr(files.css)).includes('.smoke-b')
      )
    );
    check(
      'E. 画像削除 → 生成物（png / webp）が消える',
      await waitFor(
        async () =>
          !(await exists(files.newWebp)) && !(await exists(files.newPngDist))
      )
    );

    const errors = (dev.log.slice(0, fStart) + dev.log.slice(fEnd))
      .split('\n')
      .filter((l) => /エラー|Error:|ERR_/.test(l));
    check(
      'dev のログにエラーが無い（F で意図的に起こしたものを除く）',
      errors.length === 0,
      errors.slice(0, 5).join('\n')
    );
  } finally {
    await dev.stop();
    check(
      'SIGTERM から 3 秒以内に dev のプロセスツリーが終了する（後始末がハングしない）',
      dev.exitedGracefully === true
    );
  }
}

// ---------------------------------------------------------------- 3. 後片付け
/** test/dai-html の git 状態（未コミット変更の一覧）。smoke 前後で一致すれば触ったものを戻せている */
async function gitStatus() {
  const { code, out } = await run(
    'git',
    ['status', '--porcelain', '--', PROJ],
    { cwd: ROOT }
  );
  return code === 0 ? out.trim() : null;
}

async function restore(snapshot, statusBefore) {
  console.log('\n[3/3] 後片付け');
  for (const [p, content] of Object.entries(snapshot)) {
    await fs.writeFile(p, content);
  }
  await fs.rm(files.newPartial, { force: true });
  await fs.rm(files.newPng, { force: true });
  await fs.rm(files.newWebp, { force: true });
  await fs.rm(files.newPngDist, { force: true });

  const statusAfter = await gitStatus();
  if (statusBefore !== null && statusAfter !== null) {
    check(
      'test/dai-html の git 状態が smoke の前後で変わらない（触ったファイルを戻せている）',
      statusAfter === statusBefore,
      `before:\n${statusBefore}\nafter:\n${statusAfter}`
    );
  }
}

// ---------------------------------------------------------------- main
async function main() {
  console.log(`smoke: ${rel(PROJ)} で本番ビルドと開発サーバーを実行します`);
  await ensureDeps();

  const { config } = await import(
    pathToFileURL(path.join(PROJ, 'dai-runner.config.js')).href
  );
  const buildConf = config.get('build');

  const snapshot = {
    [files.partial]: await fs.readFile(files.partial, 'utf8'),
    [files.mainJs]: await fs.readFile(files.mainJs, 'utf8'),
    [files.index]: await fs.readFile(files.index, 'utf8'),
  };
  const statusBefore = await gitStatus();

  try {
    await smokeBuild(buildConf);
    await smokeDev();
  } finally {
    await restore(snapshot, statusBefore);
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} 件成功`);
  if (failed.length > 0) {
    console.log('失敗:');
    for (const f of failed) {
      console.log(`  - ${f.name}`);
    }
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
