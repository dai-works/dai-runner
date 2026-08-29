import { test } from 'node:test';
import assert from 'node:assert/strict';
import CleanupManager from '../../utils/CleanupManager.js';
import { toPosix } from '../../utils/paths.js';

test('toPosixはWindows形式と混在形式の区切りを統一する', () => {
  assert.equal(toPosix('a\\b\\c.png'), 'a/b/c.png');
  assert.equal(toPosix('a\\b/c'), 'a/b/c');
  assert.equal(toPosix('a/b/c.png'), 'a/b/c.png');
  assert.equal(toPosix(''), '');
  assert.equal(toPosix(undefined), undefined);
});

test('shouldExcludeはWindows形式の相対パスをPOSIX形式の設定と比較できる', () => {
  assert.equal(
    CleanupManager.shouldExclude('public\\assets\\images\\keep.png', [
      'public/assets/images/keep.png',
    ]),
    true
  );
});
