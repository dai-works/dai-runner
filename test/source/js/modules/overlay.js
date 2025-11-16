/**
 * オーバーレイ機能の初期化
 */
const overlay = () => {
  const overlayTriggers = document.querySelectorAll('.js-overlay__trigger');
  const visibleClass = 'is-visible';

  let focusableElements = [];
  let firstElement, lastElement;

  // 各トリガーの初期aria-label属性を保存するMap
  const originalLabels = new Map();

  // トリガーと対応する要素を取得
  const getControlledContent = (trigger) => {
    const contentId = trigger.getAttribute('aria-controls');
    return document.getElementById(contentId);
  };

  // オーバーレイを開閉する関数
  const toggleOverlayVisibility = (trigger, content) => {
    const isExpanded = trigger.getAttribute('aria-expanded') === 'true';

    // aria-expanded の切り替え
    trigger.setAttribute('aria-expanded', !isExpanded);

    // クラスの切り替え
    content.classList.toggle(visibleClass, !isExpanded);

    // トリガーボタンのラベルを更新
    updateTriggerLabel(trigger, !isExpanded);

    if (!isExpanded) {
      setFocusableElements(trigger, content);
      trapFocus();
      addEscapeKeyListener(trigger, content);

      // data-auto-close属性がある場合の処理
      const autoCloseTime = trigger.getAttribute('data-auto-close');
      if (autoCloseTime) {
        setTimeout(
          () => {
            if (content.classList.contains(visibleClass)) {
              closeOverlay(trigger, content);
            }
          },
          parseInt(autoCloseTime, 10) * 1000,
        ); // 秒をミリ秒に変換
      }
    } else {
      removeFocusTrap();
    }
  };

  // オーバーレイを閉じる関数
  const closeOverlay = (trigger, content) => {
    trigger.setAttribute('aria-expanded', false);
    content.classList.remove(visibleClass);
    updateTriggerLabel(trigger, false);
    removeFocusTrap();
  };

  // トリガーのaria-label属性とtitle属性を更新する関数
  const updateTriggerLabel = (trigger, isOpening) => {
    const originalLabel = originalLabels.get(trigger);

    if (isOpening) {
      // 元のラベルがある場合は「{label}を閉じる」、ない場合は「オーバーレイを閉じる」
      const labelToSet = originalLabel
        ? `${originalLabel}を閉じる`
        : 'オーバーレイを閉じる';
      trigger.setAttribute('aria-label', labelToSet);
      trigger.setAttribute('title', labelToSet);
    } else {
      // 元のラベルがある場合は「{label}を開く」、ない場合は「オーバーレイを開く」
      const labelToSet = originalLabel
        ? `${originalLabel}を開く`
        : 'オーバーレイを開く';
      trigger.setAttribute('aria-label', labelToSet);
      trigger.setAttribute('title', labelToSet);
    }
  };

  // フォーカス可能な要素を設定
  const setFocusableElements = (trigger, content) => {
    const focusableInsideContent = content.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select',
    );
    focusableElements = [trigger, ...focusableInsideContent];
    firstElement = focusableElements[0];
    lastElement = focusableElements[focusableElements.length - 1];
  };

  // フォーカスを制限する
  const trapFocus = () => {
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('keydown', handleKeydown);
  };

  const removeFocusTrap = () => {
    document.removeEventListener('focusin', handleFocusIn);
    document.removeEventListener('keydown', handleKeydown);
  };

  const handleFocusIn = (event) => {
    if (!focusableElements.includes(event.target)) {
      firstElement.focus();
    }
  };

  const handleKeydown = (event) => {
    if (event.key === 'Tab') {
      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }
  };

  const addEscapeKeyListener = (trigger, content) => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        closeOverlay(trigger, content);
      }
    };

    document.addEventListener('keydown', handleEscapeKey);

    content.addEventListener('transitionend', () => {
      if (!content.classList.contains(visibleClass)) {
        document.removeEventListener('keydown', handleEscapeKey);
      }
    });
  };

  // 各トリガーと対応するコンテンツにイベントを登録
  overlayTriggers.forEach((trigger) => {
    const content = getControlledContent(trigger);

    // 初期のaria-label属性を保存（なければtitle属性をチェック）
    const initialLabel =
      trigger.getAttribute('aria-label') || trigger.getAttribute('title');
    if (initialLabel) {
      originalLabels.set(trigger, initialLabel);

      // 初期状態のtitle属性を設定（aria-labelと同じ値にして「を開く」を付加）
      const initialTitle = `${initialLabel}を開く`;
      trigger.setAttribute('title', initialTitle);
    } else {
      // どちらもない場合は汎用的なtitle属性を設定
      trigger.setAttribute('title', 'オーバーレイを開く');
    }

    // トリガーボタンのクリックイベント
    trigger.addEventListener('click', () =>
      toggleOverlayVisibility(trigger, content),
    );

    // 背景クリックでオーバーレイを閉じる
    const backdrop = content.querySelector('.js-overlay__backdrop');
    backdrop?.addEventListener('click', () => closeOverlay(trigger, content));

    // キーボード操作 (Enterキーとスペースキー)
    trigger.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleOverlayVisibility(trigger, content);
      }
    });

    // ドロワー内のリンククリック時にオーバーレイを閉じる
    const drawerLinks = content.querySelectorAll('a[href]');
    drawerLinks.forEach((link) => {
      link.addEventListener('click', () => {
        // オーバーレイが開いている場合のみ閉じる
        if (content.classList.contains(visibleClass)) {
          closeOverlay(trigger, content);
        }
      });
    });
  });
};

export { overlay };
