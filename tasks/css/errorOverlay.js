function escapeCssString(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, '\\A ');
}

/**
 * SCSSエラーを開発中のブラウザに表示するCSSを作る
 * @param {{file: string, message: string}} params
 * @returns {string}
 */
export function errorOverlayCss({ file, message }) {
  const text = `SCSS エラー\\A ${escapeCssString(file)}\\A ${escapeCssString(message)}`;
  return `@charset "UTF-8";
body::before {
  content: "${text}";
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  padding: 2rem;
  overflow: auto;
  background: #2b1720;
  color: #ffd9df;
  font: 16px/1.6 monospace;
  white-space: pre-wrap;
}`;
}
