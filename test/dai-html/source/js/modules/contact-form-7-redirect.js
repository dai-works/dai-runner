/**
 * Contact Form 7 送信後のリダイレクト処理
 *
 * フォーム送信が完了した後、完了ページにリダイレクトします。
 *
 * 【リダイレクト先の変更方法】
 * リダイレクト先URLを変更したい場合は、このファイルではなく
 * フォームを設置しているPHPテンプレートファイル内の
 * window.contactFormConfig.thanksPageUrl を編集してください。
 *
 * @example
 * <script>
 *   window.contactFormConfig = {
 *     thanksPageUrl: '<?php echo get_esc_home_url('/contact/thanks'); ?>'
 *   };
 * </script>
 */
const contactForm7Redirect = () => {
  document.addEventListener(
    'wpcf7mailsent',
    function (event) {
      // サンクスページのURLは各PHPテンプレートファイルで設定されています
      const redirectUrl = window.contactFormConfig?.thanksPageUrl;

      // 設定が正しく読み込まれているか確認
      if (!redirectUrl) {
        console.error(
          'サンクスページのURLが設定されていません。PHPテンプレートのwindow.contactFormConfig.thanksPageUrlを確認してください。',
        );
        return;
      }

      // 送信完了後、完了ページにリダイレクト
      window.location.href = redirectUrl;
    },
    false,
  );
};

export { contactForm7Redirect };
