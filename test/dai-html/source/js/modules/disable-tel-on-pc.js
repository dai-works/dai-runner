/**
 * PC時に電話番号リンクのクリックを無効化
 * 768px以上の画面幅でhref属性を削除してリンク機能を停止
 * リサイズ時にSPサイズになったら復元
 */
const disableTelOnPC = () => {
  const telLinks = document.querySelectorAll('.js-tel--only-sp');
  const breakpoint = 768;

  if (!telLinks.length) return;

  // href属性を管理する
  const updateLinks = () => {
    telLinks.forEach((link) => {
      if (window.innerWidth >= breakpoint) {
        // PC時：元のhrefを保存してリンクを無効化
        if (!link.dataset.originalHref) {
          link.dataset.originalHref = link.getAttribute('href');
        }
        link.removeAttribute('href');
      } else {
        // SP時：元のhrefを復元
        if (link.dataset.originalHref) {
          link.setAttribute('href', link.dataset.originalHref);
        }
      }
    });
  };

  // 初期化時に実行
  updateLinks();

  // リサイズ時に更新
  window.addEventListener('resize', updateLinks);
};

export { disableTelOnPC };
