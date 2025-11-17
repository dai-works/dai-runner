/**
 * ヘッダー高さを取得してCSS変数に設定する
 */
const setHeaderHeightVariable = () => {
  const headerElement = document.getElementById('js-header');
  if (headerElement) {
    const setHeaderHeight = () => {
      const headerHeight = headerElement.offsetHeight;
      document.documentElement.style.setProperty(
        '--js-height__header',
        `${headerHeight}px`,
      );
    };

    // 初期設定
    setHeaderHeight();

    // ページ読み込み完了後に再計算（レイアウトが安定してから）
    window.addEventListener('load', () => {
      setTimeout(setHeaderHeight, 50);
    });

    // ウィンドウリサイズ時に再計算
    window.addEventListener('resize', setHeaderHeight);
  }
};

export { setHeaderHeightVariable };
