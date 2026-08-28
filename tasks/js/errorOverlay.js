/**
 * JavaScriptエラーを開発中のブラウザに表示するバナーを作る
 * @param {{file: string, message: string}} params
 * @returns {string}
 */
export function errorOverlayJs({ file, message }) {
  const fileText = JSON.stringify(String(file));
  const messageText = JSON.stringify(String(message));
  return `(function () {
  var file = ${fileText};
  var message = ${messageText};
  console.error('JavaScriptエラー: ' + file + '\\n' + message);
  var banner = document.createElement('div');
  banner.textContent = 'JavaScript エラー\\n' + file + '\\n' + message;
  banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147483647;padding:16px;background:#2b1720;color:#ffd9df;font:16px/1.5 monospace;white-space:pre-wrap;';
  document.body ? document.body.insertBefore(banner, document.body.firstChild) : document.addEventListener('DOMContentLoaded', function () { document.body.insertBefore(banner, document.body.firstChild); });
})();\n`;
}
