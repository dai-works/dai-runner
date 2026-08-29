/**
 * Windows形式とPOSIX形式のパス区切りをスラッシュへ統一する
 * @param {string} value - 正規化するパス
 * @returns {string} 正規化したパス
 */
function toPosix(value) {
  return value ? value.replace(/\\/g, '/') : value;
}

export { toPosix };
