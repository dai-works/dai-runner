# 変更履歴

このプロジェクトの主な変更内容を記録します。

このフォーマットは [Keep a Changelog](https://keepachangelog.com/ja/1.0.0/)
に基づいており、バージョニングは [Semantic Versioning](https://semver.org/lang/ja/) に従います。

## [2.0.1] - 2026-08-29

### 修正

- bundle モードの監視中に JavaScript モジュールを削除した際、残ったエントリーポイントを再バンドルし、削除前のコードが成果物に残らないよう修正
- Windows 形式のパス区切りを POSIX 形式へ統一し、クリーンアップの除外判定と glob のパターンが OS に依存しないよう修正

### 内部

- CSS・JavaScript・画像・クリーンアップ・sitemap・キャッシュの一時ディレクトリを使った統合テストを追加
- キャッシュ設定のハッシュ計算で、入れ子を含むオブジェクトのキー順を再帰的に正規化

## [2.0.0] - 2026-08-29

### 破壊的変更

- **対応 Node.js を `>=20.19.0` に引き上げ**（chokidar 5 と sass の要件。Node
  18 は EOL のため切る）。`precheck` が起動時に確認し、満たさなければ止まる

### セキュリティ

- `npm audit`（本番依存）を 17 件（high 14 / moderate 3）から 3 件に削減。直接依存の `postcss` /
  `rollup` / `sharp` / `svgo` の脆弱性は解消。残る 3 件はすべて開発サーバー（browser-sync
  3.0.4）が固定している `immutable` 3.x 由来で、公式の修正は browser-sync
  1.9 へのダウングレードのため見送り（本番成果物には含まれない）

### 変更

- **本番 CSS の宣言の並び順がソース順になる**（cssnano
  6 はプロパティをアルファベット順に並べ替えていたが、7 以降はその機能を持たない）。セレクタ・宣言の内容・ルールの順序は同一で、dev ビルド（非圧縮）は元からソース順のため、本番と dev の差はむしろ減る。更新前後の成果物を「ルール内の宣言をソートして比較」し、並び順と
  `rgb(... / 0.5)` の空白、データ URI 内 SVG の表記（percent エンコード・`viewBox`
  保持）以外に差が無いことを確認済み
- svgo 4 は `preset-default` から `removeTitle` を外したため、従来どおり `<title>`
  を除去するよう明示（SVG 出力は更新前とバイト一致）
- sharp 0.35 で PNG のエンコード結果が数バイト変わる（テストでは 3972 → 3979 バイト。WebP は一致）
- chokidar 5 は glob を受け付けないため、SCSS / JS
  / 画像の監視を「ディレクトリ監視＋拡張子フィルタ」に変更（監視対象・挙動は同じ。ドット始まりは除外）
- `archiver` 8 の API 変更（`ZipArchive` クラス）に追従。`dai-runner package --zip`
  の回帰テストを追加
- `inquirer` を依存から外し、`precheck` の対話を Node 標準の `readline/promises`
  に置換（非 TTY では既定値で進む）。全案件の `node_modules` が軽くなる
- cssnano 系は 8 系まで（9 系は Node `^22.22.3`
  を要求するため見送り）。chalk は 5 系のまま（6 系は Node 22 必須で利点なし）

### 依存の更新（本番）

- archiver 7.0.1 → 8.0.0
- autoprefixer 10.4.22 → 10.5.4
- chokidar 3.6.0 → 5.0.0
- cssnano 6.1.2 → 8.0.10
- glob 12.0.0 → 13.0.6
- picomatch 4.0.4 → 4.0.7
- postcss 8.5.6 → 8.5.26
- postcss-discard-duplicates 6.0.3 → 8.0.4
- postcss-normalize-charset 6.0.2 → 8.0.5
- postcss-sort-media-queries 5.2.0 → 6.7.1
- rollup 4.53.2 → 4.63.1
- sass 1.94.0 → 1.103.1
- sharp 0.33.5 → 0.35.4
- svgo 3.3.2 → 4.1.0
- terser 5.44.1 → 5.51.2

### 依存の更新（開発）

- @eslint/js 9.39.1 → 10.0.1
- eslint 9.39.1 → 10.9.1
- eslint-config-prettier 9.1.2 → 10.1.8
- globals 15.15.0 → 17.11.0
- prettier 3.7.4 → 3.9.6

## [1.12.0] - 2026-08-28

### 追加

- 開発監視中の SCSS / JavaScript エラーをブラウザ上に表示するオーバーレイを追加
- `precheck` に Node.js バージョンとソースパスの確認を追加。`dai-runner dev / build / package`
  は設定ファイルの有無に関わらず毎回 precheck を通し、Node.js が要件を満たさなければ起動しない

### 変更

- 画像キャッシュがファイルサイズと更新日時を先に確認し、不要なハッシュ計算を省略するよう変更
- 並列ビルドが全タスクの完了を待ってから失敗をまとめて報告するよう変更

### 内部

- 開発時エラー表示、画像キャッシュ、precheck、並列実行の回帰テストを追加

## [1.11.0] - 2026-08-28

### 修正

- 画像キャッシュの共有と保存の直列化により、監視中の同時更新で manifest が欠落する問題を修正
- 画像削除時にキャッシュの manifest からもエントリを削除するよう修正

### 変更

- 設定読み込みを `loadConfig` に一本化し、環境別の解決済み設定を各タスクへ渡すよう変更
- CSS・JavaScript・画像・パッケージングの既定値を `utils/defaults.js` に集約
- `startServer(config)` は解決済み設定を引数で受けるよう変更（プログラマティック利用時は
  `loadConfig()` の戻り値を渡す。CLI 利用には影響なし）
- `index.js` から `loadConfig` を export

### 内部

- watcher 生成と CSS 出力パス計算を共通ユーティリティへ統合
- 設定、既定値、キャッシュ競合、削除処理の回帰テストを追加

## [1.10.4] - 2026-08-28

### 修正

- Error を含むログでスタックトレースを表示し、ログのプレフィックスを `[dai-runner]` に修正
- `SUCCESS` ログをログレベルの判定対象に追加
- 開発終了時に watcher と Browsersync を確実に停止し、CLI の終了コードを子プロセスから引き継ぐよう修正
- sitemap.xml が本番ビルド時のみ生成されるよう修正
- Sass 依存パッケージ由来の deprecation 警告を抑制

### 変更

- 画像の処理済みスキップログを DEBUG に変更
- `watchOptions.ignored` を設定例と開発サーバーに追加
- `test/dai-html` の設定を現行の設定例に追従

### 内部

- sitemap の生成制御と Logger の回帰テストを追加。smoke に「SIGTERM から 3 秒以内に終了する」判定を追加
- smoke テスト `npm run smoke`（`test/smoke/run.js`）を追加。`test/dai-html`
  で本番ビルドと開発サーバーを実際に動かし、設定の反映と SCSS / JS / 画像の監視追従を検証する
- `npm run check`（lint → 整形チェック → 単体テスト →
  smoke）を追加し、リリース手順（`.cursor/rules/versioning.mdc`）をこれに一本化。手書きの
  `test/dai-html/TEST_REPORT.md` は廃止
- GitHub Actions（`.github/workflows/check.yml`）で push / PR ごとに `npm run check` を実行
- リポジトリ直下に `CLAUDE.md`（変更時の約束事）を追加

## [1.10.3] - 2026-08-28

### 修正

- **監視中に「画像を追加 → 直後に削除／リネーム」するとエラーログが出ていた問題を修正**
  - イベント処理が始まる前にファイルが消えていると、ハッシュ計算で ENOENT の WARN を出していた（動作自体は正常。CI の smoke が検出）。処理前に実体を確認して静かにスキップする

### 内部

- smoke テスト `npm run smoke`（`test/smoke/run.js`）を追加。`test/dai-html`
  で本番ビルドと開発サーバーを実際に動かし、設定の反映と SCSS / JS / 画像の監視追従を検証する
- `npm run check`（lint → 整形チェック → 単体テスト →
  smoke）を追加し、リリース手順（`.cursor/rules/versioning.mdc`）をこれに一本化。手書きの
  `test/dai-html/TEST_REPORT.md` は廃止
- GitHub Actions（`.github/workflows/check.yml`）で push / PR ごとに `npm run check` を実行
- リポジトリ直下に `CLAUDE.md`（変更時の約束事）を追加

## [1.10.2] - 2026-08-28

### 修正

- **本番ビルドが開発用の CSS 設定で走っていた問題を修正**
  - `compileCss` / `minifyJs`
    が引数の options を無視してグローバル config を env 無指定で読んでいたため、 `npm run build`
    でも `dev.options.css` が使われ、本番 CSS に `.map` と `sourceMappingURL` が出ていた
  - 呼び出し元（buildCss / watchCss / buildJs /
    watchJs）が dev/build を解決した options をそのまま使うよう変更
- **`_index.scss` の自動生成が手書きファイルを上書きしていた問題を修正**
  - 存在判定の式が常に true で毎回上書きしていた。生成ヘッダ（`// <dir> styles`）で始まるファイルだけ内容が変わった時に更新し、手書きのものは WARN を出して触らない
  - 同内容なら書き直さないので、watch 中の無駄な再コンパイルも減る
- **開発監視中に `minify: true` にするとバンドルが壊れていた問題を修正**
  - watchJs が bundle 後に未バンドルの source を圧縮して dist を上書きしていた。build と同じく bundleJs に minify を渡す
- **`dai-runner package --zip`
  が書き込みエラー時に固まる問題を修正**（出力ストリームの error を reject）
- **`index.js` が存在しない `./config.js` を re-export していて `import` できなかった問題を修正**
  - あわせて `CacheManager` / `buildSitemap` / `generateSitemap` / `packageTheme` を export
- **ファイル監視の耐障害性を改善**
  - 3 つの watcher に `error` ハンドラを追加（inotify 上限などで黙って監視が死なない）
  - watchCss のハンドラ例外で dev サーバーごと落ちないよう try/catch を追加
  - 画像監視に `awaitWriteFinish` を追加（コピー途中の画像を読まない）

### 内部

- `node:test` による自動テストを追加（`npm test`、`test/unit/`）。上記の回帰テストを含む
- watchJs の add / change に重複していた処理を 1 つに統合

## [1.10.1] - 2026-08-28

### 修正

- **開発サーバーがドット始まりのディレクトリや node_modules 内のファイル変更でリロードしてしまう問題を修正**
  - Browsersync の監視対象が `**/*.php` / `**/*.html` の広いグロブだったため、 `.ftp/`
    のバックアップや `node_modules/` 内の PHP を拾って不要なリロードが起きていた
  - `watchOptions.ignored` にドット始まりのパス（`.ftp` / `.git` / `.dai-runner` など）と
    `node_modules` を既定で追加。`dai-runner.config.js` の `watchOptions.ignored`
    で案件ごとに除外パターンを追加できる

### 変更

- **`images.convertToAvif` の既定値を `true` から `false` に変更**
  - AVIF は機能として残すが、`<picture>` の AVIF 対応を用意した案件だけ明示的に有効化する
  - 1.10.0 はタグ未発行のため、この変更で挙動が変わる既存案件はない

## [1.10.0] - 2026-07-02

### 追加

- **ラスター画像から AVIF を自動生成する機能を追加**
  - JPG/PNG/WebP から、WebP に加えて AVIF（`.avif`）も生成する
  - `<picture>` の最上段 `<source type="image/avif">` で配信でき、対応ブラウザは AVIF、非対応は WebP
    → 元画像へフォールバックできる
  - `dai-runner.config.js` の `images.convertToAvif`（既定 `true`）で切り替え、
    `images.avifQuality`（既定 60）で画質を指定。AVIF は WebP より高効率なため、WebP quality
    80 と同等の見た目をより小さいサイズで得られる 60 を既定にした
  - キャッシュ（`CacheManager`）が AVIF の存在も差分判定に含め、AVIF だけ欠けても再生成する
  - 孤立画像削除（`cleanOrphans`）が AVIF を期待セットに含め、誤削除しない
  - 開発監視（`watchImages`）の unlink で `.avif` も削除する

### 内部

- `CacheManager.markProcessed` に第5引数 `avifPath` を追加し、マニフェストに保存
- `CacheManager.shouldProcessFile` に AVIF 存在チェックを記録ベースで追加（旧マニフェスト互換あり）
- `CleanupManager.buildExpectedDistSet` / `cleanImageOrphans` に `convertToAvif` を追加
- `optimizeImages` の重複していたキャッシュ設定オブジェクトをループ外の単一 `cacheOptions` に集約

## [1.9.1] - 2026-06-04

### 修正

- **拡張子と中身が食い違う画像でキャッシュが毎回再処理される不具合を修正**
  - 中身が JPEG なのに拡張子が `.png` などのファイルで、WebP の出力先パスを
    `distPath.replace(/\.(jpg|jpeg)$/i, '.webp')`
    のように拡張子限定で導出していたため置換が効かず、本来の `.webp` が生成されないままだった
  - その結果、キャッシュの WebP 存在チェックが毎回失敗し、`useCache: true` でも該当ファイルが
    `npm run dev` のたびに再最適化されていた
  - WebP の出力先を拡張子非依存（`/\.[^.]+$/i` → `.webp`）で導出するよう変更
  - 生成した WebP のパスをキャッシュマニフェスト（`webpPath`）に記録し、存在チェックを「拡張子からの推測」ではなく「実際に生成したパス」に基づいて行うよう変更。これにより中身が SVG 等で WebP を生成しないファイルでも誤って再処理し続けることがなくなった
  - 旧マニフェスト（`webpPath` 未記録）との後方互換を維持

### 内部

- `CacheManager.markProcessed` に第4引数 `webpPath` を追加し、マニフェストに保存
- `CacheManager.shouldProcessFile` の WebP 存在チェックを記録ベースに変更

## [1.9.0] - 2026-05-03

### 追加

- **`dai-runner package` コマンドを追加**
  - 本番アップロード用に必要なファイルだけを 1 つのフォルダ（デフォルト
    `dist/theme/`）にまとめる CLI サブコマンド
  - WordPress テーマ案件で `source/` `node_modules/` `docs/` などを毎回手動で除外する手間を解消
  - `--zip` フラグで `dist/theme.zip` も同時生成
  - デフォルトの include: `assets/**`, `includes/**`, `template-parts/**`, `page-parts/**`, `*.php`,
    `style.css`, `screenshot.png`
  - デフォルトの exclude: `page-snippets.php`, `**/.DS_Store`, `**/Thumbs.db`,
    `**/*:Zone.Identifier`
  - `dai-runner.config.js` の `package` キーで `outputDir` / `zip` / `zipName` /
    `include`（上書き）/ `exclude`（追加）をカスタマイズ可能
  - 出力前に `outputDir` 配下は毎回クリーンアップ（`dist/` 自体は残す）
- 依存追加: `archiver` (zip 生成), `picomatch` (exclude パターンマッチング)

### 内部

- `tasks/package/packageTheme.js` にパッケージング本体を実装
- `scripts/package.js` を CLI エントリポイントとして追加
- `bin/dai-runner.js` で `package` コマンドと `--zip` フラグの転送をサポート

## [1.8.0] - 2026-04-28

### 追加

- **`cleanup.cleanOrphans` オプションを追加**
  - 画像キャッシュ有効時（`useCache: true`）でも、`source` 側に存在しない `dist`
    の画像（孤立ファイル）を削除できるようにした
  - 従来は `useCache: true`
    の場合に画像 dist ディレクトリ全体がクリーンアップから除外され、source から消した画像が dist に残り続ける問題があった
  - `dai-runner.config.js` の `cleanup.cleanOrphans: true` で有効化（デフォルトは `false`
    で従来挙動を維持）
  - WebP 自動変換（`convertToWebp: true`）にも対応し、jpg/jpeg/png に対応する `.webp`
    ファイルも適切に保持・削除される
  - `cleanup.excludeFiles` に列挙したファイルは孤立判定からも除外される

### 内部

- `CleanupManager` に以下のヘルパーメソッドを追加
  - `listFilesRecursive(dir, baseDir)` - ディレクトリ配下の相対パス一覧を取得
  - `buildExpectedDistSet(srcRelativePaths, convertToWebp)` -
    src から期待される dist パスの Set を構築
  - `cleanImageOrphans({ srcDir, distDir, convertToWebp, excludeFiles })` - 孤立画像のみを削除
  - `removeEmptySubdirs(dir)` - 起点ディレクトリ自身は残しつつ配下の空ディレクトリを削除

## [1.7.0] - 2026-02-05

### 追加

- **sitemap.xml自動生成機能**
  - 本番ビルド時にHTMLファイルから自動的にsitemap.xmlを生成
  - `dai-runner.config.js`の`sitemap`セクションで設定可能
  - HTMLファイルを自動収集してURLリストを生成
  - トップページの優先度を自動的に1.0に設定
  - 除外パターンによる柔軟なフィルタリング（404ページ、テストページなど）
  - 本番URL、優先度、更新頻度などをカスタマイズ可能
  - デフォルト設定: 優先度0.5、更新頻度weekly
  - **カスタム優先度設定**: `customPriorities`で特定のページに個別の優先度を設定可能
    - 重要なページ（サービス、商品、会社概要など）を0.8に設定
    - ブログ記事などを0.3に設定するなど、柔軟な優先度管理が可能

### 改善

- **設定ファイルの拡張**
  - `dai-runner.config.js.example`にsitemap設定セクションを追加
  - 本番ビルド時のみsitemap生成を有効にする設定例を追加

## [1.6.1] - 2025-12-04

### 修正

- **JavaScript sourceMap生成機能の修正**
  - `sourceMap: true` 設定時にJavaScriptの.mapファイルが正しく生成されるように修正
  - `minify`、`dropConsole`、`sourceMap` を併用した際も正常に動作するように改善
  - `tasks/js/bundleJs.js` でRollup生成のsourceMapをTerserに正しく渡すように修正
  - `tasks/js/buildJs.js` でminify処理を統合し、重複を解消

### 改善

- **テスト環境の整備**
  - `test/dai-html/TEST_REPORT.md` を作成し、全設定項目の動作テストを実施
  - すべての設定項目（10/10項目）が正常に動作することを確認

## [1.6.0] - 2025-12-04

### 追加

- **コードフォーマット環境の整備**
  - ESLint 設定ファイル（`eslint.config.js`）を追加
    - モダンな flat config 形式を採用
    - Node.js 環境用の推奨ルールを設定
    - 未使用変数の警告、シングルクォート、セミコロン必須などのルールを適用
  - Prettier 設定ファイル（`.prettierrc.json`）を追加
    - JavaScript、JSON、Markdown 用のフォーマット設定
    - シングルクォート、セミコロン必須、末尾カンマなどの統一されたスタイル
  - EditorConfig（`.editorconfig`）を追加
    - エディタ間の一貫性を確保（インデント、改行コードなど）
  - `.prettierignore` を追加
    - test フォルダやビルド成果物を除外
- **npm スクリプトの追加**
  - `npm run lint` - ESLint でコードチェック
  - `npm run lint:fix` - ESLint で自動修正
  - `npm run format` - Prettier で自動フォーマット
  - `npm run format:check` - Prettier でフォーマットチェック
- **README に開発者向けセクションを追加**
  - コードフォーマットの使用方法を記載
  - 設定ファイルの説明を追加

### 改善

- **コード品質の向上**
  - プロジェクト全体を ESLint と Prettier でフォーマット
  - 未使用変数の警告を修正（`_`プレフィックスを追加）
  - コードスタイルの統一

### 変更

- **devDependencies の追加**
  - `@eslint/js`: ^9.17.0
  - `eslint`: ^9.17.0
  - `eslint-config-prettier`: ^9.1.0
  - `globals`: ^15.14.0
  - `prettier`: ^3.4.2

## [1.5.0] - 2025-12-04

### 追加

- **build 時の console.log 削除機能**
  - 本番ビルド時に`console.log`、`console.info`、`console.warn`、`console.error`などの console 出力を自動削除する機能を追加
  - `dai-runner.config.js`の`build.options.js.dropConsole`オプションで制御可能（デフォルト: true）
  - 開発環境では`dev.options.js.dropConsole`で制御可能（デフォルト: false）
  - Terser の`drop_console`オプションを使用して実装
  - バンドル処理と minify 処理の両方で動作
  - プロダクションコードのファイルサイズ削減とデバッグ情報の除外に貢献

### 修正

- **本番ビルドで正しい設定が適用されない問題を修正**
  - `scripts/build.js`で`config.get()`を`config.get('build')`に修正
  - これにより本番環境の設定（`build`セクション）が正しく適用されるようになりました
- **minify: false でも意図せず圧縮される問題を修正**
  - `dropConsole: true`使用時に、Terser のデフォルト圧縮が適用されていた問題を修正
  - `compress.defaults: false`を設定し、console.log 削除のみを実行するように改善
  - `dead_code: true`と`side_effects: true`を追加し、console.log 削除後の不要なコード（`void 0;`など）も綺麗に削除
  - `format.beautify: true`でコードの整形を保持し、`minify: false`の設定を正しく反映

### 改善

- **画像キャッシュ設定を環境別に分離**
  - `images.useCache`を共通設定から`dev.options.images`と`build.options.images`に移動
  - 開発環境: `useCache: true`（高速化のためキャッシュを使用）
  - 本番環境: `useCache: false`（全ての画像を確実に処理）
  - 環境に応じた最適な設定が自動的に適用されるようになりました

## [1.4.4] - 2025-11-21

### 改善

- **Traefik ホスト名の初期値を自動推測**
  - `.env` ファイルから `COMPOSE_PROJECT_NAME` を読み取り、自動的に `.localhost`
    を付けて初期値として表示
  - `.env` ファイルがない場合や `COMPOSE_PROJECT_NAME`
    が設定されていない場合は、ディレクトリ名から自動生成（例: `dai-html` → `dai-html.localhost`）
  - ユーザーは初期値をそのまま使用するか、必要に応じて変更可能
  - 初回セットアップ時の手間を大幅に削減

## [1.4.3] - 2025-11-21

### 修正

- **インタラクティブ設定画面が表示されない問題を修正**
  - `dai-runner.config.local.js`
    が存在しない場合に、初回セットアップ時の設定画面が表示されない問題を修正
  - `bin/dai-runner.js` で `dai-runner.config.local.js` の存在チェックを追加
  - `dai-runner dev` または `dai-runner build`
    コマンド実行時に確実に設定ファイルの確認が行われるようになりました

## [1.4.2] - 2025-11-19

### 修正

- **CleanupManager.js の不要なコード削除**
  - v1.4.0 で削除した`documents`, `fonts`, `videos`, `vendor`のパス参照が残っていたのを削除
  - クリーンアップ対象を`images`, `js`, `css`の 3 つに完全に限定

## [1.4.1] - 2025-11-18

### セキュリティ

- **glob パッケージのセキュリティ脆弱性を修正**
  - glob を v10.3.12 から v12.0.0 にアップグレード
  - GHSA-5j98-mcp5-4vw2 (Command injection via -c/--cmd) を修正
  - 既存コードとの互換性を確認済み

## [1.4.0] - 2025-11-18

### 削除

- **静的ファイルのコピー機能を削除**
  - `copyFiles` と `watchCopy` 機能を完全に削除
  - `dai-runner.config.js.example` から `documents`, `fonts`, `videos`, `vendor` のパス設定を削除
  - `tasks/misc/` ディレクトリを削除
  - ツールの責務を「SCSS、JavaScript、画像の処理」に限定

### 改善

- **設定ファイルのシンプル化**
  - 不要なパス設定を削除し、コアな機能に集中
  - 設定ファイルがより理解しやすく、保守しやすくなりました

### 理由

- フォント、動画、ドキュメントなどの静的ファイルは、通常ビルドプロセスに含める必要がない
- 必要な場合は手動でコピーするか、別のツールを使用する方がシンプル
- ツールの焦点を明確にすることで、保守性と使いやすさが向上

## [1.3.0] - 2025-11-17

### 追加

- **メイン設定ファイルの自動作成機能**
  - `dai-runner.config.js` が存在しない場合、`dai-runner.config.js.example`
    から自動的にコピーして作成
  - 初回実行時の設定ファイル不足エラーを防止
  - `precheck.js` スクリプトに自動作成処理を追加

### 改善

- **初回セットアップの体験向上**
  - `npm run dev` 実行時に必要なファイルがすべて自動生成されるようになりました
  - 手動でファイルをコピーする手間が不要に

## [1.2.3] - 2025-11-17

### 改善

- **設定ファイルのドキュメント改善**
  - `dai-runner.config.js` のコメントを `dai-runner.config.js.example` と同等の詳細度に統一
  - 各設定項目の説明、使用例、JSDoc コメントを追加
  - 設定ファイルの保守性と可読性が向上

## [1.2.2] - 2025-11-17

### 改善

- **キャッシュディレクトリの構造改善**
  - キャッシュディレクトリを `.dai-runner-cache` から `.dai-runner/cache` に変更
  - 将来的な拡張性を考慮した構造に改善（ログ、一時ファイルなども整理可能）
  - プロジェクトルートがより整理された状態を維持できるように改善

### 注意事項

- 既存のキャッシュディレクトリ `.dai-runner-cache/` は手動で削除可能です
- 次回ビルド時に新しい `.dai-runner/cache` ディレクトリが自動生成されます

## [1.2.1] - 2025-11-16

### 改善

- **設定ファイル生成の最適化**
  - `precheck.js` が `dai-runner.config.local.js.example` をコピーして生成する方式に変更
  - example ファイルが単一の真実の源泉となり、保守性が向上
  - 静的サイトモードの場合は example ファイルをそのままコピー
- **選択肢の順番を改善**
  - 最も一般的な「静的ファイルのみ (server)」を一番上に配置
  - 選択しやすい UI/UX 改善
- **用語の統一**
  - 「外部 WordPress」を「外部サーバー」に変更（より汎用的に）

### 修正

- 静的サイトモードでローカル設定ファイルが不要な場合も、2 回目以降の起動で質問されない改善

## [1.2.0] - 2025-11-16

### 追加

- **設定ファイルの分離機能**: チーム共有設定と個人設定を分離できるようになりました
  - `dai-runner.config.js`: チーム共有設定（Git 管理対象）
  - `dai-runner.config.local.js`: 個人の proxy 設定など（Git 管理対象外）
  - `dai-runner.config.local.js.example`: 新規メンバー向けテンプレート
- **自動設定生成の改善**: 初回実行時に `dai-runner.config.local.js` を自動生成
  - 開発環境タイプ（Traefik/外部 WordPress/静的ファイル）の選択
  - 選択に応じた最適な proxy 設定の自動生成
- **mode 設定のローカル化**: 開発環境のモード（server/proxy）を個人設定で切り替え可能に

### 変更

- `.gitignore`: `dai-runner.config.js` から `dai-runner.config.local.js` に変更
- `precheck.js`: ローカル設定ファイルの生成に対応
- NPM パッケージに `dai-runner.config.local.js.example` を追加

### メリット

- 個人のローカル環境設定をコミットせずに済む
- チーム共通設定の更新が全員に反映されやすくなる
- Git マージコンフリクトが発生しにくくなる
- 新規メンバーのオンボーディングが簡単に

### 移行ガイド

既存プロジェクトでは以下の 2 つの方法で利用できます：

1. **そのまま使用**: 既存の `dai-runner.config.js` をそのまま使用（互換性あり）
2. **設定分離**: proxy 設定を `dai-runner.config.local.js` に移動（推奨）

詳細は README.md を参照してください。

## [1.1.0] - 2025-11-16

### 修正

- **SCSS ファイル監視のバグ修正**: 新しい SCSS ファイルを追加した際にコンパイルされない問題を修正
  - 原因: 相対パスと絶対パスの比較エラー
  - 解決: `path.resolve()` を使用してパスを統一
- **JS ファイル削除時の不具合修正**: JS ファイルを削除した際に、対応する `.map`
  ファイルが残る問題を修正
  - ソースマップファイルも同時に削除するように改善

### 変更

- **依存パッケージの最適化**: WSL2 環境での安定動作のためにパッケージバージョンを調整
  - `chokidar`: `^4.0.3` → `^3.6.0` (ファイル監視の安定性向上)
  - `@rollup/plugin-node-resolve`: `^15.3.0` → `^16.0.1`
  - `autoprefixer`: `^10.4.20` → `^10.4.19`
  - `cssnano`: `^7.0.6` → `^6.1.2`
  - `glob`: `^11.0.0` → `^10.3.12`
  - `inquirer`: `^12.3.0` → `^12.9.4`
  - `postcss`: `^8.4.49` → `^8.4.38`
  - `postcss-discard-duplicates`: `^7.0.1` → `^6.0.3`
  - `postcss-normalize-charset`: `^7.0.0` → `^6.0.2`
  - `rollup`: `^4.28.1` → `^4.47.1`
  - `sass`: `^1.83.0` → `^1.75.0`
  - `sharp`: `^0.33.5` → `^0.33.3`
  - `svgo`: `^3.3.2` → `^3.2.0`
  - `terser`: `^5.36.0` → `^5.30.3`

### 注意事項

- WSL2 環境でファイル監視が動作しない場合は、このバージョンへのアップデートを推奨します
- 依存パッケージのバージョンを変更しているため、再インストールが必要です: `npm install`

## [1.0.0] - 2025-11-16

### 追加

- 初回リリース
- SCSS、JavaScript、画像ファイルの自動ビルド・最適化機能
- BrowserSync による開発サーバーとライブリロード機能
- ファイル監視による自動再ビルド機能
- 対話的な設定ファイル生成機能
- プロキシモードとサーバーモードのサポート
- 画像の自動最適化と WebP 変換機能
- CSS/JS のソースマップ生成機能
