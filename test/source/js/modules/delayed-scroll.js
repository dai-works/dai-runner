/**
 * 遅延スクロール機能
 * 遅延処理でレイアウト安定化を待つ
 */
const delayedScroll = () => {
  // href属性に"#"が含まれるすべての<a>要素を取得
  document.querySelectorAll('a[href*="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
      const href = anchor.getAttribute('href');
      const hashIndex = href.indexOf('#');
      if (hashIndex === -1) return;

      const targetId = href.substring(hashIndex);
      const targetElement = document.querySelector(targetId);

      if (targetElement) {
        event.preventDefault();
        // 遅延してからスクロール（レイアウト安定化のため）
        setTimeout(() => {
          targetElement.scrollIntoView();
        }, 50);
      }
    });
  });

  /**
   * ページ読み込み時のハッシュ処理
   */
  const handleInitialHash = () => {
    const hash = window.location.hash;
    if (hash && hash !== '#') {
      const targetElement = document.querySelector(hash);
      if (targetElement) {
        setTimeout(() => {
          targetElement.scrollIntoView();
        }, 200);
      }
    }
  };

  // ページ読み込み完了後にハッシュ処理を実行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handleInitialHash);
  } else {
    handleInitialHash();
  }
};

export { delayedScroll };
