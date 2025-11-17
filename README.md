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
npm install --save-dev https://github.com/dai-works/dai-runner.git#v1.3.0
```

### 初回セットアップ

#### 1. package.json にスクリプトを追加

プロジェクトの`package.json`に以下のスクリプトを追加してください：

```json
{
  "scripts": {
    "dev": "dai-runner dev",
    "build": "dai-runner build"
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
- JavaScript ファイルのコピーとフォーマット
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

## 主な機能

### SCSS 処理

- SCSS ファイルのコンパイル
- ベンダープレフィックスの自動追加
- メディアクエリの最適化
- CSS の整形と最適化

### JavaScript 処理

- JavaScript ファイルのコピーまたは圧縮
- Prettier によるコードフォーマット

### 画像処理

- 画像の最適化（サイズ圧縮）
- WebP 形式への自動変換（設定で有効時）
- SVG の最適化

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
- 画像処理オプション（最大幅、品質、WebP 変換など）
- CSS/JS 処理オプション（圧縮、ソースマップなど）
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
    'assets/images/keep-image.png',
    'assets/js/keep-js.js',
    'assets/css/keep-css.css',
  ],
},
```

**パスの指定方法：** テーマルートからの相対パスで、dist ディレクトリを含む完全なパスで指定します。  
例：`assets/images/file.png` を保持したい場合 → `'assets/images/file.png'` と指定  
※ `paths`設定で dist ディレクトリを変更した場合は、そのパスに合わせて指定してください

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
│   ├── misc/
│   └── server/
├── utils/                   # ユーティリティ関数
├── dai-runner.config.js.example        # 設定ファイルのサンプル（チーム共通用）
├── dai-runner.config.local.js.example  # ローカル設定ファイルのサンプル（個人用）
├── index.js                 # パッケージエントリーポイント
├── package.json
└── README.md
```

## 注意事項

- `npm run dev` 実行時にプロキシモードを使用する場合は、バックエンドサーバー（WordPress、Node.js サーバーなど）が起動している必要があります
- 本番環境にデプロイする前に `npm run build` を実行して最適化されたファイルを生成してください
- 設定ファイルはプロジェクトルートに配置してください
  - **`dai-runner.config.js`**: Git 管理を推奨（チーム共通設定）
  - **`dai-runner.config.local.js`**: `.gitignore` に追加を推奨（個人設定）
- 新しい環境でセットアップする際は `npm run dev` を実行すると、自動的に `dai-runner.config.local.js` が作成されます

## アップデート

最新バージョンに更新する場合：

```bash
npm update @dai-works/dai-runner
```

特定のバージョン（タグ）に更新する場合：

```bash
npm install --save-dev https://github.com/dai-works/dai-runner.git#v1.3.0
```

## プログラマティックな使用方法

CLI ではなく、Node.js スクリプトから直接使用することも可能です：

```javascript
import { config, BuildManager, Logger } from '@dai-works/dai-runner';

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

### このリポジトリで動作確認する

dai-runner パッケージ自体に同梱されているテスト用ファイルで動作確認できます：

```bash
# 開発モードで起動（ファイル監視 + BrowserSync）
npm run dev

# 本番ビルドのテスト
npm run build
```

ブラウザが自動的に開き、`http://localhost:3000` でテストページが表示されます。
SCSS や JS ファイルを編集すると、自動的にビルドされブラウザが更新されます。

**テスト用ファイル構成：**

- `test/source/scss/style.scss` - テスト用 SCSS
- `test/source/js/main.js` - テスト用 JavaScript
- `test/public/index.html` - テスト用 HTML
- `test/public/assets/` - ビルド成果物（自動生成、Git 管理外）

### 他プロジェクトでのテスト

開発中の dai-runner を他プロジェクトで使用する場合：

```bash
# dai-runner ディレクトリで
npm link

# テストしたいプロジェクトで
cd /path/to/your-project
npm link @dai-works/dai-runner
```

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
