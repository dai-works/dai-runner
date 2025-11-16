/**
 * Contact Form 7 確認画面機能
 * フォームの入力内容を確認画面に反映し、送信前の確認を可能にする
 */
const contactForm7Confirmation = () => {
  const formElement = document.querySelector(
    '.m-form-table:not(.m-form-table--confirm)',
  );
  const confirmArea = document.querySelector('.js-confirm-area');
  const confirmButton = document.querySelector('.js-confirm-button');
  const backButton = document.querySelector('.js-back-button');

  // 必要な要素が存在しない場合は処理を終了
  if (!formElement || !confirmArea || !confirmButton || !backButton) {
    return;
  }

  // フォームフィールドの情報を定義
  const fieldMappings = [
    {
      input: 'select[name="your-inquiry"]',
      confirm: '.js-confirm-your-inquiry',
    },
    { input: 'input[name="your-name"]', confirm: '.js-confirm-your-name' },
    { input: 'input[name="your-kana"]', confirm: '.js-confirm-your-kana' },
    {
      input: 'input[name="your-company"]',
      confirm: '.js-confirm-your-company',
    },
    { input: 'input[name="your-tel"]', confirm: '.js-confirm-your-tel' },
    { input: 'input[name="your-fax"]', confirm: '.js-confirm-your-fax' },
    { input: 'input[name="your-email"]', confirm: '.js-confirm-your-email' },
    {
      input: 'textarea[name="your-message"]',
      confirm: '.js-confirm-your-message',
    },
  ];

  /**
   * 必須フィールドのバリデーション
   * @returns {boolean} すべての必須フィールドが入力されているかどうか
   */
  const validateRequiredFields = () => {
    const requiredFields = formElement.querySelectorAll(
      '[aria-required="true"]',
    );
    const privacyPolicyCheckbox = formElement.querySelector(
      'input[name="your-privacy-policy"]',
    );

    // 必須フィールドの確認
    for (const field of requiredFields) {
      if (!field.value.trim()) {
        return false;
      }
    }

    // プライバシーポリシー同意チェックボックスの確認
    if (privacyPolicyCheckbox && !privacyPolicyCheckbox.checked) {
      return false;
    }

    return true;
  };

  /**
   * 確認ボタンの有効/無効状態を更新
   */
  const updateConfirmButtonState = () => {
    const isValid = validateRequiredFields();
    confirmButton.disabled = !isValid;
  };

  /**
   * 入力値を確認画面に反映
   * @param {HTMLElement} inputElement - 入力要素
   * @param {HTMLElement} confirmElement - 確認画面の表示要素
   */
  const updateConfirmValue = (inputElement, confirmElement) => {
    if (!inputElement || !confirmElement) return;

    let value = '';

    if (inputElement.tagName === 'SELECT') {
      const selectedOption = inputElement.options[inputElement.selectedIndex];
      value = selectedOption && selectedOption.value ? selectedOption.text : '';
    } else {
      value = inputElement.value;
    }

    confirmElement.textContent = value || '未入力';
  };

  /**
   * すべての入力値を確認画面に反映
   */
  const updateAllConfirmValues = () => {
    fieldMappings.forEach(({ input, confirm }) => {
      const inputElement = formElement.querySelector(input);
      const confirmElement = confirmArea.querySelector(confirm);
      updateConfirmValue(inputElement, confirmElement);
    });
  };

  /**
   * 確認画面を表示
   */
  const showConfirmScreen = () => {
    updateAllConfirmValues();
    formElement.style.display = 'none';
    confirmArea.style.display = 'block';

    // m-form-tableまでスクロール
    const targetElement = document.querySelector('.p-contact__form');
    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  /**
   * 入力画面に戻る
   */
  const showInputScreen = () => {
    formElement.style.display = 'block';
    confirmArea.style.display = 'none';

    // p-contact__formまでスクロール
    const targetElement = document.querySelector('.p-contact__form');
    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  /**
   * 送信完了後のリダイレクト処理
   */
  const handleFormSubmission = () => {
    // Contact Form 7の送信完了イベントを監視
    document.addEventListener('wpcf7mailsent', (event) => {
      // PHPで生成されたthanksページのURLを使用
      const thanksPageUrl =
        window.contactFormConfig?.thanksPageUrl || '/contact/thanks/';
      window.location.href = thanksPageUrl;
    });
  };

  // イベントリスナーの設定
  const initEventListeners = () => {
    // 入力フィールドの変更を監視
    fieldMappings.forEach(({ input }) => {
      const inputElement = formElement.querySelector(input);
      if (inputElement) {
        inputElement.addEventListener('input', updateConfirmButtonState);
        inputElement.addEventListener('change', updateConfirmButtonState);
      }
    });

    // プライバシーポリシーチェックボックスの変更を監視
    const privacyPolicyCheckbox = formElement.querySelector(
      'input[name="your-privacy-policy"]',
    );
    if (privacyPolicyCheckbox) {
      privacyPolicyCheckbox.addEventListener(
        'change',
        updateConfirmButtonState,
      );
    }

    // 確認ボタンのクリックイベント
    confirmButton.addEventListener('click', showConfirmScreen);

    // 戻るボタンのクリックイベント
    backButton.addEventListener('click', showInputScreen);

    // 送信完了イベントの設定
    handleFormSubmission();
  };

  // 初期化
  const init = () => {
    updateConfirmButtonState();
    initEventListeners();
  };

  init();
};

export { contactForm7Confirmation };
