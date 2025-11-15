# dai-runner - WordPress テーマ開発ツール

`dai-runner`は、WordPress テーマ開発のためのビルドツールです。SCSS、JavaScript、画像ファイルの処理と最適化を行い、効率的な開発環境を提供します。

## インストール

### GitHub パッケージとしてインストール

このパッケージは GitHub のプライベートリポジトリで管理されています。以下の手順でインストールできます。

#### 1. GitHub パッケージレジストリの認証設定

まず、`.npmrc` ファイルをプロジェクトルートまたはホームディレクトリに作成します。

```bash
# プロジェクトルート/.npmrc
@dai-works:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_PERSONAL_ACCESS_TOKEN
```

**Personal Access Token の作成方法：**

1. GitHub にログイン → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. "Generate new token (classic)" をクリック
3. 以下の権限を選択：
   - `read:packages` - パッケージの読み取り
   - `repo` - プライベートリポジトリへのアクセス
4. トークンをコピーして `.npmrc` に設定

#### 2. パッケージのインストール

```bash
npm install @dai-works/dai-runner
```

#### 3. プロジェクトでの使用方法

`dai-runner` をインストールしたプロジェクトで、以下の手順でセットアップします。

##### 3-1. package.json にスクリプトを追加

```json
{
  "scripts": {
    "dev": "node ./node_modules/@dai-works/dai-runner/scripts/precheck.js && cross-env NODE_ENV=dev node ./node_modules/@dai-works/dai-runner/scripts/dev.js",
    "build": "node ./node_modules/@dai-works/dai-runner/scripts/precheck.js && cross-env NODE_ENV=build node ./node_modules/@dai-works/dai-runner/scripts/build.js"
  }
}
```

##### 3-2. 設定ファイルの作成

プロジェクトルートに `config.js` を作成します。サンプルは `node_modules/@dai-works/dai-runner/config.js.example` を参照してください。

```bash
cp node_modules/@dai-works/dai-runner/config.js.example config.js
```

**重要：** `dev.proxy.target` の値は必ず変更してください。お使いの開発環境の WordPress サイトの URL に合わせる必要があります。

##### 3-3. 開発開始

```bash
npm run dev
```

## 開発環境のセットアップ（パッケージ開発者向け）

このセクションは `dai-runner` パッケージ自体を開発する場合の手順です。

### 1. 必要なパッケージのインストール

```bash
npm install
```

### 2. 設定ファイルの作成

`config.js.example` を `config.js` にコピーして、必要に応じて設定を変更してください。

**重要：** `dev.proxy.target` の値は必ず変更してください。お使いの開発環境の WordPress サイトの URL に合わせる必要があります。

```bash
cp config.js.example config.js
```

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

`config.js` で以下の設定をカスタマイズできます：

- ソースファイルと出力先のパス
- 開発サーバーの設定（プロキシ URL など）
- 画像処理オプション（最大幅、品質、WebP 変換など）
- CSS/JS 処理オプション（圧縮、ソースマップなど）
- クリーンアップの除外ファイル（残したいファイルを指定）
- ログレベル

### クリーンアップの除外設定

ビルド時にクリーンアップから除外したいファイルがある場合、`config.js`の`cleanup.excludeFiles`で指定できます。

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

```bash
dai-runner/
├── config.js                # 設定ファイル
├── config.js.example         # 設定ファイルのサンプル
├── scripts/                  # メインスクリプト
├── tasks/                    # タスク処理モジュール
├── utils/                    # ユーティリティ関数
└── README.md                 # このファイル
```

### 処理対象のディレクトリ構造

```bash
../                          # テーマルートディレクトリ
├── source/                  # ソースファイル
│   ├── scss/               # SCSSファイル
│   ├── js/                 # JavaScriptファイル
│   └── images/             # 画像ファイル
└── assets/                 # ビルド後のファイル（自動生成）
    ├── css/                # コンパイル済みCSSファイル
    ├── js/                 # 処理済みJavaScriptファイル
    └── images/             # 最適化済み画像ファイル
```

## 注意事項

- `npm run dev` 実行時は、WordPress の開発環境が起動している必要があります
- 本番環境にデプロイする前に `npm run build` を実行して最適化されたファイルを生成してください
- 設定ファイル `config.js` はバージョン管理から除外されているため、新しい環境でセットアップする際は必ずコピーして作成してください

## GitHub へのパッケージ公開（パッケージメンテナー向け）

### 1. GitHub リポジトリの作成

1. GitHub でプライベートリポジトリを作成
2. リポジトリ名: `dai-runner`
3. プライベートに設定

### 2. package.json の更新

`package.json` はすでに `@dai-works/dai-runner` として設定済みです。

### 3. Git リポジトリの初期化とプッシュ

```bash
cd /home/kose/my-projects/dai-runner-test/dai-runner
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin git@github.com:dai-works/dai-runner.git
git push -u origin main
```

### 4. GitHub パッケージとして公開

```bash
# GitHubパッケージレジストリにログイン
npm login --registry=https://npm.pkg.github.com

# パッケージを公開
npm publish
```

### 5. バージョンアップ時

```bash
# バージョンを上げる（patch/minor/major）
npm version patch

# 変更をプッシュ
git push && git push --tags

# パッケージを再公開
npm publish
```

## トラブルシューティング

### パッケージがインストールできない

- `.npmrc` の設定が正しいか確認してください
- Personal Access Token が有効か確認してください
- トークンに必要な権限（`read:packages`, `repo`）が付与されているか確認してください

### ビルドエラーが発生する

- `config.js` が正しく設定されているか確認してください
- Node.js のバージョンが 18 以上であることを確認してください

### 開発サーバーが起動しない

- プロキシモードの場合、`config.js` の `dev.proxy.target` と `proxyReq` の設定が正しいか確認してください
- ポートが他のプロセスに使用されていないか確認してください

## ライセンス

MIT
