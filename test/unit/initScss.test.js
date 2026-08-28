import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { initScss } from '../../tasks/css/initScss.js';
import { makeTmpDir } from './helpers.js';

async function setup(t) {
  const src = await makeTmpDir(t);
  const mod = path.join(src, 'modules');
  await fs.mkdir(mod);
  await fs.writeFile(path.join(mod, '_foo.scss'), '.foo { color: red; }\n');
  return { src, mod, index: path.join(mod, '_index.scss') };
}

test('_index.scss が無ければ生成ヘッダ付きで作る', async (t) => {
  const { src, index } = await setup(t);
  await initScss(src);
  const content = await fs.readFile(index, 'utf8');
  assert.equal(content, '// modules styles\n\n@forward "foo";\n');
});

test('ルート直下には _index.scss を作らない', async (t) => {
  const { src } = await setup(t);
  await initScss(src);
  await assert.rejects(fs.access(path.join(src, '_index.scss')));
});

test('パーシャルを追加して再実行すると生成物は更新される', async (t) => {
  const { src, mod, index } = await setup(t);
  await initScss(src);
  await fs.writeFile(path.join(mod, '_bar.scss'), '.bar { color: blue; }\n');
  await initScss(src);
  const content = await fs.readFile(index, 'utf8');
  assert.match(content, /@forward "bar";/);
  assert.match(content, /@forward "foo";/);
});

test('内容が同じなら書き直さない（mtime が変わらない）', async (t) => {
  const { src, index } = await setup(t);
  await initScss(src);
  const past = new Date('2020-01-01T00:00:00Z');
  await fs.utimes(index, past, past);
  await initScss(src);
  const { mtime } = await fs.stat(index);
  assert.equal(mtime.getTime(), past.getTime());
});

test('手書きの _index.scss（生成ヘッダなし）は上書きしない', async (t) => {
  const { src, index } = await setup(t);
  const handWritten = '// 手で並べ替えた\n@forward "foo" with ($size: 10px);\n';
  await fs.writeFile(index, handWritten);
  await initScss(src);
  const content = await fs.readFile(index, 'utf8');
  assert.equal(content, handWritten);
});
