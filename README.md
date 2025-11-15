# dai-runner - WordPressテーマ開発ツール

`dai-runner`は、WordPressテーマ開発のためのビルドツールです。SCSS、JavaScript、画像ファイルの処理と最適化を行い、効率的な開発環境を提供します。

## インストール

### GitHubプライベートリポジトリからのインストール

プロジェクトのルートディレクトリで以下のコマンドを実行してください：

```bash
npm install --save-dev git+ssh://git@github.com/dai-works/dai-runner.git
```

または、`package.json`に直接記述する場合：

```json
{
  "devDependencies": {
    "@dai-works/dai-runner": "git+ssh://git@github.com/dai-works/dai-runner.git"
  }
}
```

特定のバージョン（タグ）を指定する場合：

```bash
npm install --save-dev git+ssh://git@github.com/dai-works/dai-runner.git#v1.0.0
```

### 初回セットアップ

#### 1. 設定ファイルの作成

初回実行時に自動的に対話形式で`config.js`が作成されますが、手動で作成することもできます：

```bash
npx dai-runner precheck
```

または、手動で作成する場合：

```bash
cp node_modules/@dai-works/dai-runner/config.js.example config.js
```

**重要：** `dev.proxy.target` の値は必ず変更してください。お使いの開発環境のWordPressサイトのURLに合わせる必要があります。

#### 2. package.jsonにスクリプトを追加

プロジェクトの`package.json`に以下のスクリプトを追加してください：

```json
{
  "scripts": {
    "dev": "dai-runner dev",
    "build": "dai-runner build"
  }
}
```

## 開発コマンド

### 開発モード

開発モードでは、ファイルの変更を監視し、自動的にビルドとブラウザの更新を行います。

```bash
npm run dev
```

このコマンドは以下の処理を実行します：

- SCSSファイルのコンパイルと最適化
- JavaScriptファイルのコピーとフォーマット
- 画像ファイルの最適化
- ブラウザの自動更新（BrowserSync）

### 本番ビルド

本番環境用にファイルを最適化してビルドします。

```bash
npm run build
```

このコマンドは以下の処理を実行します：

- SCSSファイルのコンパイルと最適化（ソースマップなし）
- JavaScriptファイルの最適化（設定により圧縮）
- 画像ファイルの最適化

## 主な機能

### SCSS処理

- SCSSファイルのコンパイル
- ベンダープレフィックスの自動追加
- メディアクエリの最適化
- CSSの整形と最適化

### JavaScript処理

- JavaScriptファイルのコピーまたは圧縮
- Prettierによるコードフォーマット

### 画像処理

- 画像の最適化（サイズ圧縮）
- WebP形式への自動変換（設定で有効時）
- SVGの最適化

### 開発サーバー

- ファイル変更の監視と自動リロード
- プロキシモードによるWordPress開発環境との連携
- CSSの変更時はページ全体をリロードせずに反映

## 設定カスタマイズ

`config.js` で以下の設定をカスタマイズできます：

- ソースファイルと出力先のパス
- 開発サーバーの設定（プロキシURLなど）
- 画像処理オプション（最大幅、品質、WebP変換など）
- CSS/JS処理オプション（圧縮、ソースマップなど）
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

**パスの指定方法：** テーマルートからの相対パスで、distディレクトリを含む完全なパスで指定します。  
例：`assets/images/file.png` を保持したい場合 → `'assets/images/file.png'` と指定  
※ `paths`設定でdistディレクトリを変更した場合は、そのパスに合わせて指定してください

## ディレクトリ構造

### プロジェクト構造（npmパッケージとして使用する場合）

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
├── config.js                    # dai-runner設定ファイル（プロジェクト固有）
└── package.json
```

### dai-runnerパッケージ内部の構造

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
├── config.js.example        # 設定ファイルのサンプル
├── index.js                 # パッケージエントリーポイント
├── package.json
└── README.md
```

## 注意事項

- `npm run dev` 実行時は、WordPressの開発環境が起動している必要があります（proxy modeの場合）
- 本番環境にデプロイする前に `npm run build` を実行して最適化されたファイルを生成してください
- 設定ファイル `config.js` はプロジェクトルート（テーマルート）に配置し、`.gitignore`に追加することを推奨します
- 新しい環境でセットアップする際は `npx dai-runner precheck` を実行するか、手動で `config.js` を作成してください

## アップデート

最新バージョンに更新する場合：

```bash
npm update @dai-works/dai-runner
```

特定のバージョン（タグ）に更新する場合：

```bash
npm install --save-dev git+ssh://git@github.com/dai-works/dai-runner.git#v1.1.0
```

## プログラマティックな使用方法

CLIではなく、Node.jsスクリプトから直接使用することも可能です：

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

### dai-runnerパッケージの開発

dai-runnerパッケージ自体を開発する場合：

```bash
# リポジトリをクローン
git clone git@github.com:dai-works/dai-runner.git
cd dai-runner

# 依存関係をインストール
npm install

# ローカルでテスト
npm link
cd /path/to/your-project
npm link @dai-works/dai-runner
```

## トラブルシューティング

### SSH接続エラー

GitHubへのSSH接続が失敗する場合は、SSHキーが正しく設定されているか確認してください：

```bash
ssh -T git@github.com
```

### 設定ファイルが見つからない

`config.js`が見つからない場合は、プロジェクトルートで以下を実行してください：

```bash
npx dai-runner precheck
```

### パーミッションエラー

グローバルインストール時にパーミッションエラーが発生する場合は、`--save-dev`でローカルインストールすることを推奨します。
