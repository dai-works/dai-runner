# dai-html

静的HTMLサイト・WordPressテーマ開発用のテンプレートプロジェクトです。独自のビルドシステム「dai-runner」を使用して、効率的な開発環境を提供します。

## 📋 目次

- [特徴](#特徴)
- [要件](#要件)
- [インストール](#インストール)
- [使用方法](#使用方法)
- [プロジェクト構造](#プロジェクト構造)
- [開発ワークフロー](#開発ワークフロー)
- [ビルドシステム](#ビルドシステム)
- [リンティング・フォーマット](#リンティングフォーマット)
- [セキュリティ機能](#セキュリティ機能)
- [本番環境へのデプロイ](#本番環境へのデプロイ)

## ✨ 特徴

- **独自ビルドシステム**: dai-runnerによる効率的な開発環境
- **静的HTML/WordPress対応**: 一つのビルドシステムで両方に対応
- **SCSS対応**: DaiCSS設計ルールに基づくモダンなCSS開発（詳細は`source/scss/README.md`を参照）
- **自動リロード**: Browser Syncによる自動リロード機能
- **画像最適化**: Sharp/SVGOによる自動画像圧縮とWebP変換
- **コード品質管理**: ESLint、Stylelint、Prettierによる統一されたコードスタイル
- **Gitフック**: Huskyとlint-stagedによるコミット前の自動チェック
- **レスポンシブ対応**: PCファーストデザイン

## 🔧 要件

### 静的HTMLサイトの場合

- Node.js (v16以上)
- npm

### WordPressテーマの場合

- Node.js (v16以上)
- npm
- WordPress (v5.0以上)
- PHP (v7.4以上)

## 🚀 インストール

1. リポジトリをクローンまたはダウンロード

```bash
git clone <repository-url>
cd dai-html
```

2. 依存関係をインストール

```bash
npm install
```

3. **静的HTMLサイトの場合**: そのまま開発を開始できます（次のセクションへ）

4. **WordPressテーマの場合**:
   - `npm run dev` を初回実行すると `dai-runner.config.local.js` が自動作成されます
   - `dai-runner.config.local.js` の `mode` を `'proxy'` に変更
   - `proxy.proxyReq` 内の `Host` ヘッダーを開発環境のドメインに変更（必要な場合）
   - WordPress管理画面でテーマを有効化

## 📖 使用方法

### 開発環境の起動

```bash
npm run dev
```

このコマンドで以下が実行されます：

- 事前チェック（依存関係の確認）
- アセットのビルド
- ローカルサーバーの起動（Browser Sync）
  - 静的HTMLモード: `http://localhost:3000` でアクセス可能
  - WordPressプロキシモード: 設定したWordPress環境経由でアクセス可能
- ファイル監視と自動リビルド

### 本番用ビルド

```bash
npm run build
```

本番環境用に最適化されたアセットを生成します。

### その他のコマンド

```bash
# コードフォーマット
npm run format              # すべてのファイルをフォーマット
npm run format:check        # フォーマットチェックのみ
npm run format:php          # PHPファイルのみフォーマット

# リンティング
npm run lint                # JavaScriptのリント
npm run lint:fix            # JavaScriptの自動修正
npm run lint:css            # CSS/SCSSのリント
npm run lint:css:fix        # CSS/SCSSの自動修正
```

## 📁 プロジェクト構造

### 静的HTMLサイト用の構造

```
dai-html/
├── public/                   # 公開用ディレクトリ（このフォルダをFTPアップロード）
│   ├── index.html            # HTMLファイル
│   └── assets/               # ビルド済みアセット（自動生成・編集禁止）
│       ├── css/              # コンパイル済みCSS
│       ├── js/               # バンドル済みJavaScript
│       └── images/           # 最適化済み画像
├── source/                   # ソースファイル（アップロード不要）
│   ├── scss/                 # SCSSファイル（DaiCSS設計）
│   ├── js/                   # JavaScriptファイル
│   └── images/               # 元画像ファイル
├── dai-runner.config.js      # ビルドシステム設定
├── dai-runner.config.local.js # ローカル環境設定（個人用）
└── package.json              # 依存関係とスクリプト
```

**注**: ビルドシステム本体（dai-runner）は `@dai-works/dai-runner` パッケージとして `node_modules/` に配置されます。

### WordPressテーマ用の構造

```
dai-html/
├── .cursor/                  # Cursor設定
├── .git/                     # Gitリポジトリ
├── .husky/                   # Gitフック設定
├── .vscode/                  # VSCode設定
├── public/                   # 公開用ディレクトリ（このフォルダをFTPアップロード）
│   └── assets/               # ビルド済みアセット（自動生成）
│       ├── css/              # コンパイル済みCSS
│       ├── documents/        # ドキュメントファイル
│       ├── fonts/            # フォントファイル
│       ├── images/           # 最適化済み画像
│       ├── js/               # バンドル済みJavaScript
│       ├── vendor/           # サードパーティライブラリ
│       └── videos/           # 動画ファイル
├── contact-form-7/           # Contact Form 7で使うコード（管理画面で設置・本番不要）
├── includes/                 # PHP機能ファイル
│   ├── post-type/            # カスタム投稿タイプ
│   ├── disable-auto-updates.php  # 自動更新無効化
│   ├── disable-comments.php  # コメント機能無効化
│   ├── disable-fullscreen-editor.php  # フルスクリーンエディタ無効化
│   ├── enqueue.php           # アセット読み込み
│   ├── links.php             # リンク関連機能
│   ├── security.php          # セキュリティ設定
│   ├── setup.php             # テーマセットアップ
│   ├── shortcode.php         # ショートコード定義
│   ├── theme-customizer.php  # テーマカスタマイザー
│   └── utilities.php         # ユーティリティ関数
├── node_modules/             # npm依存パッケージ（自動生成）
├── source/                   # ソースファイル
│   ├── documents/            # ドキュメントファイル
│   ├── fonts/                # フォントファイル
│   ├── images/               # 元画像ファイル
│   ├── js/                   # JavaScriptファイル
│   ├── scss/                 # SCSSファイル（DaiCSS設計）
│   ├── vendor/               # サードパーティライブラリ
│   └── videos/               # 動画ファイル
├── template-parts/           # テンプレートパーツ
├── .browserslistrc           # Browserslist設定
├── .editorconfig             # エディタ設定
├── .gitignore                # Git除外設定
├── .prettierignore           # Prettier除外設定
├── .prettierrc.json          # Prettier設定
├── .stylelintrc.json         # Stylelint設定
├── 404.php                   # 404ページ
├── archive.php               # アーカイブページ
├── dai-runner.config.js      # ビルドシステム設定
├── dai-runner.config.local.js # ローカル環境設定（個人用）
├── eslint.config.js          # ESLint設定
├── footer.php                # フッター
├── front-page.php            # フロントページ
├── functions.php             # メイン機能ファイル
├── header.php                # ヘッダー
├── index.php                 # メインテンプレート
├── page-contact.php          # お問い合わせページ
├── page-snippets.php         # スニペットページ（開発用・本番不要）
├── page-thanks.php           # お問い合わせ完了ページ
├── page.php                  # 固定ページ
├── package-lock.json         # npm依存関係ロック
├── package.json              # 依存関係とスクリプト
├── README.md                 # プロジェクトドキュメント
├── screenshot.png            # テーマスクリーンショット
├── sidebar.php               # サイドバー
├── single.php                # 単一記事ページ
└── style.css                 # テーマ情報
```

## 🔄 開発ワークフロー

### 静的HTMLサイトの場合

1. **HTMLファイルの編集**: `public/` ディレクトリ内の `.html` ファイルを編集
2. **ソースファイルの編集**: `source/` ディレクトリ内のSCSS/JS/画像を編集
3. **自動ビルド**: ファイル保存時に自動的にビルドが実行され、`public/assets/` に出力
4. **ブラウザ確認**: Browser Syncによるリアルタイム確認（自動リロード）
5. **自動リント**: 保存時にリンティング・フォーマットが実行（設定されている場合）
6. **コミット**: Gitコミット時に自動的にリント・フォーマットが実行
7. **本番ビルド**: 完成後に `npm run build` で本番用に最適化
8. **デプロイ**: `public/` フォルダの中身をFTPでアップロード

### WordPressテーマの場合

1. **PHPファイルの編集**: テンプレートファイルや `includes/` 内のPHPを編集
2. **ソースファイルの編集**: `source/` ディレクトリ内のSCSS/JS/画像を編集
3. **自動ビルド**: ファイル保存時に自動的にビルドが実行され、`public/assets/` に出力
4. **ブラウザ確認**: Browser Syncプロキシによるリアルタイム確認
5. **自動リント**: 保存時にリンティング・フォーマットが実行（設定されている場合）
6. **コミット**: Gitコミット時に自動的にリント・フォーマットが実行
7. **本番ビルド**: 完成後に `npm run build` で本番用に最適化
8. **デプロイ**: 必要なファイルをFTPでアップロード

### 主要な開発ディレクトリ

- **HTML**: `public/` - HTMLファイル（静的サイトの場合）
- **SCSS**: `source/scss/` - DaiCSS設計に基づくスタイルシート（詳細は`source/scss/README.md`参照）
- **JavaScript**: `source/js/` - ES6+モジュール
- **画像**: `source/images/` - 元画像（自動最適化されます）
- **PHP**: `includes/` - テーマ機能の実装（WordPressの場合）
- **ビルド出力**: `public/assets/` - ビルド済みファイル（自動生成・編集禁止）

## ⚙️ ビルドシステム

### dai-runnerの機能

- **SCSSコンパイル**: Sass/SCSSからCSSへの変換
  - Autoprefixer（ベンダープレフィックス自動付与）
  - CSS Declaration Sorter（プロパティの並び替え）
  - PostCSS Sort Media Queries（メディアクエリの整理）
  - CSSnano（本番環境での最適化）
- **JavaScriptバンドル**: Rollupによるモジュールバンドル
  - Terserによる最適化（本番環境）
- **画像最適化**:
  - Sharp（JPEG/PNG/WebP）
  - SVGO（SVG最適化）
- **ファイル監視**: Chokidarによる高速なファイル監視
- **ローカルサーバー**: Browser Syncによる開発サーバー
- **コードフォーマット**: Prettierによる統一されたフォーマット

### 対応ファイル

`source/` ディレクトリ内のファイルは自動的に `public/assets/` にビルド・コピーされます：

- `.scss` → `.css`（コンパイル）
- `.js` → `.js`（バンドル）
- `.jpg, .png, .svg, .webp, .gif` → 最適化された画像
- その他（`.woff, .woff2, .pdf, .mp4` 等） → そのままコピー

## 🔍 リンティング・フォーマット

### コード品質管理ツール

- **ESLint**: JavaScript/TypeScriptのリンティング
- **Stylelint**: CSS/SCSSのリンティング（Standard SCSS設定）
- **Prettier**: コードフォーマット（JS, CSS, SCSS, PHP対応）

### Gitフック

Huskyとlint-stagedにより、コミット前に自動的にリント・フォーマットが実行されます：

- JavaScriptファイル: ESLint + Prettier
- CSS/SCSSファイル: Stylelint + Prettier
- PHPファイル: Prettier

## 🔒 セキュリティ機能（WordPressの場合）

- **自動更新の制御**: 意図しない更新を防止
- **コメント機能の無効化**: 不要なコメント機能を完全に無効化
- **フルスクリーンエディタの無効化**: クラシックエディタUIの維持
- **セキュリティヘッダー**: 適切なHTTPヘッダーの設定
- **不要な機能の無効化**: WordPressのデフォルト機能の整理

## 🚀 本番環境へのデプロイ

### デプロイ前の準備

1. 本番用ビルドを実行

```bash
npm run build
```

2. コードのリント・フォーマットチェック

```bash
npm run format:check
npm run lint
npm run lint:css
```

### 本番環境にアップロードするファイル

#### 静的HTMLサイトの場合

`public/` フォルダの中身をすべてサーバーのドキュメントルート（`public_html/` など）にアップロードしてください：

```
✅ アップロードが必要なファイル：
public/
├── index.html                 # HTMLファイル
├── (その他の.htmlファイル)
└── assets/                    # ビルド済みアセット
    ├── css/                   # コンパイル済みCSS
    ├── js/                    # バンドル済みJavaScript
    └── images/                # 最適化済み画像
```

#### WordPressテーマの場合

以下のファイル・ディレクトリのみをアップロードしてください：

```
✅ アップロードが必要なファイル：
├── public/
│   └── assets/                # ビルド済みアセット
├── includes/                  # PHP機能ファイル
├── template-parts/            # テンプレートパーツ
├── 404.php
├── archive.php
├── footer.php
├── front-page.php
├── functions.php
├── header.php
├── index.php
├── page-contact.php           # お問い合わせページ
├── page-thanks.php            # お問い合わせ完了ページ
├── page.php
├── README.md（任意）
├── screenshot.png             # テーマスクリーンショット（存在する場合）
├── sidebar.php
├── single.php
└── style.css
```

### 本番環境にアップロード不要なファイル

以下のファイル・ディレクトリは開発用のため、本番環境にアップロードする必要はありません：

```
❌ アップロード不要：
├── .cursor/                   # Cursor設定
├── .git/                      # Gitリポジトリ
├── .husky/                    # Gitフック設定
├── .vscode/                   # VSCode設定
├── contact-form-7/            # Contact Form 7コード（管理画面で設置）
├── node_modules/              # npm依存パッケージ（ビルドシステムを含む）
├── source/                    # ソースファイル（ビルド前）
├── .browserslistrc            # Browserslist設定
├── .editorconfig              # エディタ設定
├── .gitignore                 # Git除外設定
├── .prettierignore            # Prettier除外設定
├── .prettierrc.json           # Prettier設定
├── .stylelintrc.json          # Stylelint設定
├── dai-runner.config.js       # ビルドシステム設定
├── dai-runner.config.local.js # ローカル環境設定
├── eslint.config.js           # ESLint設定
├── package-lock.json          # npm依存関係ロック
├── package.json               # npm設定
└── page-snippets.php          # スニペットページ（開発用）
```

### デプロイのベストプラクティス

- **FTPクライアントを使用する場合**: 上記の必要なファイルのみを選択してアップロード
- **Git経由でデプロイする場合**: `.gitignore`を適切に設定し、不要なファイルを除外
- **デプロイスクリプトを使用する場合**: rsyncやzipコマンドで必要なファイルのみをパッケージング

### デプロイ用zipファイルの作成例

#### 静的HTMLサイトの場合

```bash
# publicフォルダの中身をzipに圧縮
cd public
zip -r ../site.zip . -x "*.DS_Store"
cd ..
```

#### WordPressテーマの場合

```bash
# 必要なファイルのみをzipに圧縮（手動で実行）
zip -r dai-traefik-wp-theme.zip \
  public/assets/ \
  includes/ \
  template-parts/ \
  *.php \
  style.css \
  screenshot.png \
  -x "*.map" "*.DS_Store"
```

## 📝 備考

- SCSS設計ルール（DaiCSS）の詳細は `source/scss/README.md` を参照してください
- 本テンプレートを使用する前に、WordPressのバックアップを取ることをお勧めします
- 本番環境では `npm run build` で生成された最適化済みアセットを使用してください
