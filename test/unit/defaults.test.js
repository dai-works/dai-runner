import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { DEFAULTS } from '../../utils/defaults.js';
import './helpers.js'; // ログレベルを error に落とす

test('設定例には既定値のリテラルが記載されている', async () => {
  const text = await fs.readFile(
    path.join(process.cwd(), 'dai-runner.config.js.example'),
    'utf8'
  );
  for (const [key, value] of Object.entries(DEFAULTS.images)) {
    assert.match(text, new RegExp(`${key}:\\s*${String(value)}`));
  }
  assert.match(text, /sourceMap:\s*false/);
  assert.match(text, /minify:\s*false/);
  assert.match(text, /bundle:\s*true/);
  assert.match(text, /dropConsole:\s*false/);
});

test('READMEにはパッケージングの既定 include/exclude が記載されている', async () => {
  const text = await fs.readFile(path.join(process.cwd(), 'README.md'), 'utf8');
  for (const value of [
    ...DEFAULTS.package.include,
    ...DEFAULTS.package.exclude,
  ]) {
    assert.ok(text.includes(value), `${value} が README にありません`);
  }
});
