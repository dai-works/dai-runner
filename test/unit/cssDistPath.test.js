import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { cssDistPath } from '../../tasks/css/cssDistPath.js';

test('cssDistPathは末尾のscssだけをcssに変換する', () => {
  const paths = { src: '/project/source', dist: '/project/public' };
  assert.equal(
    cssDistPath(paths, path.join(paths.src, 'foo.scss')),
    path.join(paths.dist, 'foo.css')
  );
  assert.equal(
    cssDistPath(paths, path.join(paths.src, 'foo.scss.bak')),
    path.join(paths.dist, 'foo.scss.bak')
  );
});
