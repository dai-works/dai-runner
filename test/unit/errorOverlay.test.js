import { test } from 'node:test';
import assert from 'node:assert/strict';
import { errorOverlayCss } from '../../tasks/css/errorOverlay.js';
import { errorOverlayJs } from '../../tasks/js/errorOverlay.js';

test('CSSエラーオーバーレイは値をエスケープして含める', () => {
  const css = errorOverlayCss({ file: 'a"b.scss', message: '壊れ\\た\n詳細' });
  assert.match(css, /@charset "UTF-8"/);
  assert.match(css, /SCSS エラー/);
  assert.match(css, /a\\"b\.scss/);
  assert.match(css, /position: fixed/);
  assert.match(css, /壊れ\\\\た\\A/);
});

test('JSエラーオーバーレイはファイルとメッセージを含める', () => {
  const js = errorOverlayJs({ file: 'main.js', message: '構文エラー' });
  assert.match(js, /JavaScriptエラー/);
  assert.match(js, /main\.js/);
  assert.match(js, /構文エラー/);
  assert.match(js, /console\.error/);
});
