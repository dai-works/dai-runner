# dai-runner - フロントエンドビルドツール

`dai-runner`は、SCSS、JavaScript、画像ファイルの処理と最適化を行う軽量なビルドツールです。静的サイト、WordPress テーマ、ランディングページなど、シンプルなフロントエンド開発プロジェクトで使用できます。

## インストール

### GitHub リポジトリからのインストール

プロジェクトのルートディレクトリで以下のコマンドを実行してください：

```bash
npm install --save-dev https://github.com/dai-works/dai-runner.git
```

または、`package.json`に直接記述する場合：

```json
{
  "devDependencies": {
    "@dai-works/dai-runner": "https://github.com/dai-works/dai-runner.git"
  }
}
```

特定のバージョン（タグ）を指定する場合：

```bash
npm install --save-dev https://github.com/dai-works/dai-runner.git#v1.10.3
```

### 初回セットアップ

#### 1. package.json にスクリプトを追加

プロジェクトの`package.json`に以下のスクリプトを追加してください：

```json
{
  "scripts": {
    "dev": "dai-runner dev",
    "build": "dai-runner build",
    "package": "dai-runner package",
    "package:zip": "dai-runner package --zip"
  }
}
```

#### 2. 開発を開始

初回実行時に自動的に必要な設定ファイルが作成されます：

```bash
npm run dev
```

設定ファイルだけ先に作成したい場合：

```bash
npx dai-runner precheck
```

**自動生成されるファイル：**

1. `dai-runner.config.js` - チーム共通の設定ファイル（存在しない場合のみ）
2. `dai-runner.config.local.js` - 個人用の設定ファイル（初回実行時に対話形式で作成）

初回実行時の質問で開発環境のタイプを選択してください：

- **静的ファイルのみ (server)**: HTML/CSS/JS の静的サイト開発
- **dai-traefik を使用**: Traefik を使ったプロキシ環境
  - ホスト名は `.env` ファイルの `COMPOSE_PROJECT_NAME` から自動推測されます
  - `.env` がない場合は、ディレクトリ名から自動生成されます（例: `dai-html` → `dai-html.localhost`）
- **外部サーバー**: Local、Docker、XAMPP 等の外部サーバー

## 使用用途

以下のような様々なフロントエンド開発プロジェクトで使用できます：

- **静的サイト** - HTML/CSS/JS の静的サイト開発
- **WordPress テーマ** - プロキシモード（BrowserSync）でローカル WordPress 環境と連携
- **ランディングページ** - マーケティング用のランディングページ制作
- **コーポレートサイト** - 企業サイトやポートフォリオサイト
- **その他** - SCSS/JS/画像を使用するシンプルなフロントエンドプロジェクト

## 開発コマンド

### 開発モード

開発モードでは、ファイルの変更を監視し、自動的にビルドとブラウザの更新を行います。

```bash
npm run dev
```

このコマンドは以下の処理を実行します：

- SCSS ファイルのコンパイルと最適化
- JavaScript ファイルのバンドルとフォーマット
- 画像ファイルの最適化
- ブラウザの自動更新（BrowserSync）

### 本番ビルド

本番環境用にファイルを最適化してビルドします。

```bash
npm run build
```

このコマンドは以下の処理を実行します：

- SCSS ファイルのコンパイルと最適化（ソースマップなし）
- JavaScript ファイルの最適化（設定により圧縮）
- 画像ファイルの最適化
- sitemap.xml の生成（設定で有効時）

## 主な機能

### SCSS 処理

- SCSS ファイルのコンパイル
- ベンダープレフィックスの自動追加
- メディアクエリの最適化
- CSS の整形と最適化

### JavaScript 処理

- JavaScript ファイルのバンドルまたは圧縮
- Prettier によるコードフォーマット

### 画像処理

- 画像の最適化（サイズ圧縮）
- WebP 形式への自動変換（設定で有効時）
- AVIF 形式の自動生成（設定で有効時。JPG/PNG/WebP から生成）
- SVG の最適化

### sitemap.xml 生成

- HTMLファイルから自動的にsitemap.xmlを生成
- 本番ビルド時のみ実行（設定で有効時）
- 除外パターンによるフィルタリング

### 開発サーバー

- ファイル変更の監視と自動リロード
- プロキシモードによる WordPress 開発環境との連携
- CSS の変更時はページ全体をリロードせずに反映

## 設定カスタマイズ

### 設定ファイルの種類

- **`dai-runner.config.js`** (Git 管理推奨)
  - チーム共通の設定
  - パス設定、画像処理オプション、ビルド設定など
- **`dai-runner.config.local.js`** (Git 管理外、個人用)
  - 個人のローカル環境に依存する設定
  - プロキシのターゲット URL、認証ヘッダーなど
  - 初回実行時に自動生成

### カスタマイズ可能な設定

`dai-runner.config.js` で以下の設定をカスタマイズできます：

- ソースファイルと出力先のパス
- 画像処理オプション（最大幅、品質、WebP 変換、AVIF 生成など）
- CSS/JS 処理オプション（圧縮、ソースマップ、console.log 削除など）
- クリーンアップの除外ファイル（残したいファイルを指定）
- ログレベル

`dai-runner.config.local.js` で以下の設定をカスタマイズできます：

- 開発環境のモード（server / proxy）
- プロキシのターゲット URL
- カスタムヘッダーやリクエスト改変

### クリーンアップの除外設定

ビルド時にクリーンアップから除外したいファイルがある場合、`dai-runner.config.js`の`cleanup.excludeFiles`で指定できます。

```javascript
cleanup: {
  excludeFiles: [
    'public/assets/images/keep-image.png',
    'public/assets/js/keep-js.js',
    'public/assets/css/keep-css.css',
  ],
},
```

**パスの指定方法：** テーマルートからの相対パスで、dist ディレクトリを含む完全なパスで指定します。  
例：`public/assets/images/file.png` を保持したい場合 → `'public/assets/images/file.png'` と指定  
※ `paths`設定で dist ディレクトリを変更した場合は、そのパスに合わせて指定してください

### 孤立画像の削除設定（cleanOrphans）

画像キャッシュ（`useCache: true`）を有効にしている場合、ビルド速度向上のため `dist`
の画像ディレクトリ全体がクリーンアップから除外されます。そのため `source` から削除した画像が `dist`
に残り続けてしまう問題があります。

`cleanup.cleanOrphans: true` を指定すると、キャッシュは維持したまま `source`
側に対応するファイルが無い `dist` 画像だけを削除します。

```javascript
cleanup: {
  excludeFiles: [],
  cleanOrphans: true, // src に存在しない dist 画像を自動削除
},
```

- `convertToWebp: true` 時は jpg/jpeg/png に対応する `.webp` も同時に判定対象になります
- `convertToAvif: true` 時は jpg/jpeg/png/webp に対応する `.avif` も同時に判定対象になります
- `excludeFiles` に列挙したファイルは孤立判定からも除外されるため、明示的に保持できます
- `useCache: false`
  の場合は通常のクリーンアップで dist が空になるため、本オプションは効果を持ちません

### 本番アップロード用パッケージング（package コマンド）

WordPress テーマプロジェクトなどで「本番アップロードに必要なファイルだけを 1 つのフォルダにまとめたい」場合は
`dai-runner package` を使用します。

```bash
dai-runner package          # dist/theme/ にコピーするだけ
dai-runner package --zip    # dist/theme/ に加えて dist/theme.zip も生成
```

事前に `dai-runner build` を実行して `assets/` を最新化しておく必要があります。

#### デフォルトの include / exclude

何も設定しなければ以下が適用されます。

**include（これだけコピー）:**

```
assets/**
includes/**
template-parts/**
page-parts/**
*.php
style.css
screenshot.png
```

**exclude（include に該当しても除外）:**

```
page-snippets.php
**/.DS_Store
**/Thumbs.db
**/*:Zone.Identifier
```

#### 案件ごとに上書き・追加する

`dai-runner.config.js` に `package` キーを追加します。

```javascript
package: {
  outputDir: 'dist/theme', // 出力先（デフォルト: 'dist/theme'）
  zip: false,              // CLI の --zip より優先度低
  zipName: 'theme.zip',    // zip 化したときのファイル名
  // include を指定するとデフォルトを完全に置き換える
  // include: ['assets/**', 'style.css', '*.php'],
  // exclude はデフォルト除外に追加される（上書きではない）
  exclude: ['docs/**', 'CLAUDE.md'],
},
```

- `include` は **上書き**（指定したら案件側のリストだけが使われる）
- `exclude` は **追加**（dai-runner のデフォルト除外を維持しつつ追加）
- CLI の `--zip` フラグは config の `zip` 設定より優先される
- 出力前に `outputDir` 配下は毎回クリーンアップされます（`dist/` 自体は残る）

### console.log 削除設定

本番ビルド時に`console.log`などのデバッグ出力を自動削除する機能を利用できます。

`dai-runner.config.js`の設定例：

```javascript
// 開発環境設定
dev: {
  options: {
    js: {
      minify: false,
      sourceMap: true,
      dropConsole: false, // 開発時はconsole.logを残す
    },
  },
},

// 本番環境設定
build: {
  options: {
    js: {
      minify: false,
      sourceMap: false,
      dropConsole: true, // 本番ビルド時にconsole.logを削除
    },
  },
},
```

**dropConsole オプション：**

- `true`: `console.log`、`console.info`、`console.warn`、`console.error`などを削除
- `false`: console 出力を残す
- デフォルト: 開発環境は`false`、本番環境は`true`

この機能により、プロダクションコードのファイルサイズが削減され、デバッグ情報の漏洩も防げます。

### sitemap.xml生成設定

本番ビルド時にHTMLファイルから自動的にsitemap.xmlを生成できます。

`dai-runner.config.js`の設定例：

```javascript
sitemap: {
  enabled: true,  // sitemap.xmlを生成
  productionUrl: 'https://example.com',  // 本番環境のURL
  sourceDir: 'public',  // HTMLファイルの検索元
  outputPath: 'public/sitemap.xml',  // 出力先
  excludePatterns: ['404.html', 'test/**'],  // 除外パターン
  defaultPriority: 0.5,  // デフォルト優先度（トップページは自動的に1.0）
  defaultChangefreq: 'weekly',  // デフォルト更新頻度
  customPriorities: {  // 特定のページに個別の優先度を設定
    '/service/': 0.8,        // service/index.html → /service/（重要）
    '/products/': 0.8,       // products/index.html → /products/（重要）
    '/about.html': 0.8,      // about.html → /about.html（重要）
    '/blog/': 0.3,           // blog/index.html → /blog/（補助）
  },
}
```

**sitemap設定オプション：**

- `enabled`: sitemap.xml生成の有効/無効（デフォルト: `false`）
- `productionUrl`: 本番環境のURL（必須、末尾のスラッシュは不要）
- `sourceDir`: HTMLファイルの検索元ディレクトリ（デフォルト: `'public'`）
- `outputPath`: sitemap.xmlの出力先（デフォルト: `'public/sitemap.xml'`）
- `excludePatterns`: 除外するファイルパターン（配列）
- `defaultPriority`: デフォルトの優先度 0.0-1.0（デフォルト: `0.5`）
- `defaultChangefreq`: デフォルトの更新頻度（デフォルト: `'weekly'`）
  - 指定可能な値: `always`, `hourly`, `daily`, `weekly`, `monthly`, `yearly`, `never`
- `customPriorities`: 特定のページに個別の優先度を設定（オプション）
  - オブジェクト形式で `{'/path': 優先度}` を指定
  - `service/index.html` は `/service/` として指定
  - `about.html` は `/about.html` として指定
  - トップページ (`/`) は設定不要（自動的に1.0）

**本番ビルド時のみ生成する場合：**

```javascript
// 本番環境設定
build: {
  options: { /* ... */ },
  sitemap: {
    enabled: true,
    productionUrl: 'https://example.com',
  },
}
```

この設定により、`npm run build`時のみsitemap.xmlが生成されます。

## ディレクトリ構造

### プロジェクト構造（npm パッケージとして使用する場合）

```bash
your-project/                    # プロジェクトルート
├── node_modules/
│   └── @dai-works/
│       └── dai-runner/          # インストールされたdai-runner
├── source/                      # ソースファイル
│   ├── scss/                    # SCSSファイル
│   ├── js/                      # JavaScriptファイル
│   └── images/                  # 画像ファイル
├── public/assets/               # ビルド後のファイル（自動生成）
│   ├── css/                     # コンパイル済みCSSファイル
│   ├── js/                      # 処理済みJavaScriptファイル
│   └── images/                  # 最適化済み画像ファイル
├── dai-runner.config.js         # dai-runner設定ファイル（チーム共通、Git管理）
├── dai-runner.config.local.js   # ローカル設定ファイル（個人用、Git無視）
└── package.json
```

### dai-runner パッケージ内部の構造

```bash
dai-runner/
├── bin/                     # CLIエントリーポイント
│   └── dai-runner.js
├── scripts/                 # メインスクリプト
│   ├── dev.js
│   ├── build.js
│   └── precheck.js
├── tasks/                   # タスク処理モジュール
│   ├── css/
│   ├── js/
│   ├── images/
│   └── server/
├── utils/                   # ユーティリティ関数
├── dai-runner.config.js.example        # 設定ファイルのサンプル（チーム共通用）
├── dai-runner.config.local.js.example  # ローカル設定ファイルのサンプル（個人用）
├── index.js                 # パッケージエントリーポイント
├── package.json
└── README.md
```

## 注意事項

- `npm run dev`
  実行時にプロキシモードを使用する場合は、バックエンドサーバー（WordPress、Node.js サーバーなど）が起動している必要があります
- 本番環境にデプロイする前に `npm run build` を実行して最適化されたファイルを生成してください
- 設定ファイルはプロジェクトルートに配置してください
  - **`dai-runner.config.js`**: Git 管理を推奨（チーム共通設定）
  - **`dai-runner.config.local.js`**: `.gitignore` に追加を推奨（個人設定）
- 新しい環境でセットアップする際は `npm run dev` を実行すると、自動的に `dai-runner.config.local.js`
  が作成されます

## アップデート

最新バージョンに更新する場合：

```bash
npm update @dai-works/dai-runner
```

特定のバージョン（タグ）に更新する場合：

```bash
npm install --save-dev https://github.com/dai-works/dai-runner.git#v1.10.3
```

## プログラマティックな使用方法

CLI ではなく、Node.js スクリプトから直接使用することも可能です：

```javascript
import { BuildManager, Logger } from '@dai-works/dai-runner';
// 設定はプロジェクト側の dai-runner.config.js を読む
import { config } from './dai-runner.config.js';

async function customBuild() {
  const conf = config.get('build');
  await BuildManager.executeBuild(conf, 'カスタムビルド');
  Logger.log('INFO', 'ビルド完了');
}

customBuild();
```

## 開発者向け情報

### dai-runner パッケージの開発

dai-runner パッケージ自体を開発する場合：

```bash
# リポジトリをクローン
git clone git@github.com:dai-works/dai-runner.git
cd dai-runner

# 依存関係をインストール
npm install
```

### テストとリリース前チェック

```bash
npm test          # 単体テスト（test/unit/、node:test、数秒）
npm run smoke     # test/dai-html で本番ビルドと開発サーバーを実際に動かして検証（約 1 分）
npm run check     # lint → 整形チェック → npm test → npm run smoke（タグを打つ前に必ず）
```

smoke は `npm run build` の成果物が build 設定どおりか（sourceMap / minify / dropConsole /
WebP）を見たあと、 `npm run dev`
を起動して SCSS の変更・パーシャル追加・JS 変更・画像追加・削除を順に発生させ、成果物が追従するかを確認します。触ったファイルは自動で戻します。push すると GitHub
Actions でも同じ `npm run check` が走ります。

### このリポジトリで動作確認する

`test/dai-html` が、このリポジトリを `file:../..` で参照する動作確認用プロジェクトです：

```bash
cd test/dai-html

# 開発モードで起動（ファイル監視 + BrowserSync。ブラウザは自動では開きません）
npm run dev

# 本番ビルド
npm run build
```

起動後に `http://localhost:3000`
を開くとテストページが表示されます。SCSS や JS ファイルを編集すると、自動的にビルドされブラウザが更新されます。

**テスト用ファイル構成：**

- `test/dai-html/source/scss/` - テスト用 SCSS
- `test/dai-html/source/js/main.js` - テスト用 JavaScript
- `test/dai-html/public/index.html` - テスト用 HTML
- `test/dai-html/public/assets/` - ビルド成果物（自動生成、Git 管理外）

### 他プロジェクトでのテスト

開発中の dai-runner を他プロジェクトで使用する場合：

```bash
# dai-runner ディレクトリで
npm link

# テストしたいプロジェクトで
cd /path/to/your-project
npm link @dai-works/dai-runner
```

## 開発者向け

### コードフォーマット

このプロジェクトでは、ESLint と Prettier を使用してコード品質を維持しています。

#### フォーマット確認

```bash
npm run format:check  # フォーマットチェック
npm run lint         # ESLint チェック
```

#### 自動フォーマット

```bash
npm run format     # Prettier で自動フォーマット
npm run lint:fix   # ESLint で自動修正
```

#### フォーマット設定

- **ESLint**: `eslint.config.js` - コードの品質チェック
- **Prettier**: `.prettierrc.json` - コードのフォーマット
- **EditorConfig**: `.editorconfig` - エディタの基本設定

## トラブルシューティング

### 設定ファイルが見つからない

設定ファイルが見つからない場合は、プロジェクトルートで以下を実行してください：

```bash
npm run dev
```

または

```bash
npx dai-runner precheck
```

これにより、対話形式で `dai-runner.config.local.js` が自動生成されます。

### パーミッションエラー

グローバルインストール時にパーミッションエラーが発生する場合は、`--save-dev`でローカルインストールすることを推奨します。
