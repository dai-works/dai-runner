/**
 * ローカル環境設定ファイル（個人用）
 * このファイルをコピーして dai-runner.config.local.js を作成してください
 *
 * コピー方法:
 *   cp dai-runner.config.local.js.example dai-runner.config.local.js
 *
 * または npm run dev の初回実行時に自動的に作成されます
 */
export default {
  // 開発環境のモード: 'server' または 'proxy'
  mode: 'server',

  proxy: {
    // プロキシのターゲットURL
    // 例: 'http://localhost:8080', 'http://localhost:3000'
    target: 'http://127.0.0.1',

    // カスタムヘッダーやリクエスト改変が必要な場合はここに追加
    proxyReq: [
      // 例: Hostヘッダーを変更（Traefik等を使用する場合）
      // function (proxyReq) {
      //   proxyReq.setHeader('Host', 'sample-wp.localhost');
      // },
    ],
  },
};
