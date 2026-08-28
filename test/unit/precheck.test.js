import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isNodeVersionSupported } from '../../scripts/precheck.js';

test('Node.jsの必要バージョンを比較する', () => {
  assert.equal(isNodeVersionSupported('18.0.0', '>=18.0.0'), true);
  assert.equal(isNodeVersionSupported('22.1.0', '>=18.0.0'), true);
  assert.equal(isNodeVersionSupported('16.20.0', '>=18.0.0'), false);
});
