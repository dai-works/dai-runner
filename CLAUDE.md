# dai-runner

社内フロントエンドビルドツール（SCSS / JS / 画像 / Browsersync）。案件からは
`github:dai-works/dai-runner#vX.Y.Z` で pin されて使われる。Node.js は `>=20.19.0` を必要とする。

## 変更したら必ず

```bash
npm run check   # lint → 整形チェック → 単体テスト → smoke（本番ビルド＋dev 監視の実動作）
```

- `npm test` は数秒。開発中に何度でも回す
- `npm run smoke` は約 1 分。`test/dai-html` で `npm run build` と `npm run dev`
  を実際に動かし、SCSS / JS
  / 画像の変更・追加・削除に成果物が追従するかを見る。**タグを打つ前は必ず通す**
- smoke が落ちた状態でリリースしない。落ちる理由が「テスト側が古い」なら `test/smoke/run.js` と
  `test/dai-html` を直す
- push すると GitHub Actions（`.github/workflows/check.yml`）でも同じ `npm run check` が走る

## リリース手順

CHANGELOG.md の `## [Unreleased]` に変更内容を書き、main のクリーンな作業ツリーで次を実行する。

```bash
npm run release -- <patch|minor|major>
```

`npm run check`、package.json / package-lock.json / CHANGELOG.md /
README.md の更新、commit、annotated tag、push、GitHub
Release 作成まで release が自動で行う。事前確認は `--dry-run`、check を意図的に省く場合は
`--skip-check` を使う。新機能を足したら `dai-runner.config.js.example` も更新する。

## 設計上の約束

- タスク（`tasks/**`）はグローバル config を読まず、呼び出し元が dev/build を解決した `options`
  を引数で受ける（build に dev の設定が混ざった過去がある）
- `_index.scss` は生成ヘッダ `// <dir> styles` で始まるものだけ自動更新する。手書きのものは触らない
