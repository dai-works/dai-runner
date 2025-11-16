/**
 * アコーディオンの初期化
 */
const accordion = () => {
  const accordions = document.querySelectorAll('.js-accordion');

  accordions.forEach((accordion, index) => {
    const button = accordion.querySelector('.js-accordion__button');
    const panel = accordion.querySelector('.js-accordion__panel');

    if (button && panel) {
      // ユニークなIDを生成
      const panelId = `accordion-panel-${index}`;
      const buttonId = `accordion-button-${index}`;

      // aria属性を設定
      button.setAttribute('aria-controls', panelId);
      button.setAttribute('id', buttonId);
      panel.setAttribute('aria-labelledby', buttonId);
      panel.setAttribute('id', panelId);

      // 初期状態のaria-expanded属性を設定（hidden属性の有無で判定）
      const isInitiallyHidden = panel.hasAttribute('hidden');
      button.setAttribute(
        'aria-expanded',
        isInitiallyHidden ? 'false' : 'true',
      );

      // ボタンにクリックイベントを追加
      button.addEventListener('click', () => {
        const isHidden = panel.hasAttribute('hidden');
        // hidden属性とaria-expanded属性を同期して制御
        if (isHidden) {
          panel.removeAttribute('hidden'); // 開く
          button.setAttribute('aria-expanded', 'true');
        } else {
          panel.setAttribute('hidden', ''); // 閉じる
          button.setAttribute('aria-expanded', 'false');
        }
      });
    }
  });
};

export { accordion };
