import { setHeaderHeightVariable } from './modules/set-header-height-variable.js';
import { delayedScroll } from './modules/delayed-scroll.js';
import { disableTelOnPC } from './modules/disable-tel-on-pc.js';
import { overlay } from './modules/overlay.js';
import { accordion } from './modules/accordion.js';
import { contactForm7Confirmation } from './modules/contact-form-7-confirmation.js';
import { contactForm7Redirect } from './modules/contact-form-7-redirect.js';

/**
 * メインJavaScript - 各モジュールの初期化
 */
document.addEventListener('DOMContentLoaded', () => {
  setHeaderHeightVariable();
  delayedScroll();
  disableTelOnPC();
  overlay();
  accordion();
  contactForm7Confirmation();
  contactForm7Redirect();
});
